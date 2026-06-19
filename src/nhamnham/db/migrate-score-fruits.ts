import type { Database } from "bun:sqlite";

type ColumnInfo = { name: string };

/** Frutas comidas por partida — JSON no score */
export function migrateScoreFruitsColumn(db: Database): void {
  const cols = db.query(`PRAGMA table_info(game_scores)`).all() as ColumnInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("fruit_counts_json")) {
    db.exec(`ALTER TABLE game_scores ADD COLUMN fruit_counts_json TEXT`);
  }
}
