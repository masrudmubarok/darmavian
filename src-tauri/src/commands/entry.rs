//! Operations shared by notes and folders: rename, move, delete-to-trash.
use crate::security::{join_within, sanitize_filename};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn rename_entry(path: String, new_name: String) -> Result<String, String> {
    let source = Path::new(&path);
    let parent = source
        .parent()
        .ok_or_else(|| "Cannot rename the workspace root".to_string())?;

    let safe_name = sanitize_filename(&new_name);
    let final_name = match source.extension().and_then(|e| e.to_str()) {
        Some(ext) if source.is_file() && !safe_name.to_lowercase().ends_with(&format!(".{}", ext.to_lowercase())) => {
            format!("{safe_name}.{ext}")
        }
        _ => safe_name,
    };

    let target = join_within(parent, &final_name)?;
    if target.exists() {
        return Err("An item with that name already exists".to_string());
    }
    fs::rename(source, &target).map_err(|e| format!("Cannot rename: {e}"))?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn move_entry(source_path: String, target_folder_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);
    let target_folder = Path::new(&target_folder_path);
    let name = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid source path")?;

    let target = join_within(target_folder, name)?;
    if target.exists() {
        return Err("An item with that name already exists in the destination".to_string());
    }
    fs::rename(source, &target).map_err(|e| format!("Cannot move: {e}"))?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| format!("Cannot move to Trash: {e}"))
}
