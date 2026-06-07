import { useEffect, useCallback, useRef } from "react";
import { onPtyData, onPtyExit, ptyWrite, ptyResize, killPty } from "@/lib/tauri-bridge";
import type { UnlistenFn } from "@tauri-apps/api/event";

interface UsePtyOptions {
  tabId: string;
  onData: (data: string) => void;
  onExit?: (code: number) => void;
}

export function usePty({ tabId, onData, onExit }: UsePtyOptions) {
  const unlistenDataRef = useRef<UnlistenFn | null>(null);
  const unlistenExitRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    let mounted = true;

    onPtyData(tabId, (data) => {
      if (mounted) onData(data);
    }).then((fn) => {
      unlistenDataRef.current = fn;
    });

    onPtyExit(tabId, (code) => {
      if (mounted && onExit) onExit(code);
    }).then((fn) => {
      unlistenExitRef.current = fn;
    });

    return () => {
      mounted = false;
      unlistenDataRef.current?.();
      unlistenExitRef.current?.();
    };
  }, [tabId]);

  const write = useCallback(
    (data: string) => ptyWrite(tabId, data),
    [tabId]
  );

  const resize = useCallback(
    (cols: number, rows: number) => ptyResize(tabId, cols, rows),
    [tabId]
  );

  const kill = useCallback(() => killPty(tabId), [tabId]);

  return { write, resize, kill };
}
