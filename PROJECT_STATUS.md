# СТАТУС ПРОЕКТА - ГЕЙМИФИЦИРОВАННАЯ ОБРАЗОВАТЕЛЬНАЯ ПЛАТФОРМА (КОНЦЕПЦИЯ 2.0)

Анализ проведен на основе актуального кода и нового стратегического видения.

🎯 **КОНЦЕПЦИЯ ПРОЕКТА (REVISED)**

**Цель:** Создать адаптивную образовательную платформу, где обучение происходит через уникальную, интерактивную историю, соавтором которой является сам ученик. Весь учебный процесс и контент находятся под полным контролем и модерацией учителя.

**Ключевые принципы:**
1.  **Учитель — режиссер:** Учитель задает глобальную цель обучения, сеттинг и утверждает весь контент (уроки, задачи, сюжетные повороты), обеспечивая педагогическую ценность и безопасность.
2.  **Ученик — главный герой:** Ученик своими действиями и решениями направляет развитие сюжета, что создает максимальную вовлеченность.
3.  **Адаптивность на основе данных:** Система анализирует успехи и ошибки ученика, предлагая учителю персонализированные задачи и подсвечивая сложные темы.
4.  **Модульность:** Платформа не привязана к математике и позволяет создавать учебные планы по любым предметам.

✅ **ЧТО УЖЕ РЕАЛИЗОВАНО (ФУНДАМЕНТ)**

Проект имеет прочную техническую базу, готовую для реализации новой концепции.
-   **Технологический стек:** Full-stack TypeScript (React/Node.js), PostgreSQL с Prisma, WebSocket для real-time.
-   **Аутентификация:** Надежная система на JWT с разделением ролей (TEACHER/STUDENT).
-   **Интеграция с AI:** Налажена работа с OpenAI (текст) и Leonardo AI (изображения).
-   **Базовые компоненты:** Настроен роутинг, Redux для управления состоянием, рабочий чат.

---

🔧 **ПОРЯДОК ДАЛЬНЕЙШЕЙ РАБОТЫ (ПРИОРИТИЗИРОВАНО)**

План выстроен по этапам, от создания фундамента для новой концепции до полной реализации.

---

### 👑 ЭТАП 1: ФУНДАМЕНТ — УПРАВЛЕНИЕ УЧЕБНЫМИ ПЛАНАМИ

**Цель: Дать учителю инструменты для создания структурированного и персонализированного учебного плана (Roadmap).**

*   **ЗАДАЧА 1.1 (Backend):** Расширить схему БД. Ввести сущности `LearningGoal` (цель), `ContentSection` (раздел) и `Lesson` (урок). Определить их иерархию и связи с пользователями.
*   **ЗАДАЧА 1.2 (Backend):** Реализовать API для взаимодействия с учебными планами:
    *   Создание `LearningGoal` для ученика с указанием предмета, сеттинга и возраста.
    *   Эндпоинт, который по запросу генерирует с помощью ИИ черновик учебного плана (разделы и уроки).
    *   Эндпоинт для сохранения финального, утвержденного учителем, плана.
*   **ЗАДАЧА 1.3 (Frontend):** Создать UI для учителя:
    *   Мастер создания новой `LearningGoal`.
    *   Интерактивный "Конструктор Roadmap", где учитель может редактировать предложенный ИИ план (drag-and-drop, переименование, удаление) и утверждать его.

---

### 🚀 ЭТАП 2: ЯДРО — ПУТЕШЕСТВИЕ СТУДЕНТА И МОДЕРАЦИЯ

**Цель: Реализовать основной учебный цикл, где студент проходит уроки, а учитель одобряет контент.**

*   **ЗАДАЧА 2.1 (Backend):** Реализовать API для генерации контента с системой модерации. Сгенерированные ИИ задачи и фрагменты истории должны сохраняться со статусом `PENDING_APPROVAL`. Нужен эндпоинт для их утверждения учителем.
*   **ЗАДАЧА 2.2 (Backend):** Создать API для студента (получение текущего урока, отправка ответа). Внедрить систему логирования успеваемости (`StudentPerformanceLog`).
*   **ЗАДАЧА 2.3 (Frontend):** Создать UI для модерации контента. Учитель должен иметь возможность просмотреть, отредактировать и одобрить сгенерированный контент перед тем, как его увидит ученик.
*   **ЗАДАЧА 2.4 (Frontend):** Разработать основной экран студента (`AdventureView.tsx`). Он должен отображать текущий урок, а после выполнения нескольких — показывать одобренный фрагмент истории и принимать ответ студента для развития сюжета.

