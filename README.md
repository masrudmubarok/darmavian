# Darmavian

Offline Markdown knowledge-management desktop app (Tauri 2 + React + Rust). Filesystem is the database; Markdown files are the only document format. See [docs/darmavian_implementation_plan_design.md](docs/darmavian_implementation_plan_design.md) for the full product plan, and [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for what's actually built vs. still pending against that plan.

## What works today

- **Workspace** — open any local folder as a workspace (native folder picker); sidebar header shows the open folder's name.
- **Explorer** — real filesystem tree (folders 📁/📂, notes 📄), expand/collapse, right-click New Note / New Folder / Rename / Delete (moves to system Trash), a themed modal for name input (no native `prompt()`), tooltip on truncated names.
- **Live file sync** — the sidebar reflects changes made outside the app (new/renamed/deleted files from Explorer, VS Code, git, …) automatically, via a Rust file watcher.
- **Editor** — CodeMirror 6 in an Obsidian-style *Live Preview* mode: Markdown syntax (`**bold**`, `# heading`, `` `code` ``, blockquotes, lists) is styled and its markup hidden while the cursor is elsewhere, and shown raw when editing that spot. Autosave (debounced, atomic temp-file+rename writes), undo/redo, Saving…/Saved ✓/Save failed ⚠ status, word count.
- **Preview** — Editor / Split / Preview toggle. Split mode keeps both panes scrolled to the same source line (not just the same scroll %). Renders GFM tables (with their own horizontal scrollbar, not the whole page), syntax-highlighted code blocks, and Mermaid diagrams (fixed light card + mermaid's "neutral" theme, independent of the app's own dark/light mode).
- **Theming** — light (default) / dark toggle, consistent across the editor, preview, and Mermaid diagrams.
- **Packaging** — `npm run tauri build` produces a working `.msi` and NSIS `.exe` installer.

## Not built yet

Wiki-links (`[[Note]]`) are inert plain text — no navigation, no backlinks, no tags explorer, no quick-open, no command palette, no search, no import/export, no attachments/image resolution, no external-edit-conflict prompt for an already-open note, no resizable panels or settings panel. Full breakdown: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

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

## Build

```bash
npm run tauri build
```

Produces installers under `src-tauri/target/release/bundle/`.

## Project layout

```
src/
  components/     shared UI (e.g. PromptModal)
  features/
    explorer/     workspace tree, context menu, new-item menu
    editor/       CodeMirror + Live Preview decorations, tabs, status bar, scroll-sync
    preview/      markdown-it renderer + Mermaid
  services/       noteService / folderService / workspaceService → tauriClient (Tauri IPC boundary)
  stores/         Zustand: workspace / editor / ui
src-tauri/
  src/
    commands/     Tauri commands (workspace, note, folder, entry)
    filesystem/   tree walk, atomic writes
    security/     filename sanitization, path-traversal guards
    watcher/      notify-based file watcher → "workspace://changed" event
```

See plan §30 for the originally suggested structure and §37 for the phased roadmap.
