import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

export default function StudentDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  
  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome back, {user?.firstName || 'Student'}!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="mt-2 text-lg text-gray-600 mb-6">
          Выберите раздел, чтобы начать обучение.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            to="/student/adventure" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100"
          >
            <h3 className="font-medium text-lg text-blue-700">🏰 Учебное приключение</h3>
            <p className="text-sm text-blue-600">Продолжить обучение в увлекательной игре</p>
          </Link>
          <Link 
            to="/student/story" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">📖 Редактор историй</h3>
            <p className="text-sm text-gray-500">Создавайте свои собственные истории</p>
          </Link>
          <Link 
            to="/student/math" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">🧮 Математика</h3>
            <p className="text-sm text-gray-500">Практикуйте математические навыки</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
