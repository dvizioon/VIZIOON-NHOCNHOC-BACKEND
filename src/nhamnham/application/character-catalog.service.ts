import { randomUUID } from "node:crypto";
import { AppError } from "../../shared/errors/app-error";
import { buildStoragePublicUrl } from "../application/character-assets";
import { getGameDb } from "../db/client";
import { syncCharacterCatalogFromJson } from "../db/seed-characters";

export interface GameCharacterDto {
  /** UUID do registro no banco */
  id: string;
  /** Slug do personagem — igual ao id do criancas.json / sprites */
  personKey: string;
  nome: string;
  nomeCompleto: string | null;
  genero: string | null;
  tipo: string | null;
  personalidade: string | null;
  cabecaPath: string | null;
  /** URL pública do asset no storage do backend */
  cabeca: string | null;
  ativo: boolean;
}

type CharacterRow = {
  id: string;
  person_key: string;
  nome: string;
  nome_completo: string | null;
  genero: string | null;
  tipo: string | null;
  personalidade: string | null;
  cabeca_path: string | null;
  cabeca_storage: string | null;
  ativo: number;
};

function mapRow(row: CharacterRow): GameCharacterDto {
  const cabecaUrl = buildStoragePublicUrl(row.cabeca_storage);
  return {
    id: row.id,
    personKey: row.person_key,
    nome: row.nome,
    nomeCompleto: row.nome_completo,
    genero: row.genero,
    tipo: row.tipo,
    personalidade: row.personalidade,
    cabecaPath: row.cabeca_path,
    cabeca: cabecaUrl,
    ativo: row.ativo === 1,
  };
}

export const characterCatalogService = {
  listActive(): GameCharacterDto[] {
    const db = getGameDb();
    return db
      .query<CharacterRow, []>(
        `SELECT * FROM game_characters WHERE ativo = 1 ORDER BY nome COLLATE NOCASE ASC`,
      )
      .all()
      .map(mapRow);
  },

  listAll(): GameCharacterDto[] {
    const db = getGameDb();
    return db
      .query<CharacterRow, []>(`SELECT * FROM game_characters ORDER BY nome COLLATE NOCASE ASC`)
      .all()
      .map(mapRow);
  },

  requireActive(personKey: string): GameCharacterDto {
    const db = getGameDb();
    const row = db
      .query<CharacterRow, [string]>(
        `SELECT * FROM game_characters WHERE person_key = ? AND ativo = 1`,
      )
      .get(personKey.trim());

    if (!row) {
      throw new AppError("Personagem não cadastrado", 404, "NOT_FOUND");
    }

    return mapRow(row);
  },

  requireById(characterId: string): GameCharacterDto {
    const db = getGameDb();
    const row = db
      .query<CharacterRow, [string]>(`SELECT * FROM game_characters WHERE id = ?`)
      .get(characterId.trim());

    if (!row) {
      throw new AppError("Personagem não encontrado", 404, "NOT_FOUND");
    }

    return mapRow(row);
  },

  upsert(input: {
    personKey?: string;
    id?: string;
    nome: string;
    nomeCompleto?: string | null;
    genero?: string | null;
    tipo?: string | null;
    personalidade?: string | null;
    cabecaPath?: string | null;
    cabeca?: string | null;
    ativo?: boolean;
  }): GameCharacterDto {
    const db = getGameDb();
    const ts = new Date().toISOString();
    const key = (input.personKey ?? input.id ?? "").trim();
    if (!key) {
      throw new AppError("personKey é obrigatório", 400, "VALIDATION_ERROR");
    }

    db.run(
      `INSERT INTO game_characters
        (id, person_key, nome, nome_completo, genero, tipo, personalidade, cabeca_path, cabeca_storage, ativo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
       ON CONFLICT(person_key) DO UPDATE SET
        nome = excluded.nome,
        nome_completo = excluded.nome_completo,
        genero = excluded.genero,
        tipo = excluded.tipo,
        personalidade = excluded.personalidade,
        cabeca_path = excluded.cabeca_path,
        ativo = excluded.ativo,
        updated_at = excluded.updated_at`,
      [
        randomUUID(),
        key,
        input.nome.trim(),
        input.nomeCompleto ?? null,
        input.genero ?? null,
        input.tipo ?? null,
        input.personalidade ?? null,
        input.cabecaPath ?? input.cabeca ?? null,
        input.ativo === false ? 0 : 1,
        ts,
        ts,
      ],
    );

    return this.requireActive(key);
  },

  syncFromJson(): number {
    return syncCharacterCatalogFromJson();
  },
};
