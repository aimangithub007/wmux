# Panduan Instalasi Lengkap — Tiled Workspace

Dokumen ini mencakup semua langkah dari **nol hingga app berjalan** di Linux, macOS, dan Windows.
Ikuti urutan sesuai sistem operasi kamu.

---

## Daftar Isi

1. [Prasyarat — semua OS](#1-prasyarat--semua-os)
2. [Setup Linux (Ubuntu / Debian / Arch)](#2-setup-linux-ubuntu--debian--arch)
3. [Setup macOS](#3-setup-macos)
4. [Setup Windows](#4-setup-windows)
5. [Clone & install project](#5-clone--install-project)
6. [Jalankan mode development](#6-jalankan-mode-development)
7. [Build production](#7-build-production)
8. [Troubleshooting umum](#8-troubleshooting-umum)
9. [Verifikasi instalasi](#9-verifikasi-instalasi)

---

## 1. Prasyarat — semua OS

Kamu butuh tiga tool utama sebelum mulai:

| Tool | Versi minimum | Fungsi |
|------|--------------|--------|
| **Node.js** | 20.x LTS | Frontend build + package manager |
| **Rust** | stable (≥ 1.77) | Kompilasi backend Tauri |
| **sistem build** | (lihat per OS) | Linker, WebKit, GTK, dll |

---

## 2. Setup Linux (Ubuntu / Debian / Arch)

### 2.1 Install Node.js 20

**Ubuntu / Debian:**
```bash
# Pakai NodeSource (lebih baru dari apt default)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi
node --version   # harus v20.x.x
npm --version    # harus 10.x.x
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

### 2.2 Install Rust

```bash
# Installer resmi Rust (rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Pilih opsi 1 (default) saat ditanya
# Setelah selesai, reload PATH:
source "$HOME/.cargo/env"

# Verifikasi
rustc --version    # harus stable 1.77+
cargo --version
```

### 2.3 Install sistem dependencies (WAJIB untuk Tauri)

**Ubuntu 22.04 / 24.04:**
```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  pkg-config \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libayatana-appindicator3-dev
```

> ⚠️ **Ubuntu 20.04:** pakai `libwebkit2gtk-4.0-dev` (bukan 4.1).
> Cek versinya dengan: `apt-cache search libwebkit2gtk`

**Debian 12 (Bookworm):**
```bash
sudo apt-get install -y \
  libgtk-3-dev libwebkit2gtk-4.1-dev \
  libssl-dev pkg-config build-essential \
  libappindicator3-dev librsvg2-dev patchelf
```

**Arch Linux:**
```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 base-devel curl wget \
  file openssl appmenu-gtk-module gtk3 \
  libappindicator-gtk3 librsvg patchelf
```

**Fedora / RHEL:**
```bash
sudo dnf install -y \
  webkit2gtk4.1-devel openssl-devel \
  libappindicator-gtk3-devel librsvg2-devel \
  gcc gcc-c++ make curl wget file
```

---

## 3. Setup macOS

### 3.1 Install Xcode Command Line Tools

```bash
xcode-select --install
# Ikuti dialog yang muncul, tunggu download selesai (~2GB)
```

### 3.2 Install Homebrew (jika belum ada)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Apple Silicon: tambahkan ke PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 3.3 Install Node.js

```bash
brew install node@20
# atau: brew install node  (versi terbaru)

node --version   # harus v20.x.x
```

### 3.4 Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Apple Silicon: tambah target untuk build universal
rustup target add aarch64-apple-darwin x86_64-apple-darwin

rustc --version
```

---

## 4. Setup Windows

### 4.1 Install Visual Studio Build Tools

Download dan install salah satu:
- **Visual Studio 2022** (Community, gratis): https://visualstudio.microsoft.com/
  - Pilih workload: **"Desktop development with C++"**
- **Atau** Visual Studio Build Tools saja:
  https://visualstudio.microsoft.com/visual-cpp-build-tools/

Pastikan komponen ini tercentang:
- MSVC v143 - VS 2022 C++ x64/x86 build tools
- Windows 10/11 SDK
- CMake tools for Visual Studio

### 4.2 Install WebView2

Windows 11 sudah include. Windows 10:
- Download dari: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Pilih "Evergreen Standalone Installer" → x64

### 4.3 Install Node.js

Download installer dari https://nodejs.org/en/download → pilih **LTS v20.x**

Atau via winget:
```powershell
winget install OpenJS.NodeJS.LTS
```

Verifikasi di PowerShell baru:
```powershell
node --version   # v20.x.x
npm --version
```

### 4.4 Install Rust

```powershell
# Download rustup-init.exe dari:
# https://win.rustup.rs/x86_64

# Atau via winget:
winget install Rustlang.Rustup

# Setelah install, buka PowerShell baru:
rustc --version
cargo --version
```

> ⚠️ Pastikan Rust menggunakan toolchain `stable-x86_64-pc-windows-msvc` (bukan gnu).
> Cek dengan: `rustup show`
> Jika perlu: `rustup default stable-msvc`

---

## 5. Clone & Install Project

Langkah ini sama untuk semua OS.

### 5.1 Extract / clone project

Jika kamu punya file zip (`tiled-workspace-phase3-5.zip`):
```bash
unzip tiled-workspace-phase3-5.zip
cd tiled-workspace-phase3-4
```

Jika dari Git:
```bash
git clone https://github.com/username/tiled-workspace.git
cd tiled-workspace
```

### 5.2 Install frontend dependencies

```bash
npm install
```

Output yang diharapkan: `added NNN packages` tanpa error merah.

> Jika ada warning `WARN deprecated` — itu normal, bukan error.
> Jika ada **error merah** tentang `node-gyp` atau `native`, lihat [Troubleshooting](#8-troubleshooting-umum).

### 5.3 Verifikasi Rust dependencies (opsional)

Rust deps diunduh otomatis saat build. Tapi bisa pre-fetch sekarang:
```bash
cd src-tauri
cargo fetch
cd ..
```

---

## 6. Jalankan Mode Development

```bash
npm run tauri dev
```

**Apa yang terjadi:**
1. Vite dev server mulai di `http://localhost:1420`
2. Cargo mulai kompilasi backend Rust (pertama kali: **5–15 menit**, selanjutnya ~30 detik)
3. Window app muncul
4. Hot-reload aktif — edit file `.tsx` → UI update langsung tanpa restart

**Tanda berhasil:**
```
   Vite v5.x.x  ready in XXXms
   ➜  Local:   http://localhost:1420/
...
    Running BeforeDevCommand (`npm run dev`)
    Compiling tiled-workspace ...
    Finished ... in XXs
```

Lalu window dengan splash screen muncul, kemudian terminal terbuka otomatis.

### Yang diharapkan saat pertama buka:

- Splash screen muncul ~1 detik
- Window 1280×800, tanpa native titlebar
- Satu terminal pane otomatis dibuka
- Bisa ketik `ls` (Linux/macOS) atau `dir` (Windows) — output muncul

---

## 7. Build Production

```bash
npm run tauri build
```

Proses: ~5–20 menit (tergantung CPU). Output:

| Platform | Lokasi | Format |
|----------|--------|--------|
| Linux | `src-tauri/target/release/bundle/` | `.AppImage`, `.deb` |
| macOS | `src-tauri/target/release/bundle/` | `.dmg`, `.app` |
| Windows | `src-tauri/target/release/bundle/` | `.msi`, `.exe` (NSIS) |

### Install hasil build:

**Linux (.AppImage):**
```bash
chmod +x tiled-workspace_0.2.0_amd64.AppImage
./tiled-workspace_0.2.0_amd64.AppImage
```

**Linux (.deb):**
```bash
sudo dpkg -i tiled-workspace_0.2.0_amd64.deb
```

**macOS (.dmg):**
1. Buka file `.dmg`
2. Drag `Tiled Workspace.app` ke folder `Applications`
3. Klik kanan → Open (pertama kali, untuk bypass Gatekeeper)

**Windows (.msi):**
Double-click file `.msi`, ikuti wizard installer.

---

## 8. Troubleshooting Umum

### ❌ Error: `error: failed to run custom build command for 'openssl-sys'`

**Linux:**
```bash
sudo apt-get install -y libssl-dev pkg-config
# atau Fedora:
sudo dnf install openssl-devel
```

**macOS:**
```bash
brew install openssl
export OPENSSL_DIR=$(brew --prefix openssl)
```

---

### ❌ Error: `error[E0463]: can't find crate for 'std'`

Rust toolchain belum lengkap:
```bash
rustup update stable
rustup component add rust-std
```

---

### ❌ Error: `Could not find a suitable version of webkit2gtk`

Versi webkit tidak cocok:
```bash
# Cek versi yang tersedia:
apt-cache search libwebkit2gtk

# Untuk Ubuntu 22.04+ install 4.1:
sudo apt-get install -y libwebkit2gtk-4.1-dev

# Untuk Ubuntu 20.04 install 4.0:
sudo apt-get install -y libwebkit2gtk-4.0-dev
```

---

### ❌ Error: `EACCES: permission denied` saat `npm install`

Jangan pakai `sudo npm install`. Perbaiki permission npm:
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

### ❌ App crash saat startup: `Could not initialize pty`

PTY butuh `/dev/ptmx`. Cek:
```bash
ls -la /dev/ptmx   # harus ada
# Jika tidak ada (jarang): sudo mknod /dev/ptmx c 5 2
```

Di WSL2 (Windows Subsystem for Linux) — tidak didukung secara penuh.
Gunakan Windows native build sebagai gantinya.

---

### ❌ Error di Windows: `linker 'link.exe' not found`

Visual Studio Build Tools belum terinstall atau PATH belum terset.
1. Buka "x64 Native Tools Command Prompt for VS 2022"
2. Jalankan `cargo build` dari sana
3. Atau pastikan VS Build Tools ada di PATH system

---

### ❌ `npm run tauri dev` langsung exit tanpa error

Cek apakah port 1420 sudah dipakai:
```bash
# Linux/macOS:
lsof -i :1420
# Kalau ada, kill prosesnya atau ubah port di vite.config.ts
```

---

### ❌ Window tidak muncul tapi proses jalan

Kemungkinan `visible: false` di `tauri.conf.json` tidak di-unlock oleh splash screen.
Saat dev, ubah sementara ke `"visible": true` di `src-tauri/tauri.conf.json`.

---

### ❌ macOS: `"Tiled Workspace" cannot be opened because the developer cannot be verified`

Klik kanan `.app` → **Open** → **Open** lagi di dialog.
Atau: `xattr -cr /Applications/Tiled\ Workspace.app`

---

### ❌ CodeMirror tidak muncul di EditorPane

Pastikan semua deps terinstall:
```bash
npm install @codemirror/view @codemirror/state @codemirror/basic-setup \
  @codemirror/lang-javascript @codemirror/lang-python \
  @codemirror/lang-rust @codemirror/lang-json @codemirror/lang-markdown
```

---

## 9. Verifikasi Instalasi

Setelah app berjalan, lakukan checklist ini:

```
Terminal dasar:
  ☐ Ketik `ls` atau `dir` → output muncul
  ☐ Ketik `echo hello` → "hello" muncul
  ☐ Resize window → terminal menyesuaikan (tidak terpotong)

Split pane:
  ☐ Ctrl+D → pane baru muncul secara vertikal
  ☐ Ctrl+E → pane baru muncul secara horizontal
  ☐ Drag garis antar pane → resize berfungsi

Tab:
  ☐ Ctrl+T → launcher muncul, pilih Terminal → tab baru
  ☐ Ctrl+W → tab tertutup
  ☐ Double-click nama tab → rename
  ☐ Klik ▾ di tab → launcher ganti app

Browser:
  ☐ Buka tab → pilih Browser → ketik URL → halaman load
  ☐ Tombol ← → berfungsi

Editor:
  ☐ Buka tab → pilih Editor → klik "Open" → buka file
  ☐ Edit file → dot kuning muncul → Ctrl+S → toast "Saved"

Notifikasi:
  ☐ Jalankan `sleep 3` di terminal → pindah tab lain
  ☐ Setelah 3 detik → badge biru muncul di tab terminal

Settings:
  ☐ Klik ⚙ di titlebar → panel terbuka
  ☐ Tab "Apps" tampilkan daftar

Plugin:
  ☐ Launcher → cari "Image Viewer" → klik → pane terbuka
  ☐ Launcher → cari "Markdown" → klik → preview muncul

Layout persistence:
  ☐ Buat beberapa pane → tutup window → buka lagi → layout sama
```

---

## Catatan Tambahan

### Identifier app (wajib ganti sebelum publish)

Di `src-tauri/tauri.conf.json`, ganti:
```json
"identifier": "com.yourname.tiled-workspace"
```
menjadi identifier unik kamu, misal: `"com.johndoe.tiledworkspace"`

### Config file lokasi

| OS | Path |
|----|------|
| Linux | `~/.config/tiled-workspace/` |
| macOS | `~/Library/Application Support/tiled-workspace/` |
| Windows | `C:\Users\<nama>\AppData\Roaming\tiled-workspace\` |

File yang disimpan:
- `apps.json` — daftar aplikasi
- `layout.json` — layout workspace terakhir

### Reset ke default

```bash
# Linux/macOS:
rm -rf ~/.config/tiled-workspace/

# Windows (PowerShell):
Remove-Item -Recurse "$env:APPDATA\tiled-workspace"
```
