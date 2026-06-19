import { AppError } from "../../shared/errors/app-error";
import { gameEnv } from "../config/env";
import { getGameDb } from "../db/client";
import { characterCatalogService } from "./character-catalog.service";
import type {
  GamePersonDto,
  GamePersonRow,
  GameSessionDto,
  GameUserConfig,
  GameUserRow,
} from "../domain/types";

const DEFAULT_CONFIG: GameUserConfig = {
  volumeMusica: 0.5,
  volumeEfeitos: 0.7,
  muted: false,
  modo: "toque",
};

function nowIso(): string {
  return new Date().toISOString();
}

function guestExpiresAt(): string {
  const date = new Date();
  date.setHours(date.getHours() + gameEnv.guestSessionHours);
  return date.toISOString();
}

function isGuestName(name: string): boolean {
  return name.trim().toLowerCase() === "visitante";
}

function rowToConfig(row: {
  volume_musica: number;
  volume_efeitos: number;
  muted: number;
  modo: string;
}): GameUserConfig {
  return {
    volumeMusica: row.volume_musica,
    volumeEfeitos: row.volume_efeitos,
    muted: row.muted === 1,
    modo: row.modo === "teclado" ? "teclado" : "toque",
  };
}

function parseCustom(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapPerson(row: GamePersonRow, stats?: { best: number; games: number }): GamePersonDto {
  return {
    id: row.id,
    personKey: row.person_key,
    nome: row.nome,
    genero: row.genero,
    custom: parseCustom(row.custom_json),
    isActive: row.is_active === 1,
    bestScore: stats?.best ?? 0,
    gamesPlayed: stats?.games ?? 0,
  };
}

function getPersonStats(userId: string, personId: string) {
  const db = getGameDb();
  const row = db
    .query<{ best: number; games: number }, [string, string]>(
      `SELECT COALESCE(MAX(points), 0) AS best, COUNT(*) AS games
       FROM game_scores WHERE user_id = ? AND person_id = ?`,
    )
    .get(userId, personId);
  return row ?? { best: 0, games: 0 };
}

function listPersonsForUser(userId: string): GamePersonDto[] {
  const db = getGameDb();
  const rows = db
    .query<GamePersonRow, [string]>(
      `SELECT * FROM game_persons WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(userId);

  return rows.map((row) => mapPerson(row, getPersonStats(userId, row.id)));
}

function getActivePerson(userId: string): GamePersonDto | null {
  const db = getGameDb();
  const row = db
    .query<GamePersonRow, [string]>(
      `SELECT * FROM game_persons WHERE user_id = ? AND is_active = 1 LIMIT 1`,
    )
    .get(userId);

  if (!row) return null;
  return mapPerson(row, getPersonStats(userId, row.id));
}

function buildSession(user: GameUserRow): GameSessionDto {
  const db = getGameDb();
  const configRow = db
    .query<
      {
        volume_musica: number;
        volume_efeitos: number;
        muted: number;
        modo: string;
      },
      [string]
    >(`SELECT * FROM game_user_configs WHERE user_id = ?`)
    .get(user.id);

  return {
    userId: user.id,
    sessionToken: user.session_token,
    displayName: user.display_name,
    age: user.age,
    isGuest: user.is_guest === 1,
    expiresAt: user.expires_at,
    config: configRow ? rowToConfig(configRow) : { ...DEFAULT_CONFIG },
    activePerson: getActivePerson(user.id),
    persons: user.is_guest === 1 ? [] : listPersonsForUser(user.id),
  };
}

function insertUser(displayName: string, age: number | null, isGuest: boolean): GameUserRow {
  const db = getGameDb();
  const id = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = isGuest ? guestExpiresAt() : null;

  db.run(
    `INSERT INTO game_users (id, display_name, age, is_guest, session_token, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, displayName, age, isGuest ? 1 : 0, sessionToken, createdAt, expiresAt],
  );

  db.run(
    `INSERT INTO game_user_configs (user_id, volume_musica, volume_efeitos, muted, modo, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      DEFAULT_CONFIG.volumeMusica,
      DEFAULT_CONFIG.volumeEfeitos,
      DEFAULT_CONFIG.muted ? 1 : 0,
      DEFAULT_CONFIG.modo,
      createdAt,
    ],
  );

  return db.query<GameUserRow, [string]>(`SELECT * FROM game_users WHERE id = ?`).get(id)!;
}

export const sessionService = {
  createGuestSession() {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const displayName = `guest-${suffix}`;
    const user = insertUser(displayName, null, true);
    return buildSession(user);
  },

  loginWithUsername(username: string) {
    const name = username.trim();
    if (name.length < 2) {
      throw new AppError("Usuário deve ter pelo menos 2 caracteres", 400, "VALIDATION_ERROR");
    }

    const db = getGameDb();
    const user = db
      .query<GameUserRow, [string]>(
        `SELECT * FROM game_users
         WHERE lower(display_name) = lower(?) AND is_guest = 0
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(name);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");
    }

    const sessionToken = crypto.randomUUID();
    db.run(`UPDATE game_users SET session_token = ? WHERE id = ?`, [sessionToken, user.id]);

    const updated = db.query<GameUserRow, [string]>(`SELECT * FROM game_users WHERE id = ?`).get(user.id)!;
    return buildSession(updated);
  },

  createSession(input: { name: string; age?: number | null; isGuest?: boolean }) {
    const displayName = input.name.trim();
    if (displayName.length < 2) {
      throw new AppError("Nome deve ter pelo menos 2 caracteres", 400, "VALIDATION_ERROR");
    }

    if (input.isGuest === true || isGuestName(displayName)) {
      throw new AppError("Use POST /session/guest para visitante", 400, "VALIDATION_ERROR");
    }

    const age = typeof input.age === "number" ? Math.round(input.age) : null;
    const user = insertUser(displayName, age, false);
    return buildSession(user);
  },

  getByToken(token: string): GameSessionDto {
    const user = this.requireUserByToken(token);
    return buildSession(user);
  },

  requireUserByToken(token: string): GameUserRow {
    if (!token.trim()) {
      throw new AppError("Token de sessão obrigatório", 401, "UNAUTHORIZED");
    }

    const db = getGameDb();
    const user = db
      .query<GameUserRow, [string]>(`SELECT * FROM game_users WHERE session_token = ?`)
      .get(token.trim());

    if (!user) {
      throw new AppError("Sessão inválida ou expirada", 401, "UNAUTHORIZED");
    }

    if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) {
      throw new AppError("Sessão de visitante expirada", 401, "UNAUTHORIZED");
    }

    return user;
  },
};

