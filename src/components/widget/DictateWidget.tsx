import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Check, Globe, Wand2, Languages } from "lucide-react";
import { useAppStore, WHISPER_LANGUAGES, WidgetLoadingStyle } from "../../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

const playAudioCue = (type: "start" | "done") => {
  const state = useAppStore.getState();
  if (!state.soundEffects) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Master gain to prevent clipping
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);

    if (type === "start") {
      // Clean, crisp mid-range "tick" (like a crisp UI tap)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(masterGain);

      osc.type = "sine";

      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.02);

      // Envelope: extremely short for a clean tick
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);

    } else if (type === "done") {
      // Soft, clean mid-range "pop" for completion
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(masterGain);

      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.04);

      // Envelope: gentle pop
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch (e) {
    console.error("Audio cue failed", e);
  }
};

// ─── Loading indicator variants ───────────────────────────────────────────────
const LoadingIndicator: React.FC<{ style: WidgetLoadingStyle }> = ({ style }) => {
  if (style === "dots") {
    return (
      <div className="flex items-center gap-[5px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-[5px] h-[5px] bg-zinc-200 rounded-full"
            style={{
              animation: `hdDotBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (style === "pulse") {
    return (
      <div
        className="w-[18px] h-[18px] rounded-full bg-zinc-200"
        style={{ animation: "hdPulse 1.1s ease-in-out infinite" }}
      />
    );
  }

  if (style === "bars") {
    return (
      <div className="flex items-end gap-[3px]" style={{ height: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-[4px] bg-zinc-200 rounded-full"
            style={{
              height: 18,
              animation: `hdBar 0.9s ease-in-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (style === "orbit") {
    return (
      <div className="relative w-[20px] h-[20px]">
        {/* Stationary center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[5px] h-[5px] rounded-full bg-zinc-400" />
        </div>
        {/* Orbiting dot */}
        <div
          className="absolute inset-0"
          style={{ animation: "hdOrbitRing 1s linear infinite" }}
        >
          <div
            className="w-[6px] h-[6px] rounded-full bg-zinc-100 absolute"
            style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}
          />
        </div>
      </div>
    );
  }

  if (style === "ripple") {
    return (
      <div className="relative w-[24px] h-[24px] flex items-center justify-center">
        <div
          className="absolute w-[8px] h-[8px] rounded-full border border-zinc-300"
          style={{ animation: "hdRipple 1.4s ease-out infinite" }}
        />
        <div
          className="absolute w-[8px] h-[8px] rounded-full border border-zinc-300"
          style={{ animation: "hdRipple 1.4s ease-out 0.5s infinite" }}
        />
        <div className="w-[6px] h-[6px] rounded-full bg-zinc-200" />
      </div>
    );
  }

  if (style === "matrix") {
    // Clockwise sweep order around the 4×4 grid for the 16 dots.
    // Indices: row 0 → left to right, row 1 right col, row 2 right→left, row 3 bottom→left, then inner 2×2.
    // We pre-assign a "step" (0-15) to each cell so the animation sweeps
    // visually clockwise around the perimeter then fills the centre.
    const steps = [
      // row 0  (top, left→right)
      [0,  1,  2,  3],
      // row 1
      [11, 12, 13, 4],
      // row 2
      [10, 15, 14, 5],
      // row 3  (bottom, right→left)
      [9,  8,  7,  6],
    ];
    const period = 1.6; // seconds for one full sweep
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 3px)",
          gridTemplateRows: "repeat(4, 3px)",
          gap: "2px",
        }}
      >
        {steps.map((row, ri) =>
          row.map((step, ci) => (
            <div
              key={`${ri}-${ci}`}
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "rgb(228 228 231)", // zinc-200
                animation: `hdMatrixFade ${period}s ease-in-out ${((step / 16) * period).toFixed(3)}s infinite`,
              }}
            />
          ))
        )}
      </div>
    );
  }

  // default: "spinner"
  return (
    <div className="w-[18px] h-[18px] border-[2px] border-zinc-700/60 border-t-zinc-200 rounded-full animate-spin" />
  );
};


export interface DictateWidgetProps {
  inline?: boolean;
  onDictate?: () => void;
}

