import { useEffect, useState, useRef } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import type { TabNotif, NotifLevel } from "@/types";

const LEVEL_ICONS: Record<NotifLevel, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
  attention: "●",
};

const LEVEL_COLORS: Record<NotifLevel, { bg: string; border: string; icon: string }> = {
  info:      { bg: "#161b22", border: "#30363d", icon: "#8b949e" },
  success:   { bg: "#0d2318", border: "#1a4731", icon: "#3fb950" },
  warning:   { bg: "#2d1e0f", border: "#4a3319", icon: "#d29922" },
  error:     { bg: "#2d1010", border: "#5a1a1a", icon: "#ff7b72" },
  attention: { bg: "#0d1c2d", border: "#1a3a5c", icon: "#58a6ff" },
};

interface ToastItem {
  notif: TabNotif;
  visible: boolean;
  paused: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
  dismissAt: number;
  tabName?: string;
}

const MAX_TOASTS = 3;

export function ToastManager() {
  const notifs = useNotificationStore((s) => s.notifs);
  const settings = useNotificationStore((s) => s.settings);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    if (!settings.enableToast) return;
    const recent = notifs.filter((n) => !seenIds.current.has(n.id));
    if (recent.length === 0) return;

    recent.forEach((n) => {
      seenIds.current.add(n.id);
      const duration = n.autoDismiss ?? settings.toastDuration;
      const item: ToastItem = {
        notif: n,
        visible: true,
        paused: false,
        timeoutId: null,
        dismissAt: Date.now() + duration,
      };

      setToasts((prev) => {
        const next = [...prev, item].slice(-MAX_TOASTS);
        return next;
      });

      // Auto-dismiss
      const tid = setTimeout(() => dismissToast(n.id), duration);
      item.timeoutId = tid;
    });
  }, [notifs, settings.enableToast, settings.toastDuration]);

  const dismissToast = (notifId: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.notif.id === notifId ? { ...t, visible: false } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.notif.id !== notifId));
    }, 300);
  };

  const pauseToast = (notifId: string) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.notif.id !== notifId) return t;
        if (t.timeoutId) clearTimeout(t.timeoutId);
        return { ...t, paused: true, timeoutId: null };
      })
    );
  };

  const resumeToast = (notifId: string) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.notif.id !== notifId || !t.paused) return t;
        const remaining = Math.max(0, t.dismissAt - Date.now());
        const tid = setTimeout(() => dismissToast(notifId), remaining);
        return { ...t, paused: false, timeoutId: tid };
      })
    );
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const c = LEVEL_COLORS[t.notif.level];
        return (
          <div
            key={t.notif.id}
            onMouseEnter={() => pauseToast(t.notif.id)}
            onMouseLeave={() => resumeToast(t.notif.id)}
            style={{
              pointerEvents: "auto",
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              minWidth: 260,
              maxWidth: 360,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "0 4px 16px #00000040",
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.25s, transform 0.25s",
            }}
          >
            <span style={{ fontSize: 16, color: c.icon, flexShrink: 0, marginTop: 1 }}>
              {LEVEL_ICONS[t.notif.level]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#e6edf3", lineHeight: 1.4, wordBreak: "break-word" }}>
                {t.notif.message}
              </div>
              <div style={{ fontSize: 11, color: "#484f58", marginTop: 2 }}>
                {new Date(t.notif.ts).toLocaleTimeString()} · {t.notif.level}
              </div>
            </div>
            <button
              onClick={() => dismissToast(t.notif.id)}
              style={{
                background: "none",
                border: "none",
                color: "#484f58",
                cursor: "pointer",
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