---

### 🧠 ЭТАП 3: АДАПТИВНОСТЬ И ГЕЙМИФИКАЦИЯ

**Цель: Сделать обучение по-настоящему персонализированным и добавить ключевые игровые механики.**

*   **ЗАДАЧА 3.1 (Backend):** Усовершенствовать логику генерации задач. Система должна анализировать `StudentPerformanceLog` и генерировать задачи с акцентом на слабых местах студента.
*   **ЗАДАЧА 3.2 (Backend):** Реализовать механику "Битвы с боссом". В конце каждого раздела система должна генерировать сложную задачу на основе самых проблемных тем из этого раздела.
*   **ЗАДАЧА 3.3 (Backend):** Внедрить "AI-наблюдателя" — фоновый процесс, который анализирует ошибки и формирует для учителя текстовые саммари о стиле обучения и сложностях студента.
*   **ЗАДАЧА 3.4 (Frontend):** Создать UI для "Битвы с боссом". Разработать интерфейс для учителя для просмотра отчетов от "AI-наблюдателя".

---

### ✨ ЭТАП 4: ПОЛИРОВКА И ЗАВЕРШЕНИЕ MVP

**Цель: Добавить финальные штрихи, которые повышают вовлеченность и удобство использования.**

*   **ЗАДАЧА 4.1 (Backend):** Реализовать эндпоинт для генерации изображений для бейджей с помощью Leonardo AI по текстовому описанию от учителя.
*   **ЗАДАЧА 4.2 (Frontend):** Создать страницу "Моя история", где студент может прочитать все свое приключение в формате хроники.
*   **ЗАДАЧА 4.3 (Frontend):** Реализовать страницу "Достижения" для отображения бейджей.
*   **ЗАДАЧА 4.4 (Frontend):** Расширить UI назначения бейджей, добавив опцию генерации изображения.




ГЕНЕРАЛЬНЫЙ ПЛАН — ЭТАП 2: ИНТЕРАКТИВНОЕ ПРИКЛЮЧЕНИЕ
Блок A: Фундамент Данных и API Персонажа
(Что мы делаем в этом блоке: Обновляем базу данных, чтобы она могла хранить персонажа и главы истории. Создаем API для генерации этого персонажа.)

A.1. Обновление схемы schema.prisma:

Задача: Добавить поля для персонажа и новую модель для глав истории.

Действие: Открой tutor-game/backend/prisma/schema.prisma и внеси следующие изменения:

В модель LearningGoal добавь:

Generated prisma
characterImageId String? // ID картинки ИЗ генерации для ControlNet
characterGenId   String? // ID самой ГЕНЕРАЦИИ для проверки статуса
characterPrompt  String?
storyChapters    StoryChapter[]
Use code with caution.
Prisma
В модель Lesson добавь связь:

Generated prisma
storyChapter StoryChapter?
Use code with caution.
Prisma
В конец файла добавь новую модель StoryChapter:

Generated prisma
model StoryChapter {
  id                     String       @id @default(uuid())
  learningGoalId         String
  learningGoal           LearningGoal @relation(fields: [learningGoalId], references: [id], onDelete: Cascade)
  
  lessonId               String       @unique
  lesson                 Lesson       @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  teacherSnippetText     String
  teacherSnippetImageUrl String?
  teacherSnippetStatus   LessonStatus @default(DRAFT)
  
  studentResponseText    String?
  
  createdAt              DateTime     @default(now())
  
  @@map("story_chapters")
}
Use code with caution.
Prisma
A.2. Миграция Базы Данных:

Задача: Применить новую структуру к базе данных.

Действие: В терминале, в папке tutor-game/backend, выполни:

Generated bash
npx prisma migrate dev --name story_and_character_models
npx prisma generate
Use code with caution.
Bash
A.3. Улучшение Сервиса Leonardo:

