# Tutor Game — План рефакторинга

Цель: убрать дубли, унифицировать архитектуру, улучшить DX, надёжность и безопасность. План разбит по этапам (S/M/L) и приоритетам. Учитывает текущую модель токенов: access в памяти, refresh в http-only cookie, все запросы с credentials.

## 0. Быстрые победы (S, P0)
- [ ] Обновить README с командами запуска фронта/бэка, переменными окружения и ссылкой на этот план (`README.md`).
- [ ] Включить strict-режимы TypeScript и React где не включены (`frontend/tsconfig.json`, `backend/tsconfig.json`).
- [ ] Единые алиасы импортов: `@app`, `@features`, `@components`, `@backend/*` (Vite, TS, tsconfig-paths для Node). Добавить пример использования.
- [ ] Централизовать цвета/классы в Tailwind: вынести кастомные токены, проверить `index.css`, `tailwind.config.js`.
- [ ] Единые кнопки/инпуты: базовые атомы (`Button`, `Input`, `Select`, `Spinner`) в `frontend/src/components/ui/` и постепенная замена.

## 1. Архитектура фронтенда (P0)
- [ ] Стандартизовать feature-slices в `frontend/src/features/` (auth, student, teacher, goal, lesson, achievements, chat):
  - [ ] `api.ts` (RTK Query endpoints), `types.ts`, `selectors.ts`, `hooks.ts`, `components/`.
  - [ ] Все API перенести в RTK Query, базируясь на `apiSlice` и `axiosBaseQuery` (`frontend/src/app/api/apiSlice.ts`).
  - [ ] Единая обработка ошибок (toasts, i18n-сообщения), автоповтор только для идемпотентных GET.
- [ ] Хуки для шаблонных паттернов:
  - [ ] `useAsync` (статусы загрузки и ошибка с i18n)
  - [ ] `useConfirm` (модалки подтверждения)
  - [ ] `usePagination`, `useDebounce` при необходимости
- [ ] Дизайн-система (атомы/молекулы): `components/ui/` + стили `brand-gradient`, `glass` унифицировать.
- [ ] Навигация: все пути в одном месте `routes.ts` + типобезопасные генераторы URL.
- [ ] Формы: единообразие на `react-hook-form` + `zod` схемы (через `@hookform/resolvers/zod`).
- [ ] Локальные сторы: минимизировать redux-слайсы, максимум — через RTK Query cache/selectors.

## 2. API слой и безопасность (P0)
- [ ] `axiosBaseQuery`:
  - [ ] Всегда `withCredentials: true`, корректная обработка 401/419, триггер refresh-флоу, один полёт (lock) на refresh.
  - [ ] Единый маппинг ошибок бэка -> человеко-читаемых i18n сообщений.
  - [ ] Логирование только в dev, без утечек PII.
- [ ] Перехватчик отмены запросов при уходе со страницы (AbortController).
- [ ] Инварианты из памяти: access-токен хранить в runtime-памяти, чистка при logout/ошибке — проверить в `auth` фиче.

## 3. Бэкенд (P0)
- [ ] Слои: `routes/` (валидирование + привязка), `controllers/` (оркестрация), `services/` (бизнес-логика), `prisma`/`repositories` (доступ к данным). Уже близко — довести до консистентности.
- [ ] DTO + валидация запросов: `zod`/`class-validator` для всех публичных эндпоинтов.
- [ ] Единая ошибка домена: `AppError(code, message, meta)` + error middleware (`backend/src/middlewares/`).
- [ ] Логирование: `winston/pino` с уровнями, корреляционные `requestId` (morgan-подобный http-лог в dev).
- [ ] Авторизация/Аутентификация: middleware для ролей (student/teacher/admin), защита всех `/student/*` и `/teacher/*`.
- [ ] Файлы/загрузки: валидация mime/размера, безопасные пути, S3/локальный storage абстракция.

