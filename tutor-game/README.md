# Math Quest

Educational game platform with AI-generated content for tutors and students.

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- PostgreSQL
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. Set up the database:
   ```bash
   # Create a new PostgreSQL database
   createdb tutor_game
   
   # Run migrations
   cd ../backend
   npx prisma migrate dev --name init
   ```

3. Set up environment variables:
   ```bash
   # Backend .env
   cp backend/.env.example backend/.env
   
   # Update the database URL in backend/.env
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/tutor_game?schema=public"
   ```

4. Start the development servers:
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run dev
   
   # Terminal 2: Start frontend
   cd ../frontend
   npm run dev
   ```

## 📂 Project Structure

### Backend (`/backend`)
- `src/`
  - `config/` - Configuration files
  - `controllers/` - Request handlers
  - `middlewares/` - Express middlewares
  - `prisma/` - Database schema and migrations
  - `routes/` - API routes
  - `services/` - Business logic
  - `sockets/` - WebSocket handlers
  - `app.ts` - Express app setup
  - `index.ts` - Server entry point

### Frontend (`/frontend`)
- `src/`
  - `api/` - API client and services
  - `app/` - Redux store and hooks
  - `components/` - Reusable UI components
  - `features/` - Feature modules
  - `pages/` - Page components
    - `student/` - Student-specific pages
    - `teacher/` - Teacher-specific pages
  - `App.tsx` - Main application component
  - `main.tsx` - Application entry point

## 👥 User Roles

### Student
- Solve math problems
- Generate stories
- View progress
- Chat with tutor

### Teacher
- Monitor student progress
- Create/manage assignments
- Chat with students
- View analytics

## 🔒 Authentication

Default test accounts:

**Teacher:**
- Email: tutor@example.com
- Password: tutor123

**Student:**
- Email: student@example.com
- Password: student123

## 🛠 Development

### Available Scripts

**Backend:**
```bash
# Run in development mode
npm run dev

# Run production build
npm run build
npm start

# Run database migrations
npx prisma migrate dev --name migration_name
```

**Frontend:**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 🌐 Deployment

### Backend
1. Set production environment variables
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the server:
   ```bash
   NODE_ENV=production node dist/index.js
   ```

### Frontend
1. Update API endpoints in production config
2. Build the application:
   ```bash
   npm run build
   ```
3. Deploy the `dist` folder to your hosting service

## 📝 License

This project is licensed under the MIT License.
