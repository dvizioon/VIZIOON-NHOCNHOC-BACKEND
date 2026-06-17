export type GameModo = "toque" | "teclado";

export interface GameUserConfig {
  volumeMusica: number;
  volumeEfeitos: number;
  muted: boolean;
  modo: GameModo;
}

export interface GameUserRow {
  id: string;
  display_name: string;
  age: number | null;
  is_guest: number;
  session_token: string;
  created_at: string;
  expires_at: string | null;
}

export interface GamePersonRow {
  id: string;
  user_id: string;
  person_key: string;
  nome: string;
  genero: string | null;
  custom_json: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface GameScoreRow {
  id: string;
  user_id: string;
  person_id: string;
  points: number;
  lives_left: number | null;
  level_label: string | null;
  won: number;
  played_at: string;
}

export interface GamePersonDto {
  id: string;
  personKey: string;
  nome: string;
  genero: string | null;
  custom: Record<string, unknown> | null;
  isActive: boolean;
  bestScore: number;
  gamesPlayed: number;
}

export interface GameSessionDto {
  userId: string;
  sessionToken: string;
  displayName: string;
  age: number | null;
  isGuest: boolean;
  expiresAt: string | null;
  config: GameUserConfig;
  activePerson: GamePersonDto | null;
  persons: GamePersonDto[];
}
