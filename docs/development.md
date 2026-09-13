# Developer Guide

This is the map for anyone picking up this codebase. For product scope see [darmavian_implementation_plan_design.md](darmavian_implementation_plan_design.md); for what's actually built vs. not, see [implementation_status.md](implementation_status.md).

## Core principle, and why it constrains the code

> The filesystem is the database. Markdown is the document format.

There is no database, no server, no account, no network calls. Every feature has to be explainable as "read/write plain files on disk." Before adding a dependency or a data model, ask whether it can be derived from the `.md` files instead of stored separately — that's the test the existing code (backlinks-to-be, tags-to-be, etc.) is meant to pass.

## Stack

Tauri 2 (Rust native shell) + React 18 + TypeScript, Zustand for state, Tailwind for styling, CodeMirror 6 for the editor, markdown-it + Mermaid for the preview.

## Setup

```bash
npm install
npm run tauri dev       # desktop app, hot-reloading
```

Needs the Rust toolchain (`rustup`) and, on Windows, the MSVC C++ Build Tools — `npm run dev` alone only serves the web UI and has no filesystem access (no `src-tauri` process behind it).

```bash
npx tsc -b               # typecheck
npx vite build            # frontend build only (fast sanity check)
cd src-tauri && cargo build   # Rust build only
npm run tauri build       # full installer (.msi + NSIS .exe)
```

## The IPC boundary — the one rule that matters most

```
React Component → Zustand store / hook → Service → tauriClient → Rust #[tauri::command] → filesystem
```

`src/services/tauriClient.ts` is the **only** file allowed to import `@tauri-apps/api/core`'s `invoke`. Components and stores never call `invoke` directly, and never call Rust command names as string literals outside that file. If you're adding a filesystem operation:

1. Write the Rust command in `src-tauri/src/commands/<area>.rs`, register it in `src-tauri/src/lib.rs`'s `invoke_handler![...]`.
2. Add a typed wrapper method in `tauriClient.ts`.
3. Call that wrapper from the relevant service (`noteService.ts` / `folderService.ts` / `workspaceService.ts`), not from a component.
4. Components call the service directly when there's no shared state to manage (e.g. `ExplorerPanel` calls `workspaceService.pickWorkspace()`), or via a store action when the result needs to update shared state (e.g. `workspaceStore.openWorkspace`). Either is fine — the rule is just "never skip straight to `invoke`."

Any new Rust command that takes a path or filename **must** go through `security::sanitize_filename` / `security::join_within` (see below) — don't hand a raw user-supplied string to `std::fs`.

## Repo layout

```
src/
  components/          Shared UI with no feature ownership (PromptModal, ConflictModal, WindowControls)
  features/
    explorer/          Workspace tree (incl. drag-and-drop move), right-click menu, "+" new-item menu
    editor/            CodeMirror wrapper, Live Preview decorations, search, wiki-link
                        autocomplete, tabs, status bar, the Editor/Split/Preview toggle,
                        and scroll-sync plumbing
    preview/           markdown-it renderer (+ image resolution) + Mermaid rendering
  services/            One file per domain (note/folder/workspace/asset/importExport/system) + tauriClient.ts
  stores/              Zustand: workspaceStore, editorStore (incl. external-change detection), uiStore
  types/workspace.ts   Shared domain types (WorkspaceNode, Note, Tag, NoteLink)
  utils/               Tree flattening (wiki-link source list), relative-path resolution
  styles.css           All CSS: theme tokens, prose/typography, hljs palette

src-tauri/src/
  commands/            One #[tauri::command] file per domain (workspace/note/folder/entry/
                        asset/import_export/system)
  filesystem/          Directory tree walk, atomic write helper, recursive copy
  security/            Filename sanitization + path-traversal guard — the only place
                        that's allowed to build a filesystem path from user input
  watcher/             notify-based file watcher, emits "workspace://changed"
  lib.rs               Builder setup: plugins, managed state, invoke_handler registration
```

The window itself is frameless (`decorations: false` in `tauri.conf.json`) — the titlebar you see (sidebar toggle, theme toggle, drag region, window controls) is plain React/HTML in `App.tsx` + `WindowControls.tsx`, not OS chrome. A `data-tauri-drag-region` div makes the empty middle area draggable/double-click-to-maximize; don't put interactive controls inside it.

## State management

Three Zustand stores, each owning a distinct slice — don't blur them:

- **`workspaceStore`** — the tree, the open root path, expand/collapse state, the file-watcher subscription. Does *not* hold note content.
- **`editorStore`** — open tabs and their in-memory content, active tab, save status. Content is loaded lazily per-tab (`openNote`) and dropped on `closeTab` — never build a `Record<path, content>` for the whole workspace (the plan explicitly calls this out as the anti-pattern to avoid; the target is smooth navigation at 10,000+ files).
- **`uiStore`** — theme, sidebar visibility, view mode, context-menu position. Pure UI, nothing persisted to disk.

## The two non-obvious subsystems

### Live Preview (`features/editor/livePreview.ts`)

The editor is plain CodeMirror holding the real Markdown text — there's no separate rich-text document model. `livePreview()` is a `ViewPlugin` that walks the Lezer syntax tree on every doc/selection change and:

- adds **style** decorations (bold, italic, heading size, blockquote, code) over the content span, and
- adds **hidden** decorations (`Decoration.replace`) over the syntax marks (`**`, `#`, backtick, `>`) *only when the selection isn't touching that node* — so clicking into a styled span reveals the raw markdown to edit.

The hidden ranges are also registered as `EditorView.atomicRanges` so the cursor skips over them with arrow keys instead of landing inside invisible text. If you add a new inline construct (e.g. strikethrough variants, wiki-links), follow the existing pattern in `handleNode()`: match the Lezer node type, decide style vs. hide based on `selectionTouches()`.

### Split-mode scroll sync (`EditorPanel.tsx` + `PreviewPane.tsx` + `markdownRenderer.ts`)

Naïve percentage-based sync (`scrollTop / scrollHeight`) breaks because a heading or a Mermaid diagram is much taller than a text line — the two documents don't have proportional heights. Instead:

1. `markdownRenderer.ts` stamps every block-level element with `data-line="<0-indexed source line>"` (a `markdown-it` core rule reading `token.map`). **If you override a `md.renderer.rules.*` rule, you must manually re-emit `data-line` from the token** — the default renderer does this for you via `token.attrs`, a custom rule does not (this bit us once with the `fence` rule, see git history).
2. `PreviewPane` builds a sorted `{line, pixelOffset}` table from those attributes after every render (and again after Mermaid finishes, since diagram height is only known post-render).
3. `CodeMirrorEditor` reports a *fractional* line number (`topLine + fractionWithinLine`, via `view.lineBlockAtHeight`), and can scroll to one (`view.lineBlockAt` + interpolate).
4. `EditorPanel` wires the two together with a `suppress` ref flag so a programmatic scroll on one side doesn't ping-pong back through the other's scroll listener.

Both `CodeMirrorEditor` and `PreviewPane` expose this through a shared `ScrollSyncHandle` interface (`scrollToLine`) via `forwardRef`/`useImperativeHandle`.

## Security conventions

- `security::sanitize_filename` strips path separators and reserved characters from any user-typed name (folder/note title, rename target).
- `security::join_within` sanitizes *and* rejects `..`/root/prefix components before joining onto a parent path — use this instead of `parent.join(name)` directly whenever `name` came from the frontend.
- Deletes go through the `trash` crate (system Trash), never `fs::remove_*` — see plan §7.
- Writes go through `filesystem::atomic_write` (temp file → flush → rename), never a direct `fs::write`.

## Styling / theming

Everything is CSS custom properties on `:root` (dark, the base) and `[data-theme="light"]` (override) in `src/styles.css` — see the top of that file for the full token list (`--color-surface`, `--color-accent`, `--color-code-*`, etc.). Component styles reference `var(--color-*)`, not hard-coded hex, so both themes stay correct automatically. The one deliberate exception: Mermaid diagrams render on a **fixed** light card regardless of app theme (`#ffffff` background, mermaid's built-in `"neutral"` theme) — that was a conscious choice after custom dark/cream palettes proved hard to keep readable in both app themes; see git history on `PreviewPane.tsx` if you're tempted to theme it dynamically again.

## Debugging tips

- Right-click → Inspect in the dev build opens the WebView's devtools (it's just Edge WebView2 on Windows).
- Rust-side errors are returned as `Result<T, String>` from every command and surfaced as plain strings in the UI (inline banners, save-status text) — don't let a raw `unwrap()` panic across the IPC boundary.
- If you change files under `src-tauri/icons/` or `tauri.conf.json`'s `bundle` section and a rebuild doesn't pick it up, `touch src-tauri/build.rs` to force the build script to rerun (Cargo's own change-detection doesn't always catch icon asset changes).
- Windows aggressively caches taskbar/exe icons — a changed `.ico` may need an Explorer restart (or logoff) to visibly update, even though the binary is correct.
