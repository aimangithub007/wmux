// ─── Pane & App Types ─────────────────────────────────────────────

export type PaneType = "terminal" | "browser" | "editor" | "plugin";

export interface AppEntry {
  id: string;
  name: string;
  type: PaneType;
  path?: string;
  args?: string[];
  icon?: string;
  default?: boolean;
}

export interface Tab {
  id: string;
  appId: string;
  title: string;
  props?: Record<string, unknown>;
}

export interface PaneNode {
  id: string;
  tabs: Tab[];
  activeTabId: string;
}

// ─── Notification Types ───────────────────────────────────────────

export type NotifLevel = "info" | "success" | "warning" | "error" | "attention";

export interface TabNotif {
  id: string;
  tabId: string;
  level: NotifLevel;
  message: string;
  ts: number;
  read: boolean;
  autoDismiss?: number;
}

// ─── Layout Types ─────────────────────────────────────────────────

export type MosaicKey = string;

// ─── Plugin Types (Phase 4) ───────────────────────────────────────

export interface PaneProps {
  tabId: string;
  appEntry: AppEntry;
  notify: (
    level: NotifLevel,
    message: string,
    opts?: { autoDismiss?: number }
  ) => void;
}
