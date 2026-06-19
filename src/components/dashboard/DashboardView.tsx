import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { Mic, Clock, FileText, Zap, ChevronRight, Wand2, X } from "lucide-react";

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function DashboardView() {
  const transcriptions = useAppStore((s) => s.transcriptions);
  const correctionMode = useAppStore((s) => s.correctionMode);
  const setCorrectionMode = useAppStore((s) => s.setCorrectionMode);
  const [tooltip, setTooltip] = useState<{ text: string, x: number, y: number } | null>(null);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

  // Sanitize durations: if duration > 12 hours (43,200,000 ms), estimate from word count (150 WPM = 400ms per word)
  const getSanitizedDuration = (t: any) => {
    if ((t.duration || 0) > 43200000) {
      return (t.wordCount || 0) * 400;
    }
    return t.duration || 0;
  };

  const totalWords = transcriptions.reduce((acc, t) => acc + (t.wordCount || 0), 0);
  const sessionsCount = transcriptions.length;
  const longestMs = transcriptions.reduce((acc, t) => Math.max(acc, getSanitizedDuration(t)), 0);
  
  // Assuming typing is 40 WPM and speaking is 150 WPM
  // Time saved in minutes = (totalWords / 40) - (totalWords / 150)
  // Or more accurately: Time to type - Actual dictation duration
  const timeToTypeMins = totalWords / 40;
  const actualDictationMins = transcriptions.reduce((acc, t) => acc + getSanitizedDuration(t), 0) / 60000;
  const timeSavedMins = Math.max(0, Math.round(timeToTypeMins - actualDictationMins));

  // Map real activity data for the current month
  const wordsByDate: Record<string, number> = {};
  transcriptions.forEach(t => {
    const d = new Date(t.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    wordsByDate[key] = (wordsByDate[key] || 0) + (t.wordCount || 0);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();

  // 20 weeks of data (approx 5 months)
  const WEEKS = 20;

  const activityData = Array.from({ length: WEEKS }, (_, colIdx) => {
    return Array.from({ length: 7 }, (_, rowIdx) => {
      const daysAgo = (WEEKS - 1 - colIdx) * 7 + (todayDay - rowIdx);
      if (daysAgo < 0) return { isFuture: true, month: -1 };

      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const words = wordsByDate[key] || 0;
      let level = 0;
      if (words > 0) level = 1;
      if (words > 250) level = 2;
      if (words > 1000) level = 3;
      if (words > 2500) level = 4;

      return { 
        isFuture: false, 
        level, 
        words, 
        dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        month: d.getMonth()
      };
    });
  });

  const monthLabels: { colIdx: number, label: string }[] = [];
  let lastMonth = -1;
  activityData.forEach((col, colIdx) => {
    const startOfWeek = col[0];
    if (!startOfWeek.isFuture && startOfWeek.month !== lastMonth) {
      if (lastMonth !== -1 || colIdx === 0) { // Don't skip first label
        const monthName = new Date(2000, startOfWeek.month).toLocaleString('default', { month: 'short' });
        monthLabels.push({ colIdx, label: monthName });
      }
      lastMonth = startOfWeek.month;
    }
  });

  // Compute most used apps
  const appCounts = transcriptions.reduce((acc, t) => {
    if (t.appContext) {
      // Extract just the app name if it has a dash (e.g., "Google Chrome - Tab Name" -> "Google Chrome")
      const appName = t.appContext.split(" - ")[0] || t.appContext;
      acc[appName] = (acc[appName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topApps = Object.entries(appCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div style={{ flex: 1, overflowY: "auto", width: "100%" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
            Welcome back!
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Here's a summary of your recent dictation activity.
          </p>
        </div>
        
        <button
          onClick={() => setIsStyleModalOpen(true)}
          className="hover:bg-white/5 transition-colors"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: "100px",
            border: "1px solid var(--border)", background: "var(--bg-card)",
            color: "var(--text-primary)", fontSize: 13, fontWeight: 500,
            cursor: "pointer"
          }}
        >
          <Wand2 size={16} color="var(--text-secondary)" />
          Dictation Style: <span style={{ color: "#0062ff", fontWeight: 600 }}>{correctionMode.charAt(0).toUpperCase() + correctionMode.slice(1)}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "var(--text-secondary)" }}>
            <FileText size={18} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Total Words</span>
          </div>
          <div className="text-gradient" style={{ fontSize: 32, fontWeight: 700 }}>
            {totalWords.toLocaleString()}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "var(--text-secondary)" }}>
            <Zap size={18} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Time Saved</span>
          </div>
          <div className="text-gradient" style={{ fontSize: 32, fontWeight: 700 }}>
            {timeSavedMins} <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-secondary)", WebkitTextFillColor: "initial" }}>mins</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "var(--text-secondary)" }}>
            <Mic size={18} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Sessions</span>
          </div>
          <div className="text-gradient" style={{ fontSize: 32, fontWeight: 700 }}>
            {sessionsCount.toLocaleString()}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "var(--text-secondary)" }}>
            <Clock size={18} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Longest Session</span>
          </div>
          <div className="text-gradient" style={{ fontSize: 32, fontWeight: 700 }}>
            {formatDuration(longestMs)}
          </div>
        </div>
      </div>


      {/* Activity Graph & Most Used Apps */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Activity Map</h2>
            
            {/* Legend at the top right */}
            <div style={{ display: "flex", alignItems: "center", color: "var(--text-muted)", fontSize: 11, gap: 6 }}>
              <span>Less</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <div className="activity-cube level-0" />
                <div className="activity-cube level-1" />
                <div className="activity-cube level-2" />
                <div className="activity-cube level-3" />
                <div className="activity-cube level-4" />
              </div>
              <span>More</span>
            </div>
          </div>
          <div className="hide-scrollbar" style={{ position: "relative", width: "100%", overflowX: "auto", paddingBottom: 8 }}>
            {/* Month Labels */}
            <div style={{ position: "relative", height: 16, marginBottom: 4 }}>
              {monthLabels.map((m, i) => (
                <div 
                  key={i} 
                  style={{ 
                    position: "absolute", 
                    left: m.colIdx * 14, // 10px cube + 4px gap
                    fontSize: 11, 
                    color: "var(--text-muted)",
                    fontWeight: 500
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* GitHub Style Grid */}
            <div style={{ display: "flex", gap: 4 }}>
              {activityData.map((col, colIdx) => (
                <div key={colIdx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {col.map((cell, rowIdx) => {
                    if (cell.isFuture) {
                      return (
                        <div key={rowIdx} className="activity-cube-wrapper">
                          <div className="activity-cube" style={{ opacity: 0 }} />
                        </div>
                      );
                    }
                    const titleText = (cell.words ?? 0) > 0 ? `${(cell.words || 0).toLocaleString()} words on ${cell.dateStr}` : `No dictations on ${cell.dateStr}`;
                    return (
                      <div 
                        key={rowIdx} 
                        className="activity-cube-wrapper"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ text: titleText, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div className={`activity-cube level-${cell.level}`} />
                      </div>
                    );
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "20px 24px", flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Most Used Apps</h2>
          {topApps.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topApps.map(([appName, count], idx) => (
                <div key={appName} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: 6, background: "var(--bg-hover)", 
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, color: "var(--text-muted)"
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {appName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                    {count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
               Not enough data yet.
             </div>
          )}
        </div>
      </div>

      {/* Recent History */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Dictations</h2>
        </div>
        
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {transcriptions.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              No dictations yet. Start speaking!
            </div>
          ) : (
            <div>
              {transcriptions.slice(0, 5).map((t, i) => (
                <div 
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: i < Math.min(transcriptions.length, 5) - 1 ? "1px solid var(--border)" : "none",
                    gap: 16
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      whiteSpace: "nowrap", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis",
                      fontWeight: 500,
                      marginBottom: 4
                    }}>
                      {t.text}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{t.wordCount} words</span>
                      <span>•</span>
                      <span>{formatDuration(getSanitizedDuration(t))}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Global Tooltip */}
      {tooltip && (
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y - 8,
          transform: "translate(-50%, -100%)",
          background: "#1a1a1a",
          color: "#e8e8e8",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          zIndex: 9999,
          pointerEvents: "none",
          animation: "fade-in 0.15s ease forwards"
        }}>
          {tooltip.text}
        </div>
      )}
      {/* Dictation Style Modal */}
      {isStyleModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(2px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div className="card animate-fade-up" style={{ width: 440, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Dictation Style</h2>
              <button 
                onClick={() => setIsStyleModalOpen(false)} 
                className="btn-icon"
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { id: "verbatim", name: "Verbatim (Fastest)", desc: "Exact words. Bypasses the AI for instant transcription." },
                { id: "clean", name: "Clean (Default)", desc: "Fixes grammar and removes fillers. Keeps original tone." },
                { id: "professional", name: "Professional", desc: "Elevates vocabulary and structures text formally." },
                { id: "concise", name: "Concise", desc: "Gets straight to the point. Removes rambling." }
              ].map((mode) => {
                const isSelected = correctionMode === mode.id;
                return (
                  <div 
                    key={mode.id}
                    onClick={() => { setCorrectionMode(mode.id as any); setIsStyleModalOpen(false); }}
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: isSelected ? "var(--accent-dim)" : "var(--bg-card)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex", alignItems: "center", gap: 12
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-card)"; }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: isSelected ? "var(--accent)" : "var(--text-primary)", marginBottom: 4 }}>
                        {mode.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {mode.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ color: "var(--accent)", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
