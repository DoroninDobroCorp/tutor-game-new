package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"log"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"tutor-game/internal/models"
)

type AIService struct {
	client *genai.Client
	ctx    context.Context
}

// Инициализация клиента AI
func NewAIService(apiKey string) (*AIService, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("error creating AI client: %v", err)
	}

	return &AIService{
		client: client,
		ctx:    ctx,
	}, nil
}

// Возвращает модель по имени
func (s *AIService) GetModel(name string) *genai.GenerativeModel {
	return s.client.GenerativeModel(name)
}

// Получение контекста (можно использовать для отмены запросов)
func (s *AIService) GetContext() context.Context {
	return s.ctx
}

// Извлекает текст из ответа (Candidate)
func (s *AIService) getResponseText(candidate *genai.Candidate) (string, error) {
    if candidate.Content == nil {
        return "", errors.New("empty content in AI response")
    }
    
    if len(candidate.Content.Parts) == 0 {
        return "", errors.New("no parts in AI response content")
    }
    
    text, ok := candidate.Content.Parts[0].(genai.Text)
    if !ok {
        return "", errors.New("first part is not text")
    }

    rawText := string(text)
    log.Printf("Raw text from AI: %s", rawText)

    // Очищаем текст от бэктиков и маркеров json
    cleanText := strings.ReplaceAll(rawText, "```json", "")
    cleanText = strings.ReplaceAll(cleanText, "```", "")
    cleanText = strings.TrimSpace(cleanText)
    
    // Если текст начинается с [ и заканчивается на ], значит это JSON
    if strings.HasPrefix(cleanText, "[") && strings.HasSuffix(cleanText, "]") {
        return cleanText, nil
    }
    
    // Иначе возвращаем обычный текст
    return cleanText, nil
}

// Генерация обратной связи на решение ученика
func (s *AIService) GenerateDecisionFeedback(decision models.StudentDecision) (string, error) {
	prompt := fmt.Sprintf(`Проанализируй решение ученика и дай конструктивную обратную связь.
    
Решение ученика: %s

Дай краткую обратную связь (2-3 предложения), которая:
1. Отметит сильные стороны решения
2. Предложит возможные улучшения
3. Будет мотивировать к дальнейшему обучению

Ответ должен быть на русском языке.`, decision.Decision)

	model := s.GetModel("gemini-pro")
	resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("error generating feedback: %v", err)
	}
	if len(resp.Candidates) == 0 {
		return "", fmt.Errorf("empty response from AI")
	}

	return s.getResponseText(resp.Candidates[0])
}

// Генерация обучающей истории по теме
func (s *AIService) GenerateStory(topic string) (*models.Story, error) {
	prompt := fmt.Sprintf(`Создай увлекательную обучающую историю для школьника по теме "%s".

Требования к истории:
1. Начни с реальной жизненной ситуации, связанной с темой
2. Опиши проблему или задачу, которую нужно решить
3. Включи образовательные элементы, связанные с темой
4. Заверши историю открытым вопросом, который заставит ученика подумать
5. История должна быть написана простым языком, понятным школьнику
6. Длина: 150-200 слов

Пример структуры:
- Начало: знакомая ситуация из жизни
- Середина: возникает проблема, связанная с темой урока
- Конец: открытый вопрос "Как бы ты поступил в этой ситуации?"

Тема: %s`, topic, topic)

	model := s.GetModel("gemini-pro")
	resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("error generating story: %v", err)
	}
	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("empty response from AI")
	}

	text, err := s.getResponseText(resp.Candidates[0])
	if err != nil {
		return nil, fmt.Errorf("error getting story text: %v", err)
	}

	story := &models.Story{
		Text: text,
	}

	return story, nil
}

