import { existsSync, readFileSync } from "node:fs";
import { gameEnv } from "../config/env";
import { syncCharacterHeadAsset, normalizeCabecaFilename, normalizeVozFilename } from "../application/character-assets";
import { findExistingCharacter, saveCharacterRecord } from "../application/character-sync";
import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { getGameDb, withDbTransaction } from "./client";

export type CriancaJson = {
  id: string;
  nome: string;
  nomeCompleto?: string;
  genero?: string;
  tipo?: string;
  personalidade?: string;
  cabeca?: string;
  /** MP3 da apresentação no modal — ex.: larah_sofhia.mp3 */
  voz?: string;
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

/** Sincroniza game_characters a partir do criancas.json (metadados + cabeça opcional no storage). */
export function syncCharacterCatalogFromJson(database?: Database): number {
  const db = database ?? getGameDb();
  const list = loadCriancasJson();
  if (!list.length) return 0;

  return withDbTransaction(db, () => {
    const ts = nowIso();
    const keys: string[] = [];
    let created = 0;
    let updated = 0;

    for (const item of list) {
      const personKey = item.id?.trim();
      const nome = item.nome?.trim();
      if (!personKey || !nome) continue;

      const existing = findExistingCharacter(db, {
        personKey,
        nome,
        nomeCompleto: item.nomeCompleto ?? null,
      });
      const characterId = existing?.id ?? randomUUID();
      const cabecaFile = normalizeCabecaFilename(item.cabeca ?? null);
      const vozFile = normalizeVozFilename(item.voz ?? null);
      const cabecaStorage = syncCharacterHeadAsset(
        characterId,
        cabecaFile,
        existing?.cabeca_storage ?? null,
      );

      const { created: isNew } = saveCharacterRecord(db, {
        id: characterId,
        personKey,
        nome,
        nomeCompleto: item.nomeCompleto ?? null,
        genero: item.genero ?? null,
        tipo: item.tipo ?? null,
        personalidade: item.personalidade ?? null,
        cabecaPath: cabecaFile,
        cabecaStorage,
        vozPath: vozFile,
        vozStorage: null,
        ativo: item.ativo !== false,
      });

      if (isNew) created += 1;
      else updated += 1;

      keys.push(personKey);
    }

    if (keys.length > 0) {
      const placeholders = keys.map(() => "?").join(", ");
      db.run(
        `UPDATE game_characters SET ativo = 0, updated_at = ? WHERE person_key NOT IN (${placeholders})`,
        [ts, ...keys],
      );
    }

    console.log(
      `[nhamnham] catálogo: ${keys.length} personagens (${created} novos, ${updated} atualizados)`,
    );
    return keys.length;
  });
}

/** @deprecated use syncCharacterCatalogFromJson */
export function seedCharacterCatalog(force = false): number {
  void force;
  return syncCharacterCatalogFromJson();
}

export { resolveCabecaPublicUrls } from "../application/character-assets";
