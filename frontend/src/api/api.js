import axios from 'axios';

// Базовый URL для API
const API_BASE_URL = 'http://localhost:8080';

// Обработчик ошибок
const handleError = (error) => {
  if (error.response && error.response.data) {
    // Если есть код ошибки, возвращаем его вместе с сообщением
    if (error.response.data.code) {
      const err = new Error(error.response.data.error);
      err.code = error.response.data.code;
      throw err;
    }
    // Если есть только сообщение об ошибке
    if (error.response.data.error) {
      throw new Error(error.response.data.error);
    }
  }
  // Если это сетевая ошибка или что-то еще
  throw error;
};

// API для учителя
export const teacherAPI = {
  // Создание чернового плана
  createPlan: async (subject, description) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/plan`, {
        subject,
        description,
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Получение плана
  getPlan: async (planId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teacher/plan/${planId}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Утверждение плана
  approvePlan: async (planId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/approve`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Утверждение темы
  approveTopic: async (planId, topicId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topic/${topicId}/approve`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Обновление порядка тем
  updateTopicsOrder: async (planId, topicIds) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topics/reorder`,
        topicIds
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Добавление упражнения
  addExercise: async (planId, topicId, exercise) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topic/${topicId}/exercise`,
        exercise
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Обновление упражнения
  updateExercise: async (planId, topicId, exerciseId, exercise) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topic/${topicId}/exercise/${exerciseId}`,
        exercise
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Генерация упражнений для темы
  generateExercises: async (planId, topicId, additionalPrompt) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topic/${topicId}/exercises/generate`,
        { additionalPrompt }
      );
      return response.data.plan;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Добавление своей темы
  addCustomTopic: async (planId, { name, description }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topics/custom`,
        { name, description }
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Запрос дополнительных тем через AI
  requestMoreTopics: async (planId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topics/request`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Удаление темы
  deleteTopic: async (planId, topicId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topic/${topicId}`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Удаление упражнения
  deleteExercise: async (planId, topicId, exerciseId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/teacher/plan/${planId}/topic/${topicId}/exercise/${exerciseId}`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Удаление плана
  async deletePlan(planId) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/teacher/plan/${planId}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Получение утвержденных планов
  getApprovedPlans: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teacher/plans/approved`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// API для ученика
export const studentAPI = {
  // Получение плана
  getPlan: async (planId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/student/plan/${planId}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Получение истории и упражнений для темы
  getStory: async (planId, topicId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/student/plan/${planId}/topic/${topicId}/story`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Получение истории решений ученика
  getDecisionHistory: async (planId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/student/plan/${planId}/decisions`
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Получение прогресса ученика
  getProgress: async (planId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/student/plan/${planId}/progress`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Сохранение решения ученика
  submitDecision: async (planId, topicId, decision) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/student/plan/${planId}/decision`, {
        topicId,
        decision,
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  // Проверка ответа
  checkAnswer: async (planId, topicId, exerciseId, answer) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/student/check`, {
        planId,
        topicId,
        exerciseId,
        answer,
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};
