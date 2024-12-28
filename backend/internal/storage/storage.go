package storage

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"tutor-game/internal/models"
)

type Storage struct {
	learningPlans map[string]models.LearningPlan
	dataDir       string
}

func NewStorage(dataDir string) *Storage {
	return &Storage{
		learningPlans: make(map[string]models.LearningPlan),
		dataDir:       dataDir,
	}
}

func (s *Storage) LoadAllPlans() error {
	files, err := os.ReadDir(s.dataDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // Директория не существует, это нормально
		}
		return fmt.Errorf("ошибка при чтении директории с планами: %v", err)
	}

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".json") {
			planID := strings.TrimSuffix(file.Name(), ".json")
			if err := s.loadPlanFromFile(planID); err != nil {
				return fmt.Errorf("ошибка при загрузке плана %s: %v", planID, err)
			}
		}
	}

	return nil
}

func (s *Storage) SavePlan(plan models.LearningPlan) error {
	log.Printf("Saving plan %s with %d topics", plan.ID, len(plan.Topics))
	for i, topic := range plan.Topics {
		log.Printf("Topic %d: ID=%s, Name=%s, Status=%s, HasStory=%v, HasImage=%v, ExercisesCount=%d",
			i, topic.ID, topic.Name, topic.Status, topic.Story != "", topic.ImageURL != "", len(topic.Exercises))
	}

	s.learningPlans[plan.ID] = plan
	return s.savePlanToFile(plan.ID)
}

func (s *Storage) GetPlan(planID string) (models.LearningPlan, error) {
	log.Printf("Getting plan %s", planID)
	plan, exists := s.learningPlans[planID]
	if !exists {
		log.Printf("Plan %s not found", planID)
		return models.LearningPlan{}, fmt.Errorf("plan not found")
	}

	log.Printf("Plan %s loaded successfully with %d topics", planID, len(plan.Topics))
	for i, topic := range plan.Topics {
		log.Printf("Topic %d: ID=%s, Name=%s, Status=%s, HasStory=%v, HasImage=%v, ExercisesCount=%d",
			i, topic.ID, topic.Name, topic.Status, topic.Story != "", topic.ImageURL != "", len(topic.Exercises))
	}

	return plan, nil
}

func (s *Storage) DeletePlan(planID string) error {
	// Проверяем существование плана
	_, err := s.GetPlan(planID)
	if err != nil {
		return err
	}

	// Удаляем план из памяти
	delete(s.learningPlans, planID)

	// Удаляем файл плана
	filePath := filepath.Join(s.dataDir, planID+".json")
	return os.Remove(filePath)
}

func (s *Storage) GetAllPlans() []models.LearningPlan {
	plans := make([]models.LearningPlan, 0, len(s.learningPlans))
	for _, plan := range s.learningPlans {
		plans = append(plans, plan)
	}
	return plans
}

func (s *Storage) GetApprovedPlans() []models.LearningPlan {
	var approvedPlans []models.LearningPlan
	for _, plan := range s.learningPlans {
		if plan.Status == "approved" {
			approvedPlans = append(approvedPlans, plan)
		}
	}
	return approvedPlans
}

func (s *Storage) GetStudentDecisions(planID string) ([]models.StudentDecision, error) {
	plan, err := s.GetPlan(planID)
	if err != nil {
		return nil, err
	}
	return plan.Decisions, nil
}

func (s *Storage) SaveStudentDecision(decision *models.StudentDecision) error {
	plan, err := s.GetPlan(decision.PlanID)
	if err != nil {
		return err
	}

	// Добавляем решение в план
	plan.Decisions = append(plan.Decisions, *decision)

	// Сохраняем план
	return s.SavePlan(plan)
}

func (s *Storage) UpdateStudentDecision(decision *models.StudentDecision) error {
	plan, err := s.GetPlan(decision.PlanID)
	if err != nil {
		return err
	}

	// Находим и обновляем решение
	found := false
	for i, d := range plan.Decisions {
		if d.ID == decision.ID {
			plan.Decisions[i] = *decision
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("decision not found")
	}

	// Сохраняем план
	return s.SavePlan(plan)
}

func (s *Storage) savePlanToFile(planID string) error {
	log.Printf("Saving plan %s to file", planID)
	plan, exists := s.learningPlans[planID]
	if !exists {
		return fmt.Errorf("план не найден")
	}

	data, err := json.MarshalIndent(plan, "", "  ")
	if err != nil {
		log.Printf("Error marshaling plan %s: %v", planID, err)
		return fmt.Errorf("ошибка при сериализации плана: %v", err)
	}

	log.Printf("Plan data: %s", string(data))

	filename := filepath.Join(s.dataDir, planID+".json")
	log.Printf("Writing plan to file: %s", filename)
	if err := os.WriteFile(filename, data, 0644); err != nil {
		log.Printf("Error writing plan %s to file: %v", planID, err)
		return fmt.Errorf("ошибка при сохранении плана: %v", err)
	}

	log.Printf("Plan %s saved successfully", planID)
	return nil
}

func (s *Storage) loadPlanFromFile(planID string) error {
	log.Printf("Loading plan %s from file", planID)
	filename := filepath.Join(s.dataDir, planID+".json")
	data, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("Plan %s not found", planID)
			return nil // Файл не существует, это нормально
		}
		log.Printf("Error reading plan %s: %v", planID, err)
		return fmt.Errorf("ошибка при чтении файла плана: %v", err)
	}

	var plan models.LearningPlan
	if err := json.Unmarshal(data, &plan); err != nil {
		log.Printf("Error unmarshaling plan %s: %v", planID, err)
		return fmt.Errorf("ошибка при десериализации плана: %v", err)
	}

	s.learningPlans[planID] = plan
	log.Printf("Plan %s loaded successfully with %d topics", planID, len(plan.Topics))

	return nil
}
