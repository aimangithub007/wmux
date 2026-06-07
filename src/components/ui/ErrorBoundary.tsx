import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  tabId?: string;
  onRestart?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary — wraps each tab content.
 * A crashed tab shows an error card instead of crashing the whole pane/app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 16,
            padding: 24,
            background: "#0d1117",
          }}
        >
          <div style={{ fontSize: 32 }}>💥</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#ff7b72" }}>Tab crashed</div>
          <div
            style={{
              fontSize: 12,
              color: "#8b949e",
              fontFamily: "monospace",
              background: "#161b22",
              padding: "10px 14px",
              borderRadius: 6,
              maxWidth: 400,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {this.state.error.message}
          </div>
          <button
            onClick={() => {
              this.setState({ error: null });
              this.props.onRestart?.();
            }}
            style={{
              padding: "6px 18px",
              background: "#238636",
              border: "1px solid #2ea043",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ↺ Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
