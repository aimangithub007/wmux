import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { loadApps, saveApps } from "@/lib/tauri-bridge";
import type { AppEntry } from "@/types";

const DEFAULT_APPS: AppEntry[] = [
  { id: "terminal", name: "Terminal", type: "terminal", path: "", icon: "ti-terminal-2", default: true },
  { id: "browser",  name: "Browser",  type: "browser",  path: "", icon: "ti-world" },
  { id: "editor",   name: "Editor",   type: "editor",   path: "", icon: "ti-code" },
  { id: "nvim",     name: "Neovim",   type: "terminal", path: "/usr/bin/nvim",    icon: "ti-terminal" },
  { id: "lazygit",  name: "Lazygit",  type: "terminal", path: "/usr/bin/lazygit", icon: "ti-git-branch" },
  { id: "btop",     name: "Btop",     type: "terminal", path: "/usr/bin/btop",    icon: "ti-cpu" },
  { id: "figma",    name: "Figma",    type: "browser",  path: "https://figma.com", icon: "ti-brand-figma" },
];

export const BUILTIN_IDS = new Set(["terminal", "browser", "editor"]);

interface AppRegistryCtx {
  apps: AppEntry[];
  defaultApp: AppEntry | undefined;
  reload: () => void;
  /** save and persist app list */
  saveApps: (apps: AppEntry[]) => Promise<void>;
}

export const AppRegistryContext = createContext<AppRegistryCtx>({
  apps: DEFAULT_APPS,
  defaultApp: DEFAULT_APPS[0],
  reload: () => {},
  saveApps: async () => {},
});

export function useAppRegistry() {
  return useContext(AppRegistryContext);
}

export function useAppRegistryProvider() {
  const [apps, setApps] = useState<AppEntry[]>(DEFAULT_APPS);

  const reload = useCallback(() => {
    loadApps()
      .then((loaded) => setApps(loaded.length ? loaded : DEFAULT_APPS))
      .catch(() => setApps(DEFAULT_APPS));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveAppsFn = useCallback(async (updated: AppEntry[]) => {
    setApps(updated);
    await saveApps(updated);
  }, []);

  const defaultApp = apps.find((a) => a.default) ?? apps[0];

  return { apps, defaultApp, reload, saveApps: saveAppsFn };
}
