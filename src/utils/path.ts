/** Directory portion of a path, accepting both `/` and `\` separators. */
export function dirname(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? "" : path.slice(0, idx);
}

function isAbsolute(path: string): boolean {
  return /^([a-zA-Z]:[\\/]|[\\/])/.test(path) || path.startsWith("file://");
}

/**
 * Resolves a Markdown image/link reference against the note's own
 * directory, normalizing `..`/`.` segments. Absolute paths (Windows drive
 * letters, POSIX roots, `file://`) pass through unchanged.
 */
export function resolveRelativePath(baseDir: string, ref: string): string {
  if (isAbsolute(ref)) return ref;

  const sep = baseDir.includes("\\") && !baseDir.includes("/") ? "\\" : "/";
  const parts = (baseDir + sep + ref).split(/[\\/]/).filter((p) => p.length > 0 && p !== ".");

  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  
  if (/^[a-zA-Z]:$/.test(stack[0] ?? "")) {
    return [stack[0] + sep, ...stack.slice(1)].join(sep);
  }
  return sep + stack.join(sep);
}