// Генерация упражнений по теме
func (s *AIService) GenerateExercises(topic string, count int) ([]*models.Exercise, error) {
	type rawExercise struct {
		Question          string   `json:"question"`
		Options          []string `json:"options"`
		CorrectAnswerIndex int    `json:"correctAnswerIndex"`
		Explanation     string   `json:"explanation"`
	}

	prompt := fmt.Sprintf(`Создай %d упражнений для темы "%s".

Требования:
1. Каждое упражнение должно иметь четкий вопрос
2. Каждое упражнение должно иметь 4 варианта ответа
3. Один из вариантов должен быть правильным
4. Каждое упражнение должно иметь объяснение, почему этот ответ правильный
5. Все должно быть на русском языке

Верни ответ в следующем формате:
[
  {
    "question": "текст вопроса",
    "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
    "correctAnswerIndex": 0,
    "explanation": "объяснение, почему это правильный ответ"
  }
]

Важно:
1. Используй точно такой формат JSON как показано выше
2. Используй двойные кавычки для строк
3. correctAnswerIndex должен быть числом от 0 до 3`, count, topic)

	log.Printf("Sending prompt to AI: %s", prompt)

	model := s.GetModel("gemini-pro")
	resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("error generating exercises: %v", err)
	}
	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("empty response from AI")
	}

	text, err := s.getResponseText(resp.Candidates[0])
	if err != nil {
		return nil, fmt.Errorf("error getting exercises text: %v", err)
	}

	log.Printf("Raw AI response: %s", text)

	// Сначала парсим в промежуточную структуру
	var rawExercises []rawExercise
	if err := json.Unmarshal([]byte(text), &rawExercises); err != nil {
		return nil, fmt.Errorf("error parsing exercises: %v (text: %s)", err, text)
	}

	// Конвертируем в финальную структуру
	exercises := make([]*models.Exercise, len(rawExercises))
	for i, raw := range rawExercises {
		if raw.CorrectAnswerIndex < 0 || raw.CorrectAnswerIndex >= len(raw.Options) {
			return nil, fmt.Errorf("invalid correctAnswerIndex for exercise %d", i+1)
		}

		exercises[i] = &models.Exercise{
			ID:                fmt.Sprintf("exercise_%d", i+1),
			Question:         raw.Question,
			Options:          raw.Options,
			CorrectAnswerIndex: raw.CorrectAnswerIndex,
			Answer:           raw.Options[raw.CorrectAnswerIndex],
			Explanation:     raw.Explanation,
		}
	}

	return exercises, nil
}

// Генерация объяснения для ответа ученика
func (s *AIService) GenerateAnswerExplanation(exercise *models.Exercise, userAnswer string, isCorrect bool) (string, error) {
    explanation := "почему его ответ неверный и какой ответ правильный"
    if isCorrect {
        explanation = "почему его ответ верный"
    }

    prompt := fmt.Sprintf(`Вопрос: %s
Правильный ответ: %s
Ответ ученика: %s

Объясни ученику, %s. Объяснение должно быть понятным и мотивирующим.`,
        exercise.Question,
        exercise.Answer,
        userAnswer,
        explanation)

    model := s.GetModel("gemini-pro")
    resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
    if err != nil {
        return "", fmt.Errorf("ошибка при генерации объяснения: %v", err)
    }

    if len(resp.Candidates) == 0 {
        return "", errors.New("не удалось сгенерировать объяснение")
    }

    text, err := s.getResponseText(resp.Candidates[0])
    if err != nil {
        return "", fmt.Errorf("ошибка при получении текста ответа: %v", err)
    }
    return text, nil
}

// Генерация продолжения истории на основе решения ученика
func (s *AIService) GenerateStoryContinuation(prevTopic *models.Topic, decision string, nextTopic *models.Topic) (string, error) {
    prompt := fmt.Sprintf(`Создай продолжение обучающей истории, учитывая предыдущую историю, решение ученика и тему следующего урока.

Предыдущая история:
%s

Решение ученика:
%s

Следующая тема:
%s

Требования к продолжению истории:
1. Начни с реакции на решение ученика, покажи последствия его выбора
2. Свяжи историю с новой темой урока (%s)
3. Заверши историю открытым вопросом по новой теме
4. История должна быть написана простым языком
5. Длина: 150-200 слов

Пример структуры:
- Начало: последствия решения ученика
- Середина: связь с новой темой
- Конец: новый открытый вопрос

История должна быть увлекательной и мотивировать ученика продолжать обучение.`, 
        prevTopic.Story,
        decision,
        nextTopic.Name,
        nextTopic.Name)

    model := s.GetModel("gemini-pro")
    resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
    if err != nil {
        return "", fmt.Errorf("error generating story continuation: %v", err)
    }
    if len(resp.Candidates) == 0 {
        return "", fmt.Errorf("empty response from AI")
    }

    text, err := s.getResponseText(resp.Candidates[0])
    if err != nil {
        return "", fmt.Errorf("error getting story continuation text: %v", err)
    }

    return text, nil
}

// Закрываем соединение с клиентом
func (s *AIService) Close() {
	s.client.Close()
}
