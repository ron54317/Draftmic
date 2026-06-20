use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use arboard::Clipboard;
use enigo::{Direction::{Press, Release}, Enigo, Key, Keyboard, Settings};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use rubato::{Resampler, SincFixedIn, SincInterpolationType, SincInterpolationParameters, WindowFunction};
use active_win_pos_rs::get_active_window;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use std::str::FromStr;
use tauri_plugin_autostart::MacosLauncher;

// ─── State ───────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize, Clone, Debug)]
pub struct Region {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub interactive: bool,
}

pub struct AppState {
    pub recording: bool,
    pub audio_buffer: Arc<Mutex<Vec<f32>>>,
    pub stop_signal: Option<std::sync::mpsc::Sender<()>>,
    pub sample_rate: u32,
    pub llama_server_child: Option<std::process::Child>,
    pub llama_server_starting: bool, // guard: prevents concurrent start races
    pub whisper_starting: bool, // guard: prevents concurrent whisper loads
    pub last_activity: std::time::Instant,
    // In-memory audio and transcription context
    pub resampled_audio: Arc<Mutex<Option<Vec<f32>>>>,
    pub whisper_ctx: Arc<Mutex<Option<WhisperContext>>>,
    pub current_whisper_model: Arc<Mutex<String>>,

    // GPU settings (set by the user via Settings UI)
    pub use_gpu: bool,
    pub gpu_device: i32, // -1 = auto-detect, 0+ = specific device index

    // Hotkey IDs
    pub dictate_hotkey_id: Option<u32>,
    pub ptt_hotkey_id: Option<u32>,
    pub translate_hotkey_id: Option<u32>,
    pub magic_hotkey_id: Option<u32>,

    // Static Overlay Hit-Testing
    pub interactive_regions: Vec<Region>,
    pub is_ignoring_cursor: bool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            recording: false,
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            stop_signal: None,
            sample_rate: 44100,
            llama_server_child: None,
            llama_server_starting: false,
            whisper_starting: false,
            last_activity: std::time::Instant::now(),
            resampled_audio: Arc::new(Mutex::new(None)),
            whisper_ctx: Arc::new(Mutex::new(None)),
            current_whisper_model: Arc::new(Mutex::new(String::new())),
            use_gpu: true,
            gpu_device: -1, // -1 = let transcription engine/llama auto-pick the best GPU
            dictate_hotkey_id: None,
            ptt_hotkey_id: None,
            translate_hotkey_id: None,
            magic_hotkey_id: None,
            interactive_regions: Vec::new(),
            is_ignoring_cursor: false,
        }
    }
}

