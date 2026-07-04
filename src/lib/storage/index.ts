import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * File storage abstraction (System Design §11). Dev/local: disk under
 * .data/uploads (gitignored). Prod: swap the driver for Cloudflare R2 —
 * the interface stays put/read/remove by opaque fileKey.
 */
const ROOT = path.join(process.cwd(), ".data", "uploads");

function resolveSafe(fileKey: string): string {
  const full = path.resolve(ROOT, fileKey);
  if (!full.startsWith(path.resolve(ROOT))) {
    throw new Error("Invalid file key");
  }
  return full;
}

export async function putFile(fileKey: string, data: Buffer): Promise<void> {
  const full = resolveSafe(fileKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readFileByKey(fileKey: string): Promise<Buffer> {
  return readFile(resolveSafe(fileKey));
}

export async function removeFile(fileKey: string): Promise<void> {
  try {
    await unlink(resolveSafe(fileKey));
  } catch {
    // already gone — deletion is idempotent
  }
}
