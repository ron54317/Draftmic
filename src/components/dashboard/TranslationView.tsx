import React from "react";
import { motion } from "framer-motion";
import { useAppStore, WHISPER_LANGUAGES } from "../../store/appStore";
import { Select } from "../ui/Select";

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

export function TranslationView() {
  const {
    translationMode, setTranslationMode,
    targetLanguage, setTargetLanguage,
  } = useAppStore();

  const TRANSLATION_LANGUAGES = WHISPER_LANGUAGES.filter(l => l.code !== "auto");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        flex: 1,
        overflowY: "auto",
        width: "100%",
        padding: "32px 24px 48px",
      }}
    >
      <div style={{ maxWidth: 768, margin: "0 auto" }}>
        
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: 2 }}>
          Translation
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
          Real-time voice translation settings
        </p>

        {/* Translation Settings */}
        <div className="settings-group" style={{ marginBottom: 24 }}>
          <Row label="Translation Mode" description="Instantly translate dictation into another language">
            <Toggle on={translationMode} onChange={() => setTranslationMode(!translationMode)} />
          </Row>
          
          <Row label="Target Language" description="The language your speech will be translated into">
            <Select
              value={targetLanguage}
              onChange={setTargetLanguage}
              options={TRANSLATION_LANGUAGES.map((l) => ({ value: l.name, label: `${l.name} ${l.native !== l.name ? `(${l.native})` : ""}` }))}
            />
          </Row>
        </div>

      </div>
    </motion.div>
  );
}
