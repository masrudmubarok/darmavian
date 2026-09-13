mod commands;
mod filesystem;
mod security;
mod watcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            watcher::watch_workspace,
            watcher::unwatch_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Darmavian");
}