Задача: Научить наш Node.js сервис работать с ControlNet для консистентности персонажа.

Действие: Замени содержимое tutor-game/backend/src/services/leonardo.service.ts на это:

Generated typescript
import axios from 'axios';
import { config } from '../config/env';

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  modelId?: string;
  // Для ControlNet
  characterImageId?: string | null; 
}

interface GenerationResult {
    generationId: string;
    imageId: string | null;
    url: string | null;
}

// Функция ожидания
async function pollForResult(generationId: string): Promise<GenerationResult> {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем 3 секунды
        const response = await axios.get(`${LEONARDO_API_URL}/generations/${generationId}`, {
            headers: { 'Authorization': `Bearer ${config.leonardoApiKey}` }
        });

        const data = response.data?.generations_by_pk;
        if (data?.status === 'COMPLETE') {
            const image = data.generated_images[0];
            return { generationId, imageId: image.id, url: image.url };
        }
        if (data?.status === 'FAILED') {
            throw new Error(`Leonardo generation ${generationId} failed.`);
        }
    }
}

export async function generateImage(params: GenerateImageParams): Promise<GenerationResult> {
    if (!config.leonardoApiKey) throw new Error('Leonardo API key is not configured');

    const payload: any = {
        height: params.height || 512,
        width: params.width || 512,
        prompt: params.prompt,
        modelId: params.modelId || config.leonardoModelId,
        num_images: 1,
        alchemy: true, // Включаем Alchemy для лучшего качества
    };

    if (params.characterImageId) {
        payload.controlnets = [{
            initImageId: params.characterImageId,
            initImageType: "GENERATED",
            preprocessorId: 133, // Character Reference
            strengthType: "Mid"
        }];
    }

    const generationResponse = await axios.post(`${LEONARDO_API_URL}/generations`, payload, {
        headers: { 'Authorization': `Bearer ${config.leonardoApiKey}` }
    });

    const generationId = generationResponse.data?.sdGenerationJob?.generationId;
    if (!generationId) throw new Error('Failed to start Leonardo generation job.');
    
    return pollForResult(generationId);
}
Use code with caution.
TypeScript
A.4. Создание API для Персонажа:

Задача: Написать эндпоинт, который принимает промпт и генерирует персонажа.

Действие:

Добавь роут в tutor-game/backend/src/routes/goal.routes.ts: router.post('/:goalId/character', createCharacterHandler);

Добавь сам контроллер в tutor-game/backend/src/controllers/goal.controller.ts:

Generated typescript
import { generateImage } from '../services/leonardo.service'; // Убедись, что импорт есть

export const createCharacterHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { prompt } = req.body;
    // ... (остальной код из предыдущей инструкции)
    const image = await generateImage({
        prompt: `cartoon-style full-body portrait of ${prompt}, dynamic pose...`,
        // ...
    });

    const updatedGoal = await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
            characterImageId: image.imageId, // Сохраняем ID картинки
            characterGenId: image.generationId, // Сохраняем ID генерации
            characterPrompt: prompt,
        }
    });
    res.json({ success: true, data: updatedGoal });
    // ...
};
Use code with caution.
TypeScript
A.5. Интеграция на Фронтенде:

Задача: Добавить UI для создания персонажа на RoadmapEditorPage.tsx.

Действие: Внеси изменения в teacherApi.ts и RoadmapEditorPage.tsx, как я описывал в предыдущем ответе. Главное, чтобы img src теперь использовал characterGenId для построения URL.

--- КОНЕЦ БЛОКА A ---
После этого блока у тебя должна работать генерация и отображение персонажа для каждого учебного плана. Можно остановиться и проверить.

Блок B: Генерация и Модерация Контента Урока
(Что мы делаем: Создаем API и UI для генерации сюжета и картинки к уроку, а также для их утверждения учителем.)

B.1. API для Контента Истории:

Задача: Создать два эндпоинта: один для генерации текста и картинки, второй для утверждения.

Действие:

В goal.routes.ts добавь: router.post('/lessons/:lessonId/story', generateStorySnippetHandler); и router.put('/lessons/:lessonId/story/approve', approveStorySnippetHandler);

