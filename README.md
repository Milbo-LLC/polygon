# Polygon

Polygon is an open-source browser-based 3D modeling tool designed for the AI future. It combines intuitive 2D sketching with 3D extrusion capabilities, real-time collaboration, and a modern web stack.

## Features

- **Multi-Plane Sketching**: Draw on X, Y, and Z planes with pencil, rectangle, and eraser tools
- **3D Extrusion**: Convert 2D sketches into 3D shapes with adjustable depth and colors
- **Real-Time Collaboration**: See other users' cursors and edits in real-time via WebSockets
- **History Timeline**: Full undo/redo support with visual timeline
- **Multi-Workspace**: Organization-based project management with role-based access control
- **Grid Snapping**: Precision drawing with configurable grid snapping

## Tech Stack

Built with the [T3 Stack](https://create.t3.gg/) and modern web technologies:

### Core Framework
- [Next.js 15](https://nextjs.org) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development
- [React 18](https://react.dev) - UI library

### Backend & API
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [Prisma](https://prisma.io) - Database ORM
- [PostgreSQL](https://www.postgresql.org/) - Primary database
- [Better Auth](https://www.better-auth.com/) - Authentication (Google OAuth + Email OTP)
- [Socket.io](https://socket.io/) - Real-time WebSocket communication

### Frontend & UI
- [Tailwind CSS](https://tailwindcss.com) - Utility-first styling
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [Three.js](https://threejs.org/) - 3D graphics
- [Jotai](https://jotai.org/) - Atomic state management

### Infrastructure
- [AWS S3](https://aws.amazon.com/s3/) - File storage
- [Resend](https://resend.com/) - Email delivery
- [Doppler](https://www.doppler.com/) - Environment variable management
- [Railway](https://railway.app/) - Deployment platform

## Quickstart

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Login to Doppler

   We use Doppler for sharing env variables, so login first:

   ```bash
   doppler login
   ```

3. Start the database:

   ```bash
   ./start-database.sh
   ```

4. Run migration script on database

   ```bash
   pnpm db:generate
   ```

5. Run the development server:

   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
polygon/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes (login, signup)
│   │   ├── (protected)/       # Protected routes (projects, settings)
│   │   ├── (public)/          # Public routes (waitlist)
│   │   ├── _components/       # 3D canvas components (sketch, extrude, history)
│   │   └── api/               # API routes (tRPC, auth, S3 upload)
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # shadcn/ui components
│   │   └── emails/            # Email templates
│   ├── server/                # Backend logic
│   │   ├── api/routers/       # tRPC routers
│   │   └── auth/              # Authentication configuration
│   ├── lib/                   # Utility functions
│   ├── hooks/                 # Custom React hooks
│   └── providers/             # Context providers
├── prisma/                    # Database schema and migrations
└── public/                    # Static assets
```

## Available Scripts

### Development
```bash
pnpm dev              # Start development server with Doppler
pnpm db:studio        # Open Prisma Studio (database GUI)
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate a new migration
```

### Production
```bash
pnpm build            # Build for production with Doppler
pnpm build:prod       # Build without Doppler (uses .env)
pnpm start            # Start production server
```

### Code Quality
```bash
pnpm check            # Run linting and type checking
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix linting issues
pnpm typecheck        # Run TypeScript compiler check
pnpm format:check     # Check code formatting with Prettier
pnpm format:write     # Auto-format code with Prettier
```

### Database
```bash
pnpm db:generate      # Create a new migration
pnpm db:migrate       # Deploy migrations to database
pnpm prisma:generate  # Generate Prisma Client
```

## Environment Variables

This project uses [Doppler](https://www.doppler.com/) for environment variable management. Required variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/polygon"

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-bucket"

# Email
RESEND_API_KEY="your-resend-key"

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

See `.env.example` for a complete list.

## Architecture

### Authentication Flow
1. Users sign in via Google OAuth or Email OTP
2. Better Auth creates a session and user record
3. Personal organization is auto-created on first sign-in
4. Session enriched with organization memberships
5. Active organization determined from database or header

### Data Model
- **Organizations**: Multi-tenant workspaces (personal or team)
- **Projects**: Containers for related documents
- **Documents**: Individual 3D modeling canvases
- **UserOrganization**: Role-based access (owner/admin/member)

### Real-Time Collaboration
- Socket.io manages WebSocket connections
- Users join document rooms to share cursor positions
- Presence tracking shows active users in organizations

### State Management
- **Jotai atoms**: Global UI state (tools, theme, canvas mode)
- **Atom families**: Per-document state (sketches, extrusions, history)
- **localStorage**: Client-side persistence with `polygon:*` keys
- **TanStack Query**: Server state via tRPC

## Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/polygon.git
   cd polygon
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up your environment**
   - Login to Doppler: `doppler login`
   - Or copy `.env.example` to `.env` and fill in values

4. **Start the database**
   ```bash
   ./start-database.sh
   ```

5. **Run migrations**
   ```bash
   pnpm db:generate
   ```

6. **Start developing**
   ```bash
   pnpm dev
   ```

### Code Standards

- **TypeScript**: All code must be type-safe
- **ESLint**: Run `pnpm lint` before committing
- **Prettier**: Format code with `pnpm format:write`
- **Conventional Commits**: Use conventional commit messages

### Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and ensure all checks pass: `pnpm check`
3. Commit with a descriptive message
4. Push to your fork and create a pull request
5. Wait for code review and address feedback

### Testing Guidelines

**Note**: Testing infrastructure is currently being implemented. For now:
- Manually test your changes in the browser
- Verify tRPC endpoints work as expected
- Test on both light and dark themes
- Check responsive design on mobile

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to PostgreSQL
```
Error: P1001: Can't reach database server
```

**Solution**:
1. Ensure Docker is running: `docker ps`
2. Check if the database container is running: `docker ps | grep polygon-postgres`
3. Restart the database: `./start-database.sh`
4. Verify DATABASE_URL in Doppler or .env matches your container

### Doppler Authentication

**Problem**: `doppler: command not found`

**Solution**:
1. Install Doppler CLI:
   ```bash
   # macOS
   brew install dopplerhq/cli/doppler

   # Linux
   curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/install.sh' | sh
   ```
2. Login: `doppler login`
3. Alternatively, use a `.env` file instead

### Prisma Client Issues

**Problem**: `@prisma/client did not initialize yet`

**Solution**:
```bash
pnpm prisma:generate
```

This regenerates the Prisma Client based on your schema.

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
1. Find the process: `lsof -ti:3000`
2. Kill it: `kill -9 $(lsof -ti:3000)`
3. Or use a different port: `PORT=3001 pnpm dev`

### Build Errors After Pulling

**Problem**: Build fails after pulling latest changes

**Solution**:
```bash
# Clean install
rm -rf node_modules .next
pnpm install

# Regenerate Prisma Client
pnpm prisma:generate

# Rebuild
pnpm build
```

### Socket.io Connection Failed

**Problem**: Real-time collaboration not working

**Solution**:
1. Ensure the custom server is running (not default Next.js dev)
2. Check that `server.js` is being used
3. Verify CORS configuration in `server.js` matches your domain
4. Check browser console for WebSocket errors

### Type Errors After Schema Changes

**Problem**: TypeScript errors after modifying Prisma schema

**Solution**:
```bash
# Push schema changes
pnpm db:push

# Regenerate Prisma Client
pnpm prisma:generate

# Restart your development server
```

### Authentication Redirect Loop

**Problem**: Stuck in redirect loop after login

**Solution**:
1. Clear cookies for `localhost:3000`
2. Verify NEXT_PUBLIC_BETTER_AUTH_URL matches your domain
3. Check that BETTER_AUTH_SECRET is set
4. Restart the development server

## Known Issues

- **State Persistence**: Document 3D state is currently stored in localStorage only, not synced to database. Working on fix.
- **Collaborative Editing**: Real-time cursor tracking works, but simultaneous edits may conflict. Proper CRDT/OT coming soon.
- **Performance**: Large/complex 3D scenes have not been optimized yet.

## Roadmap

### Short-term (Next Month)
- [ ] Document state persistence to database
- [ ] Integration test suite
- [ ] Error tracking (Sentry)
- [ ] Rate limiting on API endpoints

### Medium-term (3-6 Months)
- [ ] Additional sketch tools (circle, polygon, splines)
- [ ] File import/export (STL, OBJ, STEP)
- [ ] Public sharing links
- [ ] Advanced extrusion (revolve, loft)
- [ ] Measurement and dimensioning tools

### Long-term (Future)
- [ ] Parametric modeling
- [ ] Assembly mode
- [ ] Mobile app
- [ ] AI-assisted modeling

## License

[Add your license here]

## Support

- **Issues**: [GitHub Issues](https://github.com/Milbo-LLC/polygon/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Milbo-LLC/polygon/discussions)
- **Email**: [Add your support email]
