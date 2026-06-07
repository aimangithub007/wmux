import type { NotifLevel } from "@/types";

const LEVEL_COLORS: Record<NotifLevel, string> = {
  info: "#8b949e",
  success: "#3fb950",
  warning: "#d29922",
  error: "#ff7b72",
  attention: "#58a6ff",
};

interface TabBadgeProps {
  level: NotifLevel;
  count?: number;
}

export function TabBadge({ level, count }: TabBadgeProps) {
  const color = LEVEL_COLORS[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: count && count > 1 ? "auto" : 7,
        height: 7,
        minWidth: 7,
        borderRadius: 9999,
        background: color,
        fontSize: 9,
        fontWeight: 700,
        color: "#0d1117",
        padding: count && count > 1 ? "0 3px" : 0,
        marginLeft: 3,
        verticalAlign: "middle",
        boxShadow: level === "error" || level === "attention" ? `0 0 4px ${color}` : undefined,
        flexShrink: 0,
      }}
    >
      {count && count > 1 ? count : ""}
    </span>
  );
}
