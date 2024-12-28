package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/google/generative-ai-go/genai"

	"tutor-game/internal/models"
	"tutor-game/internal/services"
	"tutor-game/internal/storage"
)

type Handlers struct {
	storage   *storage.Storage
	ai        *services.AIService
}

func NewHandlers(storage *storage.Storage, ai *services.AIService) *Handlers {
	return &Handlers{
		storage: storage,
		ai:      ai,
	}
}

func (h *Handlers) RegisterRoutes(r *gin.Engine) {
	// API routes
	api := r.Group("/api")
	{
		// Маршруты для учителя
		teacher := api.Group("/teacher")
		{
			teacher.POST("/plan", h.CreatePlan)
			teacher.GET("/plan/:planId", h.GetPlan)
			teacher.DELETE("/plan/:planId", h.DeletePlan)
			teacher.POST("/plan/:planId/approve", h.ApprovePlan)
			teacher.GET("/plans/approved", h.GetApprovedPlans)

			teacher.POST("/plan/:planId/topics/custom", h.AddCustomTopic)
			teacher.DELETE("/plan/:planId/topic/:topicId", h.DeleteTopic)
			teacher.POST("/plan/:planId/topics/reorder", h.ReorderTopics)
			teacher.POST("/plan/:planId/topic/:topicId/approve", h.ApproveTopic)

			teacher.POST("/plan/:planId/topic/:topicId/exercise", h.AddExercise)
			teacher.PUT("/plan/:planId/topic/:topicId/exercise/:exerciseId", h.UpdateExercise)
			teacher.DELETE("/plan/:planId/topic/:topicId/exercise/:exerciseId", h.DeleteExercise)
			teacher.POST("/plan/:planId/topic/:topicId/exercises/generate", h.GenerateExercises)

			teacher.POST("/plan/:planId/topic/:topicId/story", h.GenerateStory)
		}

		// Маршруты для ученика
		student := api.Group("/student")
		{
			student.GET("/plan/:planId", h.GetPlan)
			student.GET("/plan/:planId/progress", h.GetStudentProgress)
			student.GET("/plan/:planId/decisions", h.GetStudentDecisions)
			student.POST("/plan/:planId/topic/:topicId/decision", h.SaveStudentDecision)
			student.POST("/plan/:planId/topic/:topicId/exercise/:exerciseId/check", h.CheckAnswer)
		}
	}
}

func (h *Handlers) ApproveTopic(c *gin.Context) {
	planId := c.Param("planId")
	topicId := c.Param("topicId")

	// Получаем план
	plan, err := h.storage.GetPlan(planId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	// Находим тему
	var topic *models.Topic
	for i := range plan.Topics {
		if plan.Topics[i].ID == topicId {
			topic = &plan.Topics[i]
			break
		}
	}

	if topic == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Тема не найдена"})
		return
	}

	// Проверяем, есть ли упражнения
	if len(topic.Exercises) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя утвердить тему без упражнений"})
		return
	}

	// Обновляем статус темы
	topic.Status = "approved"

	// Сохраняем изменения
	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить изменения"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *Handlers) GetApprovedPlans(c *gin.Context) {
	plans := h.storage.GetApprovedPlans()
	c.JSON(http.StatusOK, plans)
}

func (h *Handlers) GetPlan(c *gin.Context) {
	planID := c.Param("planId")
	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}
	c.JSON(http.StatusOK, plan)
}

func (h *Handlers) CreatePlan(c *gin.Context) {
	var plan models.LearningPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	prompt := fmt.Sprintf(`Создай список из 5-7 тем для изучения предмета "%s" с описанием "%s".
	Темы должны быть логически связаны и постепенно усложняться.
	Для каждой темы укажи её название и краткое описание.
	Верни ответ в формате JSON-массива объектов с полями "name" и "description" (без дополнительного текста до или после JSON).`, plan.Subject, plan.Description)

	log.Printf("Sending prompt to AI: %s", prompt)

	model := h.ai.GetModel("gemini-pro")
	resp, err := model.GenerateContent(h.ai.GetContext(), genai.Text(prompt))
	if err != nil {
		log.Printf("Error generating content: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Ошибка генерации тем: %v", err)})
		return
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		log.Printf("Empty response from AI")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Пустой ответ от AI"})
		return
	}

	// Получаем текст из ответа AI
	text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		log.Printf("Failed to convert AI response to text")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Неверный формат ответа от AI"})
		return
	}

	jsonStr := string(text)
	jsonStr = strings.TrimPrefix(jsonStr, "```javascript")
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	log.Printf("Raw AI response: %s", jsonStr)

	var topics []models.Topic
	if err := json.Unmarshal([]byte(jsonStr), &topics); err != nil {
		log.Printf("Error parsing topics: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Ошибка парсинга тем: %v", err)})
		return
	}

	plan.ID = fmt.Sprintf("plan_%d", time.Now().UnixNano())
	for i := range topics {
		topics[i].ID = fmt.Sprintf("topic_%d", i+1)
		topics[i].Status = "draft"
		topics[i].Exercises = []models.Exercise{}
	}

	plan.Topics = topics
	plan.Status = "draft"

	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *Handlers) ApprovePlan(c *gin.Context) {
	planID := c.Param("planId")
	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	// Утверждаем все темы и сам план
	for i := range plan.Topics {
		plan.Topics[i].Status = "approved"
	}
	plan.Status = "approved"

	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *Handlers) DeletePlan(c *gin.Context) {
	planID := c.Param("planId")
	if err := h.storage.DeletePlan(planID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}
	c.Status(http.StatusOK)
}

