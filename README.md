# Polygon

Polygon is an open-source, browser-based 3D modeling workspace built on the T3 stack. It combines collaborative project management, a React Three Fiber editor, and real-time presence via Socket.IO to provide a CAD-like experience on the web.

## Prerequisites

- **Node.js 20** (use [nvm](https://github.com/nvm-sh/nvm) or a tool of your choice)
- **pnpm 9** (automatically installed when using `corepack enable` on Node 20+)
- **Doppler CLI** for syncing shared environment variables
- **Docker** (optional) if you prefer to run the Postgres database in a container – the provided script starts a local instance automatically

## Local Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Authenticate with Doppler** (only required once)
   ```bash
   doppler login
   doppler setup
   ```

3. **Start the development database**
   ```bash
   ./start-database.sh
   ```
   The script provisions a Postgres container on port `5432` with the credentials expected by Prisma.

4. **Apply database migrations**
   ```bash
   pnpm db:generate
   ```
   This runs `prisma migrate dev` through Doppler so the schema matches the current application state.

5. **Run the app (Next.js + Socket.IO gateway)**
   ```bash
   pnpm dev
   ```
   The command boots the custom `server.js`, which starts Next.js and the Socket.IO collaboration server on [http://localhost:3000](http://localhost:3000).

## Development Tips

- **API & tRPC clients** live under `src/server/api` and `src/trpc`. Callers automatically inject the active organization ID from the signed-in session.
- **Modeling state** is managed with Jotai atoms in `src/app/(protected)/atoms` and is now persisted through the `document` tRPC router so sketches/extrusions survive reloads and sync across collaborators.
- **Real-time collaboration** runs through Socket.IO (see `server.js`). Cursor presence is already wired up; modeling state updates broadcast through the new `document:state:update` channel.
- **Styling & UI** use Tailwind, shadcn/ui, and Lucide icons. Shared providers live in `src/app/providers.tsx`.

## Useful Scripts

| Command | Purpose |
| --- | --- |
| `pnpm lint` | Run ESLint with the Doppler-managed environment |
| `pnpm typecheck` | Run TypeScript without emitting output |
| `pnpm format:write` | Apply Prettier formatting |
| `pnpm db:studio` | Open Prisma Studio against the local database |
| `pnpm preview` | Build and start the production bundle locally |

## Troubleshooting

- If you see authentication or Prisma errors, double-check that `doppler setup` completed successfully for this directory.
- The dev server expects the Postgres container to be running. Re-run `./start-database.sh` if migrations fail to connect.
- Socket.IO uses the same origin as Next.js during development. When testing across devices or tunnels, ensure the origin is present in the CORS allow-list inside `server.js`.

Happy modeling!
