import { existsSync } from "node:fs";
import { resolve } from "node:path";

function parseOrigins(): string[] {
  const raw =
    process.env.GAME_FRONTEND_ORIGINS?.trim() ??
    process.env.FRONTEND_URL?.trim() ??
    "http://localhost:5173,http://127.0.0.1:5173";

  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Caminhos fixos — editar backup/*.json e reiniciar o backend (ou POST …/sync) */
const BACKUP_DIR = resolve(process.cwd(), "backup");
const LOCAL_ASSETS = resolve(process.cwd(), "assets");
const SIBLING_GAME_PUBLIC = resolve(process.cwd(), "../game/public");

function resolveGamePublicPath(): string {
  if (process.env.GAME_PUBLIC_PATH?.trim()) {
    return resolve(process.cwd(), process.env.GAME_PUBLIC_PATH.trim());
  }
  if (existsSync(LOCAL_ASSETS)) return LOCAL_ASSETS;
  return SIBLING_GAME_PUBLIC;
}

export const gameEnv = {
  port: Number(process.env.GAME_PORT ?? 5240),
  host: process.env.GAME_HOST?.trim() || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV ?? "development",
  dbPath:
    process.env.GAME_DB_PATH?.trim() ??
    resolve(process.cwd(), "data", "nhamnham.sqlite"),
  frontendOrigins: parseOrigins(),
  guestSessionHours: Number(process.env.GAME_GUEST_HOURS ?? 24),
  backendUrl:
    process.env.GAME_BACKEND_URL?.trim() ??
    `http://localhost:${process.env.GAME_PORT ?? 5240}`,
  /** Fonte do sync — não precisa .env */
  charactersJsonPath: resolve(BACKUP_DIR, "criancas.json"),
  gameRulesJsonPath: resolve(BACKUP_DIR, "config.json"),
  /** Origem dos PNGs no sync — backend/assets (Coolify) ou ../game/public (local) */
  gamePublicPath: resolveGamePublicPath(),
  /** Destino dos assets por personagem (uuid) — servido em /storage/… */
  storagePath:
    process.env.GAME_STORAGE_PATH?.trim() ??
    resolve(process.cwd(), "storage"),
} as const;
