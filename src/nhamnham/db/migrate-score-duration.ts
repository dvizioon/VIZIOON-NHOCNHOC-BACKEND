import type { Database } from "bun:sqlite";

type ColumnInfo = { name: string };

/** Tempo da partida (ms) — ranking por quem come mais rápido */
export function migrateScoreDurationColumn(db: Database): void {
  const cols = db.query(`PRAGMA table_info(game_scores)`).all() as ColumnInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("duration_ms")) {
    db.exec(`ALTER TABLE game_scores ADD COLUMN duration_ms INTEGER`);
  }
}
