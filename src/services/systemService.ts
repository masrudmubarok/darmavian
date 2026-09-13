import { tauriClient } from "./tauriClient";

export const systemService = {
  /** Opens the OS file manager with the given note/folder selected. */
  async revealInFileManager(path: string): Promise<void> {
    await tauriClient.revealInFileManager(path);
  },
};
