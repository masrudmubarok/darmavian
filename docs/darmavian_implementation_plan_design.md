# Darmavian — Implementation Plan & Design

## 1. Product Definition

**Darmavian** is a lightweight, fully offline desktop knowledge-management and documentation application inspired by the organizational flexibility of OneNote and the Markdown/linking philosophy of Obsidian.

### Core Characteristics

- 100% offline
- No server
- No account
- No cloud dependency
- No database
- Markdown files are the source of truth
- CRUD directly against Markdown files
- Unlimited nested folder hierarchy
- Import/export based on Markdown and folder structures
- Lightweight desktop runtime using Tauri 2
- Customizable UI
- Designed primarily for personal documentation and knowledge management

### Core Principle

> **The filesystem is the database, and Markdown is the document format.**

Darmavian must never require a proprietary database to recover the user's documents.

---

## 2. Product Concept

Darmavian combines ideas from:

### OneNote
- Notebook-like organization
- Sections/categories
- Nested hierarchy
- Easy note creation
- Personal knowledge organization

### Obsidian
- Markdown files
- Wiki links
- Backlinks
- Tags
- Graph relationships
- Local-first workflow
- Files remain accessible outside the application

The resulting hierarchy can be:

```text
Darmavian Workspace
│
├── Software Development
│   ├── Backend
│   │   ├── Node.js
│   │   │   ├── Streams.md
│   │   │   └── Worker Threads.md
│   │   │
│   │   └── API Design.md
│   │
│   └── Frontend
│       └── Angular.md
│
├── System Design
│   ├── Concurrency.md
│   ├── Latency.md
│   └── Caching.md
│
├── Work
│   └── Projects
│
└── Personal
    └── Planning
```

> A **"Notebook"**, **"Section"**, or **"Category"** is simply represented by a normal filesystem folder.

---

## 3. Technology Stack

| Area | Technology |
| :--- | :--- |
| **Desktop runtime** | Tauri 2 |
| **UI** | React |
| **Language** | TypeScript |
| **Native layer** | Rust |
| **Editor** | CodeMirror |
| **State management** | Zustand |
| **Styling** | Tailwind CSS |
| **Data** | Markdown files |
| **Storage** | Local filesystem |
| **Database** | None |
| **Backend** | None |
| **Network** | None required |
| **Import** | Markdown / folder / ZIP |
| **Export** | Markdown / folder / ZIP |

---

## 4. Architecture

```text
┌──────────────────────────────────────────────┐
│                 Darmavian                    │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │          React + TypeScript            │  │
│  │                                        │  │
│  │ Sidebar │ Notes │ Editor │ Preview     │  │
│  │ Search  │ Tags  │ Links  │ Settings   │  │
│  └──────────────────┬─────────────────────┘  │
│                     │                        │
│                  Tauri IPC                   │
│                     │                        │
│  ┌──────────────────▼─────────────────────┐  │
│  │                  Rust                  │  │
│  │                                        │  │
│  │ Filesystem │ Watcher │ Import │ Export │  │
│  │ Dialogs    │ ZIP     │ OS APIs         │  │
│  └──────────────────┬─────────────────────┘  │
│                     │                        │
│  ┌──────────────────▼─────────────────────┐  │
│  │             Local Filesystem           │  │
│  │                                        │  │
│  │ Folders + Markdown + Attachments       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

- **React** handles the majority of application development.
- **Rust** is the native desktop layer responsible mainly for filesystem and OS operations.

---

## 5. Filesystem as Source of Truth

Darmavian does not require a database.

### Example Workspace Structure

```text
Darmavian/
│
├── Software Development/
│   ├── JavaScript/
│   │   ├── Fundamentals.md
│   │   ├── Async Await.md
│   │   └── Event Loop.md
│   │
│   ├── Node.js/
│   │   ├── Streams.md
│   │   ├── Worker Threads.md
│   │   └── EventEmitter.md
│   │
│   └── System Design/
│       ├── Concurrency.md
│       ├── Latency.md
│       ├── Throughput.md
│       └── Caching.md
│
├── Work/
│   ├── BeED/
│   │   ├── Projects/
│   │   ├── Technical Notes/
│   │   └── Meeting Notes/
│   │
│   └── Career/
│
├── Personal/
│   ├── Finance/
│   └── Planning/
│
└── Templates/
    ├── Default Note.md
    └── Meeting.md
