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
  charactersJsonPath:
    process.env.GAME_CHARACTERS_JSON?.trim() ??
    resolve(process.cwd(), "../game/public/assets/data/criancas.json"),
} as const;
