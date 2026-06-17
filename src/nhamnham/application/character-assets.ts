import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { gameEnv } from "../config/env";

export function ensureStorageRoot(): void {
  mkdirSync(gameEnv.storagePath, { recursive: true });
}

function joinPublicUrl(base: string, ...parts: string[]): string {
  const cleanBase = base.replace(/\/+$/, "");
  const path = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return `${cleanBase}/${path}`;
}

/** Só o nome do arquivo — ex.: anna_geovana.png */
export function normalizeCabecaFilename(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return basename(trimmed);
}

function resolveBackendHeadFile(filename: string): string {
  const publicRel = gameEnv.gamePublicPath
    .replace(/^assets\/?/, "")
    .replace(/^\/+|\/+$/g, "");
  return resolve(gameEnv.assetsPath, publicRel, filename);
}

/** URL da cabeça no public do frontend */
export function buildFrontendCabecaUrl(
  filename: string | null | undefined,
): string | null {
  const name = normalizeCabecaFilename(filename);
  if (!name) return null;
  if (/^https?:\/\//i.test(name)) return name;
  return joinPublicUrl(gameEnv.frontendUrl, gameEnv.gamePublicPath, name);
}

export function buildStoragePublicUrl(storageRel: string | null | undefined): string | null {
  if (!storageRel?.trim()) return null;
  const clean = storageRel.replace(/^\/+/, "");
  return `${gameEnv.backendUrl}/storage/${clean}`;
}

/** Monta cabeca + cabecaPath para a resposta da API */
export function resolveCabecaPublicUrls(
  cabecaPath: string | null | undefined,
  cabecaStorage: string | null | undefined,
): { cabeca: string | null; cabecaPath: string | null } {
  const filename = normalizeCabecaFilename(cabecaPath);

  if (cabecaStorage?.trim()) {
    const storageUrl = buildStoragePublicUrl(cabecaStorage);
    if (storageUrl) {
      return { cabeca: storageUrl, cabecaPath: filename };
    }
  }

  return {
    cabeca: buildFrontendCabecaUrl(filename),
    cabecaPath: filename,
  };
}

/**
 * Copia cabeça de backend/assets → storage/characters/{uuid}/head.png
 * Só quando o PNG existe localmente (personagem novo ou imagem atualizada).
 */
export function syncCharacterHeadAsset(
  characterId: string,
  cabecaPath: string | null | undefined,
  existingStorage: string | null | undefined = null,
): string | null {
  const filename = normalizeCabecaFilename(cabecaPath);
  if (!filename || /^https?:\/\//i.test(filename)) {
    return existingStorage ?? null;
  }

  const source = resolveBackendHeadFile(filename);
  if (!existsSync(source)) return existingStorage ?? null;

  ensureStorageRoot();
  const destDir = join(gameEnv.storagePath, "characters", characterId);
  mkdirSync(destDir, { recursive: true });

  const ext = basename(source).includes(".") ? basename(source).split(".").pop() : "png";
  const storageRel = `characters/${characterId}/head.${ext}`;
  const dest = join(gameEnv.storagePath, storageRel);

  copyFileSync(source, dest);
  return storageRel;
}
