import { closeGameDb, getGameDb } from "../db/client";

getGameDb();
closeGameDb();
console.log("Backup sincronizado (criancas.json + config.json → SQLite)");
