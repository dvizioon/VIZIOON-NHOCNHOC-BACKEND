import { existsSync, readFileSync } from "node:fs";
import { gameEnv } from "../config/env";
import { getGameDb } from "./client";

export type GameRulesJson = {
  metaComida?: number;
  maxVidas?: number;
  cliquesOvo?: number;
  cliquesCasulo?: number;
  intervaloSapo?: number;
  delayInicioSapo?: number;
  minComidaAntesSapo?: number;
  invulneravelFrames?: number;
  designWidth?: number;
  designHeight?: number;
};

export const DEFAULT_GAME_RULES = {
  metaComida: 24,
  maxVidas: 3,
  cliquesOvo: 4,
  cliquesCasulo: 2,
  intervaloSapo: 12000,
  delayInicioSapo: 25000,
  minComidaAntesSapo: 4,
  invulneravelFrames: 120,
  designWidth: 1280,
  designHeight: 720,
} as const;

export type GameRulesDto = typeof DEFAULT_GAME_RULES;

function nowIso(): string {
  return new Date().toISOString();
}

export function loadGameRulesJson(): GameRulesJson {
  if (!existsSync(gameEnv.gameRulesJsonPath)) {
    console.warn(`[nhamnham] config.json não encontrado: ${gameEnv.gameRulesJsonPath}`);
    return { ...DEFAULT_GAME_RULES };
  }

  const raw = readFileSync(gameEnv.gameRulesJsonPath, "utf8");
  const parsed = JSON.parse(raw) as GameRulesJson;
  return { ...DEFAULT_GAME_RULES, ...parsed };
}

export function normalizeGameRules(input: GameRulesJson): GameRulesDto {
  return {
    metaComida: Number(input.metaComida ?? DEFAULT_GAME_RULES.metaComida),
    maxVidas: Number(input.maxVidas ?? DEFAULT_GAME_RULES.maxVidas),
    cliquesOvo: Number(input.cliquesOvo ?? DEFAULT_GAME_RULES.cliquesOvo),
    cliquesCasulo: Number(input.cliquesCasulo ?? DEFAULT_GAME_RULES.cliquesCasulo),
    intervaloSapo: Number(input.intervaloSapo ?? DEFAULT_GAME_RULES.intervaloSapo),
    delayInicioSapo: Number(input.delayInicioSapo ?? DEFAULT_GAME_RULES.delayInicioSapo),
    minComidaAntesSapo: Number(input.minComidaAntesSapo ?? DEFAULT_GAME_RULES.minComidaAntesSapo),
    invulneravelFrames: Number(input.invulneravelFrames ?? DEFAULT_GAME_RULES.invulneravelFrames),
    designWidth: Number(input.designWidth ?? DEFAULT_GAME_RULES.designWidth),
    designHeight: Number(input.designHeight ?? DEFAULT_GAME_RULES.designHeight),
  };
}

/** Sincroniza regras do jogo a partir de backend/backup/config.json */
export function syncGameRulesFromJson(database?: ReturnType<typeof getGameDb>): GameRulesDto {
  const db = database ?? getGameDb();
  const rules = normalizeGameRules(loadGameRulesJson());
  const ts = nowIso();

  db.run(
    `INSERT INTO game_rules
      (id, meta_comida, max_vidas, cliques_ovo, cliques_casulo, intervalo_sapo, delay_inicio_sapo,
       min_comida_antes_sapo, invulneravel_frames, design_width, design_height, updated_at)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      meta_comida = excluded.meta_comida,
      max_vidas = excluded.max_vidas,
      cliques_ovo = excluded.cliques_ovo,
      cliques_casulo = excluded.cliques_casulo,
      intervalo_sapo = excluded.intervalo_sapo,
      delay_inicio_sapo = excluded.delay_inicio_sapo,
      min_comida_antes_sapo = excluded.min_comida_antes_sapo,
      invulneravel_frames = excluded.invulneravel_frames,
      design_width = excluded.design_width,
      design_height = excluded.design_height,
      updated_at = excluded.updated_at`,
    [
      rules.metaComida,
      rules.maxVidas,
      rules.cliquesOvo,
      rules.cliquesCasulo,
      rules.intervaloSapo,
      rules.delayInicioSapo,
      rules.minComidaAntesSapo,
      rules.invulneravelFrames,
      rules.designWidth,
      rules.designHeight,
      ts,
    ],
  );

  console.log("[nhamnham] regras do jogo sincronizadas (backup/config.json → game_rules)");
  return rules;
}
