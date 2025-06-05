# СТАТУС ПРОЕКТА - ГЕЙМИФИЦИРОВАННАЯ ОБРАЗОВАТЕЛЬНАЯ ПЛАТФОРМА

*Создано: 05.01.2025*
*Анализ проведен: Claude Opus 4*

## 🎯 КОНЦЕПЦИЯ ПРОЕКТА

**Цель**: Создать геймифицированную образовательную платформу с индивидуальным AI-обучением
- **Целевая аудитория**: Учителя + ученики (любые предметы, не только математика)
- **Ключевые особенности**: 
  - Интерактивные истории управляемые учеником
  - Boss battles в конце тем  
  - AI-тьютор для персональной помощи
  - Полный контроль учителя над контентом
  - Адаптивная сложность
- **Языки**: Русский (основной) + английский (переключаемый)

## ✅ ЧТО УЖЕ РЕАЛИЗОВАНО

### 🔐 Аутентификация и безопасность
- **JWT токены** с refresh token rotation (15 мин access, 7 дней refresh)
- **Роли**: TEACHER / STUDENT с разделением функций
- **Rate limiting** для защиты от брутфорса
- **bcrypt** для хеширования паролей
- **Token blacklist** для отозванных токенов
- **CORS** настройки для cross-origin запросов

### 👥 Система пользователей
- **Регистрация** с автоматическим созданием профилей
- **User модель** с базовой информацией
- **Teacher/Student профили** (минимальные)
- **Связь Teacher ↔ Student** (опциональная)

### 💬 Чат система (РАБОТАЕТ!)
- **WebSocket** соединения через Socket.IO
- **JWT аутентификация** для сокетов
- **Личные сообщения** между пользователями
- **Статус онлайн/офлайн**
- **Уведомления** о прочтении сообщений
- **UI компонент** полностью готов

### 🤖 AI генерация контента
- **OpenAI API** интеграция (GPT-4)
  - Генерация историй с учетом возраста
  - Создание математических задач
  - Адаптация под уровень ученика
- **Leonardo AI** для изображений
  - Автоматическая генерация картинок для историй
  - Система polling для получения результатов

### 🗄️ База данных (Prisma)
```prisma
✅ User (id, email, password, role, firstName, lastName)
✅ Teacher (userId)  
✅ Student (userId, teacherId?)
✅ Message (content, senderId, receiverId, read, readAt)
✅ Story (chapter, text, prompt, studentId)
✅ GeneratedImage (url, prompt, storyId)
✅ Goal (title, studentId)
✅ RoadmapEntry (topic, order, startAt, finished, studentId)
✅ Badge (title, status, studentId)
✅ BossBattle (lives, timeLimitSec, difficulty, prompt)
✅ TokenBlacklist (token, expiresAt)
```

### 🎮 Базовая геймификация
- **Badge система** (достижения)
- **Goal модель** (цели ученика)
- **RoadmapEntry** (план обучения)
- **BossBattle модель** (готова, но не реализована)

### 🖥️ Frontend компоненты
- **React 18 + TypeScript**
- **Redux Toolkit** + RTK Query для API
- **Tailwind CSS** для стилей
- **React Router** с защищенными роутами
- **Готовые страницы**:
  - ✅ LoginPage, RegisterPage
  - ✅ StudentDashboard, TeacherDashboard  
  - ✅ Chat (полностью работает)
  - ⚠️ StoryGenerator (UI готов, не подключен)
  - ⚠️ MathProblemSolver (UI готов, mock данные)

## 🚨 КРИТИЧЕСКИЕ БАГИ (НУЖНО ИСПРАВИТЬ!)

### Backend проблемы:

1. **auth.middleware.ts:25** - Async функция без await
```typescript
// ❌ НЕПРАВИЛЬНО:
const decoded = verifyToken(token);
// ✅ ПРАВИЛЬНО:
const decoded = await verifyToken(token);
```

2. **leonardo.service.ts:15** - Нет обработки отсутствующего API ключа
```typescript
// ❌ Может упасть если нет LEONARDO_API_KEY
headers: { 'Authorization': `Bearer ${config.leonardo.apiKey}` }
```

3. **websocket.service.ts:45** - Небезопасное приведение типов
```typescript
// ❌ Нет проверки типов
const decoded = authVerifyToken(token) as { userId: string; role: 'STUDENT' | 'TEACHER' } | null;
```

4. **Дублирование миграций** - Есть две папки migrations с разными версиями

### Frontend проблемы:

5. **StoryGenerator.tsx** - Компонент не подключен к API
6. **MathProblemSolver.tsx** - Использует mock данные вместо реального API
7. **Нет error boundaries** для обработки React ошибок
8. **Отсутствуют loading состояния** в большинстве компонентов

## 🔧 ЧТО НУЖНО СДЕЛАТЬ ДАЛЬШЕ

### 🚨 ПРИОРИТЕТ 1: Исправить баги (1-2 дня)
- [ ] Исправить async/await в auth.middleware.ts
- [ ] Добавить проверки в leonardo.service.ts
- [ ] Улучшить типизацию WebSocket
- [ ] Почистить дублирующиеся миграции
- [ ] Подключить StoryGenerator к API
- [ ] Исправить MathProblemSolver

### 🌍 ПРИОРИТЕТ 2: Интернационализация (2-3 дня)
- [ ] Установить react-i18next
- [ ] Создать файлы переводов /locales/ru.json, /locales/en.json
- [ ] Добавить переключатель языка в Layout
- [ ] Обновить все UI тексты
- [ ] Добавить поля nameEn, titleEn в БД

