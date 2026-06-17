import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { gameEnv } from "../config/env";
import { migrateGameCharactersTable } from "./migrate-characters";
import { syncCharacterCatalogFromJson } from "./seed-characters";
import { syncGameRulesFromJson } from "./seed-game-rules";

let db: Database | null = null;

function configureDatabase(database: Database): void {
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 10000;");
  database.exec("PRAGMA synchronous = NORMAL;");
}

export function withDbTransaction<T>(database: Database, fn: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      /* ignore rollback failure */
    }
    throw error;
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS game_users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER,
  is_guest INTEGER NOT NULL DEFAULT 0,
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_users_token ON game_users(session_token);
CREATE INDEX IF NOT EXISTS idx_game_users_expires ON game_users(expires_at);

CREATE TABLE IF NOT EXISTS game_characters (
  id TEXT PRIMARY KEY NOT NULL,
  person_key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  nome_completo TEXT,
  genero TEXT,
  tipo TEXT,
  personalidade TEXT,
  cabeca_path TEXT,
  cabeca_storage TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_characters_ativo ON game_characters(ativo);
CREATE INDEX IF NOT EXISTS idx_game_characters_person_key ON game_characters(person_key);

CREATE TABLE IF NOT EXISTS game_user_configs (
  user_id TEXT PRIMARY KEY NOT NULL,
  volume_musica REAL NOT NULL DEFAULT 0.5,
  volume_efeitos REAL NOT NULL DEFAULT 0.5,
  muted INTEGER NOT NULL DEFAULT 0,
  modo TEXT NOT NULL DEFAULT 'toque',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_persons (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  person_key TEXT NOT NULL,
  nome TEXT NOT NULL,
  genero TEXT,
  custom_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE,
  UNIQUE(user_id, person_key)
);

CREATE INDEX IF NOT EXISTS idx_game_persons_user ON game_persons(user_id);

CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lives_left INTEGER,
  level_label TEXT,
  won INTEGER NOT NULL DEFAULT 0,
  played_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES game_persons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_scores_person ON game_scores(person_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id);

CREATE TABLE IF NOT EXISTS game_rules (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  meta_comida INTEGER NOT NULL DEFAULT 24,
  max_vidas INTEGER NOT NULL DEFAULT 3,
  cliques_ovo INTEGER NOT NULL DEFAULT 4,
  cliques_casulo INTEGER NOT NULL DEFAULT 2,
  intervalo_sapo INTEGER NOT NULL DEFAULT 12000,
  delay_inicio_sapo INTEGER NOT NULL DEFAULT 25000,
  min_comida_antes_sapo INTEGER NOT NULL DEFAULT 4,
  invulneravel_frames INTEGER NOT NULL DEFAULT 120,
  design_width INTEGER NOT NULL DEFAULT 1280,
  design_height INTEGER NOT NULL DEFAULT 720,
  updated_at TEXT NOT NULL
);
`;

export function getGameDb(): Database {
  if (db) return db;

  mkdirSync(dirname(gameEnv.dbPath), { recursive: true });
  db = new Database(gameEnv.dbPath, { create: true });
  configureDatabase(db);
  db.exec(SCHEMA);
  migrateGameCharactersTable(db);
  syncCharacterCatalogFromJson(db);
  syncGameRulesFromJson(db);
  return db;
}

export function closeGameDb(): void {
  db?.close();
  db = null;
}
