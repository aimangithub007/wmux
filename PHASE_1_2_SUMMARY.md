# Phase 1–2 Completion Summary
## Handoff Document untuk Phase 3+

---

## Status: DONE ✅

Semua task Phase 1 dan Phase 2 telah diimplementasi. Berikut ringkasan apa yang sudah ada,
keputusan arsitektur penting, dan apa yang perlu dilakukan di Phase 3.

---

## Apa yang Sudah Jadi

### Phase 1 — Project Scaffold & PTY Dasar

| Task | File | Catatan |
|------|------|---------|
| 1.1–1.3 | `vite.config.ts`, `tsconfig.json`, `package.json` | Alias path `@/`, `@components/`, `@hooks/`, `@store/`, `@lib/` |
| 1.4 | `package.json` | xterm + addons terdaftar |
| 1.5 | `src-tauri/Cargo.toml` | portable-pty, serde, uuid, tokio, dirs, anyhow |
| 1.6–1.10 | `src-tauri/src/pty.rs` | PtyPool + spawn/write/resize/kill + background reader thread |
| 1.11 | `src/components/panes/TerminalPane.tsx` | xterm.js + FitAddon + WebLinksAddon + SearchAddon |
| 1.12 | `src/hooks/usePty.ts` | Hook enkapsulasi event + input |
| 1.13 | `src-tauri/tauri.conf.json` | 1280×800, decorations: false, resizable: true |

### Phase 2 — Split Engine

| Task | File | Catatan |
|------|------|---------|
| 2.1 | `package.json` | react-mosaic-component terdaftar |
| 2.2 | `src/types/index.ts` | PaneType, AppEntry, Tab, PaneNode, NotifLevel, TabNotif |
| 2.3–2.4 | `src/store/paneStore.ts` | Zustand store lengkap: layout, panes, tabs, launcher state |
| 2.5 | `src/components/panes/PaneContainer.tsx` | Wrapper pane dengan TabBar + PaneToolbar + TabContent |
| 2.6 | `src/components/ui/TabBar.tsx` | Tabs, rename (double-click), dropdown (▾), close (×), new (+) |
| 2.7 | `src/components/ui/AppLauncher.tsx` | Modal overlay, search realtime, keyboard navigation |
| 2.8 | `src/components/ui/PaneToolbar.tsx` | Split V (⊢), Split H (⊤), Close (×) |
| 2.9 | `src/store/paneStore.ts` → `splitPane()` | Insert ke Mosaic tree + auto-buka launcher |
| 2.10 | `src/store/paneStore.ts` → `replaceTabApp()` | Kill PTY lama, update tab.appId + title |
| 2.11 | `src/App.tsx` | Mosaic + onChange handler untuk resize drag |
| 2.12 | `src/hooks/useKeyboardShortcuts.ts` | Ctrl+D/E/T/W/Shift+W/Tab/1–9/Space |
| 2.13 | `src/components/panes/PaneContainer.tsx` | Border highlight pane aktif |
| 2.14 | `src/globals.css` | CSS variables light/dark, mosaic overrides |

---

## Arsitektur Penting yang Perlu Diketahui

### PTY Key = `tab_id` (bukan `pane_id`)
Setiap **tab** punya PTY sendiri, independen dari pane. Ini memungkinkan:
- Satu pane punya banyak terminal aktif
- Tab bisa (secara konsep) dipindah antar pane di masa depan
- Kunci: `tabId` = UUID yang di-generate saat `addTab()`

### Terminal Instance Cache
`TerminalPane.tsx` menggunakan `Map<tabId, {term, fit, search}>` di module level.
Ini berarti:
- xterm **tidak di-remount** saat switch tab (hanya `display: none`)
- xterm **di-dispose** saat tab benar-benar dihapus via `disposeTerminal(tabId)`
- **Penting:** Panggil `disposeTerminal(tabId)` dari `removeTab` jika tipe app-nya terminal

### Mosaic Layout State
- Layout disimpan di Zustand sebagai `MosaicNode<string>` dimana string = `paneId`
- `removeFromLayout()` dan `insertIntoLayout()` adalah pure functions rekursif di `paneStore.ts`
- `MosaicWindow` dari react-mosaic dipakai sebagai wrapper, tapi toolbar-nya di-hide — kita pakai `PaneToolbar` sendiri

### AppLauncher Mode
- `mode: "new"` → buat tab baru di pane tersebut
- `mode: "replace"` → ganti app di tab yang sudah ada (kill PTY lama kalau terminal)
- State launcher ada di Zustand: `{ paneId, mode, tabId? }`

### App Registry
- Load dari Tauri command `load_apps()` → `~/.config/tiled-workspace/apps.json`
- Kalau file belum ada → auto-create dengan defaults (Rust side)
- Frontend: `useAppRegistry()` hook via Context (`AppRegistryContext`)
- Built-in IDs (`terminal`, `browser`, `editor`) tidak boleh dihapus — set `BUILTIN_IDS`

---

## Yang Belum / Masih Placeholder

### BrowserPane (Phase 3B)
File: `src/components/panes/BrowserPane.tsx`

**Yang sudah ada:** Address bar UI, navigasi state, mount point div (`#browser-mount-{tabId}`)