pub type SharedState = Arc<Mutex<AppState>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn models_dir(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| dirs::data_local_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("draftmic-models");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn model_path(app: &AppHandle, model_id: &str) -> PathBuf {
    models_dir(app).join(format!("ggml-{}.bin", model_id))
}

// ─── Commands ────────────────────────────────────────────────────────────────

/// Returns true if the model file already exists on disk
#[tauri::command]
fn check_model(app: AppHandle, model_id: String) -> bool {
    model_path(&app, &model_id).exists()
}

/// Download a GGML transcription model with real-time progress events
#[tauri::command]
async fn download_model(
    app: AppHandle,
    model_id: String,
    url: String,
) -> Result<String, String> {
    let path = model_path(&app, &model_id);

    // Already downloaded
    if path.exists() {
        app.emit(
            "download-progress",
            serde_json::json!({ "progress": 100.0, "speed": "" }),
        )
        .ok();
        return Ok(path.to_string_lossy().into_owned());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(7200))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} for {url}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    // Write to a temp path, rename on success
    let tmp_path = path.with_extension("tmp");
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Cannot create file: {e}"))?;

    let mut last_emit = std::time::Instant::now();
    let start = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {e}"))?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;

        if last_emit.elapsed().as_millis() >= 250 {
            let progress = if total > 0 {
                (downloaded as f64 / total as f64 * 100.0).min(99.9)
            } else {
                0.0
            };
            let elapsed_secs = start.elapsed().as_secs_f64().max(0.001);
            let speed_mb = (downloaded as f64 / 1_000_000.0) / elapsed_secs;

            app.emit(
                "download-progress",
                serde_json::json!({
                    "progress": progress,
                    "speed": format!("{speed_mb:.1} MB/s"),
                    "downloaded": downloaded,
                    "total": total,
                }),
            )
            .ok();

            last_emit = std::time::Instant::now();
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    // Rename tmp → final
    fs::rename(&tmp_path, &path).map_err(|e| format!("Rename failed: {e}"))?;

    app.emit(
        "download-progress",
        serde_json::json!({ "progress": 100.0, "speed": "" }),
    )
    .ok();

    Ok(path.to_string_lossy().into_owned())
}

/// Start recording (sets flag; real cpal integration runs in background thread)
#[tauri::command]
async fn start_recording(
    app: AppHandle,
    state: State<'_, SharedState>,
    _language: Option<String>,
    device_name: Option<String>,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    if s.recording {
        return Err("Already recording".into());
    }
    let host = cpal::default_host();
    
    let mut selected_device = host.default_input_device();
    if let Some(name) = device_name {
        if let Ok(devices) = host.input_devices() {
            for d in devices {
                if let Ok(d_name) = d.name() {
                    if d_name == name {
                        selected_device = Some(d);
                        break;
                    }
                }
            }
        }
    }
    
    let device = selected_device.ok_or("No input device found")?;
    let config = device.default_input_config().map_err(|e| e.to_string())?;
    
    let (tx, rx) = std::sync::mpsc::channel();
    s.stop_signal = Some(tx);
    s.recording = true;
    s.audio_buffer.lock().unwrap().clear();
    
    let audio_buf = s.audio_buffer.clone();
    
    s.sample_rate = config.sample_rate().0;
    let channels = config.channels();
    
    let state_for_err = state.inner().clone();

    std::thread::spawn(move || {
        let err_fn = |err| eprintln!("an error occurred on stream: {}", err);
        let stream_res = match config.sample_format() {
            cpal::SampleFormat::F32 => device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    let mut buf = audio_buf.lock().unwrap();
                    for frame in data.chunks(channels as usize) {
                        let sum: f32 = frame.iter().sum();
                        let mut sample = sum / channels as f32;
                        sample *= 3.0; // Boost mic sensitivity (gain)
                        buf.push(sample.clamp(-1.0, 1.0));
                    }
                },
                err_fn,
                None
            ),
            cpal::SampleFormat::I16 => device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &_| {
                    let mut buf = audio_buf.lock().unwrap();
                    for frame in data.chunks(channels as usize) {
                        let sum: f32 = frame.iter().map(|&s| s as f32 / i16::MAX as f32).sum();
                        let mut sample = sum / channels as f32;
                        sample *= 3.0; // Boost mic sensitivity (gain)
                        buf.push(sample.clamp(-1.0, 1.0));
                    }
                },
                err_fn,
                None
            ),
            _ => {
                if let Ok(mut st) = state_for_err.lock() { st.recording = false; }
                return;
            }
        };
        
        let stream = match stream_res {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to build audio stream: {}", e);
                if let Ok(mut st) = state_for_err.lock() { st.recording = false; }
                return;
            }
        };
        
        if let Err(e) = stream.play() {
            eprintln!("Failed to play audio stream: {}", e);
            if let Ok(mut st) = state_for_err.lock() { st.recording = false; }
            return;
        }
        
        let _ = rx.recv(); // Wait for stop signal
    });

    let app_clone = app.clone();
    let state_monitor = state.inner().clone();
    std::thread::spawn(move || {
        let mut last_len = 0;
        loop {
            std::thread::sleep(std::time::Duration::from_millis(50));
            let s = state_monitor.lock().unwrap();
            if !s.recording {
                break;
            }
            let buf = s.audio_buffer.lock().unwrap();
            let current_len = buf.len();
            if current_len > last_len {
                let recent_samples = &buf[last_len..];
                let mut max_amp: f32 = 0.0;
                for &sample in recent_samples {
                    let abs = sample.abs();
                    if abs > max_amp {
                        max_amp = abs;
                    }
                }
                last_len = current_len;
                let _ = app_clone.emit("audio-amplitude", max_amp);
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn stop_recording(
    state: State<'_, SharedState>,
) -> Result<(), String> {
    let (raw_audio, sample_rate) = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        if !s.recording {
            return Ok(());
        }
        s.recording = false;
        if let Some(tx) = s.stop_signal.take() {
            let _ = tx.send(());
        }
        let audio = s.audio_buffer.lock().unwrap().clone();
        (audio, s.sample_rate)
    };

    if raw_audio.is_empty() {
        return Err("No audio recorded".into());
    }

    let target_rate = 16000;
    
    let audio_16k = tokio::task::spawn_blocking(move || {
        if sample_rate != target_rate {
            let params = SincInterpolationParameters {
                sinc_len: 128,
                f_cutoff: 0.95,
                interpolation: SincInterpolationType::Linear,
                oversampling_factor: 128,
                window: WindowFunction::BlackmanHarris2,
            };
            let mut resampler = SincFixedIn::<f32>::new(
                target_rate as f64 / sample_rate as f64,
                2.0,
                params,
                raw_audio.len(),
                1,
            ).map_err(|e| e.to_string())?;
            
            let mut resampled = resampler.process(&[raw_audio], None).map_err(|e| e.to_string())?;
            Ok::<Vec<f32>, String>(resampled.pop().unwrap())
        } else {
            Ok(raw_audio)
        }
    }).await.map_err(|e| e.to_string())??;

    // Save resampled audio into state for transcribe
    let s = state.lock().map_err(|e| e.to_string())?;
    *s.resampled_audio.lock().unwrap() = Some(audio_16k);

    Ok(())
}

async fn ensure_whisper_loaded_internal(app: &AppHandle, state: &SharedState, model_id: &str) -> Result<(), String> {
    loop {
        let is_starting = state.lock().unwrap().whisper_starting;
        if !is_starting { break; }
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    let (needs_load, use_gpu, gpu_device) = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.last_activity = std::time::Instant::now();
        let current = s.current_whisper_model.lock().unwrap().clone();
        let ctx_is_none = s.whisper_ctx.lock().unwrap().is_none();
        (current != model_id || ctx_is_none, s.use_gpu, s.gpu_device)
    };

    if !needs_load {
        return Ok(());
    }

    {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.whisper_starting = true;
    }

    let model_path_str = model_path(app, model_id).to_string_lossy().into_owned();
    let app_clone = app.clone();
    let model_id_owned = model_id.to_string();

    let res = async move {
        eprintln!("DEBUG: Loading whisper model {} into memory (use_gpu={}, device={})...", model_id_owned, use_gpu, gpu_device);
        if !model_path(&app_clone, &model_id_owned).exists() {
            return Err(format!("Model {} not found on disk", model_id_owned));
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

        let resolved_device: i32 = if use_gpu && gpu_device < 0 {
            tokio::task::spawn_blocking(|| {
                let devices = get_gpu_devices_cached();
                if devices.len() <= 1 {
                    return -1;
                }
                pick_best_gpu_device(devices)
                    .filter(|&idx| idx > 0)
                    .unwrap_or(-1)
            })
            .await
            .unwrap_or(-1)
        } else {
            gpu_device
        };

        let ctx = tokio::task::spawn_blocking(move || {
            let mut params = WhisperContextParameters::default();
            params.use_gpu(use_gpu);
            if use_gpu && resolved_device >= 0 {
                params.gpu_device = resolved_device;
                eprintln!("DEBUG: Whisper auto-selected GPU device {}", resolved_device);
            }

            match WhisperContext::new_with_params(&model_path_str, params) {
                Ok(ctx) => Ok(ctx),
                Err(e) if use_gpu => {
                    eprintln!("WARNING: Whisper GPU load failed ({e}). Falling back to CPU...");
                    let mut cpu_params = WhisperContextParameters::default();
                    cpu_params.use_gpu(false);
                    WhisperContext::new_with_params(&model_path_str, cpu_params)
                        .map_err(|e2| format!("CPU fallback also failed: {e2}"))
                }
                Err(e) => Err(e.to_string()),
            }
        })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| format!("Failed to load Whisper model: {}", e))?;

        let s = state.lock().map_err(|e| e.to_string())?;
        *s.current_whisper_model.lock().unwrap() = model_id_owned.clone();
        *s.whisper_ctx.lock().unwrap() = Some(ctx);
        Ok::<(), String>(())
    }.await;

    if let Ok(mut s) = state.lock() {
        s.whisper_starting = false;
    }

    res
}

/// Run transcription engine in-process on the resampled audio buffer
#[tauri::command]
async fn transcribe(
    app: AppHandle,
    state: State<'_, SharedState>,
    model_id: String,
    language: Option<String>,
    _context: Option<String>,
) -> Result<String, String> {
    let audio_16k = {
        let s = state.lock().map_err(|e| e.to_string())?;
        let res = s.resampled_audio.lock().unwrap().take();
        res
    };

    let audio_data = match audio_16k {
        Some(data) => data,
        None => return Err("No audio data available for transcription".into()),
    };

    ensure_whisper_loaded_internal(&app, state.inner(), &model_id).await?;

    let lang = language.unwrap_or_else(|| "auto".into());

    let state_clone = state.inner().clone();
    
    // Run inference in a blocking task
    let transcript = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let s = state_clone.lock().map_err(|e| e.to_string())?;
        let ctx_guard = s.whisper_ctx.lock().unwrap();
        let ctx = ctx_guard.as_ref().ok_or("WhisperContext is missing")?;
        
        let mut whisper_state = ctx.create_state().map_err(|e| e.to_string())?;
        
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        
        // Optimizations for CPU Inference Speed
        let cores = std::thread::available_parallelism().map(|p| p.get()).unwrap_or(4);
        let threads = (cores as i32 / 2).clamp(4, 8); // Use physical cores, cap at 8 for optimal transcription scaling
        params.set_n_threads(threads);

        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        
        // EXPLICITLY disable translation to prevent transcription engine from translating foreign languages to English natively
        params.set_translate(false);

        if lang != "auto" {
            params.set_language(Some(&lang));
        }

        whisper_state.full(params, &audio_data).map_err(|e| format!("Inference failed: {}", e))?;
        
        let mut result = String::new();
        let num_segments = whisper_state.full_n_segments();
        for i in 0..num_segments {
            if let Some(segment) = whisper_state.get_segment(i) {
                if let Ok(text) = segment.to_str() {
                    result.push_str(text);
                }
            }
        }
        
        Ok(result.trim().to_string())
    }).await.map_err(|e| e.to_string())??;

    app.emit("transcription-done", transcript.clone()).ok();
    Ok(transcript)
}



#[tauri::command]
async fn start_whisper_server(app: AppHandle, state: State<'_, SharedState>, model_id: String) -> Result<(), String> {
    ensure_whisper_loaded_internal(&app, state.inner(), &model_id).await
}

fn find_llama_server_binary(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().resource_dir().unwrap_or_default();
    
    let possible_names = if cfg!(windows) {
        vec!["llama-server-x86_64-pc-windows-msvc.exe", "llama-server.exe"]
    } else {
        vec!["llama-server-universal-apple-darwin", "llama-server"]
    };
    
    for name in possible_names {
        let path1 = base.join("bin").join(name);
        let path2 = base.join("resources").join("bin").join(name);
        let path3 = std::env::current_dir().unwrap_or_default().join("resources").join("bin").join(name);
        let path4 = std::env::current_dir().unwrap_or_default().join("src-tauri").join("resources").join("bin").join(name);
        
        if path1.exists() { return Ok(path1); }
        if path2.exists() { return Ok(path2); }
        if path3.exists() { return Ok(path3); }
        if path4.exists() { return Ok(path4); }
        
        if let Ok(p) = which::which(name) {
            return Ok(p);
        }
    }

    Err("llama-server binary not found. Please ensure it is bundled in resources/bin.".to_string())
}

async fn start_llama_server_internal(app: &AppHandle, state: &SharedState, model_id: &str) -> Result<(), String> {
    let bin = find_llama_server_binary(app)?;
    let model = model_path(app, model_id);
    if !model.exists() {
        return Err(format!("LLM model not found at {}", model.display()));
    }

    eprintln!("DEBUG: llama-server binary: {}", bin.display());
    eprintln!("DEBUG: llama-server model:  {}", model.display());

    // 1. Take the old child and kill it OUTSIDE the lock to avoid blocking other tasks.
    let old_child = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.llama_server_child.take()
    };

    if let Some(mut child) = old_child {
        eprintln!("DEBUG: Killing old llama-server process...");
        let _ = child.kill();
        // Wait for it to fully exit so GPU resources are released.
        let _ = tokio::task::spawn_blocking(move || child.wait()).await;
        // Small delay to let the GPU driver/OS recover and fully free VRAM/handles.
        tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
    }

    // 2. Re-acquire settings now that the old process is definitely gone.
    let (use_gpu, gpu_device) = {
        let s = state.lock().map_err(|e| e.to_string())?;
        (s.use_gpu, s.gpu_device)
    };

    let mut use_gpu_for_llama = use_gpu;
    let mut llama_device_count: usize = 0; // how many GPU devices llama-server itself sees
    if use_gpu {
        // Verify if the llama-server binary actually supports GPU offloading.
        // Since the old process is dead and we waited, this check is now reliable.
        let bin_clone = bin.clone();
        let output = tokio::task::spawn_blocking(move || {
            let mut cmd = std::process::Command::new(&bin_clone);
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x08000000);
            }
            cmd.arg("--list-devices").output()
        })
        .await
        .map_err(|e| e.to_string())?;

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let devices: Vec<&str> = stdout
                .lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty() && !l.starts_with("Available devices"))
                .collect();
            llama_device_count = devices.len();
            if devices.is_empty() {
                use_gpu_for_llama = false;
                eprintln!("WARNING: llama-server binary reports 0 GPU devices available (CPU only build?). Disabling GPU offload for llama-server.");
            }
        }
    }

    eprintln!("DEBUG: Starting llama-server (logs disabled)");

    let mut std_cmd = std::process::Command::new(&bin);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let cores = std::thread::available_parallelism().map(|p| p.get()).unwrap_or(4);
    let threads = (cores / 2).clamp(4, 8);

    std_cmd
        .arg("-m").arg(&model)
        .arg("--port").arg("42837")
        .arg("-c").arg("1024")
        .arg("-fa").arg("1")
        .arg("-ctk").arg("q8_0")
        .arg("-ctv").arg("q8_0")
        .arg("-t").arg(threads.to_string())
        .arg("-tb").arg(threads.to_string());

    if use_gpu_for_llama {
        // Offload all layers to GPU
        std_cmd.arg("-ngl").arg("99");

        // Determine the concrete device to target.
        // When auto (-1), actively pick the most powerful GPU so we don't
        // accidentally land on an integrated GPU (usually device 0 on hybrid systems).
        //
        // IMPORTANT: WMI (Win32_VideoController) indices ≠ CUDA/Vulkan device indices.
        // On a hybrid Intel iGPU + NVIDIA system:
        //   WMI sees:  [0: Intel UHD, 1: NVIDIA RTX]
        //   CUDA sees: [0: NVIDIA RTX]  (Intel has no CUDA driver — invisible to llama)
        //
        // So we ONLY pass -mg N if llama-server itself reports more than 1 device
        // (meaning there are multiple CUDA/Vulkan-visible GPUs and our index is meaningful).
        // If llama sees only 1 device, it is always CUDA index 0 regardless of WMI index.
        let effective_device: i32 = if gpu_device < 0 {
            tokio::task::spawn_blocking(move || {
                let wmi_devices = get_gpu_devices_cached(); // instant after first call

                // Only apply -mg if BOTH conditions are true:
                // 1. WMI sees multiple GPUs (so there is something to pick between)
                // 2. llama-server itself sees multiple GPU devices (so our index is valid)
                if wmi_devices.len() <= 1 || llama_device_count <= 1 {
                    // Single-GPU or hybrid where llama only sees one CUDA device.
                    // Device 0 is the only valid index — no flag needed.
                    return 0;
                }

                let best = pick_best_gpu_device(wmi_devices).unwrap_or(0);
                if best != 0 {
                    eprintln!("DEBUG: llama-server auto-selected GPU device {} ({})",
                        best,
                        wmi_devices.iter().find(|d| d.index == best).map(|d| d.name.as_str()).unwrap_or("?"));
                }
                best
            })
            .await
            .unwrap_or(0)
        } else {
            gpu_device
        };

        // Tell llama-server which device to use
        if effective_device >= 0 {
            #[cfg(target_os = "macos")]
            std_cmd.arg("--device").arg("metal"); // Metal ignores -mg, but can take --device
            #[cfg(not(target_os = "macos"))]
            {
                // NOTE: do NOT pass --split-mode none here.
                // When combined with -mg N, split-mode none restricts the eligible
                // device pool to 1 GPU — making -mg N an out-of-range index and
                // causing "invalid value for main_gpu: N (available devices: 1)".
                // Just -mg N is sufficient to direct llama-server to the preferred GPU.
                if effective_device > 0 {
                    std_cmd.arg("-mg").arg(effective_device.to_string());
                }
                // device 0 is the default — no flag needed, avoids any -mg index issues
            }
        }
    }

    let child = std_cmd
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn llama-server: {}", e))?;

    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.llama_server_child = Some(child);
    s.last_activity = std::time::Instant::now();
    Ok(())
}

