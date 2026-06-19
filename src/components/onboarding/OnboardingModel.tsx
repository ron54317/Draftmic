import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle2, ArrowLeft, Volume2, AlignLeft } from "lucide-react";
import { useAppStore, WHISPER_MODELS, LLM_MODELS } from "../../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ModelSelectionGroup } from "../ui/ModelSelectionGroup";

export function OnboardingModel() {
  const {
    selectedModel, setSelectedModel,
    modelDownloadProgress, setModelProgress,
    modelDownloadSpeed, 
    modelDownloadError, setModelError,
    selectedLlmModel, setSelectedLlmModel,
    llmModelDownloadProgress, setLlmModelProgress,
    llmModelDownloadSpeed, 
    llmModelDownloadError, setLlmModelError,
    setOnboardingStep, completeOnboarding,
    setDownloadingModel,
  } = useAppStore();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [downloadStep, setDownloadStep] = useState<"whisper" | "llm" | "done">("whisper");
  const [activeTab, setActiveTab] = useState<"whisper" | "llm">("whisper");

  const model = WHISPER_MODELS.find((m) => m.id === selectedModel) ?? WHISPER_MODELS[2];
  const llmModel = LLM_MODELS.find((m) => m.id === selectedLlmModel) ?? LLM_MODELS[0];

  const startDownload = async () => {
    setIsDownloading(true);
    setModelError(null);
    setLlmModelError(null);
    setModelProgress(0, "");
    setLlmModelProgress(0, "");

    setDownloadStep("whisper");
    setDownloadingModel(selectedModel);

    // Download Transcription Model
    try {
      const unlisten = await listen<{ progress: number; speed: string }>("download-progress", (e) => {
        setModelProgress(e.payload.progress, e.payload.speed);
      });
      await invoke("download_model", { modelId: selectedModel, url: model.url });
      unlisten();
    } catch (err) {
      console.error(err);
      setModelError(String(err));
    }

    setDownloadStep("llm");
    setDownloadingModel(selectedLlmModel);

    // Download LLM
    try {
      const unlisten = await listen<{ progress: number; speed: string }>("download-progress", (e) => {
        setLlmModelProgress(e.payload.progress, e.payload.speed);
      });
      await invoke("download_model", { modelId: selectedLlmModel, url: llmModel.url });
      unlisten();
    } catch (err) {
      console.error(err);
      setLlmModelError(String(err));
    }

    setDownloadingModel(null);
    setDownloadStep("done");
    setIsDone(true);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 48px",
        gap: 20,
        position: "relative",
      }}
    >
      <div style={{
        position: "absolute",
        top: "10%",
        right: "20%",
        width: 400,
        height: 400,
        background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        filter: "blur(120px)",
        opacity: 0.15,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Content wrapper */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ textAlign: "center", maxWidth: 400, zIndex: 1 }}
      >
        <h2 style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          color: "var(--text-primary)", 
          letterSpacing: "-0.02em", 
          marginBottom: 8,
          background: "linear-gradient(to right, var(--text-primary), var(--text-secondary))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Choose AI Models
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Private and local processing. No internet required.
        </p>
      </motion.div>

      {/* Model selector + download */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={{ 
          width: "100%", 
          maxWidth: 440, 
          display: "flex", 
          flexDirection: "column", 
          gap: 20,
          background: "rgba(15, 15, 15, 0.4)",
          backdropFilter: "blur(20px)",
          padding: 20,
          borderRadius: 20,
          border: "1px solid var(--border)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          zIndex: 1
        }}
      >
        {!isDownloading && !isDone && (
          <>
            {/* Tab Switcher */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 12, border: "1px solid var(--border)", gap: 4 }}>
              <button
                onClick={() => setActiveTab("whisper")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === "whisper" ? "white" : "var(--text-muted)",
                  background: activeTab === "whisper" ? "var(--border-hover)" : "transparent",
                  transition: "all 0.2s",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: activeTab === "whisper" ? "0 2px 8px rgba(0,0,0,0.2)" : "none"
                }}
              >
                <Volume2 size={16} /> Speech (Whisper)
              </button>
              <button
                onClick={() => setActiveTab("llm")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === "llm" ? "white" : "var(--text-muted)",
                  background: activeTab === "llm" ? "var(--border-hover)" : "transparent",
                  transition: "all 0.2s",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: activeTab === "llm" ? "0 2px 8px rgba(0,0,0,0.2)" : "none"
                }}
              >
                <AlignLeft size={16} /> Formatting (LLM)
              </button>
            </div>

            {/* Model picker list */}
            <div style={{ width: "100%", minHeight: 220 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === "whisper" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === "whisper" ? 10 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "whisper" ? (
                    <ModelSelectionGroup
                      models={WHISPER_MODELS}
                      selectedId={selectedModel}
                      onSelect={setSelectedModel}
                    />
                  ) : (
                    <ModelSelectionGroup
                      models={LLM_MODELS}
                      selectedId={selectedLlmModel}
                      onSelect={setSelectedLlmModel}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Download area */}
        <AnimatePresence mode="wait">
          {!isDownloading && !isDone && (
            <motion.button
              key="btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary"
              onClick={startDownload}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 0", fontSize: 15, fontWeight: 700, borderRadius: 14 }}
            >
              <Download size={18} />
              Download Selected Models
            </motion.button>
          )}

          {isDownloading && !isDone && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 20, padding: "8px 0" }}
            >
              {/* Whisper Progress */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: downloadStep === "whisper" ? 1 : 0.4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Volume2 size={16} />
                    Speech AI ({model.name})
                  </span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: "auto" }}>
                    {modelDownloadProgress.toFixed(0)}%
                    {modelDownloadSpeed && (
                      <span style={{ fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>
                        {modelDownloadSpeed}
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
                  <motion.div
                    animate={{ width: `${modelDownloadProgress}%` }}
                    transition={{ duration: 0.2, ease: "linear" }}
                    style={{ height: "100%", background: "var(--text-primary)", borderRadius: 3 }}
                  />
                </div>
              </div>

              {/* LLM Progress */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: downloadStep === "llm" ? 1 : 0.4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlignLeft size={16} />
                    Formatting AI ({llmModel.name})
                  </span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: "auto" }}>
                    {llmModelDownloadProgress.toFixed(0)}%
                    {llmModelDownloadSpeed && (
                      <span style={{ fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>
                        {llmModelDownloadSpeed}
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
                  <motion.div
                    animate={{ width: `${llmModelDownloadProgress}%` }}
                    transition={{ duration: 0.2, ease: "linear" }}
                    style={{ height: "100%", background: "var(--text-primary)", borderRadius: 3 }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
                Downloading to your app data folder — this only happens once.
              </div>
            </motion.div>
          )}

          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "16px 0",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  border: "1px solid var(--border)"
                }}
              >
                <CheckCircle2 size={20} />
                Models downloaded successfully!
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary"
                onClick={() => setOnboardingStep("tutorial")}
                style={{ width: "100%", padding: "16px 0", fontSize: 15, fontWeight: 700, borderRadius: 14 }}
              >
                Continue to Tutorial →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Back */}
      {!isDownloading && !isDone && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-ghost"
          onClick={() => setOnboardingStep("permissions")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 1 }}
        >
          <ArrowLeft size={16} /> Back
        </motion.button>
      )}
    </div>
  );
}
