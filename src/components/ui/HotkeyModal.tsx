import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Mic, Globe, Wand2 } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { Select } from "./Select";

const PRESETS = [
  "CommandOrControl+Shift+Space",
  "CommandOrControl+Space",
  "CommandOrControl+Alt+Space",
  "Alt+Shift+Space",
  "Ctrl+Shift+M",
  "Alt+Shift+R",
];

const parseKeyEvent = (e: KeyboardEvent) => {
  e.preventDefault();
  const keys = [];
  
  // Use CommandOrControl for cross-platform compatibility
  if (e.ctrlKey || e.metaKey) keys.push("CommandOrControl");
  if (e.altKey) keys.push("Alt");
  if (e.shiftKey) keys.push("Shift");

  // Don't just return if only modifiers are pressed
  if (["Control", "Alt", "Shift", "Meta", "OS"].includes(e.key)) return null;

  let key = e.key;
  if (key === " ") key = "Space";
  // Fix for digit keys and other single characters
  else if (key.length === 1) key = key.toUpperCase();
  // Ensure common keys are correctly named for Tauri
  else if (key === "ArrowUp") key = "Up";
  else if (key === "ArrowDown") key = "Down";
  else if (key === "ArrowLeft") key = "Left";
  else if (key === "ArrowRight") key = "Right";
  else if (key === "Escape") key = "Esc";

  keys.push(key);
  return keys.join("+");
};

export function HotkeyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dictateHotkey, setDictateHotkey, pttHotkey, setPttHotkey, translateHotkey, setTranslateHotkey, magicHotkey, setMagicHotkey } = useAppStore();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const combo = parseKeyEvent(e);
      if (combo) {
        if (recordingId === "dictate") setDictateHotkey(combo);
        if (recordingId === "ptt") setPttHotkey(combo);
        if (recordingId === "translate") setTranslateHotkey(combo);
        if (recordingId === "magic") setMagicHotkey(combo);
        setRecordingId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recordingId, setDictateHotkey, setPttHotkey, setTranslateHotkey, setMagicHotkey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 540,
              background: "var(--bg-card)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Global Hotkeys</h2>
              <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Dictate */}
              <HotkeyItem 
                id="dictate" 
                icon={<Mic size={16} />} 
                title="Dictate (Toggle)" 
                desc="Press to start, press again to accept" 
                value={dictateHotkey} 
                onChange={setDictateHotkey} 
                recordingId={recordingId}
                setRecordingId={setRecordingId}
              />
              <div style={{ height: 1, background: "var(--border)", opacity: 0.5 }} />
              {/* Push to talk */}
              <HotkeyItem 
                id="ptt" 
                icon={<Keyboard size={16} />} 
                title="Push to Talk" 
                desc="Hold to dictate, release to accept" 
                value={pttHotkey} 
                onChange={setPttHotkey}
                recordingId={recordingId}
                setRecordingId={setRecordingId}
              />
              <div style={{ height: 1, background: "var(--border)", opacity: 0.5 }} />
              {/* Translate */}
              <HotkeyItem 
                id="translate" 
                icon={<Globe size={16} />} 
                title="Translate" 
                desc="Dictate and translate to target language" 
                value={translateHotkey} 
                onChange={setTranslateHotkey}
                recordingId={recordingId}
                setRecordingId={setRecordingId}
              />
              <div style={{ height: 1, background: "var(--border)", opacity: 0.5 }} />
              {/* Magic */}
              <HotkeyItem 
                id="magic" 
                icon={<Wand2 size={16} />} 
                title="Magic Improve" 
                desc="Contextually improve selected text" 
                value={magicHotkey} 
                onChange={setMagicHotkey}
                recordingId={recordingId}
                setRecordingId={setRecordingId}
              />
            </div>
            
            <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 8, padding: "12px 0", borderRadius: 10, width: "100%", fontWeight: 600 }}>
              Done
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function HotkeyItem({ id, icon, title, desc, value, onChange, recordingId, setRecordingId }: any) {
  const isRecording = recordingId === id;
  const isMac = navigator.userAgent.includes("Mac");

  const formatMacHotkey = (hk: string) => {
    if (!isMac) {
      return hk
        .replace(/CommandOrControl/g, "Ctrl")
        .replace(/Control/g, "Ctrl")
        .replace(/Super/g, "Win");
    }
    return hk
      .replace(/CommandOrControl/g, "⌘")
      .replace(/Super/g, "⌘")
      .replace(/Control/g, "⌃")
      .replace(/Ctrl/g, "⌃")
      .replace(/Alt/g, "⌥")
      .replace(/Shift/g, "⇧")
      .replace(/\+/g, " ")
      .replace(/Space/g, "␣");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ 
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 8, background: "var(--bg-raised)", color: "var(--text-muted)" 
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setRecordingId(isRecording ? null : id)}
          style={{
            minWidth: 120,
            padding: "8px 12px",
            background: isRecording ? "var(--accent-dim)" : "var(--bg-raised)",
            border: `1px solid ${isRecording ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: 6,
            color: isRecording ? "var(--accent)" : "var(--text-primary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "monospace",
            textAlign: "center",
            outline: "none",
            transition: "all 0.2s"
          }}
        >
          {isRecording ? "Listening..." : formatMacHotkey(value)}
        </button>
        
        <Select
          value=""
          onChange={(val) => onChange(val)}
          options={PRESETS.map((p) => ({ value: p, label: formatMacHotkey(p) }))}
          placeholder="Presets"
          style={{ minWidth: 100 }}
        />
      </div>
    </div>
  );
}
