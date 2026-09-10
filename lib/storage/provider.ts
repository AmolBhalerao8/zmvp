export type StoredFile = { key: string; url: string };
export interface StorageProvider {
  put(name: string, bytes: Uint8Array, contentType: string): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

class DemoStorageProvider implements StorageProvider {
  async put(name: string) {
    const key = `demo/${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    return { key, url: `/uploads/${key.split("/").at(-1)}` };
  }
  async remove() {}
}

// Replace with a Google Cloud Storage adapter in production.
export const storageProvider: StorageProvider = new DemoStorageProvider();
