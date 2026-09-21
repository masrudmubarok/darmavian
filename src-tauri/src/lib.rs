mod commands;
mod filesystem;
mod security;
mod watcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(watcher::WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::read_tree,
            commands::note::read_note,
            commands::note::write_note,
            commands::note::create_note,
            commands::folder::create_folder,
            commands::entry::rename_entry,
            commands::entry::move_entry,
            commands::entry::delete_entry,
            commands::asset::read_asset_data_url,
            commands::import_export::import_files,
            commands::import_export::import_folder,
            commands::import_export::import_zip,
            commands::import_export::export_note,
            commands::import_export::export_zip,
            commands::system::reveal_in_file_manager,
            watcher::watch_workspace,
            watcher::unwatch_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Darmavian");
}
