use crate::filesystem;
use crate::security::{join_within, sanitize_filename};
use std::fs;
use std::path::{Path, PathBuf};

#[tauri::command]
pub fn read_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Cannot open note: {e}"))
}

#[tauri::command]
pub fn write_note(path: String, content: String) -> Result<(), String> {
    filesystem::atomic_write(Path::new(&path), &content)
}

#[tauri::command]
pub fn create_note(folder_path: String, title: String) -> Result<String, String> {
    let folder = Path::new(&folder_path);
    let safe_title = sanitize_filename(&title);
    let file_name = if safe_title.to_lowercase().ends_with(".md") {
        safe_title
    } else {
        format!("{safe_title}.md")
    };

    let base_path = join_within(folder, &file_name)?;
    let final_path = unique_path(&base_path);

    fs::File::create(&final_path).map_err(|e| format!("Cannot create note: {e}"))?;
    Ok(final_path.to_string_lossy().to_string())
}

fn unique_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled");
    let ext = path.extension().and_then(|s| s.to_str());
    let parent = path.parent().unwrap_or_else(|| Path::new("."));

    let mut counter = 2;
    loop {
        let candidate_name = match ext {
            Some(ext) => format!("{stem} {counter}.{ext}"),
            None => format!("{stem} {counter}"),
        };
        let candidate = parent.join(candidate_name);
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}