```

- Every note is a normal `.md` file.
- Every category is a normal directory.

---

## 6. Multi-Hierarchy Folder System

Folders can be nested without a fixed depth.

### Example

```text
Software Development/
└── Backend/
    └── Node.js/
        └── Advanced/
            └── Streams.md
```

Darmavian must **not** impose a fixed hierarchy such as:
`Notebook > Section > Page`

Instead:
```text
Folder
  └── Folder
      └── Folder
          └── Folder
              └── Note.md
```

The hierarchy is controlled entirely by the user.

---

## 7. CRUD Model

### Create Note

```text
New Note 
   ↓
Choose current folder 
   ↓
Enter title 
   ↓
Create CurrentFolder/Title.md 
   ↓
Open editor
```

### Read Note

```text
Click note 
   ↓
Filesystem read 
   ↓
Markdown parser 
   ↓
Editor
```

### Update Note

```text
Editor change 
   ↓
Debounce 
   ↓
Write Markdown file
```

### Delete Note

```text
Delete 
   ↓
Confirmation 
   ↓
Move to system Trash
```
*Prefer system Trash/Recycle Bin instead of irreversible deletion.*

### Rename Note

```text
Rename Note 
   ↓
Filesystem rename 
   ↓
Update UI
```
*Future versions may optionally update `[[Wiki Links]]` after renaming.*

---

## 8. Folder CRUD

Folders are first-class objects.

### Supported Operations
- Create Folder
- Rename Folder
- Delete Folder
- Move Folder
- Create Subfolder

### Example Context Menu

```text
System Design
│
├── New Note
├── New Folder
├── Import
├── Export
├── Rename
├── Move
└── Delete
```

---

## 9. Markdown as the Only Document Format

The canonical document format is `.md`.

### Example Document

```markdown
---
title: Concurrency
tags:
  - backend
  - system-design
---

# Concurrency

Concurrency is the ability to deal with multiple
tasks whose execution periods overlap.

## Related

