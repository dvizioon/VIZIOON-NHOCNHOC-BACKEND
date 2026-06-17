import { Elysia } from "elysia";
import { success } from "../../shared/http/api-response";
import {
  configService,
  personService,
  rankingService,
  scoreService,
  sessionService,
} from "../application/game.service";
import { characterCatalogService } from "../application/character-catalog.service";
import { gameRulesService } from "../application/game-rules.service";
import {
  createSessionBodySchema,
  loginBodySchema,
  readBearerToken,
  registerCharacterBodySchema,
  saveScoreBodySchema,
  selectPersonBodySchema,
  sessionHeaderSchema,
  updateConfigBodySchema,
} from "./schemas";

export const gameRouter = new Elysia({ prefix: "/api/v1/game", tags: ["NHAMNHAM"] })
  .post(
    "/session",
    ({ body }) => {
      const session = sessionService.createSession(body);
      return success("Sessão criada", {
        data: session,
        token: session.sessionToken,
      });
    },
    {
      body: createSessionBodySchema,
      detail: { summary: "Criar sessão do jogador (nome → id + token)" },
    },
  )
  .post(
    "/session/guest",
    () => {
      const session = sessionService.createGuestSession();
      return success("Sessão visitante criada", {
        data: session,
        token: session.sessionToken,
      });
    },
    {
      detail: { summary: "Criar sessão visitante (UUID temporário)" },
    },
  )
  .post(
    "/login",
    ({ body }) => {
      const session = sessionService.loginWithUsername(body.username);
      return success("Login realizado", {
        data: session,
        token: session.sessionToken,
      });
    },
    {
      body: loginBodySchema,
      detail: { summary: "Conectar com usuário cadastrado" },
    },
  )
  .get(
    "/characters",
    () => {
      const characters = characterCatalogService.listActive();
      return success("Catálogo de personagens", { data: characters });
    },
    {
      detail: { summary: "Listar personagens cadastrados" },
    },
  )
  .get(
    "/ranking",
    ({ query }) => {
      const limit = query?.limit ? Number(query.limit) : 20;
      const entries = rankingService.listLeaderboard(limit);
      return success("Ranking de pontuações", { data: entries });
    },
    {
      detail: { summary: "Top pontuações (somente contas registradas)" },
    },
  )
  .post(
    "/characters",
    ({ body }) => {
      const character = characterCatalogService.upsert(body);
      return success("Personagem cadastrado", { data: character });
    },
    {
      body: registerCharacterBodySchema,
      detail: { summary: "Cadastrar/atualizar personagem no catálogo" },
    },
  )
  .post(
    "/characters/sync",
    () => {
      const count = characterCatalogService.syncFromJson();
      return success("Catálogo sincronizado", { data: { count } });
    },
    {
      detail: { summary: "Sincronizar catálogo a partir do criancas.json" },
    },
  )
  .get(
    "/rules",
    () => {
      const rules = gameRulesService.getActive();
      return success("Regras do jogo", { data: rules });
    },
    {
      detail: { summary: "Regras globais (metaComida, vidas, ovo, sapo…)" },
    },
  )
  .post(
    "/rules/sync",
    () => {
      const rules = gameRulesService.syncFromJson();
      return success("Regras sincronizadas", { data: rules });
    },
    {
      detail: { summary: "Sincronizar regras a partir do backup/config.json" },
    },
  )
  .get(
    "/me",
    ({ headers }) => {
      const token = readBearerToken(headers.authorization);
      const session = sessionService.getByToken(token);
      return success("Sessão ativa", { data: session });
    },
    {
      headers: sessionHeaderSchema,
      detail: { summary: "Perfil da sessão atual" },
    },
  )
  .patch(
    "/config",
    ({ headers, body }) => {
      const token = readBearerToken(headers.authorization);
      const config = configService.update(token, body);
      return success("Configuração atualizada", { data: config });
    },
    {
      headers: sessionHeaderSchema,
      body: updateConfigBodySchema,
      detail: { summary: "Atualizar volume e preferências" },
    },
  )
  .get(
    "/persons",
    ({ headers }) => {
      const token = readBearerToken(headers.authorization);
      const persons = personService.list(token);
      return success("Personagens do jogador", { data: persons });
    },
    {
      headers: sessionHeaderSchema,
      detail: { summary: "Listar personagens escolhidos" },
    },
  )
  .post(
    "/persons",
    ({ headers, body }) => {
      const token = readBearerToken(headers.authorization);
      const person = personService.select(token, body);
      return success("Personagem selecionado", { data: person });
    },
    {
      headers: sessionHeaderSchema,
      body: selectPersonBodySchema,
      detail: { summary: "Escolher personagem (conta registrada)" },
    },
  )
  .post(
    "/scores",
    ({ headers, body }) => {
      const token = readBearerToken(headers.authorization);
      const result = scoreService.save(token, body);
      return success(result.saved ? "Pontuação salva" : "Visitante — pontuação local", {
        data: result,
      });
    },
    {
      headers: sessionHeaderSchema,
      body: saveScoreBodySchema,
      detail: { summary: "Registrar pontuação por personagem" },
    },
  )
  .get(
    "/scores/:personId",
    ({ headers, params }) => {
      const token = readBearerToken(headers.authorization);
      const scores = scoreService.listForPerson(token, params.personId);
      return success("Histórico de pontuações", { data: scores });
    },
    {
      headers: sessionHeaderSchema,
      detail: { summary: "Histórico do personagem" },
    },
  );
