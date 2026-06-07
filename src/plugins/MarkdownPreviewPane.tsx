/**
 * MarkdownPreviewPane — Example Plugin (Phase 4)
 */
import { useState, useCallback, useEffect } from "react";
import type { PaneProps } from "@/types";
import { PluginRegistry } from "@/lib/pluginRegistry";
import { readFile } from "@/lib/tauri-bridge";

// Minimal markdown → HTML converter (no external dep required)
function mdToHtml(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Headings
    .replace(/^###### (.+)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.+)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold, italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const inner = m.slice(3, -3).replace(/^[^\n]*\n/, ""); // strip lang
      return `<pre><code>${inner}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
    // Unordered list
    .replace(/^\s*[-*] (.+)$/gm, "<li>$1</li>")
    // Horizontal rule
    .replace(/^---+$/gm, "<hr>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}

function MarkdownPreviewComponent({ tabId, notify }: PaneProps) {
  const [source, setSource] = useState("# Welcome to Markdown Preview\n\nOpen a `.md` file or paste markdown here.\n\n**Bold**, *italic*, `code`, [links](https://example.com).\n\n```\nconst hello = 'world';\n```");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "source">("preview");

  const openFile = useCallback(async () => {
    try {
      let path: string | null = null;
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const result = await open({ filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }] });
        if (!result || typeof result !== "string") return;
        path = result;
      } catch {
        path = window.prompt("Enter markdown file path:");
        if (!path) return;
      }
      const content = await readFile(path);
      setSource(content);
      setFilePath(path);
      notify("info", `Opened: ${path.split("/").pop()}`);
    } catch (err: any) {
      notify("error", `Failed to open file: ${err?.message}`);
    }
  }, [notify]);

  const rendered = mdToHtml(source);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d1117" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", borderBottom: "1px solid #21262d", background: "#161b22", flexShrink: 0, minHeight: 32 }}>
        <button onClick={openFile} style={toolBtn}>📂 Open</button>
        <button onClick={() => setMode(mode === "preview" ? "source" : "preview")} style={toolBtn}>
          {mode === "preview" ? "📝 Source" : "👁 Preview"}
        </button>
        <div style={{ flex: 1, fontSize: 12, color: "#484f58" }}>{filePath || "Unsaved"}</div>
      </div>

      {/* Content */}
      {mode === "preview" ? (
        <div
          style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      ) : (
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            background: "#0d1117",
            color: "#e6edf3",
            border: "none",
            padding: "12px 16px",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            resize: "none",
            outline: "none",
          }}
        />
      )}

      {/* Inline styles injected via a style element */}
      <style>{`
        .md-preview h1,h2,h3,h4,h5,h6 { color: #e6edf3; margin: 1.2em 0 0.4em; border-bottom: 1px solid #21262d; padding-bottom: 0.3em; }
        .md-preview p { color: #c9d1d9; line-height: 1.7; margin: 0.6em 0; }
        .md-preview code { background: #161b22; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; color: #79c0ff; font-family: monospace; }
        .md-preview pre { background: #161b22; border-radius: 6px; padding: 14px; overflow-x: auto; }
        .md-preview pre code { background: none; padding: 0; }
        .md-preview a { color: #58a6ff; }
        .md-preview blockquote { border-left: 3px solid #30363d; margin: 0; padding-left: 16px; color: #8b949e; }
        .md-preview hr { border: none; border-top: 1px solid #30363d; margin: 1.5em 0; }
        .md-preview strong { color: #e6edf3; }
      `}</style>
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
};

// ─── Register plugin ──────────────────────────────────────────────
PluginRegistry.register({
  id: "markdown-preview",
  name: "Markdown Preview",
  icon: "ti-markdown",
  description: "Render markdown files",
  component: MarkdownPreviewComponent,
});

export default MarkdownPreviewComponent;
