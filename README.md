# Package Game · Server

The server for **Package**, a multiplayer GPS game about building factories, trading resources, and delivering goods on a shared map. Provides the game API and live updates for connected players.

[Client](https://github.com/triangle-int/package-game-frontend) · [Telegram](https://t.me/packagegame)

## Stack

- **TypeScript / NestJS** — HTTP API, WebSocket updates, and scheduled tasks.
- **PostgreSQL / Prisma** — game data and migrations.
- **Firebase Admin** — authentication; **Firebase Messaging** — push notifications.
- **Docker Compose** — local server and database.

## Getting started

You need Docker with Compose v2 and Make. The development stack runs inside Docker, including database migrations.

```bash
cp .env.example .env
```

Review [.env.example](.env.example), set `SERVER_ID` and `ADMIN_PASSWORD`, and configure Firebase for your environment:

- `src/serviceAccount.json` — Firebase Admin service account.
- `src/firebase-client/firebase-client-config.json` — Firebase client configuration.

Keep private credentials out of version control. Optional integrations are listed in `.env.example`.

```bash
make dev
```

| Service          | Local address               |
| ---------------- | --------------------------- |
| HTTP API         | `http://127.0.0.1:3005`     |
| Swagger API docs | `http://127.0.0.1:3005/api` |
| WebSocket        | `ws://127.0.0.1:3006`       |
| PostgreSQL       | `127.0.0.1:5439`            |

The dev stack enables temporary Dev Login for the client. Use `DEV_BIND_ADDRESS=<lan-ip> make dev` to connect from a physical iPhone on the same network. `make stop` stops the containers and preserves the database.

## Tests

For commands outside Docker, use Node.js 24 and pnpm 11, matching the [Dockerfile](Dockerfile).

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
make test-unit
make test-e2e
make test-coverage
```

E2E tests require Docker and use a disposable database. `make test` runs all checks above.
