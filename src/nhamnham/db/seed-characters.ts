import { existsSync, readFileSync } from "node:fs";
import { gameEnv } from "../config/env";
import { getGameDb } from "./client";

type CriancaJson = {
  id: string;
  nome: string;
  nomeCompleto?: string;
  genero?: string;
  tipo?: string;
  personalidade?: string;
  cabeca?: string;
  ativo?: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function seedCharacterCatalog(force = false): number {
  const db = getGameDb();
  if (!force) {
    const count = db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM game_characters`).get()?.n ?? 0;
    if (count > 0) return count;
  }

  if (!existsSync(gameEnv.charactersJsonPath)) {
    console.warn(`[nhamnham] criancas.json não encontrado: ${gameEnv.charactersJsonPath}`);
    return 0;
  }

  const raw = readFileSync(gameEnv.charactersJsonPath, "utf8");
  const list = JSON.parse(raw) as CriancaJson[];
  const ts = nowIso();
  let upserted = 0;

  const stmt = db.prepare(`
    INSERT INTO game_characters
      (person_key, nome, nome_completo, genero, tipo, personalidade, cabeca_path, ativo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(person_key) DO UPDATE SET
      nome = excluded.nome,
      nome_completo = excluded.nome_completo,
      genero = excluded.genero,
      tipo = excluded.tipo,
      personalidade = excluded.personalidade,
      cabeca_path = excluded.cabeca_path,
      ativo = excluded.ativo,
      updated_at = excluded.updated_at
  `);

  for (const item of list) {
    if (!item.id || !item.nome) continue;
    stmt.run(
      item.id,
      item.nome,
      item.nomeCompleto ?? null,
      item.genero ?? null,
      item.tipo ?? null,
      item.personalidade ?? null,
      item.cabeca ?? null,
      item.ativo === false ? 0 : 1,
      ts,
      ts,
    );
    upserted += 1;
  }

  return upserted;
}
