import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { toAppError } from "../shared/errors/unwrap-error";
import { gameEnv } from "./config/env";
import { getGameDb } from "./db/client";
import { gameRouter } from "./presentation/game.router";

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
    }))
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
