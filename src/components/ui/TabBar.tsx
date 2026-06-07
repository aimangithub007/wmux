import { useState, useRef, useCallback, useEffect } from "react";
import { usePaneStore } from "@/store/paneStore";
import { useNotificationStore, useTabNotif } from "@/store/notificationStore";
import { TabBadge } from "@/components/ui/TabBadge";
import type { PaneNode, Tab } from "@/types";

interface TabBarProps {
  paneId: string;
  pane: PaneNode;
}

export function TabBar({ paneId, pane }: TabBarProps) {
  const { setActiveTab, removeTab, renameTab, openLauncherForPane } = usePaneStore();
  const markRead = useNotificationStore((s) => s.markRead);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const startRename = useCallback((tabId: string, current: string) => {
    setEditingTabId(tabId);
    setEditValue(current);
    setTimeout(() => editRef.current?.select(), 30);
  }, []);

  const commitRename = useCallback(() => {
    if (editingTabId && editValue.trim()) {
      renameTab(paneId, editingTabId, editValue.trim());
    }
    setEditingTabId(null);
  }, [editingTabId, editValue, paneId, renameTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(paneId, tabId);
    markRead(tabId);
  };

  // ── Scroll overflow detection ──────────────────────────────────
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [pane.tabs.length, checkScroll]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", height: 38, background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)", flexShrink: 0 }}>
      {/* Left scroll arrow */}
      {canScrollLeft && (
        <button onClick={() => scrollBy(-120)} style={scrollArrowStyle}>‹</button>
      )}

      {/* Scrollable tab strip */}
      <div
        ref={scrollRef}
        style={{ display: "flex", alignItems: "center", flex: 1, overflowX: "auto", scrollbarWidth: "none", userSelect: "none" }}
      >
        {pane.tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            paneId={paneId}
            active={tab.id === pane.activeTabId}
            editing={editingTabId === tab.id}
            editValue={editValue}
            editRef={editRef}
            onActivate={handleTabClick}
            onDoubleClick={() => startRename(tab.id, tab.title)}
            onEditChange={setEditValue}
            onCommitRename={commitRename}
            onCancelRename={() => setEditingTabId(null)}
            onChangeLauncher={() => openLauncherForPane(paneId, "replace", tab.id)}
            onClose={() => removeTab(paneId, tab.id)}
          />
        ))}

        {/* New tab button */}
        <button
          onClick={() => openLauncherForPane(paneId, "new")}
          title="New tab (Ctrl+T)"
          style={{ ...iconBtnStyle, padding: "0 10px", height: "100%", fontSize: 16, flexShrink: 0 }}
        >
          +
        </button>
      </div>

      {/* Right scroll arrow */}
      {canScrollRight && (
        <button onClick={() => scrollBy(120)} style={scrollArrowStyle}>›</button>
      )}
    </div>
  );
}

function TabItem({
  tab,
  active,
  editing,
  editValue,
  editRef,
  onActivate,
  onDoubleClick,
  onEditChange,
  onCommitRename,
  onCancelRename,
  onChangeLauncher,
  onClose,
}: {
  tab: Tab;
  paneId: string;
  active: boolean;
  editing: boolean;
  editValue: string;
  editRef: React.RefObject<HTMLInputElement>;
  onActivate: (id: string) => void;
  onDoubleClick: () => void;
  onEditChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onChangeLauncher: () => void;
  onClose: () => void;
}) {
  const { unread, highestLevel } = useTabNotif(tab.id);
  const glowLevel = highestLevel && ["warning", "error", "attention"].includes(highestLevel) ? highestLevel : null;

  const GLOW_COLORS: Record<string, string> = {
    warning: "#d29922",
    error: "#ff7b72",
    attention: "#e3b341",
  };

  return (
    <div
      onClick={() => onActivate(tab.id)}
      onDoubleClick={onDoubleClick}
      title={tab.title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 8px",
        height: "100%",
        fontSize: 14,
        whiteSpace: "nowrap",
        cursor: "pointer",
        color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        background: active ? "#0d1117" : "transparent",
        borderRight: "1px solid var(--color-border-tertiary)",
        borderBottom: active
          ? "2px solid #58a6ff"
          : glowLevel
          ? `2px solid ${GLOW_COLORS[glowLevel]}`
          : "2px solid transparent",
        boxShadow: glowLevel && !active ? `0 1px 6px ${GLOW_COLORS[glowLevel]}60` : undefined,
        minWidth: 0,
        maxWidth: 160,
        transition: "border-bottom 0.2s, box-shadow 0.2s",
        flexShrink: 0,
      }}
    >
      {editing ? (
        <input
          ref={editRef}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 80, fontSize: 12, border: "1px solid var(--color-border-info)", borderRadius: 3, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", padding: "1px 4px" }}
        />
      ) : (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
          {tab.title}
        </span>
      )}

      {/* Badge */}
      {unread.length > 0 && highestLevel && !active && (
        <TabBadge level={highestLevel} count={unread.length} />
      )}

      <button onClick={(e) => { e.stopPropagation(); onChangeLauncher(); }} title="Change app" style={iconBtnStyle}>▾</button>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close tab" style={iconBtnStyle}>×</button>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#8b949e",
  fontSize: 14,
  padding: "2px 5px",
  borderRadius: 3,
  lineHeight: 1,
  flexShrink: 0,
};

const scrollArrowStyle: React.CSSProperties = {
  background: "var(--color-background-secondary)",
  border: "none",
  borderRight: "1px solid var(--color-border-tertiary)",
  cursor: "pointer",
  color: "var(--color-text-secondary)",
  fontSize: 16,
  padding: "0 6px",
  height: "100%",
  flexShrink: 0,
};
