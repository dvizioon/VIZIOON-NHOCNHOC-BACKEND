import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { gameEnv } from "../config/env";
import { seedCharacterCatalog } from "./seed-characters";

let db: Database | null = null;

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
  person_key TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  nome_completo TEXT,
  genero TEXT,
  tipo TEXT,
  personalidade TEXT,
  cabeca_path TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_characters_ativo ON game_characters(ativo);

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
`;

export function getGameDb(): Database {
  if (db) return db;

  mkdirSync(dirname(gameEnv.dbPath), { recursive: true });
  db = new Database(gameEnv.dbPath, { create: true });
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  seedCharacterCatalog();
  return db;
}

export function closeGameDb(): void {
  db?.close();
  db = null;
}