#[tauri::command]
async fn start_llama_server(app: AppHandle, state: State<'_, SharedState>, model_id: String) -> Result<(), String> {
    let need_start = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        if s.llama_server_starting {
            false
        } else {
            let is_dead = match &mut s.llama_server_child {
                Some(child) => match child.try_wait() {
                    Ok(Some(_)) => true,
                    Ok(None) => false,
                    Err(_) => true,
                },
                None => true,
            };
            if is_dead {
                s.llama_server_child = None;
                s.llama_server_starting = true;
                true
            } else {
                false
            }
        }
    };

    if need_start {
        let result = start_llama_server_internal(&app, &*state, &model_id).await;
        if let Ok(mut s) = state.lock() {
            s.llama_server_starting = false;
        }
        result?;
    }
    Ok(())
}

#[tauri::command]
async fn format_text(
    app: AppHandle,
    state: State<'_, SharedState>,
    text: String,
    model_id: String,
    context: Option<String>,
    translate_to: Option<String>,
    correction_mode: Option<String>,
) -> Result<String, String> {
    let c_mode = correction_mode.unwrap_or_else(|| "clean".to_string());
    
    // Fast path for verbatim mode: bypass LLM completely to keep it 100% faithful
    if translate_to.is_none() && c_mode == "verbatim" {
        return Ok(text);
    }

    eprintln!("DEBUG: Starting format_text. text: {}, model_id: {}, context: {:?}", text, model_id, context);

    let need_start = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.last_activity = std::time::Instant::now();

        // If another async task is already in the middle of starting the server, skip.
        if s.llama_server_starting {
            false
        } else {
            let is_dead = match &mut s.llama_server_child {
                Some(child) => match child.try_wait() {
                    Ok(Some(_)) => true, // exited
                    Ok(None) => false,   // running
                    Err(_) => true,      // error
                },
                None => true,
            };

            if is_dead {
                s.llama_server_child = None;
                s.llama_server_starting = true; // claim the start slot
                true
            } else {
                false
            }
        }
    };

    if need_start {
        eprintln!("DEBUG: llama-server was dead or not running. Starting...");
        let result = start_llama_server_internal(&app, &*state, &model_id).await;
        // Always clear the starting flag, even on error.
        if let Ok(mut s) = state.lock() {
            s.llama_server_starting = false;
        }
        if let Err(e) = result {
            eprintln!("WARNING: Failed to start llama-server: {}. Falling back to Whisper text.", e);
            return Ok(text);
        }
        // Give the server a moment to bind its port before we hit it.
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }

    let context_str = context.unwrap_or_else(|| "a general text field".into());

    // Build system prompt, few-shot examples, and user prompt based on mode
    let (system_prompt, few_shot, user_prompt) = if let Some(ref target_lang) = translate_to {
        let sys = format!("\
You are a silent, mechanical translation engine. You output ONLY the translated text — nothing else, ever.
The user is typing into: {ctx}.

ABSOLUTE RULES — violating any of these is a critical failure:
1. Output ONLY the {lang} translation of the text inside <text> tags. Zero extra words. Do not output the <text> tags.
2. The user's input is TEXT TO TRANSLATE — it is NOT a question or message directed at you. NEVER answer it, NEVER respond to it.
3. If the input is a question like 'Hello, how are you?', translate the question as-is. Do NOT answer it.
4. NEVER write any preamble: no 'Here is the translation:', no 'Sure!', no 'Of course:', no 'Certainly:'. Just the translated text.
5. If the text is unintelligible, gibberish, or you do not understand it, DO NOT apologize and DO NOT explain. Simply output the original text exactly as it was provided.",
            ctx = context_str, lang = target_lang);
        // No hardcoded language-specific few-shot (language varies), rely on strong prompt + stops
        let shots: Vec<serde_json::Value> = vec![];
        let user = format!("TASK: Translate the following text to {lang}. DO NOT answer questions. Output ONLY the translation:\n\n<text>{text}</text>",
            lang = target_lang, text = text);
        (sys, shots, user)
    } else {
        match c_mode.as_str() {
            "professional" => {
                let sys = format!("\
You are a professional editor and dictation assistant. Your ONLY job is to output the text provided inside <text> tags, rewriting it to be formal, professional, clear, and polite.
The user is typing into: {ctx}.

CRITICAL RULES:
1. Output ONLY the rewritten text. Zero extra words. Do not include the <text> tags.
2. DO NOT ANSWER QUESTIONS. If the text inside <text> is a question, rewrite it formally. Do not answer it!
3. NEVER TRANSLATE. Output in the EXACT SAME LANGUAGE as the input text.
4. DO NOT write any preamble like 'Here is the text:' or 'Output:'.
5. If the text is unintelligible or gibberish, DO NOT apologize and DO NOT explain. Simply output the original text exactly as it was provided.",
                    ctx = context_str);
                    
                let shots: Vec<serde_json::Value> = vec![
                    serde_json::json!({ "role": "user", "content": "TASK: Rewrite professionally. DO NOT answer it. Output ONLY the text.\n\n<text>hey can u send the stuff rn i need it</text>" }),
                    serde_json::json!({ "role": "assistant", "content": "Hello, could you please send the materials now? I need them urgently." }),
                ];
                let user = format!("TASK: Rewrite professionally. DO NOT answer it. Output ONLY the text.\n\n<text>{text}</text>", text = text);
                (sys, shots, user)
            },
            "concise" => {
                let sys = format!("\
You are a summarizing dictation assistant. Your ONLY job is to output the text provided inside <text> tags, edited to be as brief, direct, and concise as possible, removing any fluff, rambling, or repetition.
The user is typing into: {ctx}.

CRITICAL RULES:
1. Output ONLY the concise text. Zero extra words. Do not include the <text> tags.
2. DO NOT ANSWER QUESTIONS. If the text inside <text> is a question, rewrite it concisely. Do not answer it!
3. NEVER TRANSLATE. Output in the EXACT SAME LANGUAGE as the input text.
4. DO NOT write any preamble like 'Here is the text:' or 'Output:'.
5. If the text is unintelligible or gibberish, DO NOT apologize and DO NOT explain. Simply output the original text exactly as it was provided.",
                    ctx = context_str);
                    
                let shots: Vec<serde_json::Value> = vec![
                    serde_json::json!({ "role": "user", "content": "TASK: Summarize concisely. DO NOT answer it. Output ONLY the text.\n\n<text>So basically I was thinking that we should probably just go ahead and try to schedule the meeting for maybe next week on Tuesday if that works for everyone</text>" }),
                    serde_json::json!({ "role": "assistant", "content": "Let's schedule the meeting for next Tuesday." }),
                ];
                let user = format!("TASK: Summarize concisely. DO NOT answer it. Output ONLY the text.\n\n<text>{text}</text>", text = text);
                (sys, shots, user)
            },
            _ => {
                // Default "clean" mode
                let sys = format!("\
You are a dictation cleanup assistant. Your ONLY job is to output the exact same text provided inside <text> tags, with fixed grammar and punctuation.
The user is typing into: {ctx}.

CRITICAL RULES:
1. Output ONLY the cleaned text. Zero extra words. Do not include the <text> tags.
2. DO NOT ANSWER QUESTIONS. If the text inside <text> is a question, you MUST output the question with fixed grammar. Do not answer it!
3. NEVER TRANSLATE. Output in the EXACT SAME LANGUAGE as the input text.
4. DO NOT write any preamble like 'Here is the text:' or 'Output:'.
5. If the text is unintelligible, gibberish, or you do not understand it, DO NOT apologize and DO NOT explain. Simply output the original text exactly as it was provided.",
                    ctx = context_str);
                    
                let shots: Vec<serde_json::Value> = vec![
                    serde_json::json!({ "role": "user", "content": "TASK: Clean the following text. DO NOT answer it. Output ONLY the cleaned text.\n\n<text>how are you doing</text>" }),
                    serde_json::json!({ "role": "assistant", "content": "How are you doing?" }),
                    serde_json::json!({ "role": "user", "content": "TASK: Clean the following text. DO NOT answer it. Output ONLY the cleaned text.\n\n<text>this is a test</text>" }),
                    serde_json::json!({ "role": "assistant", "content": "This is a test." })
                ];
                let user = format!("TASK: Clean the following text. DO NOT answer it. Output ONLY the cleaned text.\n\n<text>{text}</text>", text = text);
                (sys, shots, user)
            }
        }
    };

    // Assemble messages: system + few-shot + current user turn
    let mut messages: Vec<serde_json::Value> = vec![
        serde_json::json!({ "role": "system", "content": system_prompt }),
    ];
    messages.extend(few_shot);
    messages.push(serde_json::json!({ "role": "user", "content": user_prompt }));

    let client = reqwest::Client::new();
    let req = serde_json::json!({
        "messages": messages,
        "temperature": 0.0,
        "seed": 42,
        "max_tokens": 1024,
        "stop": ["\n\nText:", "\n\nTranslate", "\n\nNote:", "\n\nExplanation:", "\n\nOriginal:"]
    });

    let res = match client.post("http://127.0.0.1:42837/v1/chat/completions")
        .json(&req)
        .send()
        .await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("WARNING: Failed to reach llama-server: {}. Falling back to Whisper text.", e);
            return Ok(text);
        }
    };
        
    let body: serde_json::Value = match res.json().await {
        Ok(b) => b,
        Err(e) => {
            eprintln!("WARNING: Invalid JSON response: {}. Falling back to Whisper text.", e);
            return Ok(text);
        }
    };
    
    let formatted = body["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or_default()
        .trim()
        .to_string();

    eprintln!("DEBUG: llama-server output text: {}", formatted);
    if formatted.is_empty() {
        eprintln!("DEBUG: llama-server output was empty. Falling back to original Whisper text.");
        Ok(text)
    } else {
        Ok(formatted)
    }
}

