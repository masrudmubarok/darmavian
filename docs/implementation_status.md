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
- ✅ Move note / move folder — drag-and-drop in the tree (including dropping on the empty sidebar area to move to the workspace root) and a "Move to…" context-menu item (native folder picker)

## Phase 3 — Markdown Editor

- ✅ Integrate CodeMirror
- ✅ Markdown syntax highlighting — implemented as an Obsidian-style **Live Preview** (styles rendered, syntax marks hidden until the cursor touches them), which exceeds the plan's baseline ask
- ✅ Open and edit Markdown files
- ✅ Autosave implementation (debounced + atomic temp-file+rename writes)
- ✅ Undo / redo support
- ✅ Save status indicator (Saving… / Saved ✓ / Save failed ⚠)
- ✅ Word count
- ✅ Character count
- 🟡 Autocomplete for `[[links]]` / tags — `[[Wiki Link]]` autocomplete against the workspace's notes is implemented (`@codemirror/autocomplete`, sourced from the already-loaded tree — no extra file reads); tag autocomplete is not, since there's no tag index yet (that needs Phase 5's Tags feature first)
- ✅ Search within document (`@codemirror/search`, Ctrl+F)
- ❌ Slash commands, Markdown shortcuts, drag-and-drop images *into the editor*, table editing, callouts (all explicitly "Future Capabilities" in the plan — intentionally deferred)

## Phase 4 — Preview

- ✅ Markdown renderer (markdown-it: GFM tables, strikethrough, code fences)
- ✅ Editor mode / Preview mode / Split mode
- ✅ Split-mode scroll sync, mapped by source line (not raw scroll %)
- ✅ Handle internal images — local `![](...)` references are resolved against the note's own folder and loaded via a Rust command that returns a `data:` URL (works around Tauri's asset-protocol scope not being pre-registrable for an arbitrary, user-chosen workspace folder); a 25MB size guard applies
- 🟡 Handle internal links — `[[wiki links]]` are not yet clickable for navigation (that's Phase 5; autocomplete for them now exists per Phase 3, but resolving/opening the target note on click does not)
- ✅ *(beyond plan)* Mermaid diagram rendering with a fixed light card, independent of app theme

## Phase 5 — Knowledge Features

- ❌ `[[Wiki Links]]` navigation (autocompletes while typing — Phase 3 — but clicking a link does not yet open the target note)
- ❌ Backlinks listing
- ❌ Tags explorer
- ❌ Quick open modal (Ctrl+P)
- ❌ Full workspace search (Ctrl+Shift+F) — only in-document search exists (Phase 3)
- ❌ Command palette (Ctrl+K)

## Phase 6 — Import / Export

- ✅ Import `.md`/`.txt` files (multi-select, copied into the target folder)
- ✅ Import folder (hierarchy preserved, copied into the target folder)
- ✅ Import `.zip` (extracted into its own folder; unsafe entry paths — absolute or containing `..` — are skipped rather than trusted, per §21/§35)
- ✅ Export a single note (native save dialog)
- ✅ Export a folder or the whole workspace as `.zip` (a workspace root is just a folder, so one command covers both)
- 🟡 UI is context-menu/`+`-menu driven (per-folder Import…, root-level Import…/Export Workspace…) rather than the dedicated Import/Export panel sketched in the plan's mockups — functionally complete, not laid out identically

## Phase 7 — External Changes

- ✅ Setup file watcher (Rust `notify` + debouncer → `workspace://changed` event)
- ✅ Sidebar auto-refreshes on external filesystem changes
- ✅ Auto-reload a *currently open* note's content when its file changes externally and there are no unsaved local edits
- ✅ External modification conflict dialog ("Reload / Keep Current / Compare") when the open note *does* have unsaved edits — Compare is a plain side-by-side of the two texts, not a line-by-line diff
- ✅ Safe atomic writes (temp file → flush → rename)

## Phase 8 — Polish

- 🟡 Keyboard shortcuts — editor-native ones now include Ctrl+F (search) alongside CodeMirror's default keymap and undo/redo; still no app-level shortcuts (Ctrl+K/P/Shift+F — those features don't exist yet either)
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
- ✅ Path-traversal guards on create/rename/move/import (`security::join_within`, plus `enclosed_name()` checks on ZIP extraction)
- 🟡 Symlinks — not specifically special-cased (plan §35 asks they be "handled carefully"); directory walk follows whatever `fs::read_dir` metadata reports
- ✅ ZIP path validation — unsafe entries (absolute paths, `..` components) are skipped during import rather than trusted
- 🟡 Error handling — Rust errors are turned into readable strings and surfaced inline (banners in Explorer/Preview, status bar for save failures), but not via the dedicated "\[Retry\] \[Locate File\]" banner UI sketched in §34
- 🟡 Attachments — local image resolution now works (see Phase 4); there's still no enforced/suggested `Attachments/` folder convention, and no size/type restriction beyond the 25MB read guard

## Not part of the plan (added along the way)

- Themed `PromptModal` for New Note / New Folder / Rename, replacing native `window.prompt()`
- Themed `ConflictModal` for external-change resolution
- Folder vs. note icons + tooltip on truncated Explorer names
- New-item ("+") menu next to "Open…", now also carrying Import/Export
- Last-opened workspace auto-reopens on launch (`localStorage`, per-machine — not part of plan §13)
