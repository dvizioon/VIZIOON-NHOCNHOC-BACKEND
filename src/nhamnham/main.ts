import { createGameApp } from "./app";
import { gameEnv } from "./config/env";

const app = createGameApp();

app.listen({ port: gameEnv.port, hostname: gameEnv.host });

console.log(`NHAMNHAM Game API em http://${gameEnv.host}:${gameEnv.port}`);
console.log(`URL pública: ${gameEnv.backendUrl}`);
console.log(`Docs: ${gameEnv.backendUrl}/docs`);
console.log(`SQLite: ${gameEnv.dbPath}`);
console.log(`Assets origem: ${gameEnv.gamePublicPath}`);
console.log(`Storage: ${gameEnv.storagePath}`);
