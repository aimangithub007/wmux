use anyhow::{Context, Result};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter};

// ─── PTY Handle ───────────────────────────────────────────────────

pub struct PtyHandle {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn portable_pty::MasterPty + Send>,
}

// ─── PTY Pool ─────────────────────────────────────────────────────

#[derive(Default)]
pub struct PtyPool {
    handles: HashMap<String, PtyHandle>,
}

impl PtyPool {
    pub fn new() -> Self {
        Self::default()
    }

    /// Spawn a new PTY for the given tab_id.
    pub fn spawn(
        &mut self,
        tab_id: String,
        shell: Option<String>,
        path: Option<String>,
        args: Option<Vec<String>>,
        app_handle: AppHandle,
    ) -> Result<()> {
        if self.handles.contains_key(&tab_id) {
            return Ok(()); // already spawned
        }

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("Failed to open PTY")?;

        // Build command
        let mut cmd = if let Some(p) = path.filter(|p| !p.is_empty()) {
            let mut c = CommandBuilder::new(&p);
            if let Some(a) = args {
                c.args(a);
            }
            c
        } else if let Some(s) = shell.filter(|s| !s.is_empty()) {
            CommandBuilder::new(s)
        } else {
            default_shell_cmd()
        };

        // Inherit env
        cmd.env("TERM", "xterm-256color");

        let _child = pair.slave.spawn_command(cmd).context("Failed to spawn command")?;

        let writer = pair.master.take_writer().context("Failed to get PTY writer")?;
        let mut reader = pair.master.try_clone_reader().context("Failed to clone PTY reader")?;

        // Background thread: read PTY output → emit event
        let tid = tab_id.clone();
        let app = app_handle.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => {
                        // PTY closed — emit exit event
                        let _ = app.emit(&format!("pty-exit:{}", tid), 0u32);
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app.emit(&format!("pty-data:{}", tid), data);
                    }
                }
            }
        });

        self.handles.insert(
            tab_id,
            PtyHandle {
                writer,
                master: pair.master,
            },
        );

        Ok(())
    }

    pub fn write(&mut self, tab_id: &str, data: &str) -> Result<()> {
        let handle = self
            .handles
            .get_mut(tab_id)
            .context("PTY not found for tab")?;
        handle.writer.write_all(data.as_bytes())?;
        Ok(())
    }

    pub fn resize(&mut self, tab_id: &str, cols: u16, rows: u16) -> Result<()> {
        let handle = self
            .handles
            .get_mut(tab_id)
            .context("PTY not found for tab")?;
        handle.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn kill(&mut self, tab_id: &str) {
        self.handles.remove(tab_id);
        // Drop kills the master PTY, which signals the child
    }

    pub fn kill_all(&mut self) {
        self.handles.clear();
    }
}

// ─── OS default shell ─────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn default_shell_cmd() -> CommandBuilder {
    CommandBuilder::new("powershell.exe")
}

#[cfg(not(target_os = "windows"))]
fn default_shell_cmd() -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    CommandBuilder::new(shell)
}

// ─── Managed State Wrapper ────────────────────────────────────────

pub type SharedPtyPool = Arc<Mutex<PtyPool>>;

pub fn new_pool() -> SharedPtyPool {
    Arc::new(Mutex::new(PtyPool::new()))
}
