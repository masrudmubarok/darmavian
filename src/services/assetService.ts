import { tauriClient } from "./tauriClient";

export const assetService = {
  /** Reads a local file and returns it as a `data:` URL (used to load images referenced from a note). */
  async readAsDataUrl(path: string): Promise<string> {
    return tauriClient.readAssetDataUrl(path);
  },
};
