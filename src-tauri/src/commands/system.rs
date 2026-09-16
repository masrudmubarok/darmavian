//! Reveals a note or folder in the OS file manager. Spawned directly via
//! `Command::new` (never through a shell), so there's no shell-injection
//! surface even though the path is user-controlled.
use std::path::Path;
use std::process::Command;

#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("That item no longer exists on disk".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let canonical = p.canonicalize().unwrap_or_else(|_| p.to_path_buf());
        let native = canonical
            .to_string_lossy()
            .replace('/', "\\")
            .trim_start_matches(r"\\?\")
            .to_string();
        Command::new("explorer")
            .raw_arg(format!("/select,\"{native}\""))
            .spawn()
            .map_err(|e| format!("Cannot open Explorer: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Cannot open Finder: {e}"))?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let dir = p.parent().unwrap_or(p);
        Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("Cannot open file manager: {e}"))?;
    }

    Ok(())
}
