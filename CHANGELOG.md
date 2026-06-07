# Changelog

## [0.2.0] — Phase 3–5 (current)

### Added
- **Phase 3A — TerminalPane (complete):** ResizeObserver fit, PTY exit handler with restart, idle-detection notifications, Ctrl+Shift+C/V copy-paste, xterm dispose
- **Phase 3B — BrowserPane:** Address bar with back/forward/reload, URL normalization, iframe viewport, loading progress bar, error banner, load notifications
- **Phase 3C — EditorPane:** CodeMirror 6 with lazy import, auto language detection (JS/TS, Python, Rust, JSON, Markdown), open/save via Tauri dialog, Ctrl+S, unsaved indicator
- **Phase 3E — Settings Panel:** ⚙ button in titlebar → modal with three tabs: General (shortcut reference), Apps (full CRUD for app registry), Notifications (toggle toast/OS, level filter, dismiss timer)
- **Phase 3F — Notification System:**
  - `NotificationStore` (Zustand): emit, markRead, clearTab, clearAll, settings
  - `TabBadge`: coloured dot per unread notification level
  - `ToastManager`: fixed overlay, stacked toasts, hover-pause, auto-dismiss, animated
  - Tab glow: border + shadow pulse on warning/error/attention levels
  - OS notifications via `@tauri-apps/plugin-notification` (only when window blurred)
- **Phase 4 — Plugin System:**
  - `PluginRegistry` singleton: register, getPlugin, listPlugins, toAppEntries
  - Example plugin: `ImageViewerPane` (open image, zoom scroll, fit)
  - Example plugin: `MarkdownPreviewPane` (render MD→HTML, source/preview toggle)
  - Plugin entries merged into AppLauncher search
  - `PLUGIN_GUIDE.md` — developer documentation
- **Phase 4.9 — Layout Persistence:** Full workspace state (layout + panes + tabs) saved to `~/.config/tiled-workspace/layout.json` on change (debounced 500ms), restored on next launch
- **Phase 5A — UI Polish:**
  - `Titlebar` component: OS-aware (macOS traffic lights vs Windows-style controls), settings button, drag region
  - `SplashScreen`: animated loading screen on app startup
  - `ErrorBoundary`: per-tab crash isolation — crashed tab shows error card, other tabs unaffected
  - Split pane appearance animation (150ms ease)
  - Complete light/dark theme CSS variables (auto via `prefers-color-scheme`, manual override via `data-theme`)
- **Phase 5B — Stability:**
  - Tab overflow: scroll arrows appear when tabs exceed viewport width
  - `PaneTooSmall` placeholder for panes below minimum usable size
  - PTY crash → "Process exited" message + press-any-key restart
  - xterm + CodeMirror instances properly disposed on tab close
- **Phase 5C — Build & Distribution:**
  - GitHub Actions workflow: Ubuntu / Windows / macOS matrix build
  - `tauri.conf.json` production config: CSP, bundle targets, platform-specific settings
  - Auto-update config stub (disabled by default, ready to enable)

### Changed
- `PaneContainer`: now passes `notify` prop to all pane types + plugins; wraps each tab in `ErrorBoundary`
- `TabBar`: badge + glow display from notification store; scroll overflow arrows
- `paneStore.removeTab/removePane`: properly calls `disposeTerminal` + `disposeEditor` to free memory
- `useAppRegistry`: exposes `saveApps` (was `save`) for consistency with Tauri command naming
- `types/index.ts`: added `"plugin"` to `PaneType`
- `package.json`: bumped to `0.2.0`, added all `@codemirror/*` dependencies

## [0.1.0] — Phase 1–2 (initial)

- Project scaffold (Tauri 2 + React + TypeScript + Vite)
- PTY system: spawn/write/resize/kill, background reader thread, event emission
- `TerminalPane` with xterm.js + FitAddon + WebLinksAddon + SearchAddon
- Mosaic split engine: unlimited H/V recursive splits, drag resize
- `TabBar` with rename, dropdown launcher, close
- `AppLauncher` modal with keyboard navigation
- `PaneToolbar` (split V/H, close pane)
- Zustand `paneStore` with full layout + tab state
- Keyboard shortcuts: Ctrl+D/E/T/W/Shift+W/Tab/1–9/Space
- App Registry: `apps.json` in `~/.config/tiled-workspace/`, CRUD commands
- Custom titlebar with drag region
- CSS variables for light/dark theming
