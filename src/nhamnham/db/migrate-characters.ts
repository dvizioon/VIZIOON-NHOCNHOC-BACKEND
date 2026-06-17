import type { Database } from "bun:sqlite";

type ColumnInfo = { name: string; pk: number };

export function migrateGameCharactersTable(db: Database): void {
  const cols = db.query(`PRAGMA table_info(game_characters)`).all() as ColumnInfo[];
  if (!cols.length) return;

  const idCol = cols.find((c) => c.name === "id");
  if (idCol?.pk === 1) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS game_characters_new (
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

    INSERT INTO game_characters_new
      (id, person_key, nome, nome_completo, genero, tipo, personalidade, cabeca_path, cabeca_storage, ativo, created_at, updated_at)
    SELECT
      lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
             substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
             hex(randomblob(6))),
      person_key,
      nome,
      nome_completo,
      genero,
      tipo,
      personalidade,
      cabeca_path,
      NULL,
      ativo,
      created_at,
      updated_at
    FROM game_characters;

    DROP TABLE game_characters;
    ALTER TABLE game_characters_new RENAME TO game_characters;
    CREATE INDEX IF NOT EXISTS idx_game_characters_ativo ON game_characters(ativo);
    CREATE INDEX IF NOT EXISTS idx_game_characters_person_key ON game_characters(person_key);
  `);
}
