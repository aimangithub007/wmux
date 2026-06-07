import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { PaneNode, Tab, AppEntry } from "@/types";
import type { MosaicNode } from "react-mosaic-component";
import { killPty } from "@/lib/tauri-bridge";

// ─── Launcher State ───────────────────────────────────────────────

export type LauncherMode = "new" | "replace";

export interface LauncherState {
  paneId: string;
  mode: LauncherMode;
  tabId?: string;
}

// ─── Store ────────────────────────────────────────────────────────

interface PaneStore {
  panes: Record<string, PaneNode>;
  layout: MosaicNode<string> | null;
  activePaneId: string | null;
  launcher: LauncherState | null;

  setLayout: (layout: MosaicNode<string> | null) => void;
  setActivePane: (paneId: string) => void;

  addPane: (appEntry: AppEntry) => string;
  removePane: (paneId: string) => void;
  splitPane: (paneId: string, direction: "row" | "column") => void;

  addTab: (paneId: string, appEntry: AppEntry) => string;
  removeTab: (paneId: string, tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  renameTab: (paneId: string, tabId: string, title: string) => void;
  replaceTabApp: (paneId: string, tabId: string, appEntry: AppEntry) => void;
  updateTabProps: (paneId: string, tabId: string, props: Record<string, unknown>) => void;
  cycleTab: (paneId: string, delta: 1 | -1) => void;
  jumpToTab: (paneId: string, index: number) => void;

  openLauncherForPane: (paneId: string, mode: LauncherMode, tabId?: string) => void;
  closeLauncher: () => void;
  confirmLauncher: (appEntry: AppEntry) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function makeTab(appEntry: AppEntry): Tab {
  return {
    id: uuidv4(),
    appId: appEntry.id,
    title: appEntry.name,
    props: appEntry.path ? { initialPath: appEntry.path } : {},
  };
}

function makePane(appEntry: AppEntry): PaneNode {
  const tab = makeTab(appEntry);
  return { id: uuidv4(), tabs: [tab], activeTabId: tab.id };
}

function insertIntoLayout(
  layout: MosaicNode<string> | null,
  targetId: string,
  newId: string,
  direction: "row" | "column"
): MosaicNode<string> {
  if (layout === null) return newId;
  if (layout === targetId) {
    return { direction, first: targetId, second: newId, splitPercentage: 50 };
  }
  if (typeof layout === "object") {
    return {
      ...layout,
      first: insertIntoLayout(layout.first, targetId, newId, direction),
      second: insertIntoLayout(layout.second, targetId, newId, direction),
    };
  }
  return layout;
}

function removeFromLayout(
  layout: MosaicNode<string> | null,
  removeId: string
): MosaicNode<string> | null {
  if (layout === null || layout === removeId) return null;
  if (typeof layout === "string") return layout;
  const first = removeFromLayout(layout.first, removeId);
  const second = removeFromLayout(layout.second, removeId);
  if (first === null) return second;
  if (second === null) return first;
  return { ...layout, first, second };
}

// ─── Dispose helpers (imported lazily to avoid circular deps) ─────
async function disposeTab(tab: Tab, apps: AppEntry[]) {
  const appEntry = apps.find((a) => a.id === tab.appId);
  const type = appEntry?.type ?? "terminal";
  await killPty(tab.id).catch(() => {});
  if (type === "terminal") {
    const { disposeTerminal } = await import("@/components/panes/TerminalPane");
    disposeTerminal(tab.id);
  }
  if (type === "editor") {
    const { disposeEditor } = await import("@/components/panes/EditorPane");
    disposeEditor(tab.id);
  }
}

// ─── Store Implementation ─────────────────────────────────────────

export const usePaneStore = create<PaneStore>((set, get) => ({
  panes: {},
  layout: null,
  activePaneId: null,
  launcher: null,

  setLayout: (layout) => set({ layout }),
  setActivePane: (paneId) => set({ activePaneId: paneId }),

  addPane: (appEntry) => {
    const pane = makePane(appEntry);
    set((s) => ({
      panes: { ...s.panes, [pane.id]: pane },
      layout: s.layout
        ? insertIntoLayout(s.layout, s.activePaneId ?? "", pane.id, "column")
        : pane.id,
      activePaneId: pane.id,
    }));
    return pane.id;
  },

  removePane: (paneId) => {
    const { panes } = get();
    const pane = panes[paneId];
    const apps = Object.values(panes).flatMap((p) => p.tabs).map((t) => ({ id: t.appId, type: "terminal" as const }));
    if (pane) {
      pane.tabs.forEach((t) => disposeTab(t, []));
    }
    set((s) => {
      const updated = { ...s.panes };
      delete updated[paneId];
      const newLayout = removeFromLayout(s.layout, paneId);
      const remaining = Object.keys(updated);
      return {
        panes: updated,
        layout: newLayout,
        activePaneId: remaining.length ? remaining[remaining.length - 1] : null,
      };
    });
  },

  splitPane: (paneId, direction) => {
    const defaultEntry: AppEntry = { id: "terminal", name: "Terminal", type: "terminal", icon: "ti-terminal-2", default: true };
    const newPane = makePane(defaultEntry);
    set((s) => ({
      panes: { ...s.panes, [newPane.id]: newPane },
      layout: insertIntoLayout(s.layout, paneId, newPane.id, direction),
      activePaneId: newPane.id,
      launcher: null,
    }));
  },

  addTab: (paneId, appEntry) => {
    const tab = makeTab(appEntry);
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return s;
      return {
        panes: { ...s.panes, [paneId]: { ...pane, tabs: [...pane.tabs, tab], activeTabId: tab.id } },
      };
    });
    return tab.id;
  },

  removeTab: (paneId, tabId) => {
    const { panes } = get();
    const pane = panes[paneId];
    const tab = pane?.tabs.find((t) => t.id === tabId);
    if (tab) disposeTab(tab, []);

    set((s) => {
      const p = s.panes[paneId];
      if (!p) return s;
      const remaining = p.tabs.filter((t) => t.id !== tabId);
      if (remaining.length === 0) {
        const updated = { ...s.panes };
        delete updated[paneId];
        const newLayout = removeFromLayout(s.layout, paneId);
        const keys = Object.keys(updated);
        return { panes: updated, layout: newLayout, activePaneId: keys.length ? keys[keys.length - 1] : null };
      }
      const newActive = p.activeTabId === tabId ? remaining[remaining.length - 1].id : p.activeTabId;
      return { panes: { ...s.panes, [paneId]: { ...p, tabs: remaining, activeTabId: newActive } } };
    });
  },

  setActiveTab: (paneId, tabId) => {
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return s;
      return { panes: { ...s.panes, [paneId]: { ...pane, activeTabId: tabId } } };
    });
  },

