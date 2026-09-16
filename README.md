# Staylark

Property subscription/booking platform with AI-powered voice feedback, problem reporting, and dynamic pricing.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Frontend:** Vite + React + Mantine v7 + React Router + Axios + Tanstack Query
- **Backend:** Express + TypeScript + Prisma + Better Auth
- **Contract:** Shared Zod schemas
- **Database:** PostgreSQL (Railway)
- **AI:** OpenAI Whisper + GPT-4o-mini

## Local Development

### Prerequisites

- Node.js >= 22 (see `.nvmrc`)
- pnpm >= 10

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Start all services in parallel
pnpm dev
```

### Individual workspace commands

```bash
# Frontend dev server
pnpm --filter @staylark/frontend dev

# Backend dev server
pnpm --filter @staylark/backend dev

# Lint all workspaces
pnpm lint

# Type-check all workspaces
pnpm typecheck
```

## Monorepo Structure

```
staylark/
├── packages/contract/   # @staylark/contract — shared Zod schemas
├── apps/backend/        # Express API
├── apps/frontend/       # Vite + React SPA
```

## Git Branch Strategy

- `main` — production-ready code
- `develop` — integration branch for features
- `feature/*` — individual feature branches (branch from `develop`)