func (h *Handlers) AddExercise(c *gin.Context) {
	planID := c.Param("planId")
	topicID := c.Param("topicId")

	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	var exercise models.Exercise
	if err := c.BindJSON(&exercise); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	// Находим тему
	var topic *models.Topic
	for i := range plan.Topics {
		if plan.Topics[i].ID == topicID {
			topic = &plan.Topics[i]
			break
		}
	}

	if topic == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Тема не найдена"})
		return
	}

	// Добавляем упражнение
	exercise.ID = uuid.New().String()
	topic.Exercises = append(topic.Exercises, exercise)

	// Сохраняем план
	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, exercise)
}

func (h *Handlers) UpdateExercise(c *gin.Context) {
	planID := c.Param("planId")
	topicID := c.Param("topicId")
	exerciseID := c.Param("exerciseId")

	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	var exercise models.Exercise
	if err := c.BindJSON(&exercise); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	// Находим тему и упражнение
	var found bool
	for i := range plan.Topics {
		if plan.Topics[i].ID == topicID {
			for j := range plan.Topics[i].Exercises {
				if plan.Topics[i].Exercises[j].ID == exerciseID {
					exercise.ID = exerciseID // Сохраняем ID
					plan.Topics[i].Exercises[j] = exercise
					found = true
					break
				}
			}
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Упражнение не найдено"})
		return
	}

	// Сохраняем план
	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, exercise)
}

func (h *Handlers) DeleteExercise(c *gin.Context) {
	planID := c.Param("planId")
	topicID := c.Param("topicId")
	exerciseID := c.Param("exerciseId")

	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	// Находим тему и упражнение
	var found bool
	for i := range plan.Topics {
		if plan.Topics[i].ID == topicID {
			for j := range plan.Topics[i].Exercises {
				if plan.Topics[i].Exercises[j].ID == exerciseID {
					// Удаляем упражнение
					plan.Topics[i].Exercises = append(plan.Topics[i].Exercises[:j], plan.Topics[i].Exercises[j+1:]...)
					found = true
					break
				}
			}
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Упражнение не найдено"})
		return
	}

	// Сохраняем план
	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.Status(http.StatusOK)
}

func (h *Handlers) ReorderTopics(c *gin.Context) {
	planID := c.Param("planId")
	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	var newOrder []string
	if err := c.BindJSON(&newOrder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	if len(newOrder) != len(plan.Topics) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Количество тем не совпадает"})
		return
	}

	// Создаем временную карту для быстрого поиска тем
	topicMap := make(map[string]models.Topic)
	for _, topic := range plan.Topics {
		topicMap[topic.ID] = topic
	}

	// Создаем новый список тем в нужном порядке
	newTopics := make([]models.Topic, len(newOrder))
	for i, topicID := range newOrder {
		topic, ok := topicMap[topicID]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Тема %s не найдена", topicID)})
			return
		}
		newTopics[i] = topic
	}

	plan.Topics = newTopics

	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *Handlers) AddCustomTopic(c *gin.Context) {
	planID := c.Param("planId")
	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	var topic models.Topic
	if err := c.BindJSON(&topic); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	topic.ID = uuid.New().String()
	topic.Status = "draft"
	topic.Exercises = []models.Exercise{}

	plan.Topics = append(plan.Topics, topic)

	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, topic)
}

func (h *Handlers) DeleteTopic(c *gin.Context) {
	planID := c.Param("planId")
	topicID := c.Param("topicId")

	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	// Находим индекс темы
	var index = -1
	for i, topic := range plan.Topics {
		if topic.ID == topicID {
			index = i
			break
		}
	}

	if index == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Тема не найдена"})
		return
	}

	// Удаляем тему
	plan.Topics = append(plan.Topics[:index], plan.Topics[index+1:]...)

	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.Status(http.StatusOK)
}

