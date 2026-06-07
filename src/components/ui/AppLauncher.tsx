import { useState, useEffect, useRef, useCallback } from "react";
import { useAppRegistry } from "@/hooks/useAppRegistry";
import { usePaneStore } from "@/store/paneStore";
import { PluginRegistry } from "@/lib/pluginRegistry";
import type { AppEntry } from "@/types";

export function AppLauncher() {
  const { launcher, closeLauncher, confirmLauncher } = usePaneStore();
  const { apps } = useAppRegistry();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge registry apps + plugins
  const allApps: AppEntry[] = [
    ...apps,
    ...PluginRegistry.toAppEntries().filter((p) => !apps.find((a) => a.id === p.id)),
  ];

  const filtered = allApps.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.id.toLowerCase().includes(query.toLowerCase()) ||
      a.type.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    if (launcher) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [launcher]);

  const confirm = useCallback(
    (entry: AppEntry) => {
      confirmLauncher(entry);
    },
    [confirmLauncher]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { if (filtered[selected]) confirm(filtered[selected]); }
    else if (e.key === "Escape") closeLauncher();
  };

  if (!launcher) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "#00000070", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}
      onClick={(e) => e.target === e.currentTarget && closeLauncher()}
    >
      <div
        style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, width: 480, maxWidth: "95vw", overflow: "hidden", boxShadow: "0 16px 64px #00000060" }}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #21262d" }}>
          <span style={{ fontSize: 14, color: "#8b949e", marginRight: 8 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search apps…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "#e6edf3" }}
          />
          <span style={{ fontSize: 11, color: "#484f58" }}>Esc to close</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "20px 16px", color: "#484f58", fontSize: 13, textAlign: "center" }}>No apps found</div>
          ) : (
            filtered.map((app, i) => (
              <div
                key={app.id}
                onClick={() => confirm(app)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: i === selected ? "#1f2937" : "transparent",
                  borderLeft: i === selected ? "2px solid #58a6ff" : "2px solid transparent",
                  transition: "background 0.08s",
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center", color: "#8b949e" }}>
                  {app.type === "terminal" ? "⊟" : app.type === "browser" ? "🌐" : app.type === "editor" ? "📝" : "🧩"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500 }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: "#484f58" }}>{app.type}{app.path && ` · ${app.path}`}</div>
                </div>
                {i === selected && (
                  <span style={{ fontSize: 11, color: "#8b949e", background: "#0d1117", padding: "2px 6px", borderRadius: 3 }}>↵</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
