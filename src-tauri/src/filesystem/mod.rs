use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum WorkspaceNode {
    Folder {
        name: String,
        path: String,
        children: Vec<WorkspaceNode>,
    },
    Note {
        name: String,
        path: String,
    },
}

const IGNORED_DIR_NAMES: [&str; 3] = [".git", "node_modules", ".darmavian-trash"];

pub fn read_tree(root: &Path) -> Result<Vec<WorkspaceNode>, String> {
    read_dir_nodes(root)
}

fn read_dir_nodes(dir: &Path) -> Result<Vec<WorkspaceNode>, String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Cannot read {}: {e}", dir.display()))?;
    let mut nodes = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if IGNORED_DIR_NAMES.contains(&name.as_str()) {
            continue;
        }

        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        if metadata.is_dir() {
            let children = read_dir_nodes(&path)?;
            nodes.push(WorkspaceNode::Folder {
                name,
                path: path.to_string_lossy().to_string(),
                children,
            });
        } else if metadata.is_file() {
            let is_markdown = path
                .extension()
                .map(|ext| ext.eq_ignore_ascii_case("md"))
                .unwrap_or(false);
            if is_markdown {
                nodes.push(WorkspaceNode::Note {
                    name,
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }

    Ok(nodes)
}

pub fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let dir = path.parent().ok_or("Note path has no parent directory")?;
    let mut tmp_path = dir.to_path_buf();
    let tmp_name = format!(
        ".{}.tmp",
        path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "note".to_string())
    );
    tmp_path.push(tmp_name);

    {
        let mut file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        file.flush().map_err(|e| e.to_string())?;
    }

    fs::rename(&tmp_path, path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to save file: {e}")
    })
}
