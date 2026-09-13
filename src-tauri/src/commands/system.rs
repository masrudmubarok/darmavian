//! Reveals a note or folder in the OS file manager. Spawned directly via
//! `Command::new` (never through a shell), so there's no shell-injection
//! surface even though the path is user-controlled — Windows still parses
//! `/select,<path>` as a single argument correctly this way.
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
        Command::new("explorer")
            .arg(format!("/select,{path}"))
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
