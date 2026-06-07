import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { TabNotif, NotifLevel } from "@/types";

// ─── Settings ─────────────────────────────────────────────────────
export interface NotifSettings {
  enableToast: boolean;
  enableOs: boolean;
  toastDuration: number; // ms
  osLevels: NotifLevel[];
}

const defaultSettings: NotifSettings = {
  enableToast: true,
  enableOs: true,
  toastDuration: 4000,
  osLevels: ["error", "attention"],
};

// ─── Store ────────────────────────────────────────────────────────
interface NotificationStore {
  notifs: TabNotif[];
  settings: NotifSettings;

  emit: (tabId: string, level: NotifLevel, message: string, opts?: { autoDismiss?: number }) => void;
  markRead: (tabId: string) => void;
  clearTab: (tabId: string) => void;
  clearAll: () => void;
  updateSettings: (partial: Partial<NotifSettings>) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifs: [],
  settings: defaultSettings,

  emit: (tabId, level, message, opts) => {
    const { settings } = get();
    const notif: TabNotif = {
      id: uuidv4(),
      tabId,
      level,
      message,
      ts: Date.now(),
      read: false,
      autoDismiss: opts?.autoDismiss,
    };

    set((s) => ({ notifs: [...s.notifs.slice(-99), notif] }));

    // OS notification (fire-and-forget, only if window not focused)
    if (settings.enableOs && settings.osLevels.includes(level)) {
      fireOsNotif(notif);
    }
  },

  markRead: (tabId) => {
    set((s) => ({
      notifs: s.notifs.map((n) => (n.tabId === tabId ? { ...n, read: true } : n)),
    }));
  },

  clearTab: (tabId) => {
    set((s) => ({ notifs: s.notifs.filter((n) => n.tabId !== tabId) }));
  },

  clearAll: () => set({ notifs: [] }),

  updateSettings: (partial) => {
    set((s) => ({ settings: { ...s.settings, ...partial } }));
  },
}));

// ─── OS notification helper ───────────────────────────────────────
async function fireOsNotif(notif: TabNotif) {
  try {
    // Check focus first
    if (document.hasFocus()) return;

    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    const icons: Record<NotifLevel, string> = {
      info: "ℹ",
      success: "✓",
      warning: "⚠",
      error: "✕",
      attention: "●",
    };
    await sendNotification({
      title: `Tiled Workspace — ${icons[notif.level]} ${notif.level.toUpperCase()}`,
      body: notif.message,
    });
  } catch {
    // Plugin not available or permission denied — silently ignore
  }
}

// ─── Hook for per-tab notif ───────────────────────────────────────
export function useTabNotif(tabId: string) {
  const notifs = useNotificationStore((s) => s.notifs.filter((n) => n.tabId === tabId && !n.read));
  const unread = notifs;
  const highestLevel: NotifLevel | null = highestOf(unread.map((n) => n.level));
  return { unread, highestLevel };
}

const LEVEL_ORDER: NotifLevel[] = ["info", "success", "warning", "attention", "error"];
function highestOf(levels: NotifLevel[]): NotifLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((best, l) =>
    LEVEL_ORDER.indexOf(l) > LEVEL_ORDER.indexOf(best) ? l : best
  );
}
