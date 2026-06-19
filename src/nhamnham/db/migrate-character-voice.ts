import type { Database } from "bun:sqlite";

type ColumnInfo = { name: string };

/** Adiciona voz_path e voz_storage — mesmo modelo da cabeça */
export function migrateCharacterVoiceColumns(db: Database): void {
  const cols = db.query(`PRAGMA table_info(game_characters)`).all() as ColumnInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("voz_path")) {
    db.exec(`ALTER TABLE game_characters ADD COLUMN voz_path TEXT`);
  }
  if (!names.has("voz_storage")) {
    db.exec(`ALTER TABLE game_characters ADD COLUMN voz_storage TEXT`);
  }
}
