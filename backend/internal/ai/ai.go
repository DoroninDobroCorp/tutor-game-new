package ai

import "fmt"

type AI interface {
    GenerateStory(topic string) (string, error)
    GenerateExercises(topic string, count int) ([]*Exercise, error)
}

type Exercise struct {
    ID           string
    Question     string
    Options      []string
    CorrectAnswer string
}

type OpenAIService struct {
    // TODO: Add OpenAI client configuration
}

func NewOpenAIService() *OpenAIService {
    return &OpenAIService{}
}

func (s *OpenAIService) GenerateStory(topicName string) (string, error) {
    // TODO: Implement OpenAI API call
    // For now, return a placeholder story
    return "Это временная история для тестирования. Как бы вы поступили в этой ситуации?", nil
}

func (s *OpenAIService) GenerateExercises(topic string, count int) ([]*Exercise, error) {
    // Генерируем упражнения
    exercises := make([]*Exercise, count)
    
    for i := 0; i < count; i++ {
        exercise := &Exercise{
            Question: fmt.Sprintf("Вопрос %d для темы %s", i+1, topic),
            Options: []string{
                "Вариант A",
                "Вариант B",
                "Вариант C",
                "Вариант D",
            },
            CorrectAnswer: "A",
        }
        exercises[i] = exercise
    }
    
    return exercises, nil
}
