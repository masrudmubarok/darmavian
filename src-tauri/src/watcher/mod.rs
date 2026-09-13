//! Watches the open workspace folder and tells the frontend when something
//! changes on disk (plan §25: File Watcher) — so a file created, edited,
//! renamed, or deleted outside the app (Explorer, VS Code, git, …) is
//! reflected in the sidebar without the user doing anything.
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebounceEventResult, Debouncer};
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

const WORKSPACE_CHANGED_EVENT: &str = "workspace://changed";
const DEBOUNCE_MS: u64 = 400;

type WatcherHandle = Debouncer<notify::RecommendedWatcher>;

#[derive(Default)]
pub struct WatcherState(pub Mutex<Option<WatcherHandle>>);

#[tauri::command]
pub fn watch_workspace(app: AppHandle, state: State<WatcherState>, root_path: String) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|_| "Watcher state is unavailable".to_string())?;
    *guard = None;

    let mut debouncer = new_debouncer(Duration::from_millis(DEBOUNCE_MS), move |res: DebounceEventResult| {
        if res.is_ok() {
            let _ = app.emit(WORKSPACE_CHANGED_EVENT, ());
        }
    })
    .map_err(|e| format!("Cannot start file watcher: {e}"))?;

    debouncer
        .watcher()
        .watch(Path::new(&root_path), RecursiveMode::Recursive)
        .map_err(|e| format!("Cannot watch workspace: {e}"))?;

    *guard = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub fn unwatch_workspace(state: State<WatcherState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|_| "Watcher state is unavailable".to_string())?;
    *guard = None;
    Ok(())
}
