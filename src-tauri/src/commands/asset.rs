//! Reads a local file (an image referenced by relative/absolute path in a
//! note) and returns it as a `data:` URL, so the preview's `<img>` can load
//! it without needing Tauri's asset-protocol scope configured for an
//! arbitrary, user-chosen workspace folder (plan §17/§24).
use base64::{engine::general_purpose::STANDARD, Engine};
use std::path::Path;

const MAX_ASSET_BYTES: u64 = 25 * 1024 * 1024;

fn guess_mime(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "avif" => "image/avif",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub fn read_asset_data_url(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let metadata = std::fs::metadata(p).map_err(|e| format!("Cannot read image: {e}"))?;
    if !metadata.is_file() {
        return Err("Not a file".to_string());
    }
    if metadata.len() > MAX_ASSET_BYTES {
        return Err("Image is too large to preview".to_string());
    }

    let bytes = std::fs::read(p).map_err(|e| format!("Cannot read image: {e}"))?;
    let mime = guess_mime(p);
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}
