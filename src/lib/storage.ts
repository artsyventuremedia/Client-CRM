import { mkdir, readFile as fsReadFile, unlink, writeFile } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

function resolvePath(storageKey: string): string {
  const resolved = path.join(STORAGE_ROOT, storageKey);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function saveFile(organizationId: string, documentId: string, buffer: Buffer): Promise<string> {
  const storageKey = path.join(organizationId, documentId);
  const fullPath = resolvePath(storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return storageKey;
}

export async function readFile(storageKey: string): Promise<Buffer> {
  return fsReadFile(resolvePath(storageKey));
}

export async function deleteFile(storageKey: string): Promise<void> {
  await unlink(resolvePath(storageKey)).catch(() => {});
}
