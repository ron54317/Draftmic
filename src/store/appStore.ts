import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppScreen = "onboarding" | "main";
export type OnboardingStep = "welcome" | "permissions" | "model" | "tutorial";
export type NavSection = "home" | "history" | "settings" | "translation";
export type RecordingState = "idle" | "recording" | "processing" | "done" | "error";
export type CorrectionMode = "verbatim" | "clean" | "professional" | "concise";
export type WidgetLoadingStyle = "spinner" | "dots" | "pulse" | "bars" | "orbit" | "ripple" | "matrix";

export interface TranscriptionEntry {
  id: string;
  text: string;
  rawText?: string;
  duration: number;
  timestamp: Date;
  wordCount?: number;
  language?: string;
  appContext?: string;
}

export interface WhisperLanguage {
  code: string;   // Transcription language code
  name: string;   // Display name
  native: string; // Native name
}

const RAW_LANGUAGES: WhisperLanguage[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "tl", name: "Tagalog", native: "Tagalog" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "be", name: "Belarusian", native: "Беларуская" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "jv", name: "Javanese", native: "Basa Jawa" },
  { code: "kk", name: "Kazakh", native: "Қазақ тілі" },
  { code: "km", name: "Khmer", native: "ខ្មែր" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "mg", name: "Malagasy", native: "Malagasy" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "mi", name: "Maori", native: "Māori" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "gd", name: "Scottish Gaelic", native: "Gàidhlig" },
  { code: "sn", name: "Shona", native: "chiShona" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "so", name: "Somali", native: "Soomaali" },
  { code: "su", name: "Sundanese", native: "Basa Sunda" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "uz", name: "Uzbek", native: "Oʻzbekcha" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
  { code: "yi", name: "Yiddish", native: "ייִדיש" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "zu", name: "Zulu", native: "isiZulu" }
].sort((a, b) => {
  if (a.code === "en") return -1;
  if (b.code === "en") return 1;
  return a.name.localeCompare(b.name);
});

export const WHISPER_LANGUAGES: WhisperLanguage[] = [
  { code: "auto-keyboard", name: "Auto-detect from Keyboard", native: "Auto-detect from Keyboard" },
  { code: "auto", name: "Auto-detect from Audio", native: "Auto" },
  ...RAW_LANGUAGES
];

