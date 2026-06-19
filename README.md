# NHAMNHAM Game API

Backend leve em Bun + Elysia + SQLite.

## Subir

```bash
cd backend
bun install
bun run dev
```

- API: `http://localhost:5240`
- Docs: `http://localhost:5240/docs`
- Banco: `backend/data/nhamnham.sqlite`

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/game/characters` | Catálogo (campo `id` = `criancas.json`) |
| POST | `/api/v1/game/characters` | Cadastrar personagem |
| POST | `/api/v1/game/characters/sync` | Re-sincronizar do `criancas.json` |
| POST | `/api/v1/game/session/guest` | Visitante (UUID temporário) |
| POST | `/api/v1/game/login` | Conectar com usuário cadastrado |
| POST | `/api/v1/game/session` | Cadastro (nome + idade) |
| GET | `/api/v1/game/me` | Perfil (Bearer token) |
| GET | `/api/v1/game/rules` | Regras do jogo (`metaComida`, vidas, ovo, sapo…) |
| POST | `/api/v1/game/rules/sync` | Re-sincronizar do `backup/config.json` |
| PATCH | `/api/v1/game/config` | Volume e preferências do jogador |
| GET/POST | `/api/v1/game/persons` | Personagens escolhidos |
| POST | `/api/v1/game/scores` | Pontuação por personagem |
| GET | `/api/v1/game/scores/:personId` | Histórico |

**Visitante:** id temporário, não persiste personagem/score no servidor.

**Personagens:** edite `backend/backup/criancas.json` → sync automático ao subir + `POST /characters/sync`. Assets copiados para `backend/storage/characters/{uuid}/` (`head.png` + `voice.mp3`).

**Regras:** edite `backend/backup/config.json` → sync automático + `POST /rules/sync`.

```bash
bun run sync:characters   # força sync manual
```

## Frontend

```
VITE_GAME_API_URL=http://localhost:5240
```
