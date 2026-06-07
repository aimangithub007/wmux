# Phase 3–5 Completion Summary
## Handoff Document (Final)

---

## Status: DONE ✅

Semua task Phase 3, Phase 4, dan Phase 5 telah diimplementasi.
Berikut ringkasan lengkap perubahan, keputusan arsitektur, dan checklist smoke test.

---

## File yang Diubah / Ditambah

### Phase 3A · TerminalPane (lengkap)

| File | Keterangan |
|------|-----------|
| `src/components/panes/TerminalPane.tsx` | ResizeObserver + FitAddon, PTY exit restart, idle 2s → `attention` notif, OSC 9/777 detection, Ctrl+Shift+C/V, `disposeTerminal()` |

### Phase 3B · BrowserPane

| File | Keterangan |
|------|-----------|
| `src/components/panes/BrowserPane.tsx` | Iframe viewport, address bar, back/forward/reload, history stack, URL normalisation + auto-https, loading progress bar, error banner, load/error notif |

> **Note:** Menggunakan `<iframe>` di sini. Untuk WebviewWindow penuh (spec 3B.3), lihat komentar di file — sudah disiapkan mount point + interface yang sama.

### Phase 3C · EditorPane

| File | Keterangan |
|------|-----------|
| `src/components/panes/EditorPane.tsx` | CodeMirror 6 lazy-import, language autodetect (JS/TS/Python/Rust/JSON/MD), open/save via Tauri dialog, Ctrl+S, unsaved dot, status bar, `disposeEditor()` |

### Phase 3E · App Registry Settings

| File | Keterangan |
|------|-----------|
| `src/components/ui/SettingsPanel.tsx` | Modal 3-tab: General (shortcuts read-only), Apps (CRUD + validate path + built-in guard), Notifications (toggle toast/OS, level filter, dismiss timer) |
| `src/components/ui/AppLauncher.tsx` | Merge plugin entries via `PluginRegistry.toAppEntries()` |
| `src/hooks/useAppRegistry.ts` | Expose `saveApps` (renamed dari `save`) |

### Phase 3F · Notification System

| File | Keterangan |
|------|-----------|
| `src/store/notificationStore.ts` | Zustand: `emit`, `markRead`, `clearTab`, `clearAll`, `updateSettings`; `useTabNotif(tabId)` hook; OS notif via plugin |
| `src/components/ui/TabBadge.tsx` | Dot badge berwarna per level, count badge |
| `src/components/ui/ToastManager.tsx` | Overlay kanan bawah, max 3 toast, hover-pause timer, animasi in/out |
| `src/components/ui/TabBar.tsx` | Badge + glow CSS per level tertinggi, scroll overflow arrows |

### Phase 4 · Plugin System

| File | Keterangan |
|------|-----------|
| `src/lib/pluginRegistry.ts` | Singleton: `register`, `getPlugin`, `listPlugins`, `toAppEntries`, `subscribe` |
| `src/plugins/ImageViewerPane.tsx` | Open gambar, zoom scroll wheel, zoom in/out, fit to pane |
| `src/plugins/MarkdownPreviewPane.tsx` | MD→HTML built-in (no deps), source/preview toggle, open file |
| `src/components/panes/PaneContainer.tsx` | Plugin dispatch + `notify` prop + `ErrorBoundary` per tab |
| `src/store/paneStore.ts` | `disposeTab()` lazy-import dispose terminal + editor |
| `src/types/index.ts` | `"plugin"` ditambah ke `PaneType` |
| `PLUGIN_GUIDE.md` | Dokumentasi lengkap plugin API |

### Phase 4.9 · Layout Persistence

| File | Keterangan |
|------|-----------|
| `src/App.tsx` | `loadLayout()` on mount → hydrate Zustand; `saveLayout()` debounce 500ms; window `show()` setelah splash |

### Phase 5A · UI Polish

| File | Keterangan |
|------|-----------|
| `src/components/ui/Titlebar.tsx` | OS-aware (macOS traffic lights / Windows-style), drag region, settings button, minimize/maximize/close wired ke Tauri |
| `src/components/ui/SplashScreen.tsx` | Animated loading screen, auto-dismiss 900ms, fade out |
| `src/components/ui/ErrorBoundary.tsx` | Per-tab crash isolation, Retry button |
| `src/globals.css` | Full light/dark theme CSS vars, split animation, semua `@keyframes` |

