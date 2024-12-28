import axios from 'axios';

const API_URL = 'http://localhost:8080';

export const studentAPI = {
  // Получить план обучения
  getPlan: async (planId) => {
    const response = await axios.get(`${API_URL}/api/student/plan/${planId}`);
    return response.data;
  },

  // Получить прогресс студента
  getProgress: async (planId) => {
    const response = await axios.get(`${API_URL}/api/student/plan/${planId}/progress`);
    return response.data;
  },

  // Отправить решение
  submitDecision: async (planId, topicId, decision) => {
    const response = await axios.post(`${API_URL}/api/student/plan/${planId}/topic/${topicId}/decision`, {
      decision,
    });
    return response.data;
  },

  // Проверить ответ
  checkAnswer: async (planId, topicId, exerciseId, answer) => {
    const response = await axios.post(`${API_URL}/api/student/plan/${planId}/topic/${topicId}/exercise/${exerciseId}/check`, {
      answer,
    });
    return response.data;
  },
};
