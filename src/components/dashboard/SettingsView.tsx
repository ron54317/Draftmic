import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, WHISPER_MODELS, WHISPER_LANGUAGES, LLM_MODELS, WidgetLoadingStyle } from "../../store/appStore";
import { Select } from "../ui/Select";
import { HotkeyModal } from "../ui/HotkeyModal";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      className={`toggle ${on ? "on" : "off"}`}
      onClick={onChange}
      aria-label="Toggle"
    />
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-row">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        padding: "18px 0 8px",
      }}
    >
      {title}
    </div>
  );
}

// selectStyle removed, using .select-input class from index.css

export function SettingsView() {
  const [isHotkeyModalOpen, setIsHotkeyModalOpen] = useState(false);
  const {
    dictateHotkey, pttHotkey, translateHotkey, magicHotkey,
    language, setLanguage,
    selectedModel, setSelectedModel,
    selectedLlmModel, setSelectedLlmModel,
    translationMode, setTranslationMode,
    targetLanguage, setTargetLanguage,
    launchAtLogin, setLaunchAtLogin,
    soundEffects, setSoundEffects,
    showIdleWidget, setShowIdleWidget,
    selectedMicrophone, setMicrophone,
    widgetScale, setWidgetScale,
    widgetLoadingStyle, setWidgetLoadingStyle,
    modelDownloaded,
    downloadingModel, modelDownloadProgress, modelDownloadSpeed, setDownloadingModel,
    llmModelDownloadProgress, llmModelDownloadSpeed,
    setModelProgress, setModelError,
    useGpu, setUseGpu,
    gpuDevice, setGpuDevice,
  } = useAppStore();

  interface GpuInfo { index: number; name: string; }
  const [microphones, setMicrophones] = useState<string[]>([]);
  const [gpuDevices, setGpuDevices] = useState<GpuInfo[]>([]);
  const [gpuLoading, setGpuLoading] = useState(true);

  // Load microphone list
  useEffect(() => {
    invoke<string[]>("get_audio_devices")
      .then((devices) => setMicrophones(devices))
      .catch((e) => console.error("Failed to load mics", e));
  }, []);

  // Load GPU device list in the background (async — won't freeze the UI)
  useEffect(() => {
    invoke<GpuInfo[]>("list_gpu_devices")
      .then((devices) => { setGpuDevices(devices); setGpuLoading(false); })
      .catch((e) => { console.error("Failed to list GPU devices", e); setGpuLoading(false); });
  }, []);



  const handleWhisperModelChange = async (newModelId: string) => {
    setSelectedModel(newModelId);
  };

  const handleLlmModelChange = async (newModelId: string) => {
    setSelectedLlmModel(newModelId);
  };

  // GPU handlers — apply immediately so transcription engine + llama-server reload
  const handleUseGpuChange = () => {
    const next = !useGpu;
    setUseGpu(next);
    invoke("set_use_gpu", { useGpu: next, gpuDevice }).catch(console.error);
  };

  const handleGpuDeviceChange = (val: string) => {
    const idx = val === "auto" ? -1 : parseInt(val, 10);
    setGpuDevice(idx);
    invoke("set_use_gpu", { useGpu, gpuDevice: idx }).catch(console.error);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        flex: 1,
        overflowY: "auto",
        width: "100%",
      }}
    >
      <HotkeyModal isOpen={isHotkeyModalOpen} onClose={() => setIsHotkeyModalOpen(false)} />
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: 2 }}>
        Settings
      </h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Configure Draftmic
      </p>

      {/* Shortcuts */}
      <SectionHeader title="Shortcuts" />
      <div className="settings-group">
        <Row label="Global Hotkeys" description="Configure dictation, PTT, translation, and magic shortcuts">
          <button
            onClick={() => setIsHotkeyModalOpen(true)}
            className="btn btn-secondary"
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 500, borderRadius: 8 }}
          >
            Configure
          </button>
        </Row>
      </div>

      {/* Input Device */}
      <SectionHeader title="Input" />
      <div className="settings-group">
        <Row label="Microphone" description="Select the microphone for dictation">
          <Select
            value={selectedMicrophone || ""}
            onChange={(val) => setMicrophone(val || null)}
            placeholder="Default Device"
            options={[
              { value: "", label: "Default Device" },
              ...microphones.map((mic) => ({ value: mic, label: mic }))
            ]}
          />
        </Row>
      </div>

      {/* AI Model */}
      <SectionHeader title="AI Model" />
      <div className="settings-group">
        <Row label="Transcription Model" description="Select the Whisper AI model size">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <Select
              value={selectedModel}
              onChange={handleWhisperModelChange}
              options={WHISPER_MODELS.map((m) => ({
                value: m.id,
                label: `${m.name} — ${m.size} (${m.speed})`
              }))}
            />
            {downloadingModel === selectedModel && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <div style={{ width: 140, height: 4, background: "var(--bg-hover)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${modelDownloadProgress}%` }}
                    transition={{ duration: 0.2, ease: "linear" }}
                    style={{ height: "100%", background: "var(--accent)" }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {modelDownloadProgress.toFixed(0)}% • {modelDownloadSpeed}
                </div>
              </div>
            )}
          </div>
        </Row>
        <Row label="LLM Filter Model" description="Used for text formatting and smart corrections">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <Select
              value={selectedLlmModel}
              onChange={handleLlmModelChange}
              options={LLM_MODELS.map((m) => ({
                value: m.id,
                label: (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, width: "100%", overflow: "hidden" }}>
                    {m.logo && <img src={m.logo} alt="" style={{ width: 14, height: 14, objectFit: "contain", borderRadius: 2, background: "rgba(255,255,255,0.1)", padding: 1, flexShrink: 0 }} />}
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{`${m.name} — ${m.size}`}</span>

                  </div>
                )
              }))}
            />
            {downloadingModel === selectedLlmModel && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <div style={{ width: 140, height: 4, background: "var(--bg-hover)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${llmModelDownloadProgress}%` }}
                    transition={{ duration: 0.2, ease: "linear" }}
                    style={{ height: "100%", background: "var(--accent)" }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {llmModelDownloadProgress.toFixed(0)}% • {llmModelDownloadSpeed}
                </div>
              </div>
            )}
          </div>
        </Row>
        <Row label="Default language" description="Language Whisper will transcribe in">
          <Select
            value={language}
            onChange={setLanguage}
            options={WHISPER_LANGUAGES.map((l) => ({
              value: l.code,
              label: `${l.name} ${l.native !== l.name && !l.code.startsWith("auto") ? `(${l.native})` : ""}`
            }))}
          />
        </Row>
      </div>



      {/* Model info */}
      {!modelDownloaded && (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(224,160,64,0.08)",
            border: "1px solid rgba(224,160,64,0.2)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--yellow)",
            marginTop: 8,
          }}
        >
          ⚠️ Model not downloaded yet. Go through onboarding to download it.
        </div>
      )}

      {/* Performance / GPU */}
      <SectionHeader title="Performance" />
      <div className="settings-group">
        <Row
          label="Hardware Acceleration"
          description="Use your GPU for faster AI processing. Turn off if you experience crashes or instability."
        >
          <Toggle on={useGpu} onChange={handleUseGpuChange} />
        </Row>
        {useGpu && gpuDevices.length > 1 && (
          <Row
            label="GPU Device"
            description={
              gpuDevice === -1 
                ? `Auto-detecting: ${gpuDevices[0]?.name ?? "Default GPU"}`
                : `${gpuDevices.length} GPUs detected — choose which one to use for AI inference`
            }
          >
            {gpuLoading ? (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Detecting GPUs…</span>
            ) : (
              <Select
                value={gpuDevice === -1 ? "auto" : String(gpuDevice)}
                onChange={handleGpuDeviceChange}
                options={[
                  { 
                    value: "auto", 
                    label: `Auto-detect (${gpuDevices[0]?.name ?? "Recommended"})` 
                  },
                  ...gpuDevices.map((g) => ({
                    value: String(g.index),
                    label: `Device ${g.index}: ${g.name}`,
                  }))
                ]}
              />
            )}
          </Row>
        )}
        {useGpu && !gpuLoading && gpuDevices.length === 1 && (
          <Row
            label="GPU Device"
            description="Using the only detected GPU on this system"
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {gpuDevices[0]?.name ?? "Default GPU"}
            </span>
          </Row>
        )}
      </div>

      {/* Behavior */}
      <SectionHeader title="Behavior" />
      <div className="settings-group">
        <Row label="Launch at login" description="Start Draftmic automatically when Windows starts">
          <Toggle on={launchAtLogin} onChange={() => setLaunchAtLogin(!launchAtLogin)} />
        </Row>
        <Row label="Sound effects" description="Play audio cues when recording starts and stops">
          <Toggle on={soundEffects} onChange={() => setSoundEffects(!soundEffects)} />
        </Row>
        <Row label="Show idle widget" description="Keep the bottom widget visible. Turn this off to show it only when you use a shortcut.">
          <Toggle on={showIdleWidget} onChange={() => setShowIdleWidget(!showIdleWidget)} />
        </Row>
        <Row label="Widget Scale" description="Adjust the size of the dictation widget">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={widgetScale}
              onChange={(e) => setWidgetScale(parseFloat(e.target.value))}
              style={{ width: 100, accentColor: "var(--accent)" }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 30, textAlign: "right" }}>
              {widgetScale.toFixed(1)}x
            </span>
          </div>
        </Row>
        <Row label="Widget Loading Style" description="Animation shown while the widget is processing your audio">
          {(() => {
            const STYLES: { id: WidgetLoadingStyle; label: string }[] = [
              { id: "spinner", label: "Spinner (Default)" },
              { id: "dots",    label: "Dots" },
              { id: "pulse",   label: "Pulse" },
              { id: "bars",    label: "Bars" },
              { id: "orbit",   label: "Orbit" },
              { id: "ripple",  label: "Ripple" },
              { id: "matrix",  label: "Matrix" },
            ];
            const idx = STYLES.findIndex((s) => s.id === widgetLoadingStyle);
            const prev = () => setWidgetLoadingStyle(STYLES[(idx - 1 + STYLES.length) % STYLES.length].id);
            const next = () => setWidgetLoadingStyle(STYLES[(idx + 1) % STYLES.length].id);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={prev}
                  style={{
                    width: 26, height: 26, borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                    cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, lineHeight: 1, transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                >‹</button>
                <span style={{
                  fontSize: 12, fontWeight: 500, color: "var(--text-primary)",
                  minWidth: 110, textAlign: "center",
                }}>
                  {STYLES[idx]?.label ?? "Spinner"}
                </span>
                <button
                  onClick={next}
                  style={{
                    width: 26, height: 26, borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                    cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, lineHeight: 1, transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                >›</button>
              </div>
            );
          })()}
        </Row>
      </div>

      {/* About */}
      <SectionHeader title="About" />
      <div
        style={{
          padding: "12px 14px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>Version</span>
          <span style={{ color: "var(--text-muted)" }}>0.1.0 Beta</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>Engine</span>
          <span style={{ color: "var(--text-muted)" }}>Whisper.cpp (local)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>Languages</span>
          <span style={{ color: "var(--text-muted)" }}>99 supported</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>Privacy</span>
          <span style={{ color: "var(--green)", fontWeight: 500 }}>100% local</span>
        </div>
      </div>
      </div>
    </motion.div>
  );
}
