import { X, Minus, Square } from "lucide-react";

export function TitleBar() {
  const handle = async (action: "minimize" | "maximize" | "close") => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (action === "minimize") await win.minimize();
      else if (action === "maximize") {
        const isMax = await win.isMaximized();
        isMax ? await win.unmaximize() : await win.maximize();
      } else await win.close();
    } catch {
      /* browser dev mode */
    }
  };

  const isMac = navigator.userAgent.includes("Mac");

  return (
    <div className="titlebar" style={{ display: "flex", flexDirection: isMac ? "row-reverse" : "row" }}>
      {/* App name + drag region */}
      <div
        data-tauri-drag-region
        style={{
          flex: 1,
          height: "100%",
          cursor: "default",
        }}
      />

      {/* Window controls */}
      <div style={{ display: "flex", alignItems: "center", height: "100%", padding: isMac ? "0 0 0 16px" : 0, gap: isMac ? 8 : 0 }}>
        {isMac ? (
          <>
            <MacBtn color="#ff5f56" onClick={() => handle("close")} />
            <MacBtn color="#ffbd2e" onClick={() => handle("minimize")} />
            <MacBtn color="#27c93f" onClick={() => handle("maximize")} />
          </>
        ) : (
          <>
            <WinBtn icon={<Minus size={13} strokeWidth={1.5} />} onClick={() => handle("minimize")} />
            <WinBtn icon={<Square size={11} strokeWidth={1.5} />} onClick={() => handle("maximize")} />
            <WinBtn icon={<X size={13} strokeWidth={1.5} />} onClick={() => handle("close")} isClose />
          </>
        )}
      </div>
    </div>
  );
}

function MacBtn({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color,
        border: "1px solid rgba(0,0,0,0.1)",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        outline: "none",
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    />
  );
}

function WinBtn({
  icon,
  onClick,
  isClose,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  isClose?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 46,
        height: "100%",
        borderRadius: 0,
        border: "none",
        background: "transparent",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.1s ease",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (isClose) {
          e.currentTarget.style.background = "#e81123";
          e.currentTarget.style.color = "white";
        } else {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {icon}
    </button>
  );
}
