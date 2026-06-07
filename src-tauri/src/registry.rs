use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ─── Types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub app_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppsConfig {
    apps: Vec<AppEntry>,
}

// ─── Default apps ─────────────────────────────────────────────────

fn default_apps() -> Vec<AppEntry> {
    vec![
        AppEntry {
            id: "terminal".into(),
            name: "Terminal".into(),
            app_type: "terminal".into(),
            path: Some(String::new()),
            args: None,
            icon: Some("ti-terminal-2".into()),
            default: Some(true),
        },
        AppEntry {
            id: "browser".into(),
            name: "Browser".into(),
            app_type: "browser".into(),
            path: Some(String::new()),
            args: None,
            icon: Some("ti-world".into()),
            default: None,
        },
        AppEntry {
            id: "editor".into(),
            name: "Editor".into(),
            app_type: "editor".into(),
            path: Some(String::new()),
            args: None,
            icon: Some("ti-code".into()),
            default: None,
        },
        AppEntry {
            id: "nvim".into(),
            name: "Neovim".into(),
            app_type: "terminal".into(),
            path: Some("/usr/bin/nvim".into()),
            args: None,
            icon: Some("ti-terminal".into()),
            default: None,
        },
        AppEntry {
            id: "lazygit".into(),
            name: "Lazygit".into(),
            app_type: "terminal".into(),
            path: Some("/usr/bin/lazygit".into()),
            args: None,
            icon: Some("ti-git-branch".into()),
            default: None,
        },
        AppEntry {
            id: "btop".into(),
            name: "Btop".into(),
            app_type: "terminal".into(),
            path: Some("/usr/bin/btop".into()),
            args: None,
            icon: Some("ti-cpu".into()),
            default: None,
        },
        AppEntry {
            id: "figma".into(),
            name: "Figma".into(),
            app_type: "browser".into(),
            path: Some("https://figma.com".into()),
            args: None,
            icon: Some("ti-brand-figma".into()),
            default: None,
        },
        AppEntry {
            id: "markdown-preview".into(),
            name: "Markdown Preview".into(),
            app_type: "plugin".into(),
            path: Some(String::new()),
            args: None,
            icon: Some("ti-markdown".into()),
            default: None,
        },
        AppEntry {
            id: "image-viewer".into(),
            name: "Image Viewer".into(),
            app_type: "plugin".into(),
            path: Some(String::new()),
            args: None,
            icon: Some("ti-photo".into()),
            default: None,
        },
    ]
}

// ─── Config path ──────────────────────────────────────────────────

fn config_dir() -> Result<PathBuf> {
    let dir = dirs::config_dir()
        .context("Cannot find config dir")?
        .join("tiled-workspace");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn apps_path() -> Result<PathBuf> {
    Ok(config_dir()?.join("apps.json"))
}

fn layout_path() -> Result<PathBuf> {
    Ok(config_dir()?.join("layout.json"))
}

// ─── Public API ───────────────────────────────────────────────────

pub fn load_apps() -> Result<Vec<AppEntry>> {
    let path = apps_path()?;
    if !path.exists() {
        let defaults = default_apps();
        save_apps(&defaults)?;
        return Ok(defaults);
    }
    let content = std::fs::read_to_string(&path)?;
    let mut config: AppsConfig = serde_json::from_str(&content)?;

    // Merge any new default entries not yet in user's file
    let existing_ids: std::collections::HashSet<String> =
        config.apps.iter().map(|a| a.id.clone()).collect();
    let mut changed = false;
    for default in default_apps() {
        if !existing_ids.contains(&default.id) {
            config.apps.push(default);
            changed = true;
        }
    }
    if changed {
        save_apps(&config.apps)?;
    }

    Ok(config.apps)
}

pub fn save_apps(apps: &[AppEntry]) -> Result<()> {
    let config = AppsConfig { apps: apps.to_vec() };
    let json = serde_json::to_string_pretty(&config)?;
    std::fs::write(apps_path()?, json)?;
    Ok(())
}

pub fn validate_path(path: &str) -> bool {
    if path.is_empty() {
        return true;
    }
    if path.starts_with("http://") || path.starts_with("https://") {
        return true;
    }
    std::path::Path::new(path).exists()
}

pub fn load_layout() -> Result<Option<String>> {
    let path = layout_path()?;
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(std::fs::read_to_string(path)?))
}

pub fn save_layout(json: &str) -> Result<()> {
    std::fs::write(layout_path()?, json)?;
    Ok(())
}