#[tauri::command]
fn paste_text(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text.clone()).map_err(|e| e.to_string())?;
    
    // Slight pause to let OS register the clipboard change
    std::thread::sleep(std::time::Duration::from_millis(150));
    
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    
    // Explicitly release common modifier keys to prevent the user's physical hotkey from interfering
    enigo.key(Key::Control, Release).ok();
    enigo.key(Key::Shift, Release).ok();
    enigo.key(Key::Alt, Release).ok();
    enigo.key(Key::Meta, Release).ok();
    
    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), Press).map_err(|e| e.to_string())?;
        enigo.key(Key::Unicode('v'), Release).map_err(|e| e.to_string())?;
        enigo.key(Key::Meta, Release).map_err(|e| e.to_string())?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Press).map_err(|e| e.to_string())?;
        enigo.key(Key::V, Press).map_err(|e| e.to_string())?;
        enigo.key(Key::V, Release).map_err(|e| e.to_string())?;
        enigo.key(Key::Control, Release).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
fn check_monitor_changed(app: AppHandle) -> bool {
    if let Some(widget_window) = app.get_webview_window("widget") {
        if let Ok(active_win) = active_win_pos_rs::get_active_window() {
            let cx = active_win.position.x as i32 + (active_win.position.width as i32 / 2);
            let cy = active_win.position.y as i32 + (active_win.position.height as i32 / 2);
            
            if let Ok(monitors) = widget_window.available_monitors() {
                for m in monitors {
                    let pos = m.position();
                    let size = m.size();
                    if cx >= pos.x && cx <= pos.x + size.width as i32 &&
                       cy >= pos.y && cy <= pos.y + size.height as i32 {
                        // Check if this monitor is different from the widget's current monitor
                        if let Ok(Some(current_m)) = widget_window.current_monitor() {
                            return m.name() != current_m.name() || m.position() != current_m.position();
                        }
                        return true; // We found the monitor, but couldn't get current, assume changed
                    }
                }
            }
        }
    }
    false
}