export const configService = {
  update(token: string, patch: Partial<GameUserConfig>): GameUserConfig {
    const user = sessionService.requireUserByToken(token);
    const db = getGameDb();

    const current = db
      .query<
        {
          volume_musica: number;
          volume_efeitos: number;
          muted: number;
          modo: string;
        },
        [string]
      >(`SELECT * FROM game_user_configs WHERE user_id = ?`)
      .get(user.id);

    if (!current) {
      throw new AppError("Configuração não encontrada", 404, "NOT_FOUND");
    }

    const next: GameUserConfig = {
      volumeMusica:
        typeof patch.volumeMusica === "number"
          ? Math.min(1, Math.max(0, patch.volumeMusica))
          : current.volume_musica,
      volumeEfeitos:
        typeof patch.volumeEfeitos === "number"
          ? Math.min(1, Math.max(0, patch.volumeEfeitos))
          : current.volume_efeitos,
      muted: typeof patch.muted === "boolean" ? patch.muted : current.muted === 1,
      modo: patch.modo === "teclado" || patch.modo === "toque" ? patch.modo : rowToConfig(current).modo,
    };

    db.run(
      `UPDATE game_user_configs
       SET volume_musica = ?, volume_efeitos = ?, muted = ?, modo = ?, updated_at = ?
       WHERE user_id = ?`,
      [
        next.volumeMusica,
        next.volumeEfeitos,
        next.muted ? 1 : 0,
        next.modo,
        nowIso(),
        user.id,
      ],
    );

    return next;
  },
};

