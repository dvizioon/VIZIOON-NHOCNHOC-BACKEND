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

function primaryFrontendUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim() ?? "http://localhost:5173";
  return raw.split(",")[0]?.trim() || "http://localhost:5173";
}

/** Caminhos fixos — editar backup/*.json e reiniciar o backend (ou POST …/sync) */
const BACKUP_DIR = resolve(process.cwd(), "backup");

export const gameEnv = {
  port: Number(process.env.GAME_PORT ?? 5240),
  host: process.env.GAME_HOST?.trim() || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV ?? "development",
  dbPath:
    process.env.GAME_DB_PATH?.trim() ??
    resolve(process.cwd(), "data", "nhamnham.sqlite"),
  frontendOrigins: parseOrigins(),
  frontendUrl: primaryFrontendUrl(),
  guestSessionHours: Number(process.env.GAME_GUEST_HOURS ?? 24),
  backendUrl:
    process.env.GAME_BACKEND_URL?.trim() ??
    `http://localhost:${process.env.GAME_PORT ?? 5240}`,
  /** Fonte do sync — não precisa .env */
  charactersJsonPath: resolve(BACKUP_DIR, "criancas.json"),
  gameRulesJsonPath: resolve(BACKUP_DIR, "config.json"),
  /**
   * Pasta pública das cabeças no frontend (public/).
   * Ex.: assets/sprites/characters/childs/
   */
  gamePublicPath:
    process.env.GAME_PUBLIC_PATH?.trim() ||
    "assets/sprites/characters/childs/",
  /** MP3 da apresentação no modal — espelha public/ do frontend */
  gameVoicePublicPath:
    process.env.GAME_VOICE_PUBLIC_PATH?.trim() ||
    "assets/sounds/sfx/childs/",
  /** PNG local no backend — só personagem novo ou imagem atualizada */
  assetsPath: resolve(process.cwd(), "assets"),
  /** Destino público por personagem (uuid) — servido em /storage/… */
  storagePath:
    process.env.GAME_STORAGE_PATH?.trim() ??
    resolve(process.cwd(), "storage"),
} as const;
