import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../app/store';

export const TeacherDashboardPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Welcome, {user?.firstName || 'Teacher'}!
      </h1>
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
          to="/teacher/students" 
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium text-lg">📊 Прогресс студентов</h3>
          <p className="text-sm text-gray-500">Отслеживание успеваемости студентов</p>
        </Link>
        <Link 
          to="/teacher/chat" 
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium text-lg">💬 Чат с учениками</h3>
          <p className="text-sm text-gray-500">Общайтесь со своими учениками</p>
        </Link>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
