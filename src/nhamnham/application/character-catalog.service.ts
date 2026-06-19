import { AppError } from "../../shared/errors/app-error";
import {
  normalizeCabecaFilename,
  normalizeVozFilename,
  resolveCabecaPublicUrls,
  resolveVozPublicUrls,
} from "./character-assets";
import { getGameDb } from "../db/client";
import { syncCharacterCatalogFromJson } from "../db/seed-characters";
import { saveCharacterRecord } from "./character-sync";

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
  vozPath: string | null;
  /** URL pública do MP3 da apresentação */
  voz: string | null;
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
  voz_path: string | null;
  voz_storage: string | null;
  ativo: number;
};

function mapRow(row: CharacterRow): GameCharacterDto {
  const { cabeca, cabecaPath } = resolveCabecaPublicUrls(
    row.cabeca_path,
    row.cabeca_storage,
  );
  const { voz, vozPath } = resolveVozPublicUrls(row.voz_path, row.voz_storage);
  return {
    id: row.id,
    personKey: row.person_key,
    nome: row.nome,
    nomeCompleto: row.nome_completo,
    genero: row.genero,
    tipo: row.tipo,
    personalidade: row.personalidade,
    cabecaPath,
    cabeca,
    vozPath,
    voz,
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
    vozPath?: string | null;
    voz?: string | null;
    ativo?: boolean;
  }): GameCharacterDto {
    const db = getGameDb();
    const key = (input.personKey ?? input.id ?? "").trim();
    if (!key) {
      throw new AppError("personKey é obrigatório", 400, "VALIDATION_ERROR");
    }

    saveCharacterRecord(db, {
      personKey: key,
      nome: input.nome.trim(),
      nomeCompleto: input.nomeCompleto ?? null,
      genero: input.genero ?? null,
      tipo: input.tipo ?? null,
      personalidade: input.personalidade ?? null,
      cabecaPath: normalizeCabecaFilename(input.cabecaPath ?? input.cabeca ?? null),
      vozPath: normalizeVozFilename(input.vozPath ?? input.voz ?? null),
      ativo: input.ativo !== false,
    });

    return this.requireActive(key);
  },

  syncFromJson(): number {
    return syncCharacterCatalogFromJson();
  },
};
