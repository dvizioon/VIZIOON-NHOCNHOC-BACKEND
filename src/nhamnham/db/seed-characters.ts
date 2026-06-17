import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { gameEnv } from "../config/env";
import {
  buildStoragePublicUrl,
  syncCharacterHeadAsset,
} from "../application/character-assets";
import { getGameDb } from "./client";

export type CriancaJson = {
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

export function loadCriancasJson(): CriancaJson[] {
  if (!existsSync(gameEnv.charactersJsonPath)) {
    console.warn(`[nhamnham] criancas.json não encontrado: ${gameEnv.charactersJsonPath}`);
    return [];
  }

  const raw = readFileSync(gameEnv.charactersJsonPath, "utf8");
  const list = JSON.parse(raw) as CriancaJson[];
  return Array.isArray(list) ? list : [];
}

/** Sincroniza game_characters + copia assets para storage/characters/{uuid}/ */
export function syncCharacterCatalogFromJson(database?: ReturnType<typeof getGameDb>): number {
  const db = database ?? getGameDb();
  const list = loadCriancasJson();
  if (!list.length) return 0;

  const ts = nowIso();
  const keys: string[] = [];

  const findStmt = db.prepare(`SELECT id FROM game_characters WHERE person_key = ?`);

  const upsertStmt = db.prepare(`
    INSERT INTO game_characters
      (id, person_key, nome, nome_completo, genero, tipo, personalidade, cabeca_path, cabeca_storage, ativo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(person_key) DO UPDATE SET
      nome = excluded.nome,
      nome_completo = excluded.nome_completo,
      genero = excluded.genero,
      tipo = excluded.tipo,
      personalidade = excluded.personalidade,
      cabeca_path = excluded.cabeca_path,
      cabeca_storage = excluded.cabeca_storage,
      ativo = excluded.ativo,
      updated_at = excluded.updated_at
  `);

  for (const item of list) {
    const personKey = item.id?.trim();
    const nome = item.nome?.trim();
    if (!personKey || !nome) continue;

    const existing = findStmt.get(personKey) as { id: string } | null;
    const characterId = existing?.id ?? randomUUID();
    const cabecaStorage = syncCharacterHeadAsset(characterId, item.cabeca ?? null);

    keys.push(personKey);
    upsertStmt.run(
      characterId,
      personKey,
      nome,
      item.nomeCompleto ?? null,
      item.genero ?? null,
      item.tipo ?? null,
      item.personalidade ?? null,
      item.cabeca ?? null,
      cabecaStorage,
      item.ativo === false ? 0 : 1,
      ts,
      ts,
    );
  }

  if (keys.length > 0) {
    const placeholders = keys.map(() => "?").join(", ");
    db.run(
      `UPDATE game_characters SET ativo = 0, updated_at = ? WHERE person_key NOT IN (${placeholders})`,
      [ts, ...keys],
    );
  }

  console.log(
    `[nhamnham] catálogo: ${keys.length} personagens (person_key + uuid, assets em storage/)`,
  );
  return keys.length;
}

/** @deprecated use syncCharacterCatalogFromJson */
export function seedCharacterCatalog(force = false): number {
  void force;
  return syncCharacterCatalogFromJson();
}

export { buildStoragePublicUrl };
