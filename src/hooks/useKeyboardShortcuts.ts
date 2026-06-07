import { useEffect } from "react";
import { usePaneStore } from "@/store/paneStore";

export function useKeyboardShortcuts() {
  const store = usePaneStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      const { activePaneId } = store;
      if (!activePaneId) return;

      // Ctrl+D — split vertical
      if (e.key === "d" && !e.shiftKey) {
        e.preventDefault();
        store.splitPane(activePaneId, "row");
        return;
      }

      // Ctrl+E — split horizontal
      if (e.key === "e" && !e.shiftKey) {
        e.preventDefault();
        store.splitPane(activePaneId, "column");
        return;
      }

      // Ctrl+T — new tab
      if (e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        store.openLauncherForPane(activePaneId, "new");
        return;
      }

      // Ctrl+W — close active tab
      if (e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        const pane = store.panes[activePaneId];
        if (pane) store.removeTab(activePaneId, pane.activeTabId);
        return;
      }

      // Ctrl+Shift+W — close entire pane
      if (e.key === "W" && e.shiftKey) {
        e.preventDefault();
        store.removePane(activePaneId);
        return;
      }

      // Ctrl+Tab — next tab
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        store.cycleTab(activePaneId, 1);
        return;
      }

      // Ctrl+Shift+Tab — prev tab
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        store.cycleTab(activePaneId, -1);
        return;
      }

      // Ctrl+1..9 — jump to tab N
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        e.preventDefault();
        store.jumpToTab(activePaneId, num - 1);
        return;
      }

      // Ctrl+Space — open app launcher
      if (e.code === "Space") {
        e.preventDefault();
        store.openLauncherForPane(activePaneId, "replace");
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [store]);
}