В goal.controller.ts добавь два новых хендлера:

generateStorySnippetHandler: Принимает lessonId. Находит LearningGoal, берет сеттинг, возраст, промпт урока и characterImageId. Генерирует текст истории через OpenAI. Затем вызывает generateImage из leonardo.service.ts, передавая ему текст и characterImageId для ControlNet. Создает или обновляет запись в StoryChapter с текстом, URL картинки и статусом PENDING_APPROVAL.

approveStorySnippetHandler: Принимает lessonId. Находит StoryChapter и меняет его статус на APPROVED.

B.2. UI для Модерации Истории:

Задача: В LessonEditorModal добавить вторую вкладку "История".

Действие:

В LessonEditorModal.tsx добавь систему вкладок.

На вкладке "История" размести:

Поле для просмотра/редактирования текста истории (textarea).

Область для отображения сгенерированной картинки.

Кнопки "Сгенерировать/Перегенерировать" и "Утвердить историю".

--- КОНЕЦ БЛОКА B ---
Теперь учитель может для каждого урока сгенерировать уникальный сюжетный поворот с картинкой, где будет присутствовать созданный ранее персонаж.

Блок C: Игровой Цикл для Студента
(Что мы делаем: Создаем страницу прохождения урока, API для получения текущего урока и API для отправки ответов.)

C.1. API для Студента:

Задача: Написать логику, которая выдает студенту текущий урок и принимает его ответы.

Действие:

GET /api/student/current-lesson: Ищет первый урок в текущем LearningGoal, у которого статус задач APPROVED и статус StoryChapter тоже APPROVED, и который еще не COMPLETED. Возвращает его вместе с content и storyChapter.

POST /api/lessons/:lessonId/submit: Принимает problemAnswers и storyContinuation. Проверяет ответы, пишет их в StudentPerformanceLog. Обновляет StoryChapter, добавляя studentResponseText. Меняет статус урока на COMPLETED.

C.2. UI для Студента (StudentLessonView.tsx):

Задача: Создать страницу, где происходит основной геймплей.

Действие:

Создать новый роут /student/play и компонент StudentLessonView.tsx.

Компонент при загрузке вызывает GET /api/student/current-lesson.

Отображает блоки с задачами.

После решения всех задач, показывает блок с историей, картинкой и полем ввода для ответа "Что ты делаешь дальше?".

По нажатию "Отправить" вызывает POST /api/lessons/:lessonId/submit.

--- КОНЕЦ БЛОКА C ---
На этом этапе у нас готов полный игровой цикл. Ученик может проходить уроки и влиять на историю.

Блок D: Адаптация и Хроника
(Что мы делаем: Реализуем передачу истории ответов в ИИ и создаем страницу "Моя Хроника".)

D.1. Улучшение Генерации Задач:

Задача: Модифицировать существующий API генерации задач, чтобы он учитывал прошлые ответы.

Действие: В контроллере generateLessonContentHandler перед вызовом OpenAI:

Найти текущий LearningGoal.

Найти последние 3-5 уроков (Lesson) в этом плане, которые COMPLETED.

Собрать все записи из StudentPerformanceLog для этих уроков.

Сформировать текстовый контекст: История последних ответов: Урок "Дроби" - задача 1 (ответ '5/10', неправильно), задача 2 (ответ '1/2', правильно). Урок "Проценты" - ...

Добавить этот контекст в системный промпт для OpenAI.

D.2. API для Хроники:

Задача: Создать эндпоинт, который вернет всю историю в правильном порядке.

Действие:

Добавить роут GET /api/goals/:goalId/chronicle.

В контроллере getChronicleHandler найти все StoryChapter для данного goalId, отсортировать по createdAt.

Вернуть массив { teacherText, imageUrl, studentResponse }.

D.3. UI для Хроники:

Задача: Создать страницу, где студент может почитать свою историю.

Действие:

Создать роут /student/chronicle и компонент ChroniclePage.tsx.

Компонент запрашивает данные с нового эндпоинта и красиво их отрисовывает, чередуя блоки.

--- КОНЕЦ БЛОКА D ---
Поздравляю! Весь второй этап реализован. Приложение стало по-настоящему интерактивным и персонализированным.