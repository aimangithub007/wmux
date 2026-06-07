import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import { usePty } from "@/hooks/usePty";
import { spawnPty } from "@/lib/tauri-bridge";
import { useNotificationStore } from "@/store/notificationStore";
import type { AppEntry } from "@/types";
import "xterm/css/xterm.css";

// ─── Terminal instance cache (survive tab switches) ───────────────
const termCache = new Map<
  string,
  { term: Terminal; fit: FitAddon; search: SearchAddon }
>();

interface TerminalPaneProps {
  tabId: string;
  appEntry: AppEntry;
  isActive: boolean;
  fontFamily?: string;
  fontSize?: number;
}

export function TerminalPane({
  tabId,
  appEntry,
  isActive,
  fontFamily = '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
  fontSize = 14,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spawnedRef = useRef(false);
  const mountedRef = useRef(false);
  const lastOutputRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emit = useNotificationStore((s) => s.emit);

  // ── Get or create terminal instance ──────────────────────────────
  if (!termCache.has(tabId)) {
    const term = new Terminal({
      cursorBlink: true,
      fontFamily,
      fontSize,
      lineHeight: 1.25,
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#484f58",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(search);
    termCache.set(tabId, { term, fit, search });
  }

  const { term, fit } = termCache.get(tabId)!;

  // ── PTY hook — setup listeners BEFORE spawn ────────────────────
  const { write, resize, kill } = usePty({
    tabId,
    onData: (data) => {
      term.write(data);
      lastOutputRef.current = Date.now();

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (!isActive) {
        idleTimerRef.current = setTimeout(() => {
          emit(tabId, "attention", "Process waiting — check this terminal");
        }, 2000);
      }

      if (data.includes("\x1b]9;") || data.includes("\x1b]777;")) {
        emit(tabId, "attention", "Process finished");
      }
    },
    onExit: (code) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      const color = code === 0 ? "32" : "31";
      term.writeln(
        `\r\n\x1b[${color}m[Process exited with code ${code}]\x1b[0m\r\n\x1b[33m[Press any key to restart]\x1b[0m`
      );
      if (code === 0) {
        emit(tabId, "success", "Process finished successfully");
      } else {
        emit(tabId, "error", `Process exited with error (code ${code})`);
      }

      const restart = term.onData(() => {
        restart.dispose();
        spawnPty({ tabId, shell: appEntry.path || undefined, args: appEntry.args }).catch(console.error);
      });
    },
  });

  // ── Mount terminal DOM + spawn PTY ────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Mount xterm DOM only once
    if (!mountedRef.current) {
      mountedRef.current = true;
      term.open(el);

      // Small delay to ensure DOM is ready before fit+spawn
      setTimeout(() => {
        try { fit.fit(); } catch {}
        const { cols, rows } = term;
        resize(cols, rows);

        // Spawn PTY after xterm is ready
        if (!spawnedRef.current) {
          spawnedRef.current = true;
          const shell = appEntry.path || undefined;
          const args = appEntry.args;
          spawnPty({ tabId, shell, args })
            .then(() => {
              // Force fit after PTY ready
              setTimeout(() => { try { fit.fit(); resize(term.cols, term.rows); } catch {} }, 100);
            })
            .catch(console.error);
        }
      }, 50);
    }

    // Forward keyboard input to PTY
    const d = term.onData((data) => write(data));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        const sel = term.getSelection();
        if (sel) navigator.clipboard.writeText(sel).catch(() => {});
      }
    };
    el.addEventListener("keydown", handleKeyDown);

    return () => {
      d.dispose();
      el.removeEventListener("keydown", handleKeyDown);
    };
  }, [tabId]);

  // ── Paste: Ctrl+Shift+V ────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isActive) return;
    const handlePaste = async (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text");
      if (text) write(text);
    };
    const canvas = el.querySelector("canvas");
    canvas?.addEventListener("paste", handlePaste as unknown as EventListener);
    return () => canvas?.removeEventListener("paste", handlePaste as unknown as EventListener);
  }, [isActive, tabId]);

  // ── Fit on resize via ResizeObserver ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
        resize(term.cols, term.rows);
      } catch {}
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Refocus when tab becomes active ──────────────────────────────
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        try { fit.fit(); resize(term.cols, term.rows); } catch {}
        term.focus();
      }, 30);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#0d1117",
        // Always keep in DOM, just hide — preserves xterm canvas
        visibility: isActive ? "visible" : "hidden",
        position: "absolute",
        inset: 0,
      }}
    />
  );
}

/** Dispose xterm instance when tab is permanently removed */
export function disposeTerminal(tabId: string) {
  const cached = termCache.get(tabId);
  if (cached) {
    cached.term.dispose();
    termCache.delete(tabId);
  }
}
