import { createGameApp } from "./app";
import { gameEnv } from "./config/env";

const app = createGameApp();

app.listen({ port: gameEnv.port, hostname: gameEnv.host });

console.log(`NHAMNHAM Game API em http://${gameEnv.host}:${gameEnv.port}`);
console.log(`Docs: http://localhost:${gameEnv.port}/docs`);
console.log(`SQLite: ${gameEnv.dbPath}`);
