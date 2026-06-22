import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Info, CheckCircle } from "lucide-react";

export type ToastType = "error" | "warning" | "info" | "success";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number; // ms, defaults to 7000 for errors, 4000 for others
}

// ─── Simple global event bus (no extra context/provider needed) ───────────────
type ToastListener = (toast: Toast) => void;
const listeners: Set<ToastListener> = new Set();

export function showToast(toast: Omit<Toast, "id">) {
  const full: Toast = { ...toast, id: Math.random().toString(36).slice(2) };
  listeners.forEach((fn) => fn(full));
}

// ─── ToastContainer — mount once at the app root ─────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler: ToastListener = (toast) => {
      setToasts((prev) => [toast, ...prev].slice(0, 5)); // max 5 at once
      const duration = toast.duration ?? (toast.type === "error" ? 8000 : 5000);
      setTimeout(() => remove(toast.id), duration);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [remove]);

  const iconMap = {
    error:   <AlertTriangle size={16} style={{ flexShrink: 0, color: "#f87171" }} />,
    warning: <AlertTriangle size={16} style={{ flexShrink: 0, color: "#fbbf24" }} />,
    info:    <Info          size={16} style={{ flexShrink: 0, color: "#60a5fa" }} />,
    success: <CheckCircle  size={16} style={{ flexShrink: 0, color: "#34d399" }} />,
  };

  const accentMap = {
    error:   "#f87171",
    warning: "#fbbf24",
    info:    "#60a5fa",
    success: "#34d399",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
        maxWidth: 380,
        width: "calc(100vw - 48px)",
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{
              pointerEvents: "auto",
              background: "rgba(18, 18, 22, 0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderLeft: `3px solid ${accentMap[toast.type]}`,
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "default",
            }}
          >
            {/* Icon */}
            <div style={{ paddingTop: 1 }}>{iconMap[toast.type]}</div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#f4f4f5",
                  marginBottom: toast.message ? 3 : 0,
                  lineHeight: 1.35,
                }}
              >
                {toast.title}
              </div>
              {toast.message && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}
                >
                  {toast.message}
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => remove(toast.id)}
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                color: "#71717a",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                transition: "color 0.15s",
                marginTop: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