func (h *Handlers) GetTopicStory(c *gin.Context) {
    planID := c.Param("planId")
    topicID := c.Param("topicId")

    plan, err := h.storage.GetPlan(planID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось получить план: %v", err),
        })
        return
    }

    var topic *models.Topic
    for i := range plan.Topics {
        if plan.Topics[i].ID == topicID {
            topic = &plan.Topics[i]
            break
        }
    }

    if topic == nil {
        c.JSON(http.StatusNotFound, gin.H{
            "error": "Тема не найдена",
        })
        return
    }

    // Если история уже есть, возвращаем её
    if topic.Story != "" {
        c.JSON(http.StatusOK, gin.H{
            "story": topic.Story,
        })
        return
    }

    // Если истории нет, генерируем новую
    storyObj, err := h.ai.GenerateStory(topic.Name)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось сгенерировать историю: %v", err),
        })
        return
    }

    // Сохраняем только текст истории
    topic.Story = storyObj.Text
    
    // Сохраняем изменения
    if err := h.storage.SavePlan(plan); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось сохранить план: %v", err),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "story": topic.Story,
    })
}

func (h *Handlers) GetStudentDecisions(c *gin.Context) {
    planID := c.Param("planId")
    if planID == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Не указан ID плана",
        })
        return
    }

    plan, err := h.storage.GetPlan(planID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось получить план: %v", err),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "decisions": plan.Decisions,
    })
}

func (h *Handlers) SaveStudentDecision(c *gin.Context) {
    planID := c.Param("planId")
    topicID := c.Param("topicId")

    var req models.SubmitDecisionRequest
    if err := c.BindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": fmt.Sprintf("Неверный формат запроса: %v", err),
        })
        return
    }

    plan, err := h.storage.GetPlan(planID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось получить план: %v", err),
        })
        return
    }

    // Находим тему
    var topic *models.Topic
    for i := range plan.Topics {
        if plan.Topics[i].ID == topicID {
            topic = &plan.Topics[i]
            break
        }
    }

    if topic == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Тема не найдена"})
        return
    }

    // Создаем новое решение
    decision := models.StudentDecision{
        ID:        uuid.New().String(),
        PlanID:    planID,
        TopicID:   topicID,
        Decision:  req.Decision,
        Timestamp: time.Now(),
    }

    // Генерируем обратную связь
    feedback, err := h.ai.GenerateDecisionFeedback(decision)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось сгенерировать обратную связь: %v", err),
        })
        return
    }
    decision.Feedback = feedback

    // Сохраняем решение в теме
    topic.Decision = req.Decision

    // Добавляем решение в план
    plan.Decisions = append(plan.Decisions, decision)

    // Сохраняем изменения
    if err := h.storage.SavePlan(plan); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось сохранить план: %v", err),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "status":   "success",
        "decision": decision,
    })
}

func (h *Handlers) CheckAnswer(c *gin.Context) {
    planID := c.Param("planId")
    topicID := c.Param("topicId")
    exerciseID := c.Param("exerciseId")

    var req models.CheckAnswerRequest
    if err := c.BindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
        return
    }

    // Получаем план
    plan, err := h.storage.GetPlan(planID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось получить план"})
        return
    }

    // Находим тему
    var topic *models.Topic
    var topicIndex int
    for i := range plan.Topics {
        if plan.Topics[i].ID == topicID {
            topic = &plan.Topics[i]
            topicIndex = i
            break
        }
    }

    if topic == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Тема не найдена"})
        return
    }

    // Находим упражнение
    var exercise *models.Exercise
    var exerciseIndex int
    for i := range topic.Exercises {
        if topic.Exercises[i].ID == exerciseID {
            exercise = &topic.Exercises[i]
            exerciseIndex = i
            break
        }
    }

    if exercise == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Упражнение не найдено"})
        return
    }

    // Проверяем ответ
    isCorrect := strings.EqualFold(strings.TrimSpace(exercise.Answer), strings.TrimSpace(req.Answer))

    // Генерируем объяснение
    explanation, err := h.ai.GenerateAnswerExplanation(exercise, req.Answer, isCorrect)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сгенерировать объяснение"})
        return
    }

    // Если ответ верный, проверяем завершение темы
    var nextExercise *models.Exercise
    var nextTopic *models.Topic
    var isTopicCompleted bool

    if isCorrect {
        // Если это последнее упражнение в теме
        if exerciseIndex == len(topic.Exercises)-1 {
            isTopicCompleted = true
            // Если есть следующая тема с упражнениями
            if topicIndex < len(plan.Topics)-1 {
                for i := topicIndex + 1; i < len(plan.Topics); i++ {
                    if len(plan.Topics[i].Exercises) > 0 {
                        nextTopic = &plan.Topics[i]
                        break
                    }
                }
            }
        } else {
            // Берем следующее упражнение
            nextExercise = &topic.Exercises[exerciseIndex+1]
        }
    }

    // Формируем ответ
    response := gin.H{
        "isCorrect":   isCorrect,
        "explanation": explanation,
    }

    if isCorrect {
        if nextExercise != nil {
            response["nextExercise"] = nextExercise
        }
        if isTopicCompleted {
            response["isTopicCompleted"] = true
            if nextTopic != nil {
                response["nextTopic"] = nextTopic
            }
        }
    }

    c.JSON(http.StatusOK, response)
}