#[tauri::command]
fn move_widget_to_active_monitor(app: AppHandle) -> Result<(), String> {
    if let Some(widget_window) = app.get_webview_window("widget") {
        let _ = widget_window.set_always_on_top(true);
        
        let mut target_monitor = widget_window.current_monitor().unwrap_or_default()
            .or_else(|| widget_window.primary_monitor().unwrap_or_default());
        
        if let Ok(active_win) = active_win_pos_rs::get_active_window() {
            let cx = active_win.position.x as i32 + (active_win.position.width as i32 / 2);
            let cy = active_win.position.y as i32 + (active_win.position.height as i32 / 2);
            
            if let Ok(monitors) = widget_window.available_monitors() {
                for m in monitors {
                    let pos = m.position();
                    let size = m.size();
                    if cx >= pos.x && cx <= pos.x + size.width as i32 &&
                       cy >= pos.y && cy <= pos.y + size.height as i32 {
                        target_monitor = Some(m.clone());
                        break;
                    }
                }
            }
        }
        
        if let Some(monitor) = target_monitor {
            let work_area = monitor.work_area();
            let x = work_area.position.x;
            let y = work_area.position.y;
            let w = work_area.size.width;
            let h = work_area.size.height;
            
            let current_pos = widget_window.outer_position().unwrap_or_default();
            let current_size = widget_window.outer_size().unwrap_or_default();
            
            if current_pos.x != x || current_pos.y != y || current_size.width != w || current_size.height != h {
                let _ = widget_window.set_size(tauri::PhysicalSize::new(w, h));
                let _ = widget_window.set_position(tauri::PhysicalPosition::new(x, y));
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn update_interactive_regions(regions: Vec<Region>, state: State<'_, SharedState>) {
    if let Ok(mut s) = state.lock() {
        s.interactive_regions = regions;
    }
}

fn start_hit_test_loop(window: tauri::WebviewWindow, state: SharedState) {
    std::thread::spawn(move || {
        let mut last_is_over_any = None;
        
        loop {
            let (cursor_x, cursor_y) = match window.cursor_position() {
                Ok(pos) => (pos.x as f64, pos.y as f64),
                Err(_) => {
                    std::thread::sleep(std::time::Duration::from_millis(16));
                    continue;
                }
            };
            
            let mut is_over_any = false;
            let mut is_over_interactive = false;
            let mut currently_ignoring = false;
            let mut regions = Vec::new();

            if let Ok(s) = state.lock() {
                regions = s.interactive_regions.clone();
                currently_ignoring = s.is_ignoring_cursor;
            }

            let current_mon = window.current_monitor().unwrap_or(None).or_else(|| window.primary_monitor().unwrap_or(None));
            if let Some(monitor) = current_mon {
                let pos = monitor.work_area().position;
                let scale = monitor.scale_factor();
                
                let log_cursor_x = cursor_x / scale;
                let log_cursor_y = cursor_y / scale;

                let log_pos_x = pos.x as f64 / scale;
                let log_pos_y = pos.y as f64 / scale;
                
                let rel_x = log_cursor_x - log_pos_x;
                let rel_y = log_cursor_y - log_pos_y;

                for r in regions.iter() {
                    if rel_x >= r.x && rel_x <= r.x + r.width && 
                       rel_y >= r.y && rel_y <= r.y + r.height {
                        is_over_any = true;
                        if r.interactive {
                            is_over_interactive = true;
                        }
                    }
                }
            }

            // Only inform the frontend if the hover state actually changed!
            if last_is_over_any != Some(is_over_any) {
                let _ = window.emit("global-hover", is_over_any);
                last_is_over_any = Some(is_over_any);
            }

            if is_over_interactive && currently_ignoring {
                let _ = window.set_ignore_cursor_events(false);
                if let Ok(mut s) = state.lock() {
                    s.is_ignoring_cursor = false;
                }
            } else if !is_over_interactive && !currently_ignoring {
                let _ = window.set_ignore_cursor_events(true);
                if let Ok(mut s) = state.lock() {
                    s.is_ignoring_cursor = true;
                }
            }

            std::thread::sleep(std::time::Duration::from_millis(16)); // ~60hz
        }
    });
}

/// No longer resizes the physical window to prevent "teleporting".
/// The window is now a fixed small size that doesn't block "a big distance".
#[tauri::command]
fn set_widget_expanded(app: AppHandle, _expanded: bool, _scale: f64) -> Result<(), String> {
    // Just ensure it's still positioned correctly
    move_widget_to_active_monitor(app)
}

/// No longer resizes the window, just ensures it's positioned correctly.
/// The actual scaling is now handled smoothly in the frontend with Framer Motion.
#[tauri::command]
fn set_widget_scale(app: AppHandle, _scale: f64) -> Result<(), String> {
    // We can't know the expansion state here easily, so we assume current state
    // but usually this is called when scale changes in settings.
    move_widget_to_active_monitor(app)
}

#[tauri::command]
fn set_widget_visibility(app: AppHandle, visible: bool) {
    if let Some(widget_window) = app.get_webview_window("widget") {
        if visible {
            let _ = widget_window.show();
        } else {
            let _ = widget_window.hide();
        }
    }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

#[tauri::command]
fn get_active_window_context() -> Result<String, String> {
    match get_active_window() {
        Ok(window) => {
            let app_name = window.app_name;
            let title = window.title;
            if app_name.is_empty() {
                Ok(title)
            } else if title.is_empty() {
                Ok(app_name)
            } else {
                Ok(format!("{} - {}", app_name, title))
            }
        }
        Err(e) => Err(format!("Failed to get active window: {:?}", e)),
    }
}

#[tauri::command]
fn get_audio_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let mut devices_list = Vec::new();
    
    if let Ok(devices) = host.input_devices() {
        for d in devices {
            if let Ok(name) = d.name() {
                devices_list.push(name);
            }
        }
    }
    
    // De-duplicate in case of multiple channels reported as separate endpoints
    devices_list.sort();
    devices_list.dedup();
    
    Ok(devices_list)
}

#[tauri::command]
fn register_hotkeys(app: AppHandle, state: State<'_, SharedState>, dictate: String, ptt: String, translate: String, magic: String) -> Result<(), String> {
    let manager = app.global_shortcut();
    let _ = manager.unregister_all();
    
    let mut st = state.lock().unwrap();
    st.dictate_hotkey_id = None;
    st.ptt_hotkey_id = None;
    st.translate_hotkey_id = None;
    st.magic_hotkey_id = None;
    
    if let Ok(shortcut) = Shortcut::from_str(&dictate) {
        if manager.register(shortcut).is_ok() {
            st.dictate_hotkey_id = Some(shortcut.id());
        }
    }
    if let Ok(shortcut) = Shortcut::from_str(&ptt) {
        if manager.register(shortcut).is_ok() {
            st.ptt_hotkey_id = Some(shortcut.id());
        }
    }
    if let Ok(shortcut) = Shortcut::from_str(&translate) {
        if manager.register(shortcut).is_ok() {
            st.translate_hotkey_id = Some(shortcut.id());
        }
    }
    if let Ok(shortcut) = Shortcut::from_str(&magic) {
        if manager.register(shortcut).is_ok() {
            st.magic_hotkey_id = Some(shortcut.id());
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn magic_improve_text(app: AppHandle, state: State<'_, SharedState>, model_id: String) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    // Give the user a brief moment to release the hotkey
    tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;

    // Explicitly release common modifier keys to prevent the user's physical hotkey from interfering
    enigo.key(Key::Control, Release).ok();
    enigo.key(Key::Shift, Release).ok();
    enigo.key(Key::Alt, Release).ok();
    enigo.key(Key::Meta, Release).ok();

    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    // Clear clipboard so we can detect if nothing was copied
    let _ = clipboard.set_text("".to_string());

    // Step 1: Try to copy the currently selected text (Ctrl+C)
    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Press).ok();
        enigo.key(Key::Unicode('c'), Press).ok();
        enigo.key(Key::Unicode('c'), Release).ok();
        enigo.key(Key::Meta, Release).ok();
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Press).ok();
        enigo.key(Key::C, Press).ok();
        enigo.key(Key::C, Release).ok();
        enigo.key(Key::Control, Release).ok();
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let mut text = clipboard.get_text().unwrap_or_default();

    // If nothing was selected/copied, select everything (Ctrl+A / Cmd+A) and copy again
    if text.trim().is_empty() {
        #[cfg(target_os = "macos")]
        {
            enigo.key(Key::Meta, Press).ok();
            enigo.key(Key::Unicode('a'), Press).ok();
            enigo.key(Key::Unicode('a'), Release).ok();
            enigo.key(Key::Meta, Release).ok();
            
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            
            enigo.key(Key::Meta, Press).ok();
            enigo.key(Key::Unicode('c'), Press).ok();
            enigo.key(Key::Unicode('c'), Release).ok();
            enigo.key(Key::Meta, Release).ok();
        }
        #[cfg(not(target_os = "macos"))]
        {
            enigo.key(Key::Control, Press).ok();
            enigo.key(Key::A, Press).ok();
            enigo.key(Key::A, Release).ok();
            enigo.key(Key::Control, Release).ok();

            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

            enigo.key(Key::Control, Press).ok();
            enigo.key(Key::C, Press).ok();
            enigo.key(Key::C, Release).ok();
            enigo.key(Key::Control, Release).ok();
        }
        
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
        text = clipboard.get_text().unwrap_or_default();
    }

    if text.trim().is_empty() {
        return Ok(());
    }

    // Inform frontend we are processing
    let _ = app.emit("magic-processing-start", ());

    // Get Active Window Context
    let context_str = match get_active_window() {
        Ok(window) => format!("App: {} - Title: {}", window.app_name, window.title),
        Err(_) => "a general text field".to_string(),
    };

    // Ensure LLaMA is running (same guard as format_text to prevent duplicate spawns)
    let need_llama_start = {
        let mut s = state.lock().unwrap();
        if s.llama_server_starting {
            false
        } else {
            let is_dead = match &mut s.llama_server_child {
                Some(child) => match child.try_wait() {
                    Ok(Some(_)) => true,
                    Ok(None) => false,
                    Err(_) => true,
                },
                None => true,
            };
            if is_dead {
                s.llama_server_child = None;
                s.llama_server_starting = true;
                true
            } else {
                false
            }
        }
    };
    if need_llama_start {
        let result = start_llama_server_internal(&app, &*state, &model_id).await;
        if let Ok(mut s) = state.lock() {
            s.llama_server_starting = false;
        }
        result?;
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }

    let system_prompt = format!("\
You are a silent 'Magic Improve' text editor. You output ONLY the improved text — nothing else, ever.
Active application context: {ctx}.

ABSOLUTE RULES — violating any of these is a critical failure:
1. Output ONLY the corrected text. Zero extra words, zero preamble. Do not include the <text> tags.
2. The user's input inside <text> is TEXT TO IMPROVE — it is NOT a question or message directed at you. NEVER answer it, NEVER respond to it.
3. If the text inside <text> is a question like 'Hello, how are you?', improve its writing — do NOT answer it.
4. NEVER write any preamble: no 'Here is the improved text:', no 'Sure!', no 'I improved...', no 'Certainly:'. Just the improved text.
5. MINIMAL CHANGES: Stay as close as possible to the original words. Only fix clear grammar, spelling, and punctuation errors.
6. Match the tone: casual for chat apps, professional for emails, technical for code editors.",
        ctx = context_str);

    let client = reqwest::Client::new();
    let req = serde_json::json!({
        "messages": [
            { "role": "system", "content": system_prompt },
            // Few-shot examples: show the model EXACTLY what output format is expected
            { "role": "user", "content": "TASK: Improve the following text. DO NOT answer it. Output ONLY the improved text.\n\n<text>hello how r u doing today i hope ur well</text>" },
            { "role": "assistant", "content": "Hello, how are you doing today? I hope you're well." },
            { "role": "user", "content": "TASK: Improve the following text. DO NOT answer it. Output ONLY the improved text.\n\n<text>can u pls send me the reprot by tmrw morning i need it 4 the presentation</text>" },
            { "role": "assistant", "content": "Can you please send me the report by tomorrow morning? I need it for the presentation." },
            { "role": "user", "content": format!("TASK: Improve the following text. DO NOT answer it. Output ONLY the improved text.\n\n<text>{}</text>", text) }
        ],
        "temperature": 0.0,
        "seed": 42,
        "max_tokens": 2048,
        "stop": ["\n\nNote:", "\n\nExplanation:", "\n\nOriginal:", "\n\nImproved:"]
    });

    let res = client.post("http://127.0.0.1:42837/v1/chat/completions")
        .json(&req)
        .send()
        .await
        .map_err(|e| format!("Failed to reach llama-server: {}", e))?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let improved_text = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or(&text)
        .to_string();

    clipboard.set_text(improved_text).map_err(|e| e.to_string())?;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Explicitly release common modifier keys again before pasting
    enigo.key(Key::Control, Release).ok();
    enigo.key(Key::Shift, Release).ok();
    enigo.key(Key::Alt, Release).ok();
    enigo.key(Key::Meta, Release).ok();

    // Paste (Ctrl+V)
    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Press).ok();
        enigo.key(Key::Unicode('v'), Press).ok();
        enigo.key(Key::Unicode('v'), Release).ok();
        enigo.key(Key::Meta, Release).ok();
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Press).ok();
        enigo.key(Key::V, Press).ok();
        enigo.key(Key::V, Release).ok();
        enigo.key(Key::Control, Release).ok();
    }

    let _ = app.emit("magic-processing-end", ());

    Ok(())
}

// ─── GPU device detection & settings commands ────────────────────────────────

/// A GPU device visible to the system, returned by `list_gpu_devices`.
#[derive(serde::Serialize, Clone)]
pub struct GpuDevice {
    pub index: i32,
    pub name: String,
}

/// Blocking (synchronous) GPU enumeration — safe to call from within
/// `tokio::task::spawn_blocking` or any normal synchronous context.
fn list_gpu_devices_sync() -> Vec<GpuDevice> {
    let mut devices: Vec<GpuDevice> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let output = std::process::Command::new("powershell")
            .args([
                "-NoProfile", "-NonInteractive", "-Command",
                "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name",
            ])
            .creation_flags(0x08000000)
            .output();
        if let Ok(out) = output {
            if let Ok(text) = String::from_utf8(out.stdout) {
                let mut idx = 0i32;
                for line in text.lines() {
                    let name = line.trim();
                    if !name.is_empty() {
                        devices.push(GpuDevice { index: idx, name: name.to_string() });
                        idx += 1;
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("system_profiler")
            .args(["SPDisplaysDataType", "-json"])
            .output();
        if let Ok(out) = output {
            if let Ok(text) = String::from_utf8(out.stdout) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(arr) = json["SPDisplaysDataType"].as_array() {
                        for (i, item) in arr.iter().enumerate() {
                            let name = item["sppci_model"]
                                .as_str()
                                .unwrap_or("Unknown GPU")
                                .to_string();
                            devices.push(GpuDevice { index: i as i32, name });
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("lspci").args(["-mm"]).output();
        if let Ok(out) = output {
            if let Ok(text) = String::from_utf8(out.stdout) {
                let mut idx = 0i32;
                for line in text.lines() {
                    let lower = line.to_lowercase();
                    if lower.contains("vga") || lower.contains("3d controller") || lower.contains("display controller") {
                        let parts: Vec<&str> = line.split('"').collect();
                        let name = if parts.len() >= 6 {
                            format!("{} {}", parts[3].trim(), parts[5].trim())
                        } else {
                            "Unknown GPU".to_string()
                        };
                        devices.push(GpuDevice { index: idx, name });
                        idx += 1;
                    }
                }
            }
        }
    }

    if devices.is_empty() {
        devices.push(GpuDevice { index: 0, name: "Default GPU".to_string() });
    }
    devices
}

/// Process-lifetime cache for the GPU device list.
/// Populated on first access (either from the Settings UI or from a model load).
/// Every call after the first is a free clone — no OS tool is invoked again.
static GPU_DEVICE_CACHE: std::sync::OnceLock<Vec<GpuDevice>> = std::sync::OnceLock::new();

/// Returns a reference to the cached GPU list, running detection exactly once.
/// Safe to call from any thread (OnceLock guarantees single initialization).
fn get_gpu_devices_cached() -> &'static Vec<GpuDevice> {
    GPU_DEVICE_CACHE.get_or_init(list_gpu_devices_sync)
}

/// Enumerate GPU devices available on this machine.
/// Runs OS-native tooling in a background thread so the UI never freezes.
/// Returned indices match what Vulkan/Metal exposes to whisper.cpp and llama.cpp.
#[tauri::command]
async fn list_gpu_devices() -> Vec<GpuDevice> {
    // Warm the cache (if not already) and return a clone.
    // After the first call the OS tool is never invoked again.
    tokio::task::spawn_blocking(|| get_gpu_devices_cached().clone())
        .await
        .unwrap_or_default()
}

/// Score a GPU name so we can pick the most powerful one in auto-detect mode.
/// Higher score = more powerful / preferred for AI inference.
/// Heuristic tiers (rough):
///   NVIDIA dedicated  → 1000 + model number hint
///   AMD  dedicated    →  700 + model number hint
///   Intel Arc         →  400
///   Intel Iris / UHD  →  100  (integrated)
///   Unknown           →    0
fn gpu_power_score(name: &str) -> i32 {
    let n = name.to_lowercase();

    // ── NVIDIA ──────────────────────────────────────────────────────────────
    if n.contains("nvidia") || n.contains("geforce") || n.contains("quadro") || n.contains("tesla") || n.contains("rtx") || n.contains("gtx") {
        let mut score = 1000i32;
        // Prefer higher-tier suffixes
        if n.contains("rtx") { score += 50; }
        // Add rough model-number hint (e.g. "4090" > "3080" > "1060")
        let digits: String = n.chars().filter(|c| c.is_ascii_digit()).collect();
        if let Ok(num) = digits.parse::<i32>() {
            score += (num / 10).min(500); // cap contribution
        }
        return score;
    }

    // ── AMD / Radeon ─────────────────────────────────────────────────────────
    if n.contains("amd") || n.contains("radeon") || n.contains("rx ") {
        let mut score = 700i32;
        let digits: String = n.chars().filter(|c| c.is_ascii_digit()).collect();
        if let Ok(num) = digits.parse::<i32>() {
            score += (num / 10).min(400);
        }
        return score;
    }

    // ── Intel Arc (discrete) ─────────────────────────────────────────────────
    if n.contains("intel arc") || n.contains("arc a") {
        return 400;
    }

    // ── Intel integrated (Iris / UHD / HD Graphics) ──────────────────────────
    if n.contains("intel") {
        return 100;
    }

    // ── Apple Silicon / Metal (always the only option on macOS) ─────────────
    if n.contains("apple") {
        return 900;
    }

    0 // unknown
}

/// When the user has selected Auto (gpu_device == -1) and more than one GPU is
/// present, return the index of the most powerful one instead of blindly using
/// device 0 (which is frequently the integrated GPU on hybrid systems).
///
/// Returns `None` if the list is empty (caller should fall back to library default).
fn pick_best_gpu_device(devices: &[GpuDevice]) -> Option<i32> {
    devices
        .iter()
        .max_by_key(|d| gpu_power_score(&d.name))
        .map(|d| d.index)
}

/// Apply GPU settings at runtime.
/// Only resets cached services when the settings actually changed from what's
/// already stored — safe to call on startup without causing side-effects.
#[tauri::command]
async fn set_use_gpu(
    state: State<'_, SharedState>,
    use_gpu: bool,
    gpu_device: i32,
) -> Result<(), String> {
    // Take the old llama-server child OUT of the lock before killing it.
    // Calling child.wait() inside a Mutex hold blocks the async runtime and
    // can deadlock if another command is also waiting on the lock.
    let old_child = {
        let mut s = state.lock().map_err(|e| e.to_string())?;

        // Safety guard: don't tear down services mid-recording.
        if s.recording {
            return Err("Cannot change GPU settings while recording is active".into());
        }

        let changed = s.use_gpu != use_gpu || s.gpu_device != gpu_device;
        if !changed {
            return Ok(());
        }

        s.use_gpu = use_gpu;
        s.gpu_device = gpu_device;

        // Mark transcription engine for reload on next transcription.
        *s.current_whisper_model.lock().unwrap() = String::new();
        *s.whisper_ctx.lock().unwrap() = None;

        eprintln!("DEBUG: GPU settings changed — use_gpu={}, device={}", use_gpu, gpu_device);

        // Take the child handle so we can kill it outside the lock.
        s.llama_server_child.take()
    }; // ← state lock released here

    // Kill and reap the old llama-server process outside the lock.
    if let Some(mut child) = old_child {
        let _ = child.kill();
        // Wait in a blocking thread so the async runtime isn't stalled.
        tokio::task::spawn_blocking(move || { let _ = child.wait(); });
    }

    Ok(())
}

#[tauri::command]
async fn get_keyboard_language() -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let output = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                r#"
                $code = @"
                using System;
                using System.Runtime.InteropServices;
                public class Keyboard {
                    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, IntPtr proccess);
                    [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint thread);
                }
"@
                Add-Type -TypeDefinition $code
                $hwnd = [Keyboard]::GetForegroundWindow()
                $threadId = [Keyboard]::GetWindowThreadProcessId($hwnd, [IntPtr]::Zero)
                $klid = [Keyboard]::GetKeyboardLayout($threadId)
                $langId = $klid.ToInt32() -band 0xFFFF
                if ($langId -ne 0) { (New-Object System.Globalization.CultureInfo($langId)).TwoLetterISOLanguageName } else { "en" }
                "#,
            ])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("PowerShell error: {}", e))?;
            
        let lang = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !lang.is_empty() {
            return Ok(lang);
        }
        return Ok("en".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("defaults")
            .args(["read", "com.apple.HIToolbox.plist", "AppleSelectedInputSources"])
            .output()
            .map_err(|e| format!("Defaults error: {}", e))?;
            
        let out_str = String::from_utf8_lossy(&output.stdout);
        for line in out_str.lines() {
            if line.contains("InputSourceLanguage") {
                if let Some(val) = line.split('=').nth(1) {
                    let lang = val.trim().trim_matches(|c| c == ';' || c == '"').to_string();
                    if lang.len() >= 2 {
                        return Ok(lang[0..2].to_string());
                    }
                }
            }
        }
        return Ok("en".to_string());
    }
    
    #[cfg(not(any(windows, target_os = "macos")))]
    {
        Ok("en".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
        Manager,
    };

    let state: SharedState = Arc::new(Mutex::new(AppState::default()));

    // Kill any orphaned llama-server processes left over from a previous run
    // (e.g. after a tauri dev hot-reload the parent dies but children survive).
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "llama-server.exe"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "llama-server-x86_64-pc-windows-msvc.exe"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();
        eprintln!("DEBUG: Cleaned up any orphaned llama-server processes on startup.");
    }
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("pkill").arg("-f").arg("llama-server").output();
        eprintln!("DEBUG: Cleaned up any orphaned llama-server processes on startup.");
    }



    tauri::Builder::default()
        .setup(|app| {
            let is_silent = std::env::args().any(|arg| arg == "--silent");
            if !is_silent {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            }

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            
            let quit_i = MenuItem::with_id(app, "quit", "Quit Draftmic", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Dashboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        // Take the child handle OUT of the lock before killing it.
                        // child.wait() is blocking — holding the Mutex on macOS main thread
                        // would freeze the UI. Consistent with set_use_gpu / start_llama_server_internal.
                        let old_child = {
                            let state = app.state::<SharedState>();
                            state.lock().ok().and_then(|mut s| s.llama_server_child.take())
                        };
                        if let Some(mut child) = old_child {
                            let _ = child.kill();
                            // Brief wait so llama-server releases GPU resources before process death.
                            std::thread::sleep(std::time::Duration::from_millis(200));
                        }
                        // Whisper context is in-process — freed automatically on exit.
                        //
                        // IMPORTANT: use std::process::exit instead of app.exit(0).
                        // app.exit(0) fires RunEvent::ExitRequested, which our run loop
                        // unconditionally cancels with prevent_exit() (needed to keep the
                        // app alive when the user closes the main window). std::process::exit
                        // bypasses Tauri's event system and kills the OS process directly.
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Initialize Static Overlay Hit-Testing for the widget window
            if let Some(widget_window) = app.get_webview_window("widget") {
                #[cfg(target_os = "macos")]
                {
                    use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
                    let ns_window = widget_window.ns_window().unwrap() as cocoa::base::id;
                    unsafe {
                        ns_window.setCollectionBehavior_(
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces |
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary |
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                        );
                    }
                }

                let state = app.state::<SharedState>().inner().clone();
                start_hit_test_loop(widget_window, state);
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "main" {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--silent"])))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    let action = {
                        let state_arc = app.state::<SharedState>().inner().clone();
                        let mut act = None;
                        if let Ok(s) = state_arc.lock() {
                            let id = shortcut.id();
                            if Some(id) == s.dictate_hotkey_id {
                                act = Some("dictate");
                            } else if Some(id) == s.ptt_hotkey_id {
                                act = Some("ptt");
                            } else if Some(id) == s.translate_hotkey_id {
                                act = Some("translate");
                            } else if Some(id) == s.magic_hotkey_id {
                                act = Some("magic");
                            }
                        }
                        match act {
                            Some(a) => a,
                            None => return,
                        }
                    };

                    if event.state == ShortcutState::Pressed {
                        let _ = app.emit("hotkey-pressed", action);
                    } else if event.state == ShortcutState::Released {
                        let _ = app.emit("hotkey-released", action);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_keyboard_language,
            check_model,
            download_model,
            get_audio_devices,
            start_recording,
            stop_recording,
            transcribe,
            format_text,
            paste_text,
            update_interactive_regions,
            check_monitor_changed,
            move_widget_to_active_monitor,
            set_widget_visibility,
            set_widget_scale,
            get_active_window_context,
            start_llama_server,
            start_whisper_server,
            register_hotkeys,
            magic_improve_text,
            list_gpu_devices,
            set_use_gpu,
            set_widget_expanded,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
}
