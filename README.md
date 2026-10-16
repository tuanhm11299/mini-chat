# Mini Chat

A small, readable **realtime chat starter**: an installable **PWA** for phones that also works as a normal web app on desktop.

| Layer    | Tech                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| Web      | Nuxt 4 (SPA), Nuxt UI 4, Pinia, Socket.IO client, `@vite-pwa/nuxt`           |
| API      | NestJS 11, TypeORM, Socket.IO, JWT + rotating refresh-token cookie           |
| Database | PostgreSQL 17                                                                |
| Shared   | `packages/shared`: TypeScript types and socket event names used by both apps |

The goal is a codebase you can read in an afternoon and extend without fighting it. It sticks to framework defaults and uses one folder per feature, and the web app and API share a single typed contract.

## Features

- **Accounts**: register, sign in, stay signed in (silent token refresh), sign out
- **Profile**: display name and avatar URL; initials when there is no avatar
- **Find people**: search by name or email
- **Conversations**: 1:1 direct chats and simple groups
- **Messages**: text, delivered live, optimistic sending with retry, "load older" history
- **Unread counts** and **read receipts** ("Seen", "Seen by …")
- **Presence** (online dot) and **typing indicators**
- **PWA**: installable on Android, iOS and desktop; opens offline; prompts when an update is ready
- **Responsive**: two panes on desktop, list → chat navigation on phones, safe areas and on-screen keyboard handled

Ideas for next features are listed in [docs/adding-a-feature.md](docs/adding-a-feature.md).

## Quick start

Requirements: **Node 22+**, **pnpm 10** (`corepack enable`), and **Docker** (or a local PostgreSQL 13+).

```bash
pnpm install                         # also builds packages/shared and prepares Nuxt
docker compose up -d                 # PostgreSQL on localhost:5432
cp apps/api/.env.example apps/api/.env
pnpm db:migrate                      # create the tables
pnpm db:seed                         # optional: demo users and chats
pnpm dev                             # API on :3001, web on :3000
```

Open http://localhost:3000 and sign in as `alice@example.com` / `password123`. Open a private window as `bob@example.com` (same password) to chat with yourself.

- API docs (Swagger): http://localhost:3001/api/docs
- To test on your phone on the same Wi-Fi, run `pnpm --filter @mini-chat/web dev --host`. Set `NUXT_PUBLIC_API_URL` (in `apps/web/.env`) and `WEB_ORIGIN` (in `apps/api/.env`) to your computer's LAN address. Installing as a PWA needs HTTPS (or `localhost`).

## Project structure

```
apps/
  api/                       NestJS API
    src/
      modules/<feature>/     one folder per feature: module, controller, service, entities/, dto/
      modules/realtime/      the only code that talks to sockets
      database/              TypeORM setup, migrations/, seeds/
      config/                validated environment variables
    test/                    API e2e tests (real database)
  web/                       Nuxt 4 PWA
    app/
      pages/                 routes (/login, /register, /chats, /chats/:id, /settings)
      components/            UI (chat/, common/)
      stores/                Pinia stores: auth, conversations, messages, presence
      composables/           useApi (HTTP + token refresh), useConversationDisplay, …
      plugins/realtime.client.ts   the socket connection → stores
      utils/                 plain functions (formatting, message merging) + unit tests
packages/
  shared/                    types + socket events shared by api and web
e2e/                         Playwright tests across the whole stack
docs/                        architecture and how-to guides
```

## Scripts (run from the repository root)

| Command                                       | What it does                                                  |
| --------------------------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                                    | Run API, web app and shared package in watch mode             |
| `pnpm build`                                  | Build everything (web is a static site in `apps/web/.output`) |
| `pnpm lint` / `typecheck` / `format`          | Code quality                                                  |
| `pnpm test`                                   | Unit tests (API: Jest, web: Vitest)                           |
| `pnpm test:e2e:api`                           | API tests against the `mini_chat_test` database               |
| `pnpm test:e2e`                               | Browser tests (Playwright); starts both apps if needed        |
| `pnpm db:migrate` / `db:revert`               | Apply / undo migrations                                       |
| `pnpm db:migration:generate <Name>`           | Create a migration from your entity changes                   |
| `pnpm db:seed`                                | Insert demo data                                              |
| `pnpm --filter @mini-chat/web generate:icons` | Regenerate PWA icons from `apps/web/public/logo.svg`          |

## Conventions

- **One feature, one folder** on the API (`modules/<feature>`). The web side follows the same idea with stores and components.
- **Controllers are thin**: they validate input (DTOs) and call a service. Only services touch repositories.
- **Entities never leave the API.** Services map them to the types in `packages/shared` (`toUserDto`, `toMessageDto`, …).
- **Modules don't call the realtime layer.** They emit domain events (`message.created`), and `ChatGateway` pushes them to sockets. New side effects such as push notifications or webhooks can listen to the same events.
- **The schema changes only through migrations** (`synchronize` is off). CI fails if the entities and migrations drift apart.
- **The web app sends over REST and listens over the socket.** Messages are sent with `POST`, which keeps validation in one place. The socket only pushes changes.

## Deployment notes

- **API**: `pnpm --filter @mini-chat/api build`, then `node dist/main.js`. Run `pnpm db:migrate` on each release. Set strong `JWT_ACCESS_SECRET` and `NODE_ENV=production`, which makes the refresh cookie `Secure`.
- **Web**: `pnpm --filter @mini-chat/web build` produces a static site in `apps/web/.output/public`. Host it on any static host or CDN with HTTPS (required for PWAs). Set `NUXT_PUBLIC_API_URL` at build time.
- Serve the web app and API from the **same site**, e.g. `chat.example.com` and `api.example.com`, so the `SameSite=Lax` refresh cookie is sent.
- Presence is kept in memory, so run **one API instance**, or see [docs/architecture.md](docs/architecture.md#scaling-out) to scale out.

## Further reading

- [docs/architecture.md](docs/architecture.md): how requests, auth and realtime events flow
- [docs/adding-a-feature.md](docs/adding-a-feature.md): step-by-step walkthrough for adding message reactions

## License

MIT
