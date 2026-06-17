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
| GET | `/api/v1/game/characters` | Catálogo de personagens cadastrados |
| POST | `/api/v1/game/characters` | Cadastrar personagem |
| POST | `/api/v1/game/characters/sync` | Sincronizar do `criancas.json` |
| POST | `/api/v1/game/session/guest` | Visitante (UUID temporário) |
| POST | `/api/v1/game/login` | Conectar com usuário cadastrado |
| POST | `/api/v1/game/session` | Cadastro (nome + idade) |
| GET | `/api/v1/game/me` | Perfil (Bearer token) |
| PATCH | `/api/v1/game/config` | Volume e preferências |
| GET/POST | `/api/v1/game/persons` | Personagens escolhidos |
| POST | `/api/v1/game/scores` | Pontuação por personagem |
| GET | `/api/v1/game/scores/:personId` | Histórico |

**Visitante:** id temporário, não persiste personagem/score no servidor.

## Frontend

```
VITE_GAME_API_URL=http://localhost:5240
```
