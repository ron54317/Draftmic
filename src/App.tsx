import { AnimatePresence, motion } from "framer-motion";
import { useAppStore, WHISPER_MODELS, LLM_MODELS } from "./store/appStore";
import { TitleBar } from "./components/TitleBar";
import { Onboarding } from "./components/onboarding/Onboarding";
import { Dashboard } from "./components/dashboard/Dashboard";
import { DictateWidget } from "./components/widget/DictateWidget";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

function App() {
  const screen = useAppStore((s) => s.screen);
  const selectedLlmModel = useAppStore((s) => s.selectedLlmModel);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const dictateHotkey = useAppStore((s) => s.dictateHotkey);
  const pttHotkey = useAppStore((s) => s.pttHotkey);
  const translateHotkey = useAppStore((s) => s.translateHotkey);
  const magicHotkey = useAppStore((s) => s.magicHotkey);
  const useGpu = useAppStore((s) => s.useGpu);
  const gpuDevice = useAppStore((s) => s.gpuDevice);
  const showIdleWidget = useAppStore((s) => s.showIdleWidget);
  const [isWidget, setIsWidget] = useState(false);

  // Sync GPU settings to backend immediately when they change or on app load
  useEffect(() => {
    invoke("set_use_gpu", { useGpu, gpuDevice }).catch(console.error);
  }, [useGpu, gpuDevice]);

  useEffect(() => {
    invoke("register_hotkeys", {
      dictate: dictateHotkey,
      ptt: pttHotkey,
      translate: translateHotkey,
      magic: magicHotkey,
    }).catch(console.error);
  }, [dictateHotkey, pttHotkey, translateHotkey, magicHotkey]);

  useEffect(() => {
    if (selectedLlmModel && screen !== "onboarding") {
      const initLlama = async () => {
        try {
          const exists = await invoke<boolean>("check_model", { modelId: selectedLlmModel });
          if (!exists) {
            const currentDl = useAppStore.getState().downloadingModel;
            if (currentDl !== selectedLlmModel) {
              const modelUrl = LLM_MODELS.find(m => m.id === selectedLlmModel)?.url;
              if (modelUrl) {
                console.log("Auto-downloading missing Llama model...");
                useAppStore.getState().setDownloadingModel(selectedLlmModel);
                useAppStore.getState().setLlmModelProgress(0, "");
                await invoke("download_model", { modelId: selectedLlmModel, url: modelUrl });
                useAppStore.getState().setDownloadingModel(null);
              }
            }
          }
          await invoke("start_llama_server", { modelId: selectedLlmModel });
        } catch (e) {
          console.error("Llama server init failed:", e);
        }
      };
      initLlama();
    }
  }, [selectedLlmModel, screen]);

  useEffect(() => {
    if (selectedModel && screen !== "onboarding") {
      const initWhisper = async () => {
        try {
          const exists = await invoke<boolean>("check_model", { modelId: selectedModel });
          if (!exists) {
            const currentDl = useAppStore.getState().downloadingModel;
            if (currentDl !== selectedModel) {
              const modelUrl = WHISPER_MODELS.find(m => m.id === selectedModel)?.url;
              if (modelUrl) {
                console.log("Auto-downloading missing Whisper model...");
                useAppStore.getState().setDownloadingModel(selectedModel);
                useAppStore.getState().setModelProgress(0, "");
                await invoke("download_model", { modelId: selectedModel, url: modelUrl });
                useAppStore.getState().setDownloadingModel(null);
              }
            }
          }
        } catch (e) {
          console.error("Whisper init failed:", e);
        }
      };
      initWhisper();
    }
  }, [selectedModel, screen]);

  useEffect(() => {
    if (getCurrentWindow().label === "widget") {
      setIsWidget(true);
    }
    
    const unlisten = listen("download-progress", (event: any) => {
      if (event.payload) {
        const state = useAppStore.getState();
        const dlModel = state.downloadingModel;
        const isLlm = LLM_MODELS.some(m => m.id === dlModel);
        if (isLlm) {
          state.setLlmModelProgress(event.payload.progress, event.payload.speed);
        } else {
          state.setModelProgress(event.payload.progress, event.payload.speed);
        }
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Control global widget visibility based on screen state
  useEffect(() => {
    if (getCurrentWindow().label !== "widget") {
      invoke("set_widget_visibility", { visible: screen !== "onboarding" && showIdleWidget }).catch(console.error);
    }
  }, [screen, showIdleWidget]);

  if (isWidget) {
    return <DictateWidget />;
  }

  return (
    <div className="app-shell">
      <TitleBar />

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {screen === "onboarding" ? <Onboarding /> : <Dashboard />}
        </motion.div>
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { -webkit-app-region: none; }
        [data-tauri-drag-region] { -webkit-app-region: drag; }
        select { appearance: auto; }
      `}</style>
    </div>
  );
}

export default App;
