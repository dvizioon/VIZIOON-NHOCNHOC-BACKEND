import { existsSync, readFileSync } from "node:fs";
import { gameEnv } from "../config/env";
import { syncCharacterHeadAsset, normalizeCabecaFilename } from "../application/character-assets";
import { findExistingCharacter, saveCharacterRecord } from "../application/character-sync";
import { randomUUID } from "node:crypto";
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
}

/** @deprecated use syncCharacterCatalogFromJson */
export function seedCharacterCatalog(force = false): number {
  void force;
  return syncCharacterCatalogFromJson();
}

export { resolveCabecaPublicUrls } from "../application/character-assets";
