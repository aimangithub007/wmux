# WMUX - wmux

Cross-platform tiling desktop workspace — Tauri 2 + React + TypeScript.
Split panes bebas, terminal, browser, editor, dan plugin dalam satu window.

```
Window
└── MosaicLayout (split H/V rekursif)
      └── PaneNode
            ├── TabBar  [ Terminal 🔴 | Browser ▾ | + ]
            └── TabContent → Terminal / Browser / Editor / Plugin
```

## Fitur

- **Split pane tak terbatas** — H/V rekursif, drag resize
- **Multi-tab per pane** — tiap tab punya PTY / URL / editor sendiri
- **Terminal** — xterm.js + portable-pty, dukung Neovim, Lazygit, Btop, dll
- **Browser** — address bar, back/forward/reload, loading indicator
- **Editor** — CodeMirror 6, auto language detection, open/save file
- **Notification system** — tab badge, glow, in-app toast, OS notification
- **Plugin API** — tambah pane type custom dalam TypeScript
- **App Registry** — daftarkan app apapun via `apps.json` atau Settings UI
- **Layout persistence** — workspace dipulihkan saat buka kembali
- **Light/dark theme** — ikut system preference

---

## Instalasi

> **Panduan lengkap step-by-step (dari nol) ada di [`INSTALL.md`](./INSTALL.md)**
> Mencakup Linux, macOS, Windows — dengan troubleshooting tiap error umum.

### Ringkasan cepat (jika sudah ada Node 20 + Rust stable)

```bash
# 1. Extract / clone project
unzip tiled-workspace-phase3-5.zip
cd tiled-workspace-phase3-4

# 2. Install dependencies
npm install

# 3. Jalankan (mode dev)
npm run tauri dev
```

**Linux — wajib install system deps dulu:**
```bash
sudo apt-get install -y \
  libgtk-3-dev libwebkit2gtk-4.1-dev \
  libappindicator3-dev librsvg2-dev \
  patchelf libssl-dev pkg-config build-essential
```

**Build production:**
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

---

## Keyboard Shortcuts

| Shortcut | Aksi |
|---|---|
| `Ctrl+D` | Split pane vertikal |
| `Ctrl+E` | Split pane horizontal |
| `Ctrl+T` | Tab baru di pane aktif |
| `Ctrl+W` | Tutup tab aktif |
| `Ctrl+Shift+W` | Tutup pane aktif |
| `Ctrl+Tab` | Tab berikutnya |
| `Ctrl+Shift+Tab` | Tab sebelumnya |
| `Ctrl+1–9` | Loncat ke tab ke-N |
| `Ctrl+Space` | Global app launcher |
| `Ctrl+Shift+C` | Copy (terminal) |
| `Ctrl+Shift+V` | Paste (terminal) |
| `Ctrl+S` | Simpan file (editor) |

---

## App Registry

Edit `~/.config/tiled-workspace/apps.json` atau buka **Settings → Apps**:

```json
{
  "apps": [
    { "id": "terminal",  "name": "Terminal", "type": "terminal", "path": "", "icon": "ti-terminal-2", "default": true },
    { "id": "browser",   "name": "Browser",  "type": "browser",  "path": "", "icon": "ti-world" },
    { "id": "editor",    "name": "Editor",   "type": "editor",   "path": "", "icon": "ti-code" },
    { "id": "nvim",      "name": "Neovim",   "type": "terminal", "path": "/usr/bin/nvim", "icon": "ti-terminal" },
    { "id": "figma",     "name": "Figma",    "type": "browser",  "path": "https://figma.com", "icon": "ti-brand-figma" }
  ]
}
```

---

## Plugin

Lihat [`PLUGIN_GUIDE.md`](./PLUGIN_GUIDE.md) untuk dokumentasi lengkap.

Contoh singkat:

```tsx
import { PluginRegistry } from "@/lib/pluginRegistry";
import type { PaneProps } from "@/types";

function MyPane({ tabId, notify }: PaneProps) {
  return (
    <button onClick={() => notify("success", "Halo dari plugin!")}>
      Klik saya
    </button>
  );
}

PluginRegistry.register({
  id: "my-pane",
  name: "My Pane",
  icon: "ti-puzzle",
  component: MyPane,
});
```

---

## Struktur Proyek

```
tiled-workspace/
├── INSTALL.md          ← panduan instalasi lengkap
├── PLUGIN_GUIDE.md     ← cara buat plugin
├── CHANGELOG.md
├── package.json
├── src/
│   ├── App.tsx
│   ├── components/panes/    ← Terminal, Browser, Editor
│   ├── components/ui/       ← TabBar, Launcher, Toast, Settings…
│   ├── store/               ← paneStore, notificationStore
│   ├── plugins/             ← ImageViewer, MarkdownPreview
│   └── lib/                 ← tauri-bridge, pluginRegistry
└── src-tauri/
    ├── src/                 ← Rust: PTY, registry, commands
    └── tauri.conf.json
```

---

## License

MIT