## 4. База данных и Prisma (P1)
- [ ] Пересмотреть уникальные индексы и частичные индексы (с учётом `prisma/migrations/*` и ручных фиксов). Описать причину в комментариях миграций.
- [ ] Транзакции для критических флоу (создание цели, сабмит урока) — уже начато; покрыть остальные.
- [ ] Сиды dev-данных: скрипт `scripts/seed.ts` с ролями, парой пользователей, учебной целью, уроком, ачивками.
- [ ] Миграции: правила naming, pre/post checks, автоматические проверки в CI.

## 5. i18n (P2)
- [ ] Консистентные ключи: `domain.pageOrFeature.section.key`.
- [ ] Fallback: англ. по умолчанию, проверка отсутствующих ключей в сборке dev.
- [ ] Набор общих сообщений ошибок (`common.errors.*`) и валидации форм.

## 6. Тестирование (P1)
- [ ] Unit (frontend):
  - [ ] Хуки (`useAsync`, `useConfirm`), редьюсеры auth (минимальные), RTK Query selectory.
- [ ] Unit (backend):
  - [ ] Сервисы (голы, уроки, ачивменты), обработка ошибок, гварды ролей.
- [ ] API/Contract tests: supertest для ключевых эндпоинтов (`/student/current-lesson`, `/student/lessons/:id/submit`, goals CRUD, achievements CRUD).
- [ ] e2e smoke (Playwright/Cypress): логин, создание цели, прохождение урока, выдача ачивки.

## 7. Качество кода и DX (P0)
- [ ] ESLint + Prettier baseline для фронта/бэка (консистентные правила, import/order, no-default-export где уместно).
- [ ] Husky + lint-staged: форматирование и `tsc --noEmit` на pre-commit.
- [ ] Абсолютные импорты, alias-resolver для Jest/Vitest.
- [ ] Гайд по коммитам (Conventional Commits) + автоматический `CHANGELOG.md` (standard-version/release-please).

## 8. CI/CD (P1)
- [ ] Workflow: install + build + lint + tests (фронт/бэк отдельно), кэш npm/prisma.
- [ ] Проверка Prisma миграций на чистой БД (sqlite/postgres service).
- [ ] Превью окружение на PR (если возможно) или артефакты сборки фронта.

## 9. Производительность и UX (P2)
- [ ] Code splitting маршрутов, lazy загрузка страниц (`StudentAdventurePage`, `TeacherAchievementsPage`, `CreateGoalPage`).
- [ ] Скелетоны/плейсхолдеры вместо спиннеров, оптимистичные обновления RTK Query.
- [ ] Мемоизация тяжёлых списков (виртуализация, если нужно).

## 10. Безопасность (P0)
- [ ] Проверка CORS/CSRF: same-site cookies, запрет небезопасных методов без CSRF-токена если требуется.
- [ ] Заголовки безопасности (helmet) на бэке, политика контента (CSP) базовая.
- [ ] Санитизация вводов, ограничение размера запроса, rate limiting по сессии/IP.

## 11. Документация (P2)
- [ ] CONTRIBUTING.md: как запускать, lint, тесты, миграции, релизы.
- [ ] ADRs для ключевых решений (хранение токенов, структура фич, валидация бэка).

---

## Дедлайны и приоритеты
- P0 (1–2 недели): разделы 0,1,2,3,7,10
- P1 (2–3 недели): 4,6,8
- P2 (по мере готовности): 5,9,11

## Инвентаризация потенциальных дублей для замены
- [ ] Компоненты кнопок/инпутов: выровнять по `components/ui/*`.
- [ ] Спиннеры: использовать единый `components/common/Spinner` повсеместно.
- [ ] API вызовы: перенести разрозненные `fetch/axios` в RTK Query slices.
- [ ] Локальные переводы: собрать в `locales/*`, убрать литералы в JSX.
- [ ] Обработка ошибок/тосты: централизованный helper + i18n.

## Контрольный чек-лист интеграции
- [ ] Все страницы используют единый шаблон загрузки/ошибок.
- [ ] Нет непроверенных `any`; `strict: true` проходит.
- [ ] Все публичные эндпоинты валидируются и типизированы DTO.
- [ ] Все критические флоу покрыты тестами и проходят в CI.
- [ ] Документация актуальна.