### Phase 5B · Stabilitas

| File | Keterangan |
|------|-----------|
| `src/components/ui/TabBar.tsx` | Scroll overflow arrows (canScrollLeft/Right via ResizeObserver) |
| `src/components/ui/PaneTooSmall.tsx` | Placeholder pane terlalu kecil |
| `src/store/paneStore.ts` | disposeTab pada removeTab + removePane + replaceTabApp |
| `src/components/panes/TerminalPane.tsx` | PTY crash → "press any key to restart" |

### Phase 5C · Build & Distribusi

| File | Keterangan |
|------|-----------|
| `src-tauri/tauri.conf.json` | Bundle targets, CSP, platform configs (macOS/Linux/Windows), updater stub, `visible: false` saat start (buka setelah splash) |
| `.github/workflows/build.yml` | Matrix build: ubuntu/windows/macos, tauri-action, release draft |
| `README.md` | Lengkap: install, shortcuts, app registry, plugin quick-start |
| `CHANGELOG.md` | Rincian semua perubahan Phase 1–5 |
| `package.json` | Versi `0.2.0`, deps CodeMirror ditambah |

---

## Arsitektur Penting

### Notification Flow

```
TerminalPane / BrowserPane / EditorPane / Plugin
  └── notify(level, message)          ← via PaneContainer prop
        ↓
  notificationStore.emit(tabId, level, message)
        ├── store: notifs[] diupdate
        ├── TabBar: useTabNotif → badge warna + border glow
        ├── ToastManager: subscribe → popup kanan bawah
        └── OS: sendNotification() kalau window blur + level match
```

### Plugin Flow

```
src/plugins/MyPlugin.tsx  (diimport sekali di PaneContainer)
  └── PluginRegistry.register({ id, name, icon, component })
        ↓ AppLauncher memasukkan ke daftar (PluginRegistry.toAppEntries())
        ↓ User pilih → tab.appId = plugin.id
        ↓ PaneContainer → PluginRegistry.getPlugin(id) → render <PluginComponent>
```

### Dispose Flow (memory management)

```
removeTab(paneId, tabId)
  └── disposeTab(tab)
        ├── killPty(tabId)            ← Tauri: kill OS process
        ├── disposeTerminal(tabId)    ← xterm: dispose + hapus dari Map
        └── disposeEditor(tabId)      ← CodeMirror: view.destroy() + hapus dari Map
```

### Layout Persistence Format

```json
{
  "layout": { "direction": "column", "first": "pane-abc", "second": "pane-def", "splitPercentage": 50 },
  "panes": {
    "pane-abc": { "id": "pane-abc", "tabs": [{ "id": "tab-xyz", "appId": "terminal", "title": "Terminal", "props": {} }], "activeTabId": "tab-xyz" }
  },
  "activePaneId": "pane-abc"
}
```

---

## Yang Belum / Opsional untuk Masa Depan

| Item | Catatan |
|------|---------|
| BrowserPane WebviewWindow | iframe cukup untuk dev; WebviewWindow butuh Tauri child window API yang lebih kompleks (lihat komentar di BrowserPane.tsx) |
| App icon | Belum ada icon. Buat PNG 512×512 → `tauri icon icon.png` |
| Auto-update | Stub ada di `tauri.conf.json`, tinggal isi `endpoints` dan `pubkey` |
| Shortcut kustomisasi | Saat ini read-only di Settings; bisa ditambah ke settingsStore |
| Tab drag reorder | TabBar mendukung scroll, belum drag-and-drop antar tab |
| Theme manual override | CSS var siap, tinggal tambahkan toggle di Settings → General |

---

## Checklist Smoke Test

### Phase 3
- [ ] Terminal: ketik `ls`, output muncul
- [ ] Terminal: ketik `sleep 5`, pindah tab lain → setelah 2 detik muncul badge `attention` + toast
- [ ] Terminal: ketik `false`, tab glow merah + toast "Process exited with error"
- [ ] Terminal: PTY exit → tekan sembarang key → shell baru spawn
- [ ] Terminal: Ctrl+Shift+C → copy selection; Ctrl+Shift+V → paste
- [ ] Browser: navigasi ke `google.com` → loading bar muncul → hilang
- [ ] Browser: tombol ← → berfungsi (history stack)
- [ ] Browser: URL `example` → auto → `https://example.com`
- [ ] Editor: Open `.ts` file → syntax highlight JS/TS
- [ ] Editor: Edit → dot kuning di toolbar → Ctrl+S → toast "Saved ..."
- [ ] Settings ⚙ → panel terbuka
- [ ] Settings → Apps → Add App → Save → muncul di launcher
- [ ] Settings → Apps → hapus non-built-in app
- [ ] Settings → Notifications → toggle toast off → tidak ada toast

