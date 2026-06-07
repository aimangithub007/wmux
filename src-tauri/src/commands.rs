use crate::pty::SharedPtyPool;
use crate::registry::{self, AppEntry};
use tauri::{command, AppHandle, State};

// ─── PTY Commands ─────────────────────────────────────────────────

#[command]
pub async fn spawn_pty(
    tab_id: String,
    shell: Option<String>,
    path: Option<String>,
    args: Option<Vec<String>>,
    pool: State<'_, SharedPtyPool>,
    app: AppHandle,
) -> Result<(), String> {
    let mut guard = pool.lock().map_err(|e| e.to_string())?;
    guard
        .spawn(tab_id, shell, path, args, app)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn pty_write(
    tab_id: String,
    data: String,
    pool: State<'_, SharedPtyPool>,
) -> Result<(), String> {
    let mut guard = pool.lock().map_err(|e| e.to_string())?;
    guard.write(&tab_id, &data).map_err(|e| e.to_string())
}

#[command]
pub async fn pty_resize(
    tab_id: String,
    cols: u16,
    rows: u16,
    pool: State<'_, SharedPtyPool>,
) -> Result<(), String> {
    let mut guard = pool.lock().map_err(|e| e.to_string())?;
    guard.resize(&tab_id, cols, rows).map_err(|e| e.to_string())
}

#[command]
pub async fn kill_pty(
    tab_id: String,
    pool: State<'_, SharedPtyPool>,
) -> Result<(), String> {
    let mut guard = pool.lock().map_err(|e| e.to_string())?;
    guard.kill(&tab_id);
    Ok(())
}

// ─── App Registry Commands ────────────────────────────────────────

#[command]
pub async fn load_apps() -> Result<Vec<AppEntry>, String> {
    registry::load_apps().map_err(|e| e.to_string())
}

#[command]
pub async fn save_apps(apps: Vec<AppEntry>) -> Result<(), String> {
    registry::save_apps(&apps).map_err(|e| e.to_string())
}

#[command]
pub async fn validate_app_path(path: String) -> bool {
    registry::validate_path(&path)
}

// ─── File Commands ────────────────────────────────────────────────

#[command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// ─── Layout Persistence ───────────────────────────────────────────

#[command]
pub async fn save_layout(layout_json: String) -> Result<(), String> {
    registry::save_layout(&layout_json).map_err(|e| e.to_string())
}

#[command]
pub async fn load_layout() -> Result<Option<String>, String> {
    registry::load_layout().map_err(|e| e.to_string())
}


// ─── Open URL in system browser ───────────────────────────────────

#[command]
pub async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", &url])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