export const DictateWidget: React.FC<DictateWidgetProps> = ({ inline = false, onDictate }) => {
  const { recordingState, setRecordingState, dictateHotkey, selectedModel, selectedLlmModel, selectedMicrophone, addTranscription, widgetScale, widgetLoadingStyle } = useAppStore();
  const [amplitudes, setAmplitudes] = useState<number[]>(Array(10).fill(0));
  const pressTimeRef = useRef<number>(0);
  const isHeldRef = useRef<boolean>(false);
  const appContextRef = useRef<string | undefined>(undefined);
  const recordingStartTimeRef = useRef<number>(0);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const translationMode = useAppStore((s) => s.translationMode);
  const targetLanguage = useAppStore((s) => s.targetLanguage);
  const language = useAppStore((s) => s.language);
  const screen = useAppStore((s) => s.screen);
  const showIdleWidget = useAppStore((s) => s.showIdleWidget);

  // Auto-expand widget when recording starts, or when hovered, or when a menu is open
  const isExpanded = isHovered || recordingState !== "idle" || isDropdownOpen || isLangMenuOpen;

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Static Overlay Hit-Testing Logic
  const updateHitTestRegions = () => {
    if (inline) return;
    const nodes = document.querySelectorAll('.interactive-node, .detection-node');
    const regions = Array.from(nodes).map(node => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        interactive: node.classList.contains('interactive-node')
      };
    });
    invoke('update_interactive_regions', { regions }).catch(console.error);
  };

  useEffect(() => {
    if (inline) return;
    const observer = new ResizeObserver(() => updateHitTestRegions());
    observer.observe(document.body);

    // Listen for global hover events from Rust
    const unlistenHover = listen<boolean>("global-hover", (e) => {
      if (recordingState === "idle") {
        setIsHovered(e.payload);
      }
    });

    // Initial update
    updateHitTestRegions();
    return () => {
      observer.disconnect();
      unlistenHover.then(f => f());
    };
  }, [inline, recordingState]);

  // Update regions when state changes that might affect layout
  useEffect(() => {
    updateHitTestRegions();
  }, [isExpanded, isDropdownOpen, isLangMenuOpen, translationMode, widgetScale]);

  useEffect(() => {
    if (inline) return;

    // Position on mount
    invoke("move_widget_to_active_monitor").catch(console.error);

    // Periodically ensure widget follows the active monitor smoothly
    const interval = setInterval(async () => {
      try {
        const changed = await invoke<boolean>("check_monitor_changed");
        if (changed) {
          // 1. Fade out
          setIsTransitioning(true);
          // Wait for fade out to finish (200ms)
          setTimeout(async () => {
            // 2. Teleport window in the background
            await invoke("move_widget_to_active_monitor");
            // 3. Fade back in
            setIsTransitioning(false);
          }, 200);
        }
      } catch (err) {
        console.error("Monitor tracking error", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [inline]);

  useEffect(() => {
    if (inline) return;
    const shouldShowWidget =
      screen !== "onboarding" && (showIdleWidget || recordingState !== "idle");

    invoke("set_widget_visibility", { visible: shouldShowWidget }).catch(console.error);
  }, [inline, recordingState, screen, showIdleWidget]);

  // Sync state from main window in real time
  useEffect(() => {
    const unlistenScale = listen<number>("sync-widget-scale", (e) => {
      useAppStore.setState({ widgetScale: e.payload });
    });
    const unlistenTransMode = listen<boolean>("sync-translation-mode", (e) => {
      useAppStore.setState({ translationMode: e.payload });
    });
    const unlistenTargetLang = listen<string>("sync-target-language", (e) => {
      useAppStore.setState({ targetLanguage: e.payload });
    });
    return () => {
      unlistenScale.then(f => f());
      unlistenTransMode.then(f => f());
      unlistenTargetLang.then(f => f());
    };
  }, []);

  const processTranscription = async () => {
    const state = useAppStore.getState();
    if (state.recordingState !== "recording") return;

    // Capture the exact moment the user stopped recording (pressed the V/Check)
    const recordingEndTime = Date.now();
    const startTime = recordingStartTimeRef.current || recordingEndTime;
    const durationMs = recordingEndTime - startTime;

    setRecordingState("processing");
    try {
      let finalLanguage = state.language === "auto" ? null : state.language;
      if (state.language === "auto-keyboard") {
        try {
          const kbdLang = await invoke<string>("get_keyboard_language");
          finalLanguage = kbdLang ? kbdLang : null;
        } catch (e) {
          console.warn("Failed to get keyboard language", e);
          finalLanguage = null;
        }
      }

      await invoke("stop_recording");
      const transcript = await invoke<string>("transcribe", {
        modelId: state.selectedModel,
        language: finalLanguage,
        context: appContextRef.current
      });

      const cleanedTranscript = transcript.trim();
      if (!cleanedTranscript || cleanedTranscript === "[BLANK_AUDIO]") {
        return; // The finally block will reset state to idle
      }

      let formatted = transcript;
      if (!state.translationMode && state.correctionMode === "verbatim") {
        // Fast path for verbatim: don't even ping the Rust backend or LLM
        formatted = transcript;
      } else {
        try {
          formatted = await invoke<string>("format_text", {
            text: transcript,
            modelId: state.selectedLlmModel,
            context: appContextRef.current,
            translateTo: state.translationMode ? state.targetLanguage : null,
            correctionMode: state.correctionMode,
          });
        } catch (llmError) {
          console.warn("LLM formatting failed, falling back to raw transcript:", llmError);
        }
      }

      if (!formatted.trim()) {
        return;
      }

      state.addTranscription({
        id: recordingStartTimeRef.current.toString(),
        text: formatted,
        duration: durationMs,
        timestamp: new Date(recordingStartTimeRef.current),
        wordCount: formatted.split(/\s+/).filter(Boolean).length,
        language: state.language === "auto" ? "Auto" : state.language,
        appContext: appContextRef.current,
      });

      await invoke("paste_text", { text: formatted });
      onDictate?.();
      playAudioCue("done");
    } catch (e) {
      console.error("Transcription failed:", e);
      setRecordingState("error");
    } finally {
      setRecordingState("idle");
    }
  };

  const startRecording = async () => {
    playAudioCue("start");
    const state = useAppStore.getState();
    if (!inline) {
      invoke("set_widget_visibility", { visible: true }).catch(console.error);
    }
    setRecordingState("recording");
    try {
      // Capture context before recording begins
      const context = await invoke<string>("get_active_window_context").catch(() => undefined);
      appContextRef.current = context;
      recordingStartTimeRef.current = Date.now();

      await invoke("start_recording", {
        language: state.language === "auto" ? null : state.language,
        deviceName: state.selectedMicrophone
      });
    } catch (e) {
      console.error("Failed to start:", e);
      setRecordingState("idle");
    }
  };

  // Setup Global Shortcut
  useEffect(() => {
    let unmounted = false;
    const listeners: (() => void)[] = [];

    const setupShortcut = async () => {
      try {
        const unlistenPressed = await listen<string>("hotkey-pressed", (event) => {
          const action = event.payload;
          const state = useAppStore.getState();

          if (state.screen === "onboarding" && !inline) return;
          if (state.screen !== "onboarding" && inline) return;

          // Only care about dictate hotkey for this widget
          if (action === "dictate" || action === "ptt" || action === "translate") {
            pressTimeRef.current = Date.now();
            isHeldRef.current = false;

            const currentRecState = state.recordingState;
            if (currentRecState === "idle" || currentRecState === "done") {
              // Set translation mode based on the shortcut used to start
              if (action === "translate") {
                state.setTranslationMode(true);
              } else {
                state.setTranslationMode(false);
              }
              startRecording();
            } else if (currentRecState === "recording") {
              processTranscription();
            }
          } else if (action === "magic") {
            if (state.selectedLlmModel) {
              invoke("magic_improve_text", { modelId: state.selectedLlmModel }).catch(console.error);
            }
          }
        });
        if (unmounted) unlistenPressed(); else listeners.push(unlistenPressed);

        const unlistenReleased = await listen<string>("hotkey-released", (event) => {
          const action = event.payload;
          const state = useAppStore.getState();

          if (state.screen === "onboarding" && !inline) return;
          if (state.screen !== "onboarding" && inline) return;

          if (action === "ptt") {
            const heldDuration = Date.now() - pressTimeRef.current;
            // If held for more than 300ms, treat as push-to-talk
            if (heldDuration > 300) {
              isHeldRef.current = true;
              if (state.recordingState === "recording") {
                processTranscription();
              }
            }
          }
        });
        if (unmounted) unlistenReleased(); else listeners.push(unlistenReleased);
      } catch (err) {
        console.error("Failed to listen for hotkeys", err);
      }
    };

    const setupMagicListeners = async () => {
      try {
        const unlistenMagicStart = await listen("magic-processing-start", () => {
          setRecordingState("processing");
        });
        if (unmounted) unlistenMagicStart(); else listeners.push(unlistenMagicStart);

        const unlistenMagicEnd = await listen("magic-processing-end", () => {
          setRecordingState("done");
          setTimeout(() => {
            const currentRecState = useAppStore.getState().recordingState;
            if (currentRecState === "done") setRecordingState("idle");
          }, 3000);
        });
        if (unmounted) unlistenMagicEnd(); else listeners.push(unlistenMagicEnd);
      } catch (err) {
        console.error("Failed to listen for magic events", err);
      }
    };

    setupShortcut();
    setupMagicListeners();

    return () => {
      unmounted = true;
      listeners.forEach(unlisten => unlisten());
    };
  }, [dictateHotkey, setRecordingState, inline, screen]);

  // Listen to actual audio amplitude
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    if (recordingState === "recording") {
      listen<number>("audio-amplitude", (event) => {
        // Multiply by a factor to make the visualization more responsive
        // Max amplitude is typically ~0.1 - 0.3 for normal speech depending on mic.
        const val = Math.min(event.payload * 5, 1);
        setAmplitudes(prev => [val, ...prev.slice(0, 9)]);
      }).then((u) => {
        unlisten = u;
      });
    } else {
      setAmplitudes(Array(10).fill(0));
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, [recordingState]);

  const handleCancel = async () => {
    setRecordingState("idle");
    await invoke("stop_recording");
  };

  const handleDone = () => {
    processTranscription();
  };

  const formatHotkey = (hk: string) => {
    if (navigator.userAgent.includes("Mac")) {
      return hk.replace("Alt", "Option");
    }
    return hk;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isDropdownOpen || isLangMenuOpen) return;

    // Scroll to toggle translation mode
    const state = useAppStore.getState();
    if (e.deltaY !== 0) {
      const newMode = !state.translationMode;
      state.setTranslationMode(newMode);
    }
  };

  const handleTargetLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    useAppStore.getState().setTargetLanguage(e.target.value);
  };

  return (
    <div
      ref={widgetRef}
      className={inline ? "relative flex flex-col items-center pointer-events-auto z-[100] px-10 py-4 -mx-10 -my-4 rounded-3xl" : "w-full h-full flex flex-col items-center justify-end pb-4 overflow-hidden relative pointer-events-none"}
      data-tauri-drag-region={!inline ? "" : undefined}
      onWheel={handleWheel}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(false);
        }, 250);
      }}
      onMouseDown={inline ? (e) => {
        if ((e.target as HTMLElement).tagName !== 'SELECT') {
          e.preventDefault();
        }
      } : undefined}
    >
      <motion.div
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full flex flex-col items-center justify-end pointer-events-none"
      >
        <motion.div
          animate={!inline ? {
            opacity: 1,
            scale: widgetScale
          } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={!inline ? { transformOrigin: "bottom center" } : undefined}
          className="flex flex-col items-center pointer-events-none relative"
        >
          <AnimatePresence>
            {translationMode && isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="flex items-center gap-1 bg-zinc-950 border border-white/20 rounded-full px-2 py-1 shadow-[0_0_15px_rgba(255,255,255,0.05)] pointer-events-auto mb-2 interactive-node"
              >
                <div
                  className="text-[10px] font-semibold text-zinc-300 hover:text-white cursor-pointer flex items-center gap-1 transition-colors"
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                >
                  {language === "auto" ? "Auto" : language.substring(0, 3).toUpperCase()}
                </div>
                <span className="text-[10px] text-zinc-500 mx-1">→</span>

                <div className="relative flex items-center">
                  <div
                    className="text-[10px] font-semibold text-[#0062ff] hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {targetLanguage.substring(0, 3).toUpperCase()}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="m6 9 6 6 6-6" /></svg>
                  </div>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-950 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-xl overflow-y-auto pointer-events-auto z-50 flex flex-col interactive-node custom-scrollbar"
                        style={{ maxHeight: "140px", minWidth: "110px" }}
                      >
                        {WHISPER_LANGUAGES.filter(l => l.code !== "auto").map(l => (
                          <div
                            key={l.code}
                            onClick={() => { useAppStore.getState().setTargetLanguage(l.name); setIsDropdownOpen(false); }}
                            className={`px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors ${l.name === targetLanguage ? "bg-[#0062ff]/15 text-[#0062ff]" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                          >
                            {l.name}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Dictation Language Menu */}
          <AnimatePresence>
            {isLangMenuOpen && isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                className="absolute right-[calc(50%+76px)] bottom-0 bg-zinc-950 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-xl overflow-y-auto pointer-events-auto z-50 flex flex-col interactive-node custom-scrollbar"
                style={{ maxHeight: "140px", minWidth: "110px" }}
              >
                {WHISPER_LANGUAGES.map(l => (
                  <div
                    key={l.code}
                    onClick={() => {
                      useAppStore.getState().setLanguage(l.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors ${l.code === language ? "bg-[#0062ff]/15 text-[#0062ff]" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    {l.name}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Widget UI - Replaces the bar smoothly */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  width: recordingState === "processing" ? 48 : 136,
                  borderColor: translationMode ? "#0062ff" : "rgba(255,255,255,0.25)"
                }}
                exit={{ opacity: 0, y: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className="bg-zinc-950 border shadow-[0_0_25px_rgba(255,255,255,0.1)] flex items-center gap-3 overflow-hidden text-white pointer-events-auto cursor-pointer interactive-node rounded-full px-1"
                style={{
                  height: "48px",
                }}
              >
                <AnimatePresence mode="wait">
                  {recordingState === "idle" || recordingState === "done" ? (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center w-full px-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                          <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className={`p-2 rounded-full transition-colors ${isLangMenuOpen ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                          >
                            <Globe size={16} />
                          </button>
                        </div>
                        <button
                          onClick={startRecording}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {translationMode ? <Languages size={16} className="text-white" /> : <Mic size={16} className="text-white" />}
                        </button>
                        <button
                          onClick={() => {
                            if (selectedLlmModel) {
                              invoke("magic_improve_text", { modelId: selectedLlmModel }).catch(console.error);
                            }
                          }}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                          <Wand2 size={16} className="text-zinc-400 hover:text-white" />
                        </button>
                      </div>
                    </motion.div>
                  ) : recordingState === "processing" ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center w-full"
                    >
                      <div className="w-8 h-8 flex items-center justify-center">
                        <LoadingIndicator style={widgetLoadingStyle} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="recording"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center gap-3 w-full px-2"
                    >
                      <button
                        onClick={handleCancel}
                        className="p-1.5 bg-white/10 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>

                      <div className="flex items-center gap-[2px] justify-center">
                        {amplitudes.map((amp, i) => {
                          const baseScale = [0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.5][i];
                          const wave = Math.sin(Date.now() / 200 + i * 0.8) * 0.15;
                          return (
                            <motion.div
                              key={i}
                              animate={{
                                height: 4 + amp * 16 * Math.max(0, baseScale + wave),
                              }}
                              transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
                              className="w-[3px] bg-white rounded-full flex-shrink-0"
                              style={{ minHeight: "4px" }}
                            />
                          );
                        })}
                      </div>

                      <button
                        onClick={handleDone}
                        className="p-1.5 bg-white text-black hover:bg-zinc-200 rounded-full transition-colors flex-shrink-0"
                      >
                        <Check size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Base Idle Bar - Fades out completely when expanded */}
          <motion.div
            animate={{
              opacity: isExpanded ? 0 : 1,
              scale: isExpanded ? 0.9 : 1,
              y: isExpanded ? 5 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="w-[60px] h-[10px] bg-zinc-950 border border-white/20 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.06)] detection-node absolute bottom-0"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};
