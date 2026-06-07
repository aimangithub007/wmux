import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Mosaic, MosaicWindow } from "react-mosaic-component";
import { usePaneStore } from "@/store/paneStore";
import { PaneContainer } from "@/components/panes/PaneContainer";
import { AppLauncher } from "@/components/ui/AppLauncher";
import { ToastManager } from "@/components/ui/ToastManager";
import { SettingsPanel } from "@/components/ui/SettingsPanel";
import { Titlebar } from "@/components/ui/Titlebar";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { AppRegistryContext, useAppRegistryProvider } from "@/hooks/useAppRegistry";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { saveLayout, loadLayout } from "@/lib/tauri-bridge";
import "react-mosaic-component/react-mosaic-component.css";
import "./globals.css";

// Debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

function WorkspaceInner() {
  const { layout, panes, setLayout, addPane } = usePaneStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const bootstrapped = useRef(false);
  useKeyboardShortcuts();

  // ── Load layout on mount ──────────────────────────────────────────
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        const saved = await loadLayout();
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.layout && parsed?.panes && Object.keys(parsed.panes).length > 0) {
            usePaneStore.setState({
              layout: parsed.layout,
              panes: parsed.panes,
              activePaneId: parsed.activePaneId ?? null,
            });
            return;
          }
        }
      } catch {
        // Fall through to bootstrap
      }
      if (Object.keys(usePaneStore.getState().panes).length === 0) {
        addPane({
          id: "terminal",
          name: "Terminal",
          type: "terminal",
          icon: "ti-terminal-2",
          default: true,
        });
      }
    })();
  }, []);

  // ── Save layout on change (debounced 500ms) ───────────────────────
  const doPersist = useCallback(
    debounce(() => {
      const { layout, panes, activePaneId } = usePaneStore.getState();
      if (!layout) return;
      saveLayout(JSON.stringify({ layout, panes, activePaneId })).catch(() => {});
    }, 500),
    []
  );

  // Simpan layout saat layout berubah (struktur tile)
  useEffect(() => {
    if (layout !== null) doPersist();
  }, [layout]);

  // Simpan panes saat panes berubah (tab props, filePath, dll) — terpisah agar tidak saling trigger
  const doPersistPanes = useCallback(
    debounce(() => {
      const { layout, panes, activePaneId } = usePaneStore.getState();
      if (!layout) return;
      saveLayout(JSON.stringify({ layout, panes, activePaneId })).catch(() => {});
    }, 1000),
    []
  );

  useEffect(() => {
    doPersistPanes();
  }, [panes]);

  // ── Make window visible after splash ────────────────────────────
  useEffect(() => {
    if (!splashDone) return;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().show();
      } catch {}
    })();
  }, [splashDone]);

  const tileRenderer = useMemo(
    () => (id: string, path: any) => (
      <MosaicWindow<string>
        title=""
        path={path}
        createNode={() => id}
        renderToolbar={() => <div />}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <PaneContainer paneId={id} />
        </div>
      </MosaicWindow>
    ),
    []
  );

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}
    >
      {/* Splash */}
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {/* Custom titlebar */}
      <Titlebar onSettingsOpen={() => setSettingsOpen(true)} />

      {/* Tiling area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {layout !== null ? (
          <Mosaic<string>
            renderTile={tileRenderer}
            value={layout}
            onChange={(newLayout) => setLayout(newLayout)}
            className="mosaic-theme-dark"
          />
        ) : (
          <EmptyState
            onOpen={() =>
              addPane({
                id: "terminal",
                name: "Terminal",
                type: "terminal",
                icon: "ti-terminal-2",
                default: true,
              })
            }
          />
        )}
      </div>

      {/* Global overlays */}
      <AppLauncher />
      <ToastManager />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 16,
        color: "var(--color-text-secondary)",
      }}
    >
      <div style={{ fontSize: 56, opacity: 0.2 }}>⊞</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
        Tiled Workspace
      </div>
      <div style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
        Open a terminal to get started
      </div>
      <button
        onClick={onOpen}
        style={{
          padding: "9px 22px",
          background: "var(--color-background-info)",
          color: "var(--color-text-info)",
          border: "1px solid var(--color-border-info)",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Open Terminal
      </button>
      <div
        style={{
          fontSize: 12,
          opacity: 0.45,
          lineHeight: 2,
          textAlign: "center",
          fontFamily: "monospace",
        }}
      >
        Ctrl+D — split vertical &nbsp;·&nbsp; Ctrl+E — split horizontal<br />
        Ctrl+T — new tab &nbsp;·&nbsp; Ctrl+W — close tab &nbsp;·&nbsp; Ctrl+Space — launcher
      </div>
    </div>
  );
}

export function App() {
  const registry = useAppRegistryProvider();
  return (
    <AppRegistryContext.Provider value={registry}>
      <WorkspaceInner />
    </AppRegistryContext.Provider>
  );
}
