use crate::filesystem::{self, WorkspaceNode};
use std::path::Path;

#[tauri::command]
pub fn read_tree(root_path: String) -> Result<Vec<WorkspaceNode>, String> {
    let root = Path::new(&root_path);
    if !root.is_dir() {
        return Err("Workspace folder no longer exists".to_string());
    }
    filesystem::read_tree(root)
}
