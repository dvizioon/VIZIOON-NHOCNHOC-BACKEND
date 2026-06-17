import { createGameApp } from "./app";
import { gameEnv } from "./config/env";
import { closeGameDb } from "./db/client";

const app = createGameApp();

app.listen({ port: gameEnv.port, hostname: gameEnv.host });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    closeGameDb();
    process.exit(0);
  });
}

console.log(`NHAMNHAM Game API em http://${gameEnv.host}:${gameEnv.port}`);
console.log(`URL pública: ${gameEnv.backendUrl}`);
console.log(`Docs: ${gameEnv.backendUrl}/docs`);
console.log(`SQLite: ${gameEnv.dbPath}`);
console.log(`Cabecas (frontend): ${gameEnv.frontendUrl}/${gameEnv.gamePublicPath}`);
console.log(`Cabecas (upload backend): ${gameEnv.assetsPath}/`);
console.log(`Storage: ${gameEnv.storagePath}`);
