# Tutor Game

Интерактивное образовательное приложение, которое помогает учителям создавать увлекательные учебные планы с элементами геймификации, а ученикам - изучать материал через интересные истории и упражнения.

## Особенности

- Геймификация обучения через интерактивные истории
- AI-генерация контента с помощью Google Gemini
- Инструменты для учителей по созданию и управлению планами обучения
- Адаптивное обучение с учетом решений ученика
- Мгновенная обратная связь по ответам

## Технологии

### Frontend
- React
- Chakra UI
- Axios
- Vite

### Backend
- Go
- Gin Web Framework
- Google Gemini AI

## Установка

### Требования
- Node.js 16+
- Go 1.20+
- Google API Key для Gemini

### Backend

```bash
cd backend
go mod download
cp .env.example .env  # Добавьте свой Google API Key
go run main.go
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Использование

1. Учитель создает план обучения
2. AI генерирует упражнения и историю для каждой темы
3. Учитель проверяет и утверждает контент
4. Ученики проходят темы, принимая решения и выполняя упражнения
5. История развивается на основе решений ученика

## Структура проекта

```
.
├── backend/
│   ├── internal/
│   │   ├── api/      # HTTP handlers
│   │   ├── models/   # Data models
│   │   ├── services/ # Business logic
│   │   └── storage/  # Data storage
│   └── main.go
└── frontend/
    ├── src/
    │   ├── api/      # API clients
    │   ├── components/
    │   └── pages/
    └── index.html
