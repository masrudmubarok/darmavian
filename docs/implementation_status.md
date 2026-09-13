# Implementation Status

Checklist against [darmavian_implementation_plan_design.md](darmavian_implementation_plan_design.md). Legend: ✅ done · 🟡 partial · ❌ not started.

## Phase 1 — Foundation

- ✅ Initialize Tauri 2
- ✅ Setup React + TypeScript
- ✅ Setup Tailwind CSS
- ✅ Setup Zustand
- ✅ Build application shell
- ✅ Setup theme system (light default / dark toggle)
- ✅ Implement workspace selection (native folder picker)

## Phase 2 — Filesystem Explorer

- ✅ Read directory tree
- ✅ Folder expand / collapse
- ✅ Create, rename, delete folder (delete → system Trash)
- ✅ Create, rename, delete note (delete → system Trash)
- 🟡 Move note / move folder — Rust command (`move_entry`) exists, but there is no UI for it yet (no drag-and-drop, no "Move…" menu item)

## Phase 3 — Markdown Editor

- ✅ Integrate CodeMirror
- ✅ Markdown syntax highlighting — implemented as an Obsidian-style **Live Preview** (styles rendered, syntax marks hidden until the cursor touches them), which exceeds the plan's baseline ask
- ✅ Open and edit Markdown files
- ✅ Autosave implementation (debounced + atomic temp-file+rename writes)
- ✅ Undo / redo support
- ✅ Save status indicator (Saving… / Saved ✓ / Save failed ⚠)
- ✅ Word count
- ❌ Character count
- ❌ Autocomplete for `[[links]]` / tags (listed under Editor's "Required Features" in §16)
- ❌ Search within document
- ❌ Slash commands, Markdown shortcuts, drag-and-drop images, table editing, callouts (all explicitly "Future Capabilities" in the plan)

## Phase 4 — Preview

- ✅ Markdown renderer (markdown-it: GFM tables, strikethrough, code fences)
- ✅ Editor mode / Preview mode / Split mode
- ✅ Split-mode scroll sync, mapped by source line (not raw scroll %)
- 🟡 Handle internal links and images — Mermaid diagrams and syntax-highlighted code blocks render; plain image references (`![](...)`) are not path-resolved against the note's folder, and `[[wiki links]]` are not clickable yet (that's Phase 5)
- ✅ *(beyond plan)* Mermaid diagram rendering with a fixed light card, independent of app theme

## Phase 5 — Knowledge Features

- ❌ `[[Wiki Links]]` parsing / navigation (currently inert plain text)
- ❌ Backlinks listing
- ❌ Tags explorer
- ❌ Quick open modal (Ctrl+P)
- ❌ Full workspace search (Ctrl+Shift+F)
- ❌ Command palette (Ctrl+K)

Nothing in this phase has been started.

## Phase 6 — Import / Export

- ❌ Import `.md`, folder, `.zip`
- ❌ Export `.md`, folder, `.zip`

Nothing in this phase has been started.

## Phase 7 — External Changes

- ✅ Setup file watcher (Rust `notify` + debouncer → `workspace://changed` event)
- ✅ Sidebar auto-refreshes on external filesystem changes
- ❌ Auto-reload a *currently open* note's content when its file changes externally
- ❌ External modification conflict dialog ("Reload / Keep Current / Compare")
- ✅ Safe atomic writes (temp file → flush → rename)

## Phase 8 — Polish

- 🟡 Keyboard shortcuts — only editor-native ones (CodeMirror's default keymap, undo/redo); no app-level shortcuts (Ctrl+K/P/Shift+F, etc. — those features don't exist yet either)
- ❌ Resizable layout panels (sidebar width is fixed)
- ✅ Tabbed editor view
- ❌ Settings panel
- ✅ Dark / light themes
- ✅ Application packaging & installer (`.msi` + NSIS `.exe` via `tauri build`)

## Phase 9 — Advanced Features (Post-MVP)

- ❌ Graph view
- ❌ Document history
- ❌ Advanced search indexing
- ❌ Local AI integration
- ❌ Plugin system
- ❌ Custom themes

Correctly untouched — plan explicitly scopes these to after MVP is stable.

## Cross-cutting

- ✅ Filename sanitization (`security::sanitize_filename`)
- ✅ Path-traversal guards on create/rename/move (`security::join_within`)
- 🟡 Symlinks — not specifically special-cased (plan §35 asks they be "handled carefully"); directory walk follows whatever `fs::read_dir` metadata reports
- ❌ ZIP path validation — N/A until import/export exists
- 🟡 Error handling — Rust errors are turned into readable strings and surfaced inline (banners in Explorer/Preview, status bar for save failures), but not via the dedicated "\[Retry\] \[Locate File\]" banner UI sketched in §34
- ❌ Attachments folder convention / local image resolution (§24)

## Not part of the plan (added along the way)

- Themed `PromptModal` for New Note / New Folder / Rename, replacing native `window.prompt()`
- Folder vs. note icons + tooltip on truncated Explorer names
- New-item ("+") menu next to "Open…"
