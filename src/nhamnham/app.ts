import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { toAppError } from "../shared/errors/unwrap-error";
import { gameEnv } from "./config/env";
import { getGameDb } from "./db/client";
import { gameRouter } from "./presentation/game.router";

function resolveStorageFile(relativePath: string): string | null {
  const base = resolve(gameEnv.storagePath);
  const filePath = resolve(base, relativePath);
  if (!filePath.startsWith(base)) return null;
  if (!existsSync(filePath)) return null;
  return filePath;
}

export function createGameApp() {
  getGameDb();

  return new Elysia({ name: "nhamnham-game-api", strictPath: false })
    .use(
      cors({
        origin: gameEnv.frontendOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )
    .get("/health", () => ({
      success: true,
      service: "nhamnham-game",
      db: gameEnv.dbPath,
      storage: gameEnv.storagePath,
    }))
    .get("/storage/*", async ({ request, set }) => {
      const url = new URL(request.url);
      const relative = decodeURIComponent(url.pathname.replace(/^\/storage\//, ""));
      const filePath = resolveStorageFile(relative);
      if (!filePath) {
        set.status = 404;
        return { success: false, message: "Arquivo não encontrado" };
      }
      return Bun.file(filePath);
    })
    .use(gameRouter)
    .use(
      openapi({
        path: "/docs",
        documentation: {
          info: {
            title: "NHAMNHAM Game API",
            version: "1.0.0",
            description:
              "Sessão do jogador, config, personagens e pontuação por personagem.",
          },
          servers: [{ url: gameEnv.backendUrl }],
        },
      }),
    )
    .onError(({ code, error, set }) => {
      const appErr = toAppError(error);

      if (code === "NOT_FOUND") {
        set.status = 404;
        return { success: false, message: "Rota não encontrada" };
      }

      if (appErr) {
        set.status = appErr.status;
        return appErr.toJSON();
      }

      set.status = 500;
      return {
        success: false,
        message: "Erro interno do servidor",
        code: "INTERNAL_ERROR",
      };
    });
}
