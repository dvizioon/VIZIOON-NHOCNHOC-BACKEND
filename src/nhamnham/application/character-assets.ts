import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { gameEnv } from "../config/env";

export function ensureStorageRoot(): void {
  mkdirSync(gameEnv.storagePath, { recursive: true });
}

function resolveGamePublicAsset(relativePath: string): string {
  const clean = relativePath.replace(/^assets\//, "").replace(/^\//, "");
  return resolve(gameEnv.gamePublicPath, clean);
}

/** Copia sprite da cabeça para storage/characters/{uuid}/ */
export function syncCharacterHeadAsset(
  characterId: string,
  cabecaPath: string | null | undefined,
): string | null {
  if (!cabecaPath?.trim()) return null;

  const source = cabecaPath.startsWith("http")
    ? null
    : resolveGamePublicAsset(cabecaPath);

  if (!source || !existsSync(source)) {
    console.warn(`[nhamnham] asset não encontrado: ${cabecaPath}`);
    return null;
  }

  ensureStorageRoot();
  const destDir = join(gameEnv.storagePath, "characters", characterId);
  mkdirSync(destDir, { recursive: true });

  const ext = basename(source).includes(".") ? basename(source).split(".").pop() : "png";
  const storageRel = `characters/${characterId}/head.${ext}`;
  const dest = join(gameEnv.storagePath, storageRel);

  copyFileSync(source, dest);
  return storageRel;
}

export function buildStoragePublicUrl(storageRel: string | null | undefined): string | null {
  if (!storageRel?.trim()) return null;
  const clean = storageRel.replace(/^\/+/, "");
  return `${gameEnv.backendUrl}/storage/${clean}`;
}
