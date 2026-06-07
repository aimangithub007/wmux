import { useState, useRef, useCallback, useEffect } from "react";
import type { AppEntry } from "@/types";

interface BrowserPaneProps {
  tabId: string;
  appEntry: AppEntry;
  isActive: boolean;
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
}

export function BrowserPane({
  tabId,
  appEntry,
  isActive,
  initialUrl,
  onUrlChange,
}: BrowserPaneProps) {
  const startUrl =
    initialUrl ||
    (appEntry.path?.startsWith("http") ? appEntry.path : "") ||
    "https://www.google.com";

  const [inputUrl, setInputUrl] = useState(startUrl);
  const [currentUrl, setCurrentUrl] = useState(startUrl);
  const [loading, setLoading] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<any>(null);
  const labelRef = useRef(`browser-${tabId}`);

  const normalizeUrl = (raw: string) => {
    const t = raw.trim();
    if (!t) return "";
    if (t.startsWith("http://") || t.startsWith("https://")) return t;
    if (!t.includes(".") || t.includes(" ")) {
      return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
    }
    return `https://${t}`;
  };

  // ── Get pane position relative to screen ─────────────────────────
  const getPaneRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }, []);

  // ── Create or get WebviewWindow ───────────────────────────────────
  const getOrCreateWebview = useCallback(async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const label = labelRef.current;

      let wv = await WebviewWindow.getByLabel(label);
      if (!wv) {
        const rect = getPaneRect();
        if (!rect) return null;

        // Get parent window position to calculate absolute screen position
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const parentWin = getCurrentWindow();
        const outerPos = await parentWin.outerPosition();
        const scaleFactor = await parentWin.scaleFactor();

        const absX = Math.round(outerPos.x / scaleFactor + rect.x);
        const absY = Math.round(outerPos.y / scaleFactor + rect.y);

        wv = new WebviewWindow(label, {
          url: currentUrl,
          title: "",
          width: rect.width,
          height: rect.height,
          x: absX,
          y: absY,
          decorations: false,
          resizable: false,
          alwaysOnTop: false,
          skipTaskbar: true,
          visible: false,
        });

        await new Promise<void>((resolve) => {
          wv!.once("tauri://created", () => resolve());
          setTimeout(resolve, 2000); // timeout fallback
        });

        setWebviewReady(true);
      }

      webviewRef.current = wv;
      return wv;
    } catch (e) {
      console.error("WebviewWindow error:", e);
      return null;
    }
  }, [currentUrl, getPaneRect]);

  // ── Sync webview position to pane ─────────────────────────────────
  const syncPosition = useCallback(async () => {
    const wv = webviewRef.current;
    if (!wv) return;
    try {
      const rect = getPaneRect();
      if (!rect) return;

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const parentWin = getCurrentWindow();
      const outerPos = await parentWin.outerPosition();
      const scaleFactor = await parentWin.scaleFactor();

      const absX = Math.round(outerPos.x / scaleFactor + rect.x);
      const absY = Math.round(outerPos.y / scaleFactor + rect.y);

      const { PhysicalPosition, PhysicalSize } = await import("@tauri-apps/api/dpi");
      await wv.setPosition(new PhysicalPosition(absX * scaleFactor, absY * scaleFactor));
      await wv.setSize(new PhysicalSize(rect.width * scaleFactor, rect.height * scaleFactor));
    } catch {}
  }, [getPaneRect]);

  // ── Navigate ──────────────────────────────────────────────────────
  const navigate = useCallback(async (target: string) => {
    const url = normalizeUrl(target);
    if (!url) return;
    setLoading(true);
    setCurrentUrl(url);
    setInputUrl(url);
    onUrlChange?.(url);

    try {
      let wv = webviewRef.current;
      if (!wv) {
        wv = await getOrCreateWebview();
      }
      if (wv) {
        await wv.navigate(url);
        await syncPosition();
        await wv.show();
        await wv.setFocus();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [getOrCreateWebview, syncPosition, onUrlChange]);

  // ── Show/hide webview when tab active changes ─────────────────────
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    if (isActive) {
      syncPosition().then(() => wv.show());
    } else {
      wv.hide();
    }
  }, [isActive, syncPosition]);

  // ── Sync on resize ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (isActive && webviewRef.current) syncPosition();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isActive, syncPosition]);

  // ── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      webviewRef.current?.close().catch(() => {});
    };
  }, []);

  // ── Show webview when pane first becomes active after creation ────
  useEffect(() => {
    if (isActive && webviewReady && webviewRef.current) {
      syncPosition().then(() => webviewRef.current?.show());
    }
  }, [webviewReady, isActive, syncPosition]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d1117" }}
    >
      {/* Address bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 8px", borderBottom: "1px solid #21262d",
        background: "#161b22", flexShrink: 0, zIndex: 10,
      }}>
        <button
          onClick={() => webviewRef.current?.navigate(currentUrl)}
          title="Reload"
          style={navBtnStyle}
        >
          {loading ? "⏳" : "↻"}
        </button>

        <input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && navigate(inputUrl)}
          onFocus={(e) => e.target.select()}
          placeholder="Enter URL or search..."
          style={{
            flex: 1, padding: "5px 12px", fontSize: 13,
            borderRadius: 6, border: "1px solid #30363d",
            background: "#0d1117", color: "#e6edf3", outline: "none",
          }}
        />

        <button
          onClick={() => navigate(inputUrl)}
          style={{ ...navBtnStyle, background: "#1f6feb", color: "#fff", padding: "5px 14px", borderRadius: 6, fontSize: 13 }}
        >
          Go
        </button>
      </div>

      {/* Placeholder area — webview float di atas ini */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        color: "#6e7681",
      }}>
        {!webviewReady ? (
          <>
            <div style={{ fontSize: 40, opacity: 0.2 }}>🌐</div>
            <div style={{ fontSize: 13, color: "#8b949e" }}>
              Ketik URL dan tekan Enter
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {["https://google.com", "https://github.com", "http://localhost:3000", "http://localhost:8000"].map((u) => (
                <button key={u} onClick={() => navigate(u)}
                  style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                  {u.replace("https://", "").replace("http://", "")}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#484f58" }}>
            Browser window aktif
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 15, color: "#8b949e", padding: "4px 8px",
  borderRadius: 5, transition: "color 0.1s",
};
