import type { PaneProps, AppEntry } from "@/types";

// ─── Plugin Interface ──────────────────────────────────────────────
export interface PanePlugin {
  id: string;
  name: string;
  icon: string;
  description?: string;
  component: React.ComponentType<PaneProps>;
}

// ─── Registry (singleton) ─────────────────────────────────────────
class PluginRegistryClass {
  private plugins = new Map<string, PanePlugin>();
  private listeners: Array<() => void> = [];

  register(plugin: PanePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" already registered — skipping`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
    this.notify();
  }

  getPlugin(id: string): PanePlugin | undefined {
    return this.plugins.get(id);
  }

  listPlugins(): PanePlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Convert all registered plugins to AppEntry[] for the launcher */
  toAppEntries(): AppEntry[] {
    return this.listPlugins().map((p) => ({
      id: p.id,
      name: p.name,
      type: "plugin" as any,
      icon: p.icon,
      path: "",
    }));
  }

  subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const PluginRegistry = new PluginRegistryClass();
