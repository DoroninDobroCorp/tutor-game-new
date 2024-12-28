package models

import "time"

type Story struct {
	Text  string `json:"text"`
	Image string `json:"image,omitempty"`
}

type StudentDecision struct {
    ID        string    `json:"id"`
    PlanID    string    `json:"planId"`
    TopicID   string    `json:"topicId"`
    Decision  string    `json:"decision"`
    Feedback  string    `json:"feedback,omitempty"`
    Timestamp time.Time `json:"timestamp"`
}

type Exercise struct {
    ID          string   `json:"id"`
    Question    string   `json:"question"`
    Options     []string `json:"options"`
    Answer      string   `json:"answer"`
    CorrectAnswerIndex int    `json:"correctAnswerIndex"`
    Explanation string   `json:"explanation,omitempty"`
}

type Topic struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	Story       string     `json:"story"`
	Decision    string     `json:"decision"`
	Exercises   []Exercise `json:"exercises"`
	TopicIndex  int        `json:"topicIndex"`
	Completed   bool       `json:"completed"`
	ImageURL    string     `json:"imageUrl,omitempty"`
}

type LearningPlan struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Subject     string            `json:"subject"`
	Description string            `json:"description"`
	Topics      []Topic           `json:"topics"`
	Status      string            `json:"status"`
	Decisions   []StudentDecision `json:"decisions,omitempty"` // История решений ученика
}

type CheckAnswerRequest struct {
	PlanID     string `json:"planId"`
	TopicID    string `json:"topicId"`
	ExerciseID string `json:"exerciseId"`
	Answer     string `json:"answer"`
}

type CheckAnswerResponse struct {
	Correct     bool   `json:"correct"`
	Explanation string `json:"explanation"`
}

type SubmitDecisionRequest struct {
	Decision string `json:"decision"`
}
