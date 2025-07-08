# Math Quest - Backend

This is the backend service for the Math Quest educational platform, built with Node.js, Express, Prisma, and TypeScript.

## Features

- RESTful API with JWT authentication
- WebSocket support for real-time updates
- Integration with OpenAI for story generation
- Integration with Leonardo.AI for image generation
- PostgreSQL database with Prisma ORM
- Role-based access control (Teacher/Student)

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- pnpm
- Docker (optional, for local database)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/math-quest.git
   cd math-quest/backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

4. **Set up the database**
   - Option 1: Using Docker (recommended)
     ```bash
     docker-compose up -d postgres
     ```
   - Option 2: Manual setup
     - Create a new PostgreSQL database
     - Update the `DATABASE_URL` in `.env`

5. **Run database migrations**
   ```bash
   pnpm prisma migrate dev --name init
   ```

6. **Generate Prisma Client**
   ```bash
   pnpm prisma generate
   ```

## Development

1. **Start the development server**
   ```bash
   pnpm dev
   ```
   The server will be available at `http://localhost:3001`

2. **API Documentation**
   - Swagger UI: `http://localhost:3001/api-docs` (if enabled)
   - Health check: `http://localhost:3001/health`

## Database

### Prisma Studio

To view and edit your database with a GUI, run:

```bash
pnpm prisma studio
```

### Migrations

To create a new migration after changing the schema:

```bash
pnpm prisma migrate dev --name your_migration_name
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port to run the server on | 3001 |
| NODE_ENV | Node environment | development |
| JWT_SECRET | Secret key for JWT | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| DATABASE_URL | PostgreSQL connection URL | - |
| OPENAI_API_KEY | OpenAI API key | - |
| LEONARDO_API_KEY | Leonardo.AI API key | - |
| LEONARDO_MODEL_ID | Leonardo.AI model ID | - |
| CORS_ORIGIN | Allowed CORS origins | http://localhost:3000 |
| LOG_LEVEL | Logging level | debug |

## Deployment

### Building for Production

```bash
pnpm build
```

### Running in Production

```bash
NODE_ENV=production pnpm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Teacher

- `GET /api/teacher/dashboard` - Get teacher dashboard
- `GET /api/teacher/students/:studentId` - Get student progress
- `PUT /api/teacher/students/:studentId/roadmap` - Update student roadmap
- `POST /api/teacher/students/:studentId/badges` - Assign badge to student

### Student

- `GET /api/student/profile` - Get student profile
- `POST /api/student/goal` - Set student goal
- `GET /api/student/roadmap` - Get student roadmap
- `GET /api/student/math-problem` - Generate math problem
- `POST /api/student/submit-answer` - Submit answer to math problem

### Generation

- `POST /api/generate/story` - Generate a new story
- `POST /api/generate/story/continue` - Continue an existing story
- `POST /api/generate/story/image` - Generate an image for a story

## License

MIT