[[Latency]]
[[Throughput]]
[[Parallelism]]
```

Frontmatter is optional. A normal Markdown file without frontmatter must still work.

---

## 10. Wiki Links

Darmavian supports:
```markdown
[[Concurrency]]
```

The UI renders it as a clickable link.

### Future Syntax Features
```markdown
[[Concurrency#Examples]]
[[Concurrency|Concurrency concept]]
```

### Resolution Flow

```text
Current Note 
   ↓
Resolve target 
   ↓
Find Markdown file 
   ↓
Open target note
```

---

## 11. Backlinks

If `System Design/Concurrency.md` contains:
```markdown
[[Latency]]
```

Then `Latency.md` can show:

```text
Backlinks

System Design
└── Concurrency
```

Backlinks are derived from Markdown files and are **not** primary data.

---

## 12. Tags

### Frontmatter Support

```markdown
---
tags:
  - backend
  - nodejs
  - architecture
---
```

### Example Tag Explorer

```text
Tags

#backend          32
#nodejs           18
#architecture     14
#system-design    27
```

Tags remain part of the Markdown file.

---

## 13. Workspace

A workspace is simply a normal directory on the system.

### Examples
- `D:/Documents/Darmavian`
- `~/Documents/Darmavian`

Opening a workspace means opening that directory. No proprietary workspace database is required.

---

## 14. UI Layout

Recommended default UI structure:

```text
┌────────────────────────────────────────────────────────────┐
│ Darmavian                     Search...          Ctrl + K   │
├────────────────┬───────────────────────────┬───────────────┤
│                │                           │               │
│ Workspace      │       Editor              │ Properties    │
│                │                           │               │
│ ▼ Software Dev │ # Concurrency             │ Tags          │
│   ▼ Backend    │                           │               │
│     ▼ Node.js  │ Concurrency is...         │ #backend      │
│                │                           │ #system-design│
│   ▼ System     │ ## Examples               │               │
│     Design     │                           │ Backlinks     │
│       Note.md  │ [[Latency]]               │               │
│                │                           │ 3 references  │
│ ▼ Work         │                           │               │
│                │                           │               │
├────────────────┴───────────────────────────┴───────────────┤
│ Saved ✓ | Markdown | 132 words | UTF-8                     │
└────────────────────────────────────────────────────────────┘
```

### Three Major Areas
1. **Explorer**
2. **Editor**
3. **Context / Metadata Panel**

---

## 15. Explorer

The Explorer represents the actual filesystem.

### Example

```text
▼ Software Development
  ▼ System Design
    📄 Concurrency.md
    📄 Latency.md
    📄 Caching.md

  ▼ Backend
    ▼ Node.js
      📄 Streams.md
      📄 Workers.md
```

> **Important Rule:** The tree shown in the UI must represent the actual filesystem hierarchy. No virtual folders in MVP.

---

## 16. Editor

Built using **CodeMirror**.

### Required Features
- Markdown syntax highlighting
- Autocomplete for `[[links]]`
- Autocomplete for tags
- Search within document
- Undo / redo
- Autosave
- Word count
- Character count

### Future Capabilities
- Slash commands
- Markdown shortcuts
- Drag and drop images
- Table editing
- Callouts

---

## 17. Preview

Supports:
- **Editor Mode**
- **Preview Mode**
- **Split Mode**

### Example Split Layout

```text
┌───────────────────────┬────────────────────────┐
│ Markdown              │ Preview                │
│                       │                        │
│ # Concurrency         │ Concurrency            │
│                       │                        │
│ Concurrency is...     │ Concurrency is...      │
└───────────────────────┴────────────────────────┘
```

---

## 18. Search

MVP search works directly from files.

- **Shortcut:** `Ctrl + Shift + F`
- **Query:** `concurrency`
- **Results:**
  ```text
  System Design/Concurrency.md
  System Design/Distributed Systems.md
  Backend/Node.js/Workers.md
  ```

Do not introduce SQLite merely for search. If the workspace becomes very large, a rebuildable search index can be introduced later.

---

## 19. Quick Open

- **Shortcut:** `Ctrl + P`
- **Query:** `concur`
- **Results:**
  ```text
  Concurrency.md
  Distributed Concurrency.md
  Concurrency Patterns.md
  ```

Selecting a result opens the file immediately.

---

## 20. Command Palette

- **Shortcut:** `Ctrl + K`

### Available Commands
- Create Note
- Create Folder
- Open Note
- Search Workspace
- Rename
- Delete
- Move
- Import
- Export
- Toggle Sidebar
- Toggle Preview
- Toggle Fullscreen
- Open Settings
- Reload File

Uses a centralized command registry:

```typescript
type Command = {
  id: string;
  title: string;
  shortcut?: string;
  execute: () => void;
};
```

---

## 21. Import

### Supported Formats Initially
- `.md`
- `.txt`
- Folder
- `.zip`

Folder import must preserve hierarchy.

#### Example Folder Import
**Source Structure:**
```text
Old Notes/
├── JavaScript.md
├── Node.js/
│   └── Streams.md
└── System Design/
    └── Caching.md
```

**Target Workspace Structure:**
```text
Workspace/
└── Imported/
    └── Old Notes/
        ├── JavaScript.md
        ├── Node.js/
        │   └── Streams.md
        └── System Design/
            └── Caching.md
```

#### ZIP Import Flow
```text
Import 
 ↓
Select ZIP 
 ↓
Validate archive 
 ↓
Prevent path traversal 
 ↓
Extract 
 ↓
Copy into workspace 
 ↓
Refresh tree
```

---

## 22. Export

- **Export Note:** `Concurrency.md`
- **Export Folder:**
  ```text
  System Design/
  ├── Concurrency.md
  ├── Latency.md
  └── Caching.md
  ```
- **Export Workspace:**
  ```text
  Darmavian-Export.zip
  ├── Software Development/
  ├── Work/
  ├── Personal/
  └── Templates/
  ```

> **Rules:**
> 1. Export must preserve the original hierarchy.
> 2. Export must never modify the source workspace.

---

## 23. Import/Export Principle

Import/export should not require database transformation.

```text
Darmavian ──► Export ──► Normal Markdown Files
```
```text
Normal Markdown Files ──► Import ──► Darmavian
```

This ensures easy migration between applications.

---

## 24. Attachments

Notes remain plain Markdown. Images and documents can be referenced locally.

### Recommended Structure

```text
Workspace/
├── Software Development/
├── Work/
├── Personal/
└── Attachments/
    ├── architecture.png
    ├── screenshot.png
    └── diagram.svg
```

### Reference Example

```markdown
![Architecture](../Attachments/architecture.png)
```

Attachments are ordinary local files.

---

## 25. File Watcher

Darmavian monitors workspace changes in real-time.

```text
VS Code modifies Concurrency.md
              ↓
        File watcher
              ↓
  Darmavian detects change
              ↓
         Reload note
```

If Darmavian also has unsaved changes:

```text
┌──────────────────────────────────────┐
│ File changed externally              │
│                                      │
│ [Reload] [Keep Current] [Compare]    │
└──────────────────────────────────────┘
```

---

## 26. Autosave

### Flow
```text
User types 
   ↓
300–800ms debounce 
   ↓
Save 
   ↓
✓ Saved
```

### Status Indicators
- `Saving...`
- `Saved ✓`
- `Save failed ⚠`

> **Critical Rule:** Save errors must never silently discard content.

---

## 27. Safe File Writes

Uses atomic writes where practical to prevent data corruption during unexpected crashes:

```text
Content ──► Temporary File ──► Flush ──► Rename ──► Original Replaced
```

---

## 28. Rust Responsibilities

Rust remains strictly focused on native platform functionality:

- Filesystem access
- File watcher
- Native file dialogs
- Folder selection dialogs
- ZIP import/export operations
- Trash/recycle-bin operations
- OS integration
- Native window management

> Avoid putting UI or business logic into Rust unless necessary. Most application logic should remain in TypeScript.

---

## 29. Tauri API Boundary

Do not scatter direct Tauri calls throughout React components.

### Preferred Flow

```text
React Component ──► Feature Hook ──► Service ──► Tauri Client ──► Rust Command ──► Filesystem
```

#### Code Example
```typescript
// Do this inside a service:
await noteService.create({ folderPath, title });

// Avoid doing this inside components:
// invoke("create_note", ...)
```

---

## 30. Suggested Project Structure

```text
darmavian/
│
├── src/
│   ├── app/
│   │
│   ├── components/
│   │
│   ├── features/
│   │   ├── explorer/
│   │   ├── editor/
│   │   ├── preview/
│   │   ├── search/
│   │   ├── quick-open/
│   │   ├── backlinks/
│   │   ├── tags/
│   │   ├── import-export/
│   │   └── settings/
│   │
│   ├── services/
│   │   ├── workspaceService.ts
│   │   ├── noteService.ts
│   │   ├── folderService.ts
│   │   ├── searchService.ts
│   │   └── importExportService.ts
│   │
│   ├── stores/
│   │   ├── workspaceStore.ts
│   │   ├── editorStore.ts
│   │   └── uiStore.ts
│   │
│   ├── hooks/
│   ├── types/
│   └── utils/
│
├── src-tauri/
│   └── src/
│       ├── commands/
│       │   ├── workspace.rs
│       │   ├── note.rs
│       │   ├── folder.rs
│       │   ├── import_export.rs
│       │   └── watcher.rs
│       │
│       ├── filesystem/
│       ├── watcher/
│       ├── security/
│       └── main.rs
│
├── public/
├── package.json
└── README.md
```

---

## 31. Core Domain Types

### Workspace Node

```typescript
export type WorkspaceNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children?: WorkspaceNode[];
    }
  | {
      type: "note";
      name: string;
      path: string;
    };
```

### Note Model

```typescript
export interface Note {
  path: string;
  title: string;
  content: string;
}
```

### Link Model

```typescript
export interface NoteLink {
  source: string;
  target: string;
}
```

### Tag Model

```typescript
export interface Tag {
  name: string;
  notes: string[];
}
```

---

## 32. State Management

Global state contains application/session state rather than the content of every Markdown file.

### Example Workspace State
```typescript
interface WorkspaceState {
  rootPath: string | null;
  tree: WorkspaceNode[];
  activeNote: string | null;
  openTabs: string[];
}
```

### Anti-Pattern to Avoid
```typescript
// DO NOT DO THIS FOR THE WHOLE WORKSPACE:
allNotes: Record<string, string>
```
*Load note contents dynamically on demand.*

---

## 33. Performance Strategy

Darmavian should remain lightweight.

### Rules
1. Do not load every Markdown file into memory.
2. Lazy-load notes on demand.
3. Avoid unnecessary React re-renders.
4. Debounce filesystem operations.
5. Keep Rust commands lightweight and focused.
6. Do not introduce a database prematurely.
7. Add indexing only when actual workspace size requires it.

**Initial Target:** Smooth navigation with **10,000+ Markdown files**.

---

## 34. Error Handling

Filesystem operations must handle edge cases gracefully:
- File not found
- Permission denied
- File already exists
- Invalid filename or path
- Workspace unavailable
- Disk full
- External file modification
- Corrupt ZIP / Invalid import structure

### UI Error Banner Example

```text
┌──────────────────────────────────────┐
│ Unable to save note.                 │
│ The file may have been moved/deleted.│
│                                      │
│ [Retry]               [Locate File]  │
└──────────────────────────────────────┘
```

> Do not expose raw Rust system errors directly to end users.

---

## 35. Security

Even though Darmavian is offline-only:
- Sanitize filenames
- Prevent `../` path traversal
- Validate ZIP paths
- Avoid arbitrary shell commands
- Restrict filesystem access to intended locations
- Handle symlinks carefully
- Never execute imported content
- Validate imported paths

---

## 36. Backup

Because everything is a normal file, users can back up their workspace using existing tools:
- Git
- OneDrive / Google Drive / Dropbox
- External drives
- OS system backups
- ZIP archives

Darmavian itself does not require a cloud service.

### Optional Future Auto-Backup
`backup-2026-09-13.zip`

---

## 37. MVP Roadmap

### Phase 1 — Foundation
- Initialize Tauri 2
- Setup React + TypeScript
- Setup Tailwind CSS
- Setup Zustand
- Build application shell
- Setup theme system
- Implement workspace selection

### Phase 2 — Filesystem Explorer
- Read directory tree
- Folder expand / collapse
- Create, rename, delete folder
- Create, rename, delete, move note
- Move folder

### Phase 3 — Markdown Editor
- Integrate CodeMirror
- Markdown syntax highlighting
- Open and edit Markdown files
- Autosave implementation
- Undo / redo support
- Save status indicator

### Phase 4 — Preview
- Markdown renderer
- Editor mode / Preview mode / Split mode
- Handle internal links and images

### Phase 5 — Knowledge Features
- `[[Wiki Links]]` parsing
- Backlinks listing
- Tags explorer
- Quick open modal
- Full workspace search
- Command palette

### Phase 6 — Import / Export
- Import `.md`, folder, `.zip`
- Export `.md`, folder, `.zip`

### Phase 7 — External Changes
- Setup file watcher
- Auto-reload changed files
- External modification conflict detection
- Safe atomic writes

### Phase 8 — Polish
- Keyboard shortcuts
- Resizable layout panels
- Tabbed editor view
- Settings panel
- Dark / light themes
- Application packaging & installer

### Phase 9 — Advanced Features (Post-MVP)
*Only after core functionality is completely stable:*
- Graph view
- Document history
- Advanced search indexing
- Local AI integration
- Plugin system
- Custom themes

---

## 38. Features to Avoid in Early Versions

Do **not** build these before the basic file workflow is stable:

- ❌ Database
- ❌ Cloud sync
- ❌ User accounts
- ❌ Authentication
- ❌ Collaboration
- ❌ Remote API
- ❌ Complex plugin system
- ❌ AI features
- ❌ Vector database
- ❌ Semantic search

> **The primary goal is a small, fast, and reliable application.**

---

## 39. Definition of Done for MVP

Darmavian MVP is successful when a user can:

1. Open a folder as a workspace
2. Create nested folders
3. Create Markdown notes
4. Open and edit notes
5. Autosave notes cleanly
6. Rename, move, and safely delete notes
7. Search notes across the workspace
8. Link notes using `[[Note]]`
9. View backlinks for any note
10. Add and filter by tags
11. Import Markdown files, folders, and ZIP archives
12. Export Markdown files, folders, and ZIP archives
13. Close and reopen the application without data loss or corruption

> **Key Rule:** The application must remain useful even if Darmavian itself is uninstalled, because all user Markdown files remain fully accessible independently.

---

## 40. Long-Term Architecture

The architecture should support the following modular evolution:

```text
                 Darmavian
                     │
        ┌────────────┼────────────┐
        │            │            │
     Markdown      Links        Tags
        │            │            │
        └────────────┼────────────┘
                     │
                Filesystem
                     │
              ┌──────┴──────┐
              │             │
          Local Search   Graph View
              │             │
              └──────┬──────┘
                     │
                Optional AI
```

> AI, indexing, graph features, and advanced capabilities must remain **derived layers**. They must never become the primary source of truth for user documents.

---

## 41. Final Architecture Decision

### Core Tech Selection
```text
Tauri 2
│
├── React
├── TypeScript
├── CodeMirror
├── Zustand
├── Tailwind CSS
│
└── Rust
    ├── Filesystem
    ├── File Watcher
    ├── Native Dialogs
    ├── Import
    └── Export
```

### Storage Stack
- Markdown files (`.md`)
- Local folders
- Local attachments

### Excluded Stack
- No Database
- No Server
- No Cloud
- No Account

### Product Philosophy
> Darmavian should be a powerful interface **over** the user's files, not a system that **owns** the user's files. This principle guides every future architectural decision.