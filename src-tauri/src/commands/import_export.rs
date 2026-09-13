//! Import/export (plan §21–§23): never requires database transformation —
//! everything here is plain file copies or a ZIP of plain files. Import
//! never trusts a ZIP's internal paths (path-traversal guard via
//! `enclosed_name()`); export never modifies the source it reads from.
use crate::filesystem::{copy_dir_recursive, unique_path};
use crate::security::{join_within, sanitize_filename};
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

#[tauri::command]
pub fn import_files(target_folder: String, source_paths: Vec<String>) -> Result<(), String> {
    let target = Path::new(&target_folder);
    for source in source_paths {
        let src = Path::new(&source);
        let name = src.file_name().ok_or("Invalid source file name")?;
        let base = join_within(target, &name.to_string_lossy())?;
        let dest = unique_path(&base);
        fs::copy(src, &dest).map_err(|e| format!("Cannot import {}: {e}", src.display()))?;
    }
    Ok(())
}

#[tauri::command]
pub fn import_folder(target_folder: String, source_folder: String) -> Result<String, String> {
    let target = Path::new(&target_folder);
    let src = Path::new(&source_folder);
    let name = src.file_name().ok_or("Invalid folder name")?.to_string_lossy().to_string();
    let base = join_within(target, &name)?;
    let dest = unique_path(&base);
    copy_dir_recursive(src, &dest)?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_zip(target_folder: String, zip_path: String) -> Result<String, String> {
    let target = Path::new(&target_folder);
    let zip_file_path = Path::new(&zip_path);
    let stem = zip_file_path.file_stem().and_then(|s| s.to_str()).unwrap_or("Imported");
    let base = join_within(target, &sanitize_filename(stem))?;
    let dest_root = unique_path(&base);
    fs::create_dir_all(&dest_root).map_err(|e| format!("Cannot create {}: {e}", dest_root.display()))?;

    let file = File::open(zip_file_path).map_err(|e| format!("Cannot open ZIP: {e}"))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Invalid ZIP archive: {e}"))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("Cannot read ZIP entry: {e}"))?;
        let Some(relative) = entry.enclosed_name() else {
            continue;
        };
        let out_path = dest_root.join(relative);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = File::create(&out_path).map_err(|e| e.to_string())?;
            io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        }
    }

    Ok(dest_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn export_note(source_path: String, dest_path: String) -> Result<(), String> {
    fs::copy(&source_path, &dest_path).map_err(|e| format!("Cannot export note: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn export_zip(source_folder: String, dest_zip_path: String) -> Result<(), String> {
    let src_root = Path::new(&source_folder);
    let file = File::create(&dest_zip_path).map_err(|e| format!("Cannot create ZIP: {e}"))?;
    let mut writer = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    add_dir_to_zip(&mut writer, src_root, src_root, options)?;

    writer.finish().map_err(|e| format!("Cannot finalize ZIP: {e}"))?;
    Ok(())
}

fn add_dir_to_zip(
    writer: &mut ZipWriter<File>,
    base: &Path,
    dir: &Path,
    options: SimpleFileOptions,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let relative = path.strip_prefix(base).map_err(|e| e.to_string())?;
        let name = relative.to_string_lossy().replace('\\', "/");

        if path.is_dir() {
            writer.add_directory(format!("{name}/"), options).map_err(|e| e.to_string())?;
            add_dir_to_zip(writer, base, &path, options)?;
        } else {
            writer.start_file(name, options).map_err(|e| e.to_string())?;
            let mut f = File::open(&path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            writer.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
