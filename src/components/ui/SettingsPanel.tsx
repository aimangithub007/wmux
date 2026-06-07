import { useState, useCallback } from "react";
import { useAppRegistry } from "@/hooks/useAppRegistry";
import { useNotificationStore } from "@/store/notificationStore";
import { validateAppPath } from "@/lib/tauri-bridge";
import type { AppEntry, NotifLevel } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ─── Built-in IDs that cannot be deleted ──────────────────────────
const BUILTIN_IDS = new Set(["terminal", "browser", "editor"]);

// ─── Sub-panel types ──────────────────────────────────────────────
type Tab = "general" | "apps" | "notifications";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>("general");

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8000,
        background: "#00000080",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 10,
          width: 680,
          maxWidth: "95vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px #00000060",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid #30363d",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: "#e6edf3" }}>Settings</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{ width: 160, borderRight: "1px solid #30363d", padding: "12px 0", flexShrink: 0 }}>
            {(["general", "apps", "notifications"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 20px",
                  background: tab === t ? "#1f2937" : "none",
                  border: "none",
                  color: tab === t ? "#e6edf3" : "#8b949e",
                  cursor: "pointer",
                  fontSize: 13,
                  textTransform: "capitalize",
                  borderLeft: tab === t ? "2px solid #58a6ff" : "2px solid transparent",
                  transition: "all 0.1s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
            {tab === "general" && <GeneralTab />}
            {tab === "apps" && <AppsTab />}
            {tab === "notifications" && <NotificationsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────
function GeneralTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="Shortcuts (read-only)">
        {[
          ["Ctrl+D", "Split pane vertical"],
          ["Ctrl+E", "Split pane horizontal"],
          ["Ctrl+T", "New tab"],
          ["Ctrl+W", "Close tab"],
          ["Ctrl+Shift+W", "Close pane"],
          ["Ctrl+Tab", "Next tab"],
          ["Ctrl+Shift+Tab", "Previous tab"],
          ["Ctrl+1–9", "Jump to tab N"],
          ["Ctrl+Space", "Global launcher"],
        ].map(([key, desc]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #21262d" }}>
            <code style={{ fontSize: 12, color: "#58a6ff", background: "#0d1117", padding: "1px 6px", borderRadius: 3 }}>{key}</code>
            <span style={{ fontSize: 13, color: "#8b949e" }}>{desc}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ─── Apps Tab ─────────────────────────────────────────────────────
function AppsTab() {
  const { apps, saveApps } = useAppRegistry();
  const [editing, setEditing] = useState<Partial<AppEntry> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

  const startAdd = () => {
    setEditId(null);
    setEditing({ id: "", name: "", type: "terminal", path: "", icon: "ti-terminal", args: [] });
    setPathError(null);
  };

  const startEdit = (app: AppEntry) => {
    setEditId(app.id);
    setEditing({ ...app });
    setPathError(null);
  };

  const cancel = () => { setEditing(null); setEditId(null); };

  const saveEntry = async () => {
    if (!editing?.name || !editing?.type) return;
    setValidating(true);
    const path = editing.path || "";
    if (path) {
      const valid = await validateAppPath(path);
      if (!valid) { setPathError("Path not found or not executable"); setValidating(false); return; }
    }
    setPathError(null);
    const entry: AppEntry = {
      id: editId || uuidv4().slice(0, 8),
      name: editing.name!,
      type: editing.type as any,
      path: editing.path || undefined,
      args: editing.args?.filter(Boolean),
      icon: editing.icon || (editing.type === "terminal" ? "ti-terminal" : editing.type === "browser" ? "ti-world" : "ti-code"),
    };
    let updated: AppEntry[];
    if (editId) {
      updated = apps.map((a) => (a.id === editId ? entry : a));
    } else {
      updated = [...apps, entry];
    }
    await saveApps(updated);
    cancel();
    setValidating(false);
  };

  const deleteApp = async (id: string) => {
    if (BUILTIN_IDS.has(id)) return;
    await saveApps(apps.filter((a) => a.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3" }}>App Registry</span>
        <button onClick={startAdd} style={btnPrimary}>+ Add App</button>
      </div>

      {/* Add/Edit form */}
      {editing && (
        <div style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>{editId ? "Edit App" : "Add App"}</div>
          <FormRow label="Name">
            <input value={editing.name || ""} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="e.g. Neovim" />
          </FormRow>
          <FormRow label="Type">
            <select value={editing.type || "terminal"} onChange={(e) => setEditing((p) => ({ ...p, type: e.target.value as any }))} style={inputStyle}>
              <option value="terminal">Terminal</option>
              <option value="browser">Browser</option>
              <option value="editor">Editor</option>
            </select>
          </FormRow>
          <FormRow label="Path / URL">
            <input value={editing.path || ""} onChange={(e) => setEditing((p) => ({ ...p, path: e.target.value }))} style={inputStyle} placeholder="/usr/bin/nvim or https://..." />
          </FormRow>
          {pathError && <div style={{ color: "#ff7b72", fontSize: 12 }}>⚠ {pathError}</div>}
          <FormRow label="Args">
            <input
              value={(editing.args || []).join(" ")}
              onChange={(e) => setEditing((p) => ({ ...p, args: e.target.value.split(" ").filter(Boolean) }))}
              style={inputStyle}
              placeholder="Optional arguments"
            />
          </FormRow>
          <FormRow label="Icon">
            <input value={editing.icon || ""} onChange={(e) => setEditing((p) => ({ ...p, icon: e.target.value }))} style={inputStyle} placeholder="ti-terminal" />
          </FormRow>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={cancel} style={btnSecondary}>Cancel</button>
            <button onClick={saveEntry} disabled={validating || !editing.name} style={btnPrimary}>
              {validating ? "Validating…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* App list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {apps.map((app) => (
          <div
            key={app.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              background: "#0d1117",
              borderRadius: 6,
              border: "1px solid #21262d",
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center", color: "#8b949e" }}>
              {app.type === "terminal" ? "⊟" : app.type === "browser" ? "🌐" : "📝"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500 }}>{app.name}</div>
              <div style={{ fontSize: 11, color: "#484f58", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {app.path || "(built-in)"} · {app.type}
              </div>
            </div>
            <button onClick={() => startEdit(app)} style={iconBtn} title="Edit">✏</button>
            {!BUILTIN_IDS.has(app.id) && (
              <button onClick={() => deleteApp(app.id)} style={{ ...iconBtn, color: "#ff7b72" }} title="Delete">🗑</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────
function NotificationsTab() {
  const { settings, updateSettings } = useNotificationStore();

  const LEVELS: NotifLevel[] = ["info", "success", "warning", "error", "attention"];

  const toggleOsLevel = (level: NotifLevel) => {
    const current = settings.osLevels;
    const next = current.includes(level) ? current.filter((l) => l !== level) : [...current, level];
    updateSettings({ osLevels: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="In-app Notifications">
        <ToggleRow
          label="Enable toast notifications"
          value={settings.enableToast}
          onChange={(v) => updateSettings({ enableToast: v })}
        />
        {settings.enableToast && (
          <FormRow label="Auto-dismiss (ms)">
            <input
              type="number"
              value={settings.toastDuration}
              min={1000}
              max={30000}
              step={500}
              onChange={(e) => updateSettings({ toastDuration: Number(e.target.value) })}
              style={{ ...inputStyle, width: 100 }}
            />
          </FormRow>
        )}
      </Section>

      <Section title="OS Notifications">
        <ToggleRow
          label="Enable OS notifications"
          value={settings.enableOs}
          onChange={(v) => updateSettings({ enableOs: v })}
        />
        {settings.enableOs && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 8 }}>Fire OS notification for levels:</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleOsLevel(level)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 12,
                    border: "1px solid",
                    cursor: "pointer",
                    fontSize: 12,
                    borderColor: settings.osLevels.includes(level) ? "#58a6ff" : "#30363d",
                    background: settings.osLevels.includes(level) ? "#0d1c2d" : "transparent",
                    color: settings.osLevels.includes(level) ? "#58a6ff" : "#8b949e",
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#58a6ff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <label style={{ fontSize: 12, color: "#8b949e", width: 80, flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "#c9d1d9" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          border: "none",
          background: value ? "#1a7f37" : "#30363d",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: value ? 18 : 3,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 10px",
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: 5,
  color: "#e6edf3",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "5px 14px",
  background: "#238636",
  border: "1px solid #2ea043",
  borderRadius: 5,
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const btnSecondary: React.CSSProperties = {
  padding: "5px 14px",
  background: "none",
  border: "1px solid #30363d",
  borderRadius: 5,
  color: "#8b949e",
  cursor: "pointer",
  fontSize: 13,
};

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#8b949e",
  fontSize: 14,
  padding: "2px 6px",
};
