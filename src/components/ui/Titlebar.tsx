import { useState, useEffect } from "react";

interface TitlebarProps {
  onSettingsOpen: () => void;
}

export function Titlebar({ onSettingsOpen }: TitlebarProps) {
  const [isMac, setIsMac] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
    checkMaximized();
  }, []);

  const checkMaximized = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    } catch {}
  };

  const minimize = async () => {
    try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); await getCurrentWindow().minimize(); } catch {}
  };
  const toggleMaximize = async () => {
    try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); await getCurrentWindow().toggleMaximize(); setIsMaximized((m) => !m); } catch {}
  };
  const close = async () => {
    try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); await getCurrentWindow().close(); } catch {}
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 36,
        background: "#13181f",
        borderBottom: "1px solid #2a2f38",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px 0 12px",
        flexShrink: 0,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {isMac ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <MacBtn color="#ff5f57" title="Close" onClick={close} />
          <MacBtn color="#febc2e" title="Minimize" onClick={minimize} />
          <MacBtn color="#28c840" title="Maximize" onClick={toggleMaximize} />
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          tiled workspace
        </span>
      )}

      {isMac && (
        <span data-tauri-drag-region style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, letterSpacing: "0.06em", pointerEvents: "none" }}>
          tiled workspace
        </span>
      )}

      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={onSettingsOpen} title="Settings" style={settingsBtnStyle}>⚙</button>
        {!isMac && (
          <>
            <WinBtn symbol="─" title="Minimize" onClick={minimize} hoverBg="#2a2f38" />
            <WinBtn symbol={isMaximized ? "❐" : "□"} title={isMaximized ? "Restore" : "Maximize"} onClick={toggleMaximize} hoverBg="#2a2f38" />
            <WinBtn symbol="✕" title="Close" onClick={close} hoverBg="#c0392b" />
          </>
        )}
      </div>
    </div>
  );
}

function MacBtn({ color, title, onClick }: { color: string; title: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: 12, height: 12, borderRadius: "50%", background: color, border: "none", cursor: "pointer", padding: 0, fontSize: 8, lineHeight: "12px", color: "#00000080", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {hovered ? (title === "Close" ? "×" : title === "Minimize" ? "−" : "+") : ""}
    </button>
  );
}

function WinBtn({ symbol, title, onClick, hoverBg }: { symbol: string; title: string; onClick: () => void; hoverBg: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? hoverBg : "none", border: "none", cursor: "pointer", color: hovered ? "#e6edf3" : "#9198a1", fontSize: 12, padding: "0 11px", height: 36, display: "flex", alignItems: "center", transition: "background 0.1s, color 0.1s", borderRadius: 4 }}>
      {symbol}
    </button>
  );
}

const settingsBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", fontSize: 15,
  color: "#8b949e", padding: "2px 8px", borderRadius: 4, transition: "color 0.1s",
};
