import { usePaneStore } from "@/store/paneStore";

interface PaneToolbarProps {
  paneId: string;
}

export function PaneToolbar({ paneId }: PaneToolbarProps) {
  const { splitPane, removePane } = usePaneStore();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 4px",
        height: 34,
        flexShrink: 0,
      }}
    >
      <ToolBtn
        title="Split vertically (Ctrl+D)"
        onClick={() => splitPane(paneId, "row")}
      >
        ⊢
      </ToolBtn>
      <ToolBtn
        title="Split horizontally (Ctrl+E)"
        onClick={() => splitPane(paneId, "column")}
      >
        ⊤
      </ToolBtn>
      <ToolBtn
        title="Close pane (Ctrl+Shift+W)"
        onClick={() => removePane(paneId)}
        danger
      >
        ×
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        color: danger ? "var(--color-text-danger)" : "var(--color-text-tertiary)",
        padding: "2px 5px",
        borderRadius: 4,
        lineHeight: 1.3,
      }}
    >
      {children}
    </button>
  );
}