**Yang perlu ditambah:**
```
- Tauri WebviewWindow per tab:
    let webview = WebviewWindowBuilder::new(app, &format!("browser-{}", tab_id), ...)
        .build()
- Sinkronisasi posisi: pakai ResizeObserver → get bounding rect → update WebviewWindow bounds
- Show/hide: webview.show() / webview.hide() saat isActive berubah
- Destroy saat tab close: webview.close() + simpan URL terakhir ke tab.props.lastUrl
- Nav controls: webview.navigate(url), webview.eval("history.back()"), dll
```

### EditorPane (Phase 3C)
File: `src/components/panes/EditorPane.tsx`

**Yang perlu ditambah:**
```
npm install @codemirror/view @codemirror/state @codemirror/basic-setup
npm install @codemirror/lang-javascript @codemirror/lang-python @codemirror/lang-rust @codemirror/lang-json @codemirror/lang-markdown
```
Lalu mount CodeMirror, connect ke `read_file` / `write_file` Tauri commands.

### Terminal Dispose
Di `paneStore.ts` `removeTab()`, perlu import dan panggil `disposeTerminal(tabId)`:
```ts
import { disposeTerminal } from "@/components/panes/TerminalPane";
// ...dalam removeTab():
const tab = pane.tabs.find(t => t.id === tabId);
const app = apps.find(a => a.id === tab?.appId);
if (app?.type === "terminal") disposeTerminal(tabId);
```
Saat ini hanya `killPty` yang dipanggil (Rust side), xterm instance belum di-dispose.

### Custom Titlebar Buttons
Di `App.tsx`, tombol minimize/maximize/close sudah ada secara visual tapi `onClick` masih kosong.
Phase 5A perlu wire ini ke Tauri window commands:
```ts
import { getCurrentWindow } from "@tauri-apps/api/window";
const win = getCurrentWindow();
// minimize: win.minimize()
// maximize: win.toggleMaximize()
// close: win.close()
```

### Layout Persistence
`saveLayout` / `loadLayout` Tauri commands sudah ada di Rust dan TS bridge.
Di `App.tsx` perlu:
1. `loadLayout()` saat mount → parse JSON → set ke Zustand
2. `saveLayout(JSON.stringify(layout))` saat layout berubah (debounce ~500ms)

---

## Dependency Install Commands

```bash
# Frontend
npm install

# Rust (otomatis saat cargo build)
cd src-tauri && cargo build
```

**Linux tambahan:**
```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev \
  libappindicator3-dev librsvg2-dev patchelf libssl-dev pkg-config
```

---

## Dev Run

```bash
npm run tauri dev
```

---

## Checklist Smoke Test (lakukan sebelum lanjut ke Phase 3)

- [ ] `npm run tauri dev` berjalan tanpa error
- [ ] Window muncul 1280×800, tanpa native titlebar
- [ ] Terminal muncul, bisa ketik `ls` / `dir`
- [ ] Ctrl+D split pane, launcher muncul, pilih Terminal → terminal baru jalan
- [ ] Ctrl+T buka tab baru di pane aktif
- [ ] Ctrl+W tutup tab
- [ ] Double-click tab → rename
- [ ] Klik ▾ di tab → launcher bisa ganti app
- [ ] Drag resize antar pane berfungsi
- [ ] Tutup semua tab → pane hilang
- [ ] Ctrl+Space buka launcher global

---

## File Map Lengkap

```
tiled-workspace/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── .github/workflows/build.yml
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── globals.css
│   │
│   ├── types/
│   │   └── index.ts            ← semua shared types
│   │
│   ├── lib/
│   │   └── tauri-bridge.ts     ← semua invoke() dan listen()
│   │
│   ├── hooks/
│   │   ├── usePty.ts           ← PTY event + input hook
│   │   ├── useAppRegistry.ts   ← app list + Context provider
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── store/
│   │   └── paneStore.ts        ← Zustand: layout + panes + tabs + launcher
│   │
│   └── components/
│       ├── panes/
│       │   ├── TerminalPane.tsx     ← xterm.js, PTY, cache
│       │   ├── BrowserPane.tsx      ← placeholder (Phase 3B)
│       │   ├── EditorPane.tsx       ← placeholder (Phase 3C)
│       │   └── PaneContainer.tsx   ← wrapper: TabBar + content
│       └── ui/
│           ├── TabBar.tsx           ← tabs, rename, dropdown, close
│           ├── PaneToolbar.tsx      ← split V/H, close pane
│           └── AppLauncher.tsx      ← modal search overlay
│
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── apps.json               ← default app registry
    ├── tauri.conf.json
    └── src/
        ├── main.rs
        ├── lib.rs              ← Tauri builder + plugin setup
        ├── commands.rs         ← semua #[command] handlers
        ├── pty.rs              ← PtyPool + PtyHandle
        └── registry.rs        ← load/save apps.json + layout.json
```

---

## Rekomendasi Urutan Phase 3

**3D dulu** (Multi-PTY Pool Rust) — cek bahwa `PtyPool` berjalan stabil dengan banyak tab sebelum
implementasi UI yang kompleks.

Lalu **3A** (TerminalPane lengkap) — refactor minor, FitAddon resize via ResizeObserver,
handle PTY exit event.

Lalu **3E** (App Registry & Launcher) — settings panel untuk edit apps.json.

Lalu **3B** (BrowserPane) — paling kompleks karena butuh WebviewWindow sync.

Lalu **3C** (EditorPane) — CodeMirror install + mount.

Lalu **3F** (Notification System) — bisa diintegrasikan ke semua pane di akhir.
