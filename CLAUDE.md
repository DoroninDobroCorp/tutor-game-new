# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Math Quest is a full-stack educational platform built as a TypeScript monorepo with:
- **Backend**: Node.js/Express API with Prisma ORM, PostgreSQL, Socket.IO, JWT auth
- **Frontend**: React SPA with Redux Toolkit, Vite, Tailwind CSS
- **Features**: AI story/image generation, real-time chat, progress tracking, role-based access

## Key Commands

### Development Setup
```bash
# Install all dependencies
npm run install:all

# Start services (run in separate terminals)
npm run backend:dev    # Backend on :3002
npm run frontend:dev   # Frontend on :3003
```

### Backend Commands (run from /tutor-game/backend)
```bash
npm run dev                # Development server with hot reload
npm run build              # TypeScript compilation
npm run prisma:generate    # Generate Prisma client after schema changes
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open database GUI
```

### Frontend Commands (run from /tutor-game/frontend)
```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run lint      # ESLint checking
```

## Architecture

### Backend Structure
- **Routes**: `/routes/` - API endpoint definitions
- **Controllers**: `/controllers/` - Request handlers for auth, student, teacher, generate
- **Services**: `/services/` - Business logic (auth, OpenAI, Leonardo AI, websocket)
- **Middlewares**: `/middlewares/` - Auth validation, error handling
- **Sockets**: `/sockets/` - Real-time WebSocket handlers

### Frontend Structure
- **Features**: `/features/` - Redux slices and API queries (auth, chat)
- **Pages**: `/pages/` - Route components with role-based folders (student/, teacher/, chat/)
- **API**: `/api/client.ts` - Axios client with auth interceptors
- **Store**: `/app/store.ts` - Redux Toolkit configuration

### Database
Prisma schema with key models: User, Teacher, Student, Message, Story, GeneratedImage, Goal, RoadmapEntry, Badge, TokenBlacklist. Students optionally belong to Teachers.

### Authentication
JWT with refresh token rotation. Access tokens (15min), refresh tokens (7d, HTTP-only cookies), blacklist for revoked tokens.

## API Endpoints

**Auth**: `/api/auth/{register,login,logout,refresh,me}`
**Teacher**: `/api/teacher/{dashboard,students/:id,students/:id/roadmap}`
**Student**: `/api/student/{profile,goal,math-problem}`
**Generate**: `/api/generate/story/{,continue,image}` (OpenAI + Leonardo AI)

## WebSocket Events
Real-time chat using Socket.IO with JWT auth. Events: `sendMessage`, `markAsRead`, `getMessages`, `getUsers` → `message`, `messages`, `users`, `userList`

## Environment Setup
Backend requires `.env` with: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`, `LEONARDO_API_KEY`

## Development Notes
- Frontend dev server proxies `/api/*` to backend
- TypeScript throughout with strict typing
- Redux Toolkit for state, RTK Query for API calls
- Role-based route protection with HOCs
- Centralized error handling and logging