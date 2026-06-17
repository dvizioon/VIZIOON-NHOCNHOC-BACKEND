import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";

export type CharacterMatchInput = {
  personKey: string;
  nome: string;
  nomeCompleto?: string | null;
};

type ExistingCharacterRow = {
  id: string;
  person_key: string;
  cabeca_storage: string | null;
  created_at: string;
};

/** Busca personagem já cadastrado — person_key, depois nome completo, depois nome */
export function findExistingCharacter(
  db: Database,
  input: CharacterMatchInput,
): ExistingCharacterRow | null {
  const personKey = input.personKey.trim();
  const nome = input.nome.trim();
  const nomeCompleto = input.nomeCompleto?.trim() ?? "";

  const byKey = db
    .query<ExistingCharacterRow, [string]>(
      `SELECT id, person_key, cabeca_storage, created_at
       FROM game_characters WHERE person_key = ? COLLATE NOCASE`,
    )
    .get(personKey);
  if (byKey) return byKey;

  if (nomeCompleto) {
    const byFull = db
      .query<ExistingCharacterRow, [string]>(
        `SELECT id, person_key, cabeca_storage, created_at
         FROM game_characters
         WHERE nome_completo IS NOT NULL AND lower(trim(nome_completo)) = lower(trim(?))`,
      )
      .get(nomeCompleto);
    if (byFull) return byFull;
  }

  return (
    db
      .query<ExistingCharacterRow, [string]>(
        `SELECT id, person_key, cabeca_storage, created_at
         FROM game_characters WHERE lower(trim(nome)) = lower(trim(?))`,
      )
      .get(nome) ?? null
  );
}

export type SaveCharacterInput = CharacterMatchInput & {
  /** UUID já reservado (ex.: pasta storage criada antes do save) */
  id?: string;
  genero?: string | null;
  tipo?: string | null;
  personalidade?: string | null;
  cabecaPath?: string | null;
  cabecaStorage?: string | null;
  ativo?: boolean;
};

/** Insere ou atualiza — mantém o mesmo UUID se já existir */
export function saveCharacterRecord(
  db: Database,
  input: SaveCharacterInput,
): { id: string; created: boolean } {
  const ts = new Date().toISOString();
  const personKey = input.personKey.trim();
  const nome = input.nome.trim();
  const existing = findExistingCharacter(db, input);
  const id = existing?.id ?? input.id ?? randomUUID();
  const cabecaStorage = input.cabecaStorage ?? existing?.cabeca_storage ?? null;

  if (existing) {
    db.run(
      `UPDATE game_characters SET
        person_key = ?,
        nome = ?,
        nome_completo = ?,
        genero = ?,
        tipo = ?,
        personalidade = ?,
        cabeca_path = ?,
        cabeca_storage = COALESCE(?, cabeca_storage),
        ativo = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        personKey,
        nome,
        input.nomeCompleto ?? null,
        input.genero ?? null,
        input.tipo ?? null,
        input.personalidade ?? null,
        input.cabecaPath ?? null,
        cabecaStorage,
        input.ativo === false ? 0 : 1,
        ts,
        id,
      ],
    );
    return { id, created: false };
  }

  db.run(
    `INSERT INTO game_characters
      (id, person_key, nome, nome_completo, genero, tipo, personalidade, cabeca_path, cabeca_storage, ativo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      personKey,
      nome,
      input.nomeCompleto ?? null,
      input.genero ?? null,
      input.tipo ?? null,
      input.personalidade ?? null,
      input.cabecaPath ?? null,
      cabecaStorage,
      input.ativo === false ? 0 : 1,
      ts,
      ts,
    ],
  );

  return { id, created: true };
}
