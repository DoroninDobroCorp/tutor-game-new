// Полное содержимое файла: tutor-game/frontend/src/pages/teacher/TeacherDashboard.tsx

import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

export default function TeacherDashboard() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return null; // ProtectedRoute обработает редирект
  }

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Добро пожаловать, {user.firstName || 'Учитель'}!
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="mt-2 text-lg text-gray-600 mb-6">
          Выберите раздел для управления учебным процессом.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/teacher/students" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">👥 Управление студентами</h3>
            <p className="text-sm text-gray-500">Просмотр и добавление ваших студентов</p>
          </Link>
          
          <Link
            to="/teacher/goals" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">🎯 Учебные планы</h3>
            <p className="text-sm text-gray-500">Создание и редактирование планов обучения</p>
          </Link>
          
          <Link
            to="/teacher/chat"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">💬 Чат с учениками</h3>
            <p className="text-sm text-gray-500">Общение и поддержка студентов</p>
          </Link>

        </div>
      </div>
    </div>
  );
}
