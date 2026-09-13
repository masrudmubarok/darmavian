import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/**
 * Themed replacement for `window.prompt()` — picks up the app's light/dark
 * CSS variables instead of the OS's native (unstyled) dialog.
 */
export function PromptModal({
  title,
  label,
  defaultValue = "",
  confirmLabel = "Create",
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-[320px] rounded-lg border border-border bg-surface p-4 shadow-xl"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter") submit();
        }}
      >
        <h2 className="mb-3 text-sm font-semibold">{title}</h2>
        <label className="mb-1 block text-xs opacity-70">{label}</label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded border border-border bg-surface-alt px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-sm hover:bg-surface-alt"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