export const WHISPER_MODELS = [
  { id: "distil-large-v3", name: "Distil-Large V3 (EN Only)", size: "754 MB", speed: "Medium", quality: "Ultra", url: "https://huggingface.co/distil-whisper/distil-large-v3-ggml/resolve/main/ggml-distil-large-v3.bin", notes: ["Ultra high accuracy", "Requires mid-to-high spec PC", "English only"] },
  { id: "tiny-q5",    name: "Tiny (Q5)",    size: "31 MB",  speed: "Super Fast", quality: "Basic",    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin", notes: ["Incredibly fast", "Runs smoothly on any PC or older laptop", "Good for quick drafts"] },
  { id: "base-q5",    name: "Base (Q5)",    size: "57 MB",  speed: "Fast",    quality: "Good",     url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin", notes: ["Very fast", "Runs on most laptops smoothly", "Good balance of speed and accuracy"] },
  { id: "small-q5",   name: "Small (Q5)",   size: "185 MB", speed: "Medium",  quality: "Better",   url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin", notes: ["High accuracy across many languages", "Requires mid spec PC", "Great for multilingual dictation"] },
  { id: "turbo-q5",   name: "Turbo V3 (Q5)",size: "547 MB", speed: "Medium",    quality: "Ultra",    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin", notes: ["Exceptional accuracy and speed", "Requires high spec PC or Mac (Apple Silicon)", "State of the art transcription"] },
];

export const LLM_MODELS = [
  { id: "llama-3.1-8b-instruct", name: "Llama 3.1 (8B)", size: "4.9 GB", speed: "Medium", logo: "/llama.png", url: "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf", notes: ["State of the art 8B model", "Requires high spec PC (16GB+ RAM)", "Excellent reasoning and formatting"] },
  { id: "qwen2.5-7b-instruct", name: "Qwen 2.5 (7B)", size: "4.7 GB", speed: "Medium", logo: "/qwen.png", url: "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf", notes: ["Powerful multilingual capabilities", "Requires high spec PC (16GB+ RAM)", "Top tier open weights model"] },
  { id: "mistral-7b-instruct-v0.3", name: "Mistral v0.3 (7B)", size: "4.4 GB", speed: "Medium", logo: "/mistral.png", url: "https://huggingface.co/MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3.Q4_K_M.gguf", notes: ["Solid all-rounder", "Requires high spec PC (16GB+ RAM)", "Uncensored instruction following"] },
  { id: "llama-3.2-3b-instruct", name: "Llama 3.2 (3B)", size: "2.1 GB", speed: "Fast", logo: "/llama.png", url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf", recommended: true, notes: ["Very fast and highly capable", "Runs well on mid spec PCs (8GB+ RAM)", "Highly recommended balance"] },
  { id: "gemma-2-2b-it", name: "Gemma 2 (2B)", size: "1.7 GB", speed: "Fast", logo: "/google.svg", url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf", notes: ["Ultra fast and lightweight", "Runs on almost any modern PC", "Great for simple formatting"] },
  { id: "qwen2.5-1.5b-instruct", name: "Qwen 2.5 (1.5B)", size: "1.1 GB", speed: "Super Fast", logo: "/qwen.png", url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf", notes: ["Extremely fast generation", "Runs smoothly on older hardware", "Good basic formatting capabilities"] },
];

interface AppState {
  screen: AppScreen;
  onboardingStep: OnboardingStep;
  navSection: NavSection;

  // Settings
  dictateHotkey: string;
  pttHotkey: string;
  translateHotkey: string;
  magicHotkey: string;
  language: string;       // transcription language code
  selectedMicrophone: string | null;
  micPermission: "pending" | "granted" | "denied";
  selectedModel: string;  // transcription model id
  selectedLlmModel: string; // llm model id
  autoPaste: boolean;
  launchAtLogin: boolean;
  soundEffects: boolean;
  showIdleWidget: boolean;
  widgetScale: number;
  widgetLoadingStyle: WidgetLoadingStyle;

  // GPU acceleration
  useGpu: boolean;
  gpuDevice: number; // -1 = auto, 0+ = specific device index

  translationMode: boolean;
  targetLanguage: string;
  correctionMode: CorrectionMode;

  // Model
  modelDownloaded: boolean;
  modelDownloadProgress: number;
  modelDownloadSpeed: string;
  modelDownloadError: string | null;
  downloadingModel: string | null;
  
  llmModelDownloaded: boolean;
  llmModelDownloadProgress: number;
  llmModelDownloadSpeed: string;
  llmModelDownloadError: string | null;

  // Recording
  recordingState: RecordingState;
  currentAmplitude: number;
  transcriptions: TranscriptionEntry[];
  lastTranscript: string;

  // Actions
  setScreen: (s: AppScreen) => void;
  setOnboardingStep: (s: OnboardingStep) => void;
  setNavSection: (s: NavSection) => void;
  setDictateHotkey: (k: string) => void;
  setPttHotkey: (k: string) => void;
  setTranslateHotkey: (k: string) => void;
  setMagicHotkey: (k: string) => void;
  setLanguage: (l: string) => void;
  setMicrophone: (mic: string | null) => void;
  setMicPermission: (perm: "pending" | "granted" | "denied") => void;
  setSelectedModel: (m: string) => void;
  setSelectedLlmModel: (m: string) => void;
  setAutoPaste: (b: boolean) => void;
  setLaunchAtLogin: (b: boolean) => void;
  setSoundEffects: (b: boolean) => void;
  setShowIdleWidget: (b: boolean) => void;
  setWidgetScale: (n: number) => void;
  setWidgetLoadingStyle: (s: WidgetLoadingStyle) => void;
  setUseGpu: (b: boolean) => void;
  setGpuDevice: (n: number) => void;

  setTranslationMode: (b: boolean) => void;
  setTargetLanguage: (s: string) => void;
  setCorrectionMode: (m: CorrectionMode) => void;

  setModelDownloaded: (b: boolean) => void;
  setModelProgress: (p: number, speed: string) => void;
  setModelError: (e: string | null) => void;
  setDownloadingModel: (m: string | null) => void;
  setLlmModelDownloaded: (d: boolean) => void;
  setLlmModelProgress: (p: number, speed: string) => void;
  setLlmModelError: (e: string | null) => void;
  setRecordingState: (s: RecordingState) => void;
  setCurrentAmplitude: (a: number) => void;
  setLastTranscript: (t: string) => void;
  addTranscription: (e: TranscriptionEntry) => void;
  completeOnboarding: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      screen: "onboarding",
      onboardingStep: "welcome",
      navSection: "home",
      dictateHotkey: "CommandOrControl+Shift+Space",
      pttHotkey: "Alt+Space",
      translateHotkey: "CommandOrControl+Shift+T",
      magicHotkey: "CommandOrControl+Shift+M",
      language: "auto-keyboard",
      selectedMicrophone: null,
      micPermission: "pending",
      selectedModel: "distil-large-v3",
      selectedLlmModel: "llama-3.2-3b-instruct",
      autoPaste: true,
      launchAtLogin: true,
      soundEffects: true,
      showIdleWidget: true,
      widgetScale: 1.0,
      widgetLoadingStyle: "spinner" as WidgetLoadingStyle,

      useGpu: true,
      gpuDevice: -1,

      translationMode: false,
      targetLanguage: "Spanish",
      correctionMode: "clean",

      modelDownloaded: false,
      modelDownloadProgress: 0,
      modelDownloadSpeed: "",
      modelDownloadError: null,
      downloadingModel: null,
      
      llmModelDownloaded: false,
      llmModelDownloadProgress: 0,
      llmModelDownloadSpeed: "",
      llmModelDownloadError: null,

      recordingState: "idle",
      currentAmplitude: 0,
      transcriptions: [],
      lastTranscript: "",

      setScreen: (screen) => set({ screen }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      setNavSection: (navSection) => set({ navSection }),
      setDictateHotkey: (dictateHotkey) => set({ dictateHotkey }),
      setPttHotkey: (pttHotkey) => set({ pttHotkey }),
      setTranslateHotkey: (translateHotkey) => set({ translateHotkey }),
      setMagicHotkey: (magicHotkey) => set({ magicHotkey }),
      setLanguage: (language) => set({ language }),
      setMicrophone: (selectedMicrophone) => set({ selectedMicrophone }),
      setMicPermission: (micPermission) => set({ micPermission }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setSelectedLlmModel: (selectedLlmModel) => set({ selectedLlmModel }),
      setAutoPaste: (autoPaste) => set({ autoPaste }),
      setLaunchAtLogin: (launchAtLogin) => {
        set({ launchAtLogin });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          import("@tauri-apps/plugin-autostart").then(({ enable, disable }) => {
            if (launchAtLogin) {
              enable().catch(console.error);
            } else {
              disable().catch(console.error);
            }
          });
        }
      },
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      setShowIdleWidget: (showIdleWidget) => set({ showIdleWidget }),
      setUseGpu: (useGpu) => set({ useGpu }),
      setGpuDevice: (gpuDevice) => set({ gpuDevice }),
      setWidgetScale: (widgetScale) => {
        set({ widgetScale });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          import("@tauri-apps/api/event").then(({ emit }) => {
            emit("sync-widget-scale", widgetScale).catch(console.error);
          });
        }
      },
      setWidgetLoadingStyle: (widgetLoadingStyle) => {
        set({ widgetLoadingStyle });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          import("@tauri-apps/api/event").then(({ emit }) => {
            emit("sync-widget-loading-style", widgetLoadingStyle).catch(console.error);
          });
        }
      },
      setTranslationMode: (translationMode) => {
        set({ translationMode });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          import("@tauri-apps/api/event").then(({ emit }) => {
            emit("sync-translation-mode", translationMode).catch(console.error);
          });
        }
      },
      setTargetLanguage: (targetLanguage) => {
        set({ targetLanguage });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          import("@tauri-apps/api/event").then(({ emit }) => {
            emit("sync-target-language", targetLanguage).catch(console.error);
          });
        }
      },
      setCorrectionMode: (correctionMode) => {
        set({ correctionMode });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          import("@tauri-apps/api/event").then(({ emit }) => {
            emit("sync-correction-mode", correctionMode).catch(console.error);
          });
        }
      },
      setDownloadingModel: (m) => set({ downloadingModel: m }),
      setModelDownloaded: (b) => set({ modelDownloaded: b }),
      setModelProgress: (p, speed) => set({ modelDownloadProgress: p, modelDownloadSpeed: speed }),
      setModelError: (modelDownloadError) => set({ modelDownloadError }),
      
      setLlmModelDownloaded: (llmModelDownloaded) => set({ llmModelDownloaded }),
      setLlmModelProgress: (p, speed) => set({ llmModelDownloadProgress: p, llmModelDownloadSpeed: speed }),
      setLlmModelError: (llmModelDownloadError) => set({ llmModelDownloadError }),

      setRecordingState: (recordingState) => set({ recordingState }),
      setCurrentAmplitude: (currentAmplitude) => set({ currentAmplitude }),
      setLastTranscript: (lastTranscript) => set({ lastTranscript }),
      addTranscription: (entry) =>
        set((s) => ({ transcriptions: [entry, ...s.transcriptions].slice(0, 5000) })),
      completeOnboarding: () => set({ screen: "main", modelDownloaded: true }),
    }),
    {
      name: "draftmic-settings",
      partialize: (s) => ({
        screen: s.screen,
        onboardingStep: s.onboardingStep,
        dictateHotkey: s.dictateHotkey,
        pttHotkey: s.pttHotkey,
        translateHotkey: s.translateHotkey,
        magicHotkey: s.magicHotkey,
        language: s.language,
        selectedMicrophone: s.selectedMicrophone,
        micPermission: s.micPermission,
        selectedModel: s.selectedModel,
        selectedLlmModel: s.selectedLlmModel,
        autoPaste: s.autoPaste,
        launchAtLogin: s.launchAtLogin,
        soundEffects: s.soundEffects,
        showIdleWidget: s.showIdleWidget,
        widgetScale: s.widgetScale,
        widgetLoadingStyle: s.widgetLoadingStyle,
        useGpu: s.useGpu,
        gpuDevice: s.gpuDevice,
        translationMode: s.translationMode,
        targetLanguage: s.targetLanguage,
        correctionMode: s.correctionMode,
        modelDownloaded: s.modelDownloaded,
        llmModelDownloaded: s.llmModelDownloaded,
        transcriptions: s.transcriptions.slice(0, 5000),
      }),
    }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "draftmic-settings") {
      useAppStore.persist.rehydrate();
    }
  });

  // Sync autostart setting with OS on app load
  if ((window as any).__TAURI_INTERNALS__) {
    import("@tauri-apps/plugin-autostart").then(({ enable, disable, isEnabled }) => {
      isEnabled().then((enabled) => {
        const shouldBeEnabled = useAppStore.getState().launchAtLogin;
        if (shouldBeEnabled && !enabled) {
          enable().catch(console.error);
        } else if (!shouldBeEnabled && enabled) {
          disable().catch(console.error);
        }
      }).catch(console.error);
    }).catch(console.error);
  }
}
