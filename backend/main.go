package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"tutor-game/internal/api"
	"tutor-game/internal/services"
	"tutor-game/internal/storage"
)

func main() {
	// Настраиваем логирование
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.SetOutput(os.Stdout)

	// Загружаем переменные окружения
	if err := godotenv.Load(); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Инициализируем хранилище
	store := storage.NewStorage("./data")
	log.Printf("✅ Хранилище инициализировано")

	// Загружаем все планы при старте
	if err := store.LoadAllPlans(); err != nil {
		log.Printf("❌ Ошибка загрузки планов: %v", err)
	}

	// Инициализируем AI сервис
	log.Printf("🔄 Инициализация AI сервиса...")
	googleAPIKey := os.Getenv("GOOGLE_API_KEY")

	if googleAPIKey == "" {
		log.Fatal("GOOGLE_API_KEY is not set")
	}

	aiService, err := services.NewAIService(googleAPIKey)
	if err != nil {
		log.Fatalf("Failed to create AI service: %v", err)
	}
	defer aiService.Close()

	log.Printf("✅ AI сервис инициализирован")

	// Инициализируем обработчики
	handlers := api.NewHandlers(store, aiService)

	// Настраиваем роутер
	r := gin.Default()

	// Включаем логирование запросов
	r.Use(gin.Logger())

	// Настраиваем CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Регистрируем маршруты
	handlers.RegisterRoutes(r)

	// Запускаем сервер
	log.Printf("🚀 Сервер запущен на порту 8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
