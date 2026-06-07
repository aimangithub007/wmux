mod commands;
mod pty;
mod registry;

use commands::*;
use pty::new_pool;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Register shared PTY pool as managed state
            app.manage(new_pool());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill all PTYs on close
                if let Some(pool) = window.try_state::<pty::SharedPtyPool>() {
                    if let Ok(mut guard) = pool.lock() {
                        guard.kill_all();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            spawn_pty,
            pty_write,
            pty_resize,
            kill_pty,
            load_apps,
            save_apps,
            validate_app_path,
            read_file,
            write_file,
            save_layout,
            load_layout,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
