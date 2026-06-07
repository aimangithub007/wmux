import { useEffect, useRef, useState, useCallback } from "react";
import type { AppEntry } from "@/types";
import { readFile, writeFile } from "@/lib/tauri-bridge";
import { useNotificationStore } from "@/store/notificationStore";

// ── CodeMirror lazy imports ────────────────────────────────────────
// All CodeMirror modules are lazily imported to avoid blocking render
let cmReady = false;
type CM = typeof import("@codemirror/view");
type CMState = typeof import("@codemirror/state");
let cmView: CM | null = null;
let cmState: CMState | null = null;

async function loadCM() {
  if (cmReady) return;
  const [view, state] = await Promise.all([
    import("@codemirror/view"),
    import("@codemirror/state"),
  ]);
  cmView = view;
  cmState = state;
  cmReady = true;
}

// ── Language detection ────────────────────────────────────────────
function getExtension(path: string): string {
  return path.split(".").pop()?.toLowerCase() || "";
}

async function getLanguageExtension(path: string) {
  const ext = getExtension(path);
  try {
    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return (await import("@codemirror/lang-javascript")).javascript({ jsx: true, typescript: true });
      case "py":
        return (await import("@codemirror/lang-python")).python();
      case "rs":
        return (await import("@codemirror/lang-rust")).rust();
      case "json":
        return (await import("@codemirror/lang-json")).json();
      case "md":
      case "markdown":
        return (await import("@codemirror/lang-markdown")).markdown();
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ── Editor instance cache ─────────────────────────────────────────
interface EditorInstance {
  view: import("@codemirror/view").EditorView;
  container: HTMLDivElement;
}
const editorCache = new Map<string, EditorInstance>();

interface EditorPaneProps {
  tabId: string;
  appEntry: AppEntry;
  isActive: boolean;
  initialPath?: string;
  onPathChange?: (path: string) => void;
}

export function EditorPane({ tabId, appEntry, isActive, initialPath, onPathChange }: EditorPaneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [filePath, setFilePath] = useState<string | null>(initialPath || null);
  const [fileName, setFileName] = useState<string>(initialPath ? initialPath.split("/").pop() || "Untitled" : "Untitled");
  const [unsaved, setUnsaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmLoaded, setCmLoaded] = useState(cmReady);
  const emit = useNotificationStore((s) => s.emit);

  // ── Load CodeMirror lazily ────────────────────────────────────────
  useEffect(() => {
    loadCM().then(() => setCmLoaded(true));
  }, []);

  // ── Auto-load file jika initialPath ada (restore setelah re-mount) ─
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!cmLoaded || !initialPath || autoLoaded.current) return;
    autoLoaded.current = true;
    // Load file content ke editor
    (async () => {
      try {
        const content = await readFile(initialPath);
        const cached = editorCache.get(tabId);
        if (cached && cmState) {
          const langExt = await getLanguageExtension(initialPath);
          cached.view.dispatch({
            changes: { from: 0, to: cached.view.state.doc.length, insert: content },
          });
          if (langExt) {
            const langComp = (cached.view as any)._langCompartment;
            if (langComp) cached.view.dispatch({ effects: langComp.reconfigure(langExt) });
          }
        }
        setUnsaved(false);
      } catch {
        // File mungkin sudah tidak ada, biarkan editor kosong
      }
    })();
  }, [cmLoaded, initialPath, tabId]);

  // ── Mount editor ──────────────────────────────────────────────────
  useEffect(() => {
    if (!cmLoaded || !mountRef.current || !cmView || !cmState) return;
    const el = mountRef.current;

    if (!editorCache.has(tabId)) {
      const { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } = cmView;
      const { EditorState, Compartment } = cmState;

      const themeCompartment = new Compartment();
      const langCompartment = new Compartment();

      const darkTheme = EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
          background: "#0d1117",
          color: "#e6edf3",
        },
        ".cm-content": { caretColor: "#58a6ff", fontFamily: '"JetBrains Mono", monospace' },
        ".cm-cursor": { borderLeftColor: "#58a6ff" },
        ".cm-activeLine": { background: "#161b22" },
        ".cm-activeLineGutter": { background: "#161b22" },
        ".cm-gutters": { background: "#0d1117", color: "#484f58", border: "none" },
        ".cm-lineNumbers .cm-gutterElement": { minWidth: "3em", padding: "0 6px 0 4px" },
        ".cm-selectionBackground, ::selection": { background: "#264f7880 !important" },
        ".cm-matchingBracket": { background: "#264f78" },
        ".cm-scroller": { overflow: "auto", fontFamily: "inherit" },
      }, { dark: true });

      const state = EditorState.create({
        doc: "",
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          themeCompartment.of(darkTheme),
          langCompartment.of([]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setUnsaved(true);
            }
          }),
          keymap.of([
            {
              key: "Ctrl-s",
              run: () => {
                // Save action — use imperative ref
                saveFileRef.current();
                return true;
              },
            },
          ]),
          EditorView.lineWrapping,
        ],
      });

      const view = new EditorView({ state, parent: el });
      const container = el;
      editorCache.set(tabId, { view, container });

      // Store compartments for later use
      (view as any)._langCompartment = langCompartment;
      (view as any)._themeCompartment = themeCompartment;
    }

    // Move cached editor into this container
    const cached = editorCache.get(tabId)!;
    if (cached.container !== el) {
      el.appendChild(cached.view.dom);
      cached.container = el;
    }
  }, [cmLoaded, tabId]);

  // ── Open file ─────────────────────────────────────────────────────
  const openFile = useCallback(async () => {
    try {
      // Use Tauri dialog — dynamically import to avoid errors in web mode
      let path: string | null = null;
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const result = await open({ filters: [{ name: "All Files", extensions: ["*"] }] });
        if (!result || typeof result !== "string") return;
        path = result;
      } catch {
        // Fallback: prompt
        path = window.prompt("Enter file path:");
        if (!path) return;
      }

      setLoading(true);
      setError(null);
      const content = await readFile(path);
      const name = path.split("/").pop() || path.split("\\").pop() || "file";
      setFilePath(path);
      setFileName(name);
      onPathChange?.(path);

      // Load content into editor
      const cached = editorCache.get(tabId);
      if (cached && cmState) {
        const { EditorState } = cmState;
        const langExt = await getLanguageExtension(path);
        const extensions: any[] = [];
        if (langExt) extensions.push(langExt);

        const newState = cached.view.state.update({
          changes: { from: 0, to: cached.view.state.doc.length, insert: content },
        });
        cached.view.dispatch(newState);

        // Update language
        if (langExt) {
          const langComp = (cached.view as any)._langCompartment;
          if (langComp) {
            cached.view.dispatch({ effects: langComp.reconfigure(langExt) });
          }
        }
      }

      setUnsaved(false);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "Failed to open file");
      setLoading(false);
    }
  }, [tabId, onPathChange]);

  // ── Save file ─────────────────────────────────────────────────────
  const saveFile = useCallback(async () => {
    const cached = editorCache.get(tabId);
    if (!cached) return;

    let path = filePath;
    if (!path) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const result = await save({ filters: [{ name: "All Files", extensions: ["*"] }] });
        if (!result) return;
        path = result;
      } catch {
        path = window.prompt("Save to path:", fileName || "untitled.txt");
        if (!path) return;
      }
      setFilePath(path);
      setFileName(path.split("/").pop() || path);
      onPathChange?.(path);
    }

    try {
      const content = cached.view.state.doc.toString();
      await writeFile(path, content);
      setUnsaved(false);
      emit(tabId, "success", `Saved: ${path.split("/").pop()}`);
    } catch (err: any) {
      emit(tabId, "error", `Save failed: ${err?.message}`);
    }
  }, [filePath, fileName, tabId, emit, onPathChange]);

  // ── Save ref for keymap ───────────────────────────────────────────
  const saveFileRef = useRef(saveFile);
  useEffect(() => { saveFileRef.current = saveFile; }, [saveFile]);

  // ── Show/hide based on isActive ───────────────────────────────────
  // NOTE: JANGAN return null saat inactive — akan unmount komponen dan reset semua state!
  // Gunakan display:none saja agar komponen tetap mounted.

  return (
    <div style={{ display: isActive ? "flex" : "none", flexDirection: "column", height: "100%", background: "#0d1117" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          borderBottom: "1px solid #30363d",
          background: "#161b22",
          flexShrink: 0,
          minHeight: 32,
        }}
      >
        <button onClick={openFile} style={toolBtn} title="Open file">
          📂 Open
        </button>
        <button onClick={saveFile} style={toolBtn} title="Save (Ctrl+S)">
          💾 Save
        </button>
        <div style={{ flex: 1, fontSize: 13, color: "#8b949e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {filePath || "No file open"}
        </div>
        {unsaved && (
          <div
            title="Unsaved changes"
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#d29922", flexShrink: 0 }}
          />
        )}
        {loading && <span style={{ fontSize: 11, color: "#8b949e" }}>Loading…</span>}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "6px 12px", background: "#3d1a1a", color: "#ff7b72", fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      {/* Editor mount */}
      {!cmLoaded ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: 13 }}>
          Loading editor…
        </div>
      ) : (
        <div
          ref={mountRef}
          style={{ flex: 1, overflow: "hidden", minHeight: 0 }}
        />
      )}

      {/* Status bar */}
      <div
        style={{
          padding: "2px 12px",
          fontSize: 11,
          color: "#484f58",
          borderTop: "1px solid #21262d",
          background: "#0d1117",
          display: "flex",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span>{fileName}</span>
        {filePath && <span style={{ color: "#6e7681" }}>{getExtension(filePath).toUpperCase() || "TXT"}</span>}
        {unsaved && <span style={{ color: "#d29922" }}>● Modified</span>}
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

/** Dispose editor instance when tab is permanently removed */
export function disposeEditor(tabId: string) {
  const cached = editorCache.get(tabId);
  if (cached) {
    cached.view.destroy();
    editorCache.delete(tabId);
  }
}
