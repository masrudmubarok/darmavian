use crate::security::join_within;
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn create_folder(parent_path: String, name: String) -> Result<String, String> {
    let parent = Path::new(&parent_path);
    let target = join_within(parent, &name)?;
    if target.exists() {
        return Err("A folder with that name already exists".to_string());
    }
    fs::create_dir_all(&target).map_err(|e| format!("Cannot create folder: {e}"))?;
    Ok(target.to_string_lossy().to_string())
}