export const personService = {
  select(
    token: string,
    input: {
      personKey: string;
      nome: string;
      genero?: string | null;
      custom?: Record<string, unknown> | null;
    },
  ): GamePersonDto {
    const user = sessionService.requireUserByToken(token);

    if (user.is_guest === 1) {
      throw new AppError(
        "Visitante joga offline — personagem não é salvo na conta",
        403,
        "FORBIDDEN",
      );
    }

    const personKey = input.personKey.trim();
    const nome = input.nome.trim();
    if (!personKey || !nome) {
      throw new AppError("personKey e nome são obrigatórios", 400, "VALIDATION_ERROR");
    }

    const catalog = characterCatalogService.requireActive(personKey);

    const db = getGameDb();
    const ts = nowIso();
    const customJson = input.custom ? JSON.stringify(input.custom) : null;

    db.run(`UPDATE game_persons SET is_active = 0 WHERE user_id = ?`, [user.id]);

    const existing = db
      .query<GamePersonRow, [string, string]>(
        `SELECT * FROM game_persons WHERE user_id = ? AND person_key = ?`,
      )
      .get(user.id, personKey);

    let personId: string;

    if (existing) {
      personId = existing.id;
      db.run(
        `UPDATE game_persons
         SET nome = ?, genero = ?, custom_json = ?, is_active = 1, updated_at = ?
         WHERE id = ?`,
        [nome, catalog.genero ?? input.genero ?? null, customJson, ts, personId],
      );
    } else {
      personId = crypto.randomUUID();
      db.run(
        `INSERT INTO game_persons
         (id, user_id, person_key, nome, genero, custom_json, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [personId, user.id, personKey, catalog.nome, catalog.genero ?? input.genero ?? null, customJson, ts, ts],
      );
    }

    const row = db.query<GamePersonRow, [string]>(`SELECT * FROM game_persons WHERE id = ?`).get(personId)!;
    return mapPerson(row, getPersonStats(user.id, personId));
  },

  list(token: string): GamePersonDto[] {
    const user = sessionService.requireUserByToken(token);
    if (user.is_guest === 1) return [];
    return listPersonsForUser(user.id);
  },
};

export const scoreService = {
  save(
    token: string,
    input: {
      personId?: string;
      personKey?: string;
      points: number;
      livesLeft?: number | null;
      levelLabel?: string | null;
      won?: boolean;
      durationMs?: number | null;
      fruitCounts?: Record<string, number> | null;
    },
  ) {
    const user = sessionService.requireUserByToken(token);

    if (user.is_guest === 1) {
      return {
        saved: false,
        reason: "guest_offline" as const,
        points: input.points,
      };
    }

    const db = getGameDb();
    let personId = input.personId?.trim();

    if (!personId && input.personKey) {
      const person = db
        .query<GamePersonRow, [string, string]>(
          `SELECT * FROM game_persons WHERE user_id = ? AND person_key = ?`,
        )
        .get(user.id, input.personKey.trim());
      personId = person?.id;
    }

    if (!personId) {
      const active = db
        .query<GamePersonRow, [string]>(
          `SELECT * FROM game_persons WHERE user_id = ? AND is_active = 1 LIMIT 1`,
        )
        .get(user.id);
      personId = active?.id;
    }

    if (!personId) {
      throw new AppError("Nenhum personagem selecionado para salvar pontuação", 400, "VALIDATION_ERROR");
    }

    const scoreId = crypto.randomUUID();
    const points = Math.max(0, Math.round(input.points));
    const durationMs = typeof input.durationMs === "number" && input.durationMs > 0
      ? Math.round(input.durationMs)
      : null;
    const fruitCountsJson = input.fruitCounts && Object.keys(input.fruitCounts).length > 0
      ? JSON.stringify(input.fruitCounts)
      : null;

    db.run(
      `INSERT INTO game_scores
       (id, user_id, person_id, points, lives_left, level_label, won, duration_ms, fruit_counts_json, played_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scoreId,
        user.id,
        personId,
        points,
        typeof input.livesLeft === "number" ? input.livesLeft : null,
        input.levelLabel ?? null,
        input.won ? 1 : 0,
        durationMs,
        fruitCountsJson,
        nowIso(),
      ],
    );

    const stats = getPersonStats(user.id, personId);

    return {
      saved: true as const,
      scoreId,
      personId,
      points,
      bestScore: stats.best,
      gamesPlayed: stats.games,
    };
  },

  listForPerson(token: string, personId: string) {
    const user = sessionService.requireUserByToken(token);
    const db = getGameDb();

    const person = db
      .query<GamePersonRow, [string, string]>(
        `SELECT * FROM game_persons WHERE id = ? AND user_id = ?`,
      )
      .get(personId, user.id);

    if (!person) {
      throw new AppError("Personagem não encontrado", 404, "NOT_FOUND");
    }

    return db
      .query<
        {
          id: string;
          points: number;
          lives_left: number | null;
          level_label: string | null;
          won: number;
          played_at: string;
        },
        [string]
      >(
        `SELECT id, points, lives_left, level_label, won, played_at
         FROM game_scores WHERE person_id = ? ORDER BY played_at DESC LIMIT 20`,
      )
      .all(personId)
      .map((row) => ({
        id: row.id,
        points: row.points,
        livesLeft: row.lives_left,
        levelLabel: row.level_label,
        won: row.won === 1,
        playedAt: row.played_at,
      }));
  },

  getRunFruits(token: string, scoreId: string) {
    const user = sessionService.requireUserByToken(token);
    const db = getGameDb();

    const row = db
      .query<
        {
          user_id: string;
          points: number;
          duration_ms: number | null;
          fruit_counts_json: string | null;
        },
        [string]
      >(
        `SELECT user_id, points, duration_ms, fruit_counts_json
         FROM game_scores WHERE id = ?`,
      )
      .get(scoreId.trim());

    if (!row || row.user_id !== user.id) {
      throw new AppError("Partida não encontrada", 404, "NOT_FOUND");
    }

    let fruitCounts: Record<string, number> = {};
    if (row.fruit_counts_json) {
      try {
        const parsed = JSON.parse(row.fruit_counts_json) as Record<string, number>;
        if (parsed && typeof parsed === "object") fruitCounts = parsed;
      } catch {
        fruitCounts = {};
      }
    }

    return {
      scoreId,
      points: row.points,
      durationMs: row.duration_ms,
      fruitCounts,
    };
  },
};

export interface RankingEntryDto {
  userId: string;
  displayName: string;
  personName: string;
  bestScore: number;
  bestDurationMs: number | null;
  scoreId: string;
}

export const rankingService = {
  listLeaderboard(limit = 20): RankingEntryDto[] {
    const db = getGameDb();
    const safeLimit = Math.min(50, Math.max(1, Math.round(limit)));

    return db
      .query<
        {
          user_id: string;
          display_name: string;
          person_name: string;
          best_score: number;
          best_duration_ms: number | null;
          score_id: string;
        },
        [number]
      >(
        `SELECT u.id AS user_id, u.display_name, p.nome AS person_name,
                best.best_score, best.best_duration_ms, MIN(s.id) AS score_id
         FROM game_users u
         INNER JOIN (
           SELECT user_id,
                  MIN(duration_ms) AS best_duration_ms,
                  MAX(points) AS best_score
           FROM game_scores
           WHERE won = 1
             AND duration_ms IS NOT NULL
             AND duration_ms > 0
             AND points >= 100
           GROUP BY user_id
         ) best ON best.user_id = u.id
         INNER JOIN game_scores s
           ON s.user_id = u.id
          AND s.duration_ms = best.best_duration_ms
          AND s.won = 1
          AND s.points >= 100
         INNER JOIN game_persons p ON p.id = s.person_id
         WHERE u.is_guest = 0
         GROUP BY u.id
         ORDER BY best.best_duration_ms ASC, u.display_name COLLATE NOCASE ASC
         LIMIT ?`,
      )
      .all(safeLimit)
      .map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        personName: row.person_name,
        bestScore: row.best_score,
        bestDurationMs: row.best_duration_ms,
        scoreId: row.score_id,
      }));
  },
};
