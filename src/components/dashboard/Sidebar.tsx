import { motion } from "framer-motion";
import { Mic, Clock, Settings, Home, Globe } from "lucide-react";
import { useAppStore, NavSection } from "../../store/appStore";

const NAV = [
  { id: "home" as NavSection,        icon: Home,     label: "Dashboard" },
  { id: "history" as NavSection,     icon: Clock,    label: "History" },
  { id: "translation" as NavSection, icon: Globe,    label: "Translation" },
  { id: "settings" as NavSection,    icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { navSection, setNavSection, recordingState, transcriptions } = useAppStore();

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  return (
    <div
      style={{
        width: 196,
        minWidth: 196,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        borderRight: "1px solid var(--border)",
        padding: "16px 10px",
        gap: 2,
        flexShrink: 0,
      }}
    >
      {/* Logo Area */}
      <div style={{ padding: "8px 10px 24px 10px", display: "flex", alignItems: "center", gap: 12 }}>
        <img 
          src="/LogoNobackround.png" 
          alt="Draftmic" 
          style={{ width: 32, height: 32, objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0, 98, 255, 0.2))" }}
        />
        <span style={{ fontSize: 16, fontWeight: 700, background: "linear-gradient(135deg, var(--text-primary) 30%, var(--text-secondary) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Draftmic
        </span>
      </div>

      {/* Nav */}
      {NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`nav-item ${navSection === id ? "active" : ""}`}
          onClick={() => setNavSection(id)}
        >
          {navSection === id && (
            <motion.div
              layoutId="sidebar-indicator"
              style={{
                position: "absolute",
                left: 0,
                width: 2.5,
                height: 16,
                background: "var(--accent)",
                borderRadius: "0 3px 3px 0",
                boxShadow: "0 0 10px var(--accent)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <Icon size={14} strokeWidth={navSection === id ? 2 : 1.5} />
          {label}
          {id === "history" && transcriptions.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                fontWeight: 600,
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                color: "var(--text-muted)",
              }}
            >
              {transcriptions.length > 99 ? "99+" : transcriptions.length}
            </span>
          )}
        </button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 10px" }}>
        v0.1 Beta
      </div>
    </div>
  );
}
