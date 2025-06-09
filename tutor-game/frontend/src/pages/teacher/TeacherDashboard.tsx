import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

export default function TeacherDashboard() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return null; // ProtectedRoute will handle redirection
  }

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {user.firstName || 'Teacher'}!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="mt-2 text-lg text-gray-600 mb-6">
          Выберите раздел для управления учебным процессом.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            to="/teacher/students" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">👥 Управление студентами</h3>
            <p className="text-sm text-gray-500">Просмотр и управление списком студентов</p>
          </Link>
          <Link 
            to="/teacher/progress" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">📊 Прогресс студентов</h3>
            <p className="text-sm text-gray-500">Анализ успеваемости студентов</p>
          </Link>
          <Link 
            to="/teacher/chat" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">💬 Чат с учениками</h3>
            <p className="text-sm text-gray-500">Общение со студентами</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