func (h *Handlers) GenerateStory(c *gin.Context) {
    planID := c.Param("planId")
    topicID := c.Param("topicId")

    plan, err := h.storage.GetPlan(planID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось получить план: %v", err),
        })
        return
    }

    var topic *models.Topic
    var topicIndex int
    for i := range plan.Topics {
        if plan.Topics[i].ID == topicID {
            topic = &plan.Topics[i]
            topicIndex = i
            break
        }
    }

    if topic == nil {
        c.JSON(http.StatusNotFound, gin.H{
            "error": "Тема не найдена",
        })
        return
    }

    // Генерируем историю
    story, err := h.ai.GenerateStory(topic.Name)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось сгенерировать историю: %v", err),
        })
        return
    }

    // Обновляем тему с новой историей
    topic.Story = story.Text
    plan.Topics[topicIndex] = *topic

    // Сохраняем изменения
    if err := h.storage.SavePlan(plan); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": fmt.Sprintf("Не удалось сохранить план: %v", err),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "status": "success",
        "story":  story.Text,
    })
}

func (h *Handlers) GenerateExercises(c *gin.Context) {
	planID := c.Param("planId")
	topicID := c.Param("topicId")

	plan, err := h.storage.GetPlan(planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}

	// Находим тему
	var topic *models.Topic
	for i := range plan.Topics {
		if plan.Topics[i].ID == topicID {
			topic = &plan.Topics[i]
			break
		}
	}

	if topic == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Тема не найдена"})
		return
	}

	// Генерируем упражнения
	exercises, err := h.ai.GenerateExercises(topic.Name, 5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Ошибка генерации упражнений: %v", err)})
		return
	}

	// Добавляем упражнения в тему
	for _, ex := range exercises {
		topic.Exercises = append(topic.Exercises, *ex)
	}

	// Сохраняем план
	if err := h.storage.SavePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"exercises": exercises,
		"plan":     plan,
	})
}

func (h *Handlers) GetStudentProgress(c *gin.Context) {
    planID := c.Param("planId")
    
    // Получаем план
    plan, err := h.storage.GetPlan(planID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
        return
    }

    // Получаем историю решений
    decisions := plan.Decisions

    // Находим первую тему с упражнениями, которая еще не пройдена
    var currentTopic *models.Topic
    var previousTopic *models.Topic
    for i, topic := range plan.Topics {
        hasExercises := len(topic.Exercises) > 0
        isCompleted := false
        for _, decision := range decisions {
            if decision.TopicID == topic.ID {
                isCompleted = true
                // Сохраняем решение в теме
                topic.Decision = decision.Decision
                break
            }
        }

        if hasExercises && !isCompleted {
            currentTopic = &plan.Topics[i]
            // Если это не первая тема, берем предыдущую
            if i > 0 {
                previousTopic = &plan.Topics[i-1]
            }
            break
        }
    }

    if currentTopic == nil {
        c.JSON(http.StatusOK, gin.H{
            "completed": true,
            "message": "Все темы пройдены",
        })
        return
    }

    // Если есть предыдущая тема и последнее решение
    if previousTopic != nil && previousTopic.Decision != "" && currentTopic.Story == "" {
        // Генерируем продолжение истории
        story, err := h.ai.GenerateStoryContinuation(previousTopic, previousTopic.Decision, currentTopic)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сгенерировать продолжение истории"})
            return
        }
        
        // Сохраняем новую историю
        currentTopic.Story = story
        if err := h.storage.SavePlan(plan); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
            return
        }
    }

    // Если у текущей темы все еще нет истории (это первая тема или не удалось сгенерировать продолжение)
    if currentTopic.Story == "" {
        story, err := h.ai.GenerateStory(currentTopic.Name)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сгенерировать историю"})
            return
        }
        currentTopic.Story = story.Text
        // Сохраняем план с новой историей
        if err := h.storage.SavePlan(plan); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить план"})
            return
        }
    }

    // Возвращаем текущий прогресс
    response := gin.H{
        "currentTopic": currentTopic,
        "exercises": currentTopic.Exercises,
        "decisions": decisions,
    }

    // Добавляем историю предыдущей темы, если она есть
    if previousTopic != nil {
        response["previousTopic"] = previousTopic
    }

    c.JSON(http.StatusOK, response)
}