  renameTab: (paneId, tabId, title) => {
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return s;
      return {
        panes: { ...s.panes, [paneId]: { ...pane, tabs: pane.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)) } },
      };
    });
  },

  replaceTabApp: (paneId, tabId, appEntry) => {
    const { panes } = get();
    const tab = panes[paneId]?.tabs.find((t) => t.id === tabId);
    if (tab) disposeTab(tab, []);
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return s;
      return {
        panes: {
          ...s.panes,
          [paneId]: {
            ...pane,
            tabs: pane.tabs.map((t) => t.id === tabId ? { ...t, appId: appEntry.id, title: appEntry.name, props: {} } : t),
          },
        },
      };
    });
  },

  updateTabProps: (paneId, tabId, props) => {
    set((s) => {
      const pane = s.panes[paneId];
      if (!pane) return s;
      return {
        panes: {
          ...s.panes,
          [paneId]: {
            ...pane,
            tabs: pane.tabs.map((t) =>
              t.id === tabId ? { ...t, props: { ...t.props, ...props } } : t
            ),
          },
        },
      };
    });
  },

  cycleTab: (paneId, delta) => {
    const pane = get().panes[paneId];
    if (!pane) return;
    const idx = pane.tabs.findIndex((t) => t.id === pane.activeTabId);
    const next = (idx + delta + pane.tabs.length) % pane.tabs.length;
    get().setActiveTab(paneId, pane.tabs[next].id);
  },

  jumpToTab: (paneId, index) => {
    const pane = get().panes[paneId];
    if (!pane || index >= pane.tabs.length) return;
    get().setActiveTab(paneId, pane.tabs[index].id);
  },

  openLauncherForPane: (paneId, mode, tabId) => {
    const pane = get().panes[paneId];
    const resolvedTabId = tabId ?? pane?.activeTabId;
    set({ launcher: { paneId, mode, tabId: resolvedTabId } });
  },

  closeLauncher: () => set({ launcher: null }),

  confirmLauncher: (appEntry) => {
    const { launcher } = get();
    if (!launcher) return;
    const { paneId, mode, tabId } = launcher;
    if (mode === "new") {
      get().addTab(paneId, appEntry);
    } else if (mode === "replace" && tabId) {
      get().replaceTabApp(paneId, tabId, appEntry);
    }
    set({ launcher: null });
  },
}));
