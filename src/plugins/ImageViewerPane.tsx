/**
 * ImageViewerPane — Example Plugin (Phase 4)
 * Demonstrates how to build a custom pane plugin.
 */
import { useState, useCallback, useRef } from "react";
import type { PaneProps } from "@/types";
import { PluginRegistry } from "@/lib/pluginRegistry";

function ImageViewerComponent({ tabId, notify }: PaneProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("No image");
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const openFile = useCallback(async () => {
    try {
      let dataUrl: string | null = null;
      let name = "image";
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const path = await open({ filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }] });
        if (!path || typeof path !== "string") return;
        name = path.split("/").pop() || path.split("\\").pop() || "image";
        const { readFile } = await import("@tauri-apps/plugin-fs");
        const bytes = await readFile(path);
        const ext = name.split(".").pop()?.toLowerCase() || "png";
        const mime = ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/png";
        const blob = new Blob([bytes], { type: mime });
        dataUrl = URL.createObjectURL(blob);
      } catch {
        // Web fallback: file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        await new Promise<void>((res) => {
          input.onchange = () => {
            const file = input.files?.[0];
            if (file) { name = file.name; dataUrl = URL.createObjectURL(file); }
            res();
          };
          input.click();
        });
        if (!dataUrl) return;
      }
      setSrc(dataUrl);
      setFileName(name);
      setScale(1);
      setError(null);
      notify("info", `Opened: ${name}`);
    } catch (err: any) {
      setError(err?.message || "Failed to open image");
      notify("error", "Failed to open image");
    }
  }, [notify]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.1, Math.min(8, s - e.deltaY * 0.001)));
  };

  const fitToPane = () => setScale(1);
  const zoomIn = () => setScale((s) => Math.min(8, s * 1.25));
  const zoomOut = () => setScale((s) => Math.max(0.1, s / 1.25));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d1117" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", borderBottom: "1px solid #21262d", background: "#161b22", flexShrink: 0, minHeight: 32 }}>
        <button onClick={openFile} style={toolBtn}>📂 Open</button>
        <button onClick={zoomOut} style={toolBtn}>−</button>
        <span style={{ fontSize: 12, color: "#8b949e", minWidth: 40, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} style={toolBtn}>+</button>
        <button onClick={fitToPane} style={toolBtn}>⊡ Fit</button>
        <div style={{ flex: 1, fontSize: 12, color: "#484f58", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
      </div>

      {error && <div style={{ padding: "6px 12px", background: "#2d1010", color: "#ff7b72", fontSize: 12 }}>⚠ {error}</div>}

      {/* Viewport */}
      <div
        onWheel={handleWheel}
        style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#080b10", cursor: src ? "zoom-in" : "default" }}
      >
        {src ? (
          <img
            ref={imgRef}
            src={src}
            alt={fileName}
            style={{ transform: `scale(${scale})`, transformOrigin: "center", maxWidth: "none", imageRendering: scale > 2 ? "pixelated" : "auto", transition: "transform 0.05s" }}
            draggable={false}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#484f58" }}>
            <div style={{ fontSize: 48 }}>🖼</div>
            <div style={{ fontSize: 14 }}>No image open</div>
            <button onClick={openFile} style={{ ...toolBtn, padding: "8px 18px", fontSize: 13 }}>Open Image</button>
          </div>
        )}
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid #30363d",
  borderRadius: 4,
  color: "#e6edf3",
  cursor: "pointer",
  fontSize: 12,
  padding: "2px 8px",
  whiteSpace: "nowrap",
};

// ─── Register plugin ──────────────────────────────────────────────
PluginRegistry.register({
  id: "image-viewer",
  name: "Image Viewer",
  icon: "ti-photo",
  description: "View images with zoom",
  component: ImageViewerComponent,
});

export default ImageViewerComponent;
