import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, CheckCheck, Search, Globe, Clock, X } from "lucide-react";
import { useAppStore } from "../../store/appStore";

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function groupTranscriptions(transcriptions: ReturnType<typeof useAppStore.getState>["transcriptions"]) {
  const groups: Record<string, typeof transcriptions> = {};
  
  transcriptions.forEach(t => {
    const d = new Date(t.timestamp);
    const now = new Date();
    
    let key = "Older";
    if (d.toDateString() === now.toDateString()) {
      key = "Today";
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      } else {
        key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  
  return groups;
}

function Row({ entry }: { entry: ReturnType<typeof useAppStore.getState>["transcriptions"][number] }) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(entry.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 20px",
        background: isHovered ? "var(--bg-hover)" : "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginBottom: 12,
        transition: "background 0.2s ease, border-color 0.2s ease",
        borderColor: isHovered ? "var(--border-strong)" : "var(--border)",
      }}
    >
      {/* Content */}
      <p
        style={{
          fontSize: 14,
          color: "var(--text-primary)",
          lineHeight: 1.6,
          margin: 0,
          letterSpacing: "0.01em",
        }}
      >
        {entry.text}
      </p>

      {/* Footer Meta & Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {/* Meta tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
            <Clock size={11} strokeWidth={2} />
            {formatTime(entry.timestamp)}
          </span>
          {entry.language && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
              <Globe size={11} strokeWidth={2} />
              {entry.language}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <button
          onClick={copy}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: copied ? "var(--accent-dim)" : (isHovered ? "rgba(255,255,255,0.05)" : "transparent"),
            color: copied ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            opacity: (isHovered || copied) ? 1 : 0.5,
          }}
          title="Copy text"
        >
          {copied ? <CheckCheck size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
        </button>
      </div>
    </motion.div>
  );
}

export function HistoryView() {
  const { transcriptions } = useAppStore();
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filtered = useMemo(() => {
    return search
      ? transcriptions.filter((t) => t.text.toLowerCase().includes(search.toLowerCase()))
      : transcriptions;
  }, [transcriptions, search]);

  const grouped = useMemo(() => groupTranscriptions(filtered), [filtered]);
  const groupKeys = Object.keys(grouped);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 800, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", paddingTop: 40, paddingLeft: 24, paddingRight: 24 }}>
        
        {/* Header Area */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>
            History
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Review and copy your past dictations.
          </p>
        </div>

        {/* Enhanced Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: isFocused ? "var(--bg-hover)" : "var(--bg-card)",
            border: "1px solid",
            borderColor: isFocused ? "var(--border-strong)" : "var(--border)",
            borderRadius: 12,
            marginBottom: 24,
            transition: "all 0.2s ease",
            boxShadow: isFocused ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
            flexShrink: 0,
          }}
        >
          <Search size={16} color={isFocused ? "var(--text-primary)" : "var(--text-muted)"} style={{ transition: "color 0.2s ease" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search your dictations..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 14,
              flex: 1,
              fontFamily: "inherit",
            }}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch("")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(255,255,255,0.1)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={12} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* List */}
        <div 
          className="custom-scrollbar"
          style={{ flex: 1, overflowY: "auto", paddingBottom: 40, paddingRight: 4 }}
        >
          {groupKeys.length > 0 ? (
            groupKeys.map((key) => (
              <div key={key} style={{ marginBottom: 32 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                  paddingLeft: 4,
                }}>
                  {key}
                </div>
                {grouped[key].map((entry) => (
                  <Row key={entry.id} entry={entry} />
                ))}
              </div>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
                minHeight: 300,
              }}
            >
              {search ? (
                <>
                  <div style={{ padding: 16, borderRadius: 16, background: "var(--bg-raised)" }}>
                    <Search size={32} color="var(--text-muted)" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>No results found</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>We couldn't find any dictations matching "{search}"</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: 16, borderRadius: 16, background: "var(--bg-raised)" }}>
                    <Clock size={32} color="var(--text-muted)" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>It's quiet here</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Your dictated text will automatically appear here.</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
