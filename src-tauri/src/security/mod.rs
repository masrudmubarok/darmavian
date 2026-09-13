use std::path::{Component, Path, PathBuf};

pub fn sanitize_filename(raw: &str) -> String {
    let trimmed = raw.trim();
    let cleaned: String = trimmed
        .chars()
        .filter(|c| !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
        .collect();
    let cleaned = cleaned.trim();
    if cleaned.is_empty() || cleaned == "." || cleaned == ".." {
        "Untitled".to_string()
    } else {
        cleaned.to_string()
    }
}

pub fn join_within(parent: &Path, child_name: &str) -> Result<PathBuf, String> {
    let safe_name = sanitize_filename(child_name);
    let candidate = parent.join(&safe_name);

    for component in Path::new(&safe_name).components() {
        if matches!(component, Component::ParentDir | Component::RootDir | Component::Prefix(_)) {
            return Err("Invalid name: path traversal is not allowed".to_string());
        }
    }

    Ok(candidate)
}