### 📚 ПРИОРИТЕТ 3: Система курсов (1-2 недели)
- [ ] Расширить базу данных (Subject, Course, Topic, Section, Lesson)
- [ ] Создать конструктор курсов для учителей
- [ ] Реализовать систему уроков из блоков
- [ ] AI помощник для создания контента

### 🎮 ПРИОРИТЕТ 4: Полная геймификация (2-3 недели)
- [ ] Система опыта и уровней
- [ ] Интерактивные истории с выборами
- [ ] Boss battles функционал
- [ ] Инвентарь и предметы
- [ ] Адаптивная сложность

## 📁 СТРУКТУРА КОДА - ГДЕ ЧТО МЕНЯТЬ

### Backend (/tutor-game/backend/src/)
```
controllers/          # Обработчики HTTP запросов
├── auth.controller.ts      # ✅ Готов
├── student.controller.ts   # ⚠️ Базовый функционал
├── teacher.controller.ts   # ⚠️ Базовый функционал  
└── generate.controller.ts  # ✅ Работает

services/             # Бизнес-логика
├── auth.service.ts         # ✅ Готов
├── openai.service.ts       # ✅ Работает
├── leonardo.service.ts     # 🚨 Нужны исправления
└── websocket.service.ts    # 🚨 Нужны исправления

routes/               # API маршруты
├── auth.routes.ts          # ✅ Готов
├── student.routes.ts       # ⚠️ Базовые роуты
├── teacher.routes.ts       # ⚠️ Базовые роуты
└── generate.routes.ts      # ✅ Работает

middlewares/          # Middleware
├── auth.middleware.ts      # 🚨 БАГИ! Исправить async/await
└── error.middleware.ts     # ✅ Базовый

prisma/
└── schema.prisma          # ⚠️ Нужно расширять для новых фич
```

### Frontend (/tutor-game/frontend/src/)
```
features/             # Redux слайсы и API
├── auth/                   # ✅ Полностью готов
│   ├── authSlice.ts
│   └── authApi.ts
└── chat/                   # ✅ Работает!
    └── Chat.tsx

pages/                # Страницы приложения
├── LoginPage.tsx           # ✅ Готов
├── RegisterPage.tsx        # ✅ Готов
├── student/
│   ├── StudentDashboard.tsx    # ✅ Базовый UI
│   ├── StoryGenerator.tsx      # 🚨 НЕ ПОДКЛЮЧЕН к API
│   └── MathProblemSolver.tsx   # 🚨 MOCK данные
└── teacher/
    ├── TeacherDashboard.tsx    # ✅ Базовый UI
    └── StudentProgress.tsx     # ⚠️ Базовый

components/common/    # Переиспользуемые компоненты
└── Layout.tsx             # ✅ Готов, нужно добавить переключатель языка

api/
└── client.ts              # ✅ Axios клиент готов
```

## 🚀 QUICK WINS (можно сделать за неделю)

### День 1-2: Исправление багов
1. **Исправить auth.middleware.ts** - добавить await к verifyToken
2. **Исправить leonardo.service.ts** - проверка API ключа
3. **Подключить StoryGenerator** к существующему API
4. **Исправить MathProblemSolver** - использовать реальный API

### День 3-4: Интернационализация
1. **Установить i18next** и настроить
2. **Создать переводы** для всех текстов
3. **Добавить переключатель языка** в Layout
4. **Тестирование** переключения языков

### День 5-7: Улучшение UX
1. **Добавить loading спиннеры** во все компоненты
2. **Error boundaries** для обработки ошибок
3. **Улучшить UI** дашбордов
4. **Мобильная адаптивность** основных страниц

## 💡 СОВЕТЫ ДЛЯ НОВЫХ ЧАТОВ

### Если нужно исправить баги:
1. Начни с auth.middleware.ts:25 - добавь await
2. Проверь leonardo.service.ts - обработка ошибок API
3. Посмотри websocket.service.ts - типизация

### Если нужно добавить фичи:
1. **Для API**: добавь в controllers/ и routes/
2. **Для БД**: обнови schema.prisma и создай миграцию  
3. **Для UI**: создай в pages/ или features/
4. **Для Redux**: добавь слайс в features/

### Команды для запуска:
```bash
# Установка зависимостей
npm run install:all

# Запуск development
npm run backend:dev    # :3002
npm run frontend:dev   # :3003

# База данных
cd backend && npm run prisma:migrate
cd backend && npm run prisma:studio
```

### Структура файлов конфигурации:
- **Backend .env**: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, LEONARDO_API_KEY
- **Prisma**: tutor-game/backend/prisma/schema.prisma
- **Frontend**: Vite настроен, proxy на :3002 для API

## 🎯 СЛЕДУЮЩИЕ ШАГИ

**Для MVP (2-4 недели)**:
1. Исправить все баги (приоритет 1)
2. Добавить интернационализацию 
3. Расширить систему курсов
4. Улучшить геймификацию

**Для полной версии (3-6 месяцев)**:
- Мобильное приложение
- Детальная аналитика
- Социальные функции  
- Система подписок

---

**Статус на 05.01.2025**: Есть рабочий MVP с чатом и генерацией контента. Критические баги мешают развитию. После исправления багов можно быстро добавлять новые фичи.

**Оценка сложности**: 📊 Средняя (есть хорошая база, но нужна доработка архитектуры для полной геймификации)