### Phase 4
- [ ] AppLauncher → "Image Viewer" muncul → buka → ImageViewerPane muncul
- [ ] ImageViewer: open PNG → gambar muncul; scroll wheel zoom; Fit
- [ ] AppLauncher → "Markdown Preview" → buka → contoh konten ter-render
- [ ] MarkdownPreview: toggle Source/Preview
- [ ] Plugin `notify("success", "test")` → toast + badge muncul

### Phase 4.9
- [ ] Tutup window → buka lagi → layout identik (pane + tabs + posisi split)

### Phase 5
- [ ] Splash screen muncul saat startup (700ms) lalu fade out
- [ ] Titlebar: macOS traffic lights (atau Windows buttons) berfungsi
- [ ] Minimize/Maximize/Close via titlebar
- [ ] Split pane → pane baru muncul dengan animasi fade-in
- [ ] Tab ke-9+ → scroll arrows (‹ ›) muncul di TabBar
- [ ] Tab crash (throw di component) → error card muncul di tab itu, pane lain normal
- [ ] Retry button di error card → component remount

---

## File Map Lengkap

```
tiled-workspace/
├── .github/workflows/build.yml      ← CI/CD matrix build
├── CHANGELOG.md                     ← riwayat semua versi
├── FASE_3_4_SUMMARY.md              ← dokumen ini
├── PLUGIN_GUIDE.md                  ← dokumentasi plugin
├── README.md                        ← install + usage + shortcuts
├── package.json                     ← v0.2.0, CodeMirror deps
├── vite.config.ts
├── tsconfig.json / tsconfig.node.json
├── index.html
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                      ← Titlebar + Splash + layout persist
│   ├── globals.css                  ← full light/dark theme + all animations
│   │
│   ├── types/index.ts               ← "plugin" PaneType, PaneProps
│   │
│   ├── lib/
│   │   ├── tauri-bridge.ts
│   │   └── pluginRegistry.ts        ← ✨ Plugin Registry singleton
│   │
│   ├── hooks/
│   │   ├── usePty.ts
│   │   ├── useAppRegistry.ts        ← saveApps exposed
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── store/
│   │   ├── paneStore.ts             ← disposeTab on remove/replace
│   │   └── notificationStore.ts    ← ✨ Zustand notif store
│   │
│   ├── plugins/
│   │   ├── ImageViewerPane.tsx      ← ✨ contoh plugin gambar
│   │   └── MarkdownPreviewPane.tsx  ← ✨ contoh plugin markdown
│   │
│   └── components/
│       ├── panes/
│       │   ├── TerminalPane.tsx     ← complete
│       │   ├── BrowserPane.tsx      ← complete (iframe)
│       │   ├── EditorPane.tsx       ← ✨ CodeMirror 6
│       │   └── PaneContainer.tsx    ← plugins + ErrorBoundary + notify
│       └── ui/
│           ├── Titlebar.tsx         ← ✨ OS-aware (macOS/Win)
│           ├── SplashScreen.tsx     ← ✨ animated startup screen
│           ├── ErrorBoundary.tsx    ← ✨ per-tab crash isolation
│           ├── TabBar.tsx           ← badges + glow + overflow scroll
│           ├── TabBadge.tsx         ← ✨ notification dot
│           ├── ToastManager.tsx     ← ✨ toast overlay
│           ├── AppLauncher.tsx      ← plugins merged
│           ├── PaneToolbar.tsx
│           ├── PaneTooSmall.tsx     ← ✨ min-size guard placeholder
│           └── SettingsPanel.tsx    ← ✨ General + Apps + Notifications
│
└── src-tauri/
    ├── Cargo.toml                   ← unchanged
    ├── tauri.conf.json              ← production config, CSP, visible:false
    └── src/
        ├── main.rs
        ├── lib.rs                   ← unchanged
        ├── commands.rs              ← unchanged
        ├── pty.rs                   ← unchanged
        └── registry.rs             ← unchanged
```
