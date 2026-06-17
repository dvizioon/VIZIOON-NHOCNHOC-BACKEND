import { t } from "elysia";
import { z } from "zod";

export const loginBodySchema = z.object({
  username: z.string().min(2).max(48),
});

export const createSessionBodySchema = z.object({
  name: z.string().min(2).max(48),
  age: z.number().int().min(3).max(99).optional().nullable(),
  isGuest: z.boolean().optional(),
});

export const updateConfigBodySchema = z.object({
  volumeMusica: z.number().min(0).max(1).optional(),
  volumeEfeitos: z.number().min(0).max(1).optional(),
  muted: z.boolean().optional(),
  modo: z.enum(["toque", "teclado"]).optional(),
});

export const selectPersonBodySchema = z.object({
  personKey: z.string().min(1).max(64),
  nome: z.string().min(1).max(64),
  genero: z.string().max(16).optional().nullable(),
  custom: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const saveScoreBodySchema = z.object({
  personId: z.string().uuid().optional(),
  personKey: z.string().min(1).max(64).optional(),
  points: z.number().int().min(0),
  livesLeft: z.number().int().min(0).optional().nullable(),
  levelLabel: z.string().max(64).optional().nullable(),
  won: z.boolean().optional(),
});

export const registerCharacterBodySchema = z.object({
  personKey: z.string().min(1).max(64),
  id: z.string().min(1).max(64).optional(),
  nome: z.string().min(1).max(64),
  nomeCompleto: z.string().max(128).optional().nullable(),
  genero: z.string().max(16).optional().nullable(),
  tipo: z.string().max(32).optional().nullable(),
  personalidade: z.string().max(512).optional().nullable(),
  cabecaPath: z.string().max(256).optional().nullable(),
  cabeca: z.string().max(256).optional().nullable(),
  ativo: z.boolean().optional(),
});

export const sessionHeaderSchema = t.Object({
  authorization: t.Optional(t.String()),
});

export function readBearerToken(authorization?: string | null): string {
  if (!authorization) return "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? authorization.trim();
}
