import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { AppEntry } from "@/types";

// ─── PTY Commands ─────────────────────────────────────────────────

export interface SpawnPtyOptions {
  tabId: string;
  shell?: string;
  path?: string;
  args?: string[];
}

export async function spawnPty(opts: SpawnPtyOptions): Promise<void> {
  return invoke("spawn_pty", opts as unknown as Record<string, unknown>);
}

export async function ptyWrite(tabId: string, data: string): Promise<void> {
  return invoke("pty_write", { tabId, data });
}

export async function ptyResize(
  tabId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke("pty_resize", { tabId, cols, rows });
}

export async function killPty(tabId: string): Promise<void> {
  return invoke("kill_pty", { tabId });
}

// ─── PTY Events ───────────────────────────────────────────────────

export function onPtyData(
  tabId: string,
  cb: (data: string) => void
): Promise<UnlistenFn> {
  return listen<string>(`pty-data:${tabId}`, (e) => cb(e.payload));
}

export function onPtyExit(
  tabId: string,
  cb: (exitCode: number) => void
): Promise<UnlistenFn> {
  return listen<number>(`pty-exit:${tabId}`, (e) => cb(e.payload));
}

// ─── App Registry Commands ────────────────────────────────────────

export async function loadApps(): Promise<AppEntry[]> {
  return invoke("load_apps");
}

export async function saveApps(apps: AppEntry[]): Promise<void> {
  return invoke("save_apps", { apps });
}

export async function validateAppPath(path: string): Promise<boolean> {
  return invoke("validate_app_path", { path });
}

// ─── File Commands ────────────────────────────────────────────────

export async function readFile(path: string): Promise<string> {
  return invoke("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke("write_file", { path, content });
}

// ─── Layout Persistence ───────────────────────────────────────────

export async function saveLayout(layoutJson: string): Promise<void> {
  return invoke("save_layout", { layoutJson });
}

export async function loadLayout(): Promise<string | null> {
  return invoke("load_layout");
}
