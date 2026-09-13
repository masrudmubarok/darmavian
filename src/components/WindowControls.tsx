import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

/** Custom minimize/maximize/close buttons — the window itself is frameless (see tauri.conf.json). */
export function WindowControls() {
  return (
    <div className="flex h-full shrink-0 items-center">
      <button
        type="button"
        title="Minimize"
        onClick={() => void appWindow.minimize()}
        className="flex h-full w-11 items-center justify-center hover:bg-surface-alt"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        title="Maximize / Restore"
        onClick={() => void appWindow.toggleMaximize()}
        className="flex h-full w-11 items-center justify-center hover:bg-surface-alt"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        title="Close"
        onClick={() => void appWindow.close()}
        className="flex h-full w-11 items-center justify-center hover:bg-red-500 hover:text-white"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}
