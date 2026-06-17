import { getGameDb } from "../db/client";
import {
  DEFAULT_GAME_RULES,
  type GameRulesDto,
  syncGameRulesFromJson,
} from "../db/seed-game-rules";

type GameRulesRow = {
  meta_comida: number;
  max_vidas: number;
  cliques_ovo: number;
  cliques_casulo: number;
  intervalo_sapo: number;
  delay_inicio_sapo: number;
  min_comida_antes_sapo: number;
  invulneravel_frames: number;
  design_width: number;
  design_height: number;
};

function mapRow(row: GameRulesRow): GameRulesDto {
  return {
    metaComida: row.meta_comida,
    maxVidas: row.max_vidas,
    cliquesOvo: row.cliques_ovo,
    cliquesCasulo: row.cliques_casulo,
    intervaloSapo: row.intervalo_sapo,
    delayInicioSapo: row.delay_inicio_sapo,
    minComidaAntesSapo: row.min_comida_antes_sapo,
    invulneravelFrames: row.invulneravel_frames,
    designWidth: row.design_width,
    designHeight: row.design_height,
  };
}

export const gameRulesService = {
  getActive(): GameRulesDto {
    const db = getGameDb();
    const row = db
      .query<GameRulesRow, []>(`SELECT * FROM game_rules WHERE id = 'default'`)
      .get();

    if (!row) return { ...DEFAULT_GAME_RULES };
    return mapRow(row);
  },

  syncFromJson(): GameRulesDto {
    return syncGameRulesFromJson();
  },
};
