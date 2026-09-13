# Darmavian

Offline Markdown knowledge-management desktop app (Tauri 2 + React + Rust). Filesystem is the database; Markdown files are the only document format. See [docs/darmavian_implementation_plan_design.md](docs/darmavian_implementation_plan_design.md) for the full product plan, and [docs/implementation_status.md](docs/implementation_status.md) for what's actually built vs. still pending against that plan.

## What works today

- **Workspace** — open any local folder as a workspace (native folder picker); sidebar header shows the open folder's name; the last opened workspace reopens automatically on the next launch (remembered in `localStorage`, not synced anywhere).
- **Explorer** — real filesystem tree (folders 📁/📂, notes 📄), expand/collapse, right-click New Note / New Folder / Rename / Move to… / Delete (moves to system Trash), drag-and-drop to move a note or folder (including dropping onto the empty sidebar area to move to the workspace root), a themed modal for name input (no native `prompt()`), tooltip on truncated names.
- **Live file sync** — the sidebar reflects changes made outside the app (new/renamed/deleted files from Explorer, VS Code, git, …) automatically, via a Rust file watcher. If the file behind your *currently open* note changes externally, it's silently reloaded when you have no unsaved edits, or you get a "File changed externally" dialog (Reload / Keep Current / Compare) when you do.
- **Editor** — CodeMirror 6 in an Obsidian-style *Live Preview* mode: Markdown syntax (`**bold**`, `# heading`, `` `code` ``, blockquotes, lists) is styled and its markup hidden while the cursor is elsewhere, and shown raw when editing that spot. Autosave (debounced, atomic temp-file+rename writes), undo/redo, in-document search (Ctrl+F), `[[Wiki Link]]` autocomplete against the workspace's notes, Saving…/Saved ✓/Save failed ⚠ status, word + character count.
- **Preview** — Editor / Split / Preview toggle. Split mode keeps both panes scrolled to the same source line (not just the same scroll %). Renders GFM tables (with their own horizontal scrollbar, not the whole page), syntax-highlighted code blocks, Mermaid diagrams (fixed light card + mermaid's "neutral" theme, independent of the app's own dark/light mode), and local images referenced from a note (resolved relative to the note's own folder).
- **Import / Export** — import loose `.md`/`.txt` files, a whole folder (hierarchy preserved), or a `.zip` (path-traversal-checked on extraction) into any folder; export a single note, or a folder/whole workspace as a `.zip`.
- **Theming** — light (default) / dark toggle, consistent across the editor, preview, and Mermaid diagrams.
- **Packaging** — `npm run tauri build` produces a working `.msi` and NSIS `.exe` installer.

## Not built yet

Wiki-links (`[[Note]]`) autocomplete while typing but aren't clickable for navigation yet, and there's no backlinks panel, no tags explorer, no quick-open, no command palette, no full-workspace search (only in-document search exists), no resizable panels, and no settings panel. Full breakdown: [docs/implementation_status.md](docs/implementation_status.md).

## Prerequisites

- Node.js 18+
- Rust toolchain (`rustup`) — required to run/build the desktop shell
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on most Windows 10/11 systems) and the MSVC C++ Build Tools (needed to link the Rust side)

Install Rust: https://www.rust-lang.org/tools/install

## Develop

```bash
npm install
npm run tauri dev
```

`npm run dev` alone only starts the Vite web preview (no filesystem access — the Explorer/Editor need the Tauri commands in `src-tauri`).

## Build a Windows .exe

This produces a real installable Windows app — an installer that, once run, puts a normal `.exe` on the user's machine (Start Menu shortcut, uninstaller, no Node/Rust/dev tools required on their side).

1. Make sure the [Prerequisites](#prerequisites) above are installed on **your** (build) machine — Node, Rust, WebView2, MSVC Build Tools. The person you hand the installer to needs none of that; only WebView2 (already on most Windows 10/11 installs).
2. Install JS dependencies (first time only, or after pulling changes to `package.json`):
   ```bash
   npm install
   ```
3. Run the build:
   ```bash
   npm run tauri build
   ```
   This compiles the frontend (`vite build`), compiles the Rust backend in release mode, embeds the icon, and packages everything. Takes a few minutes the first time (Rust release compile); faster on later runs.
4. Grab the output from `src-tauri/target/release/bundle/`:
   - `nsis/Darmavian_<version>_x64-setup.exe` — a normal Windows installer (double-click, Next, Next, Finish). **This is the one to hand people.**
   - `msi/Darmavian_<version>_x64_en-US.msi` — same thing as an `.msi`, if you specifically need that format (e.g. enterprise deployment via Group Policy).
5. Run the installer, launch Darmavian from the Start Menu like any other app.

The unpackaged executable also exists on its own at `src-tauri/target/release/darmavian.exe` if you just want to run it directly without installing (no Start Menu entry, no uninstaller — useful for quick local testing).

**Troubleshooting**
- Build fails immediately with a `cargo`/`link.exe` error → the MSVC C++ Build Tools aren't installed (see Prerequisites); Rust needs them to link on Windows.
- Icon looks unchanged after rebuilding new `.ico`/`.png` files under `src-tauri/icons/` → Cargo may not detect the asset change; force it with `touch src-tauri/build.rs` (or just edit-and-save that file) before rebuilding. Windows also caches taskbar/exe icons aggressively — an Explorer restart or logoff may be needed to actually see it.
- Want a smaller/faster build for local testing only (skip installer packaging) → `npm run tauri build -- --debug`, or `cd src-tauri && cargo build` for just the Rust binary.

## Project layout

```
src/
  components/     shared UI (PromptModal, ConflictModal)
  features/
    explorer/     workspace tree (incl. drag-and-drop move), context menu, new-item/import menu
    editor/       CodeMirror + Live Preview decorations, search, wiki-link autocomplete,
                  tabs, status bar, scroll-sync
    preview/      markdown-it renderer (+ image resolution) and Mermaid
  services/       note/folder/workspace/asset/importExport services → tauriClient (Tauri IPC boundary)
  stores/         Zustand: workspace / editor (incl. external-change detection) / ui
  utils/          tree flattening (wiki-link source list), relative-path resolution
src-tauri/
  src/
    commands/     Tauri commands (workspace, note, folder, entry, asset, import_export)
    filesystem/   tree walk, atomic writes, recursive copy
    security/     filename sanitization, path-traversal guards
    watcher/      notify-based file watcher → "workspace://changed" event
```

See plan §30 for the originally suggested structure and §37 for the phased roadmap.
