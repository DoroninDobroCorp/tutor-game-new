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
        <div className="grid grid-cols-1 gap-4">
          <Link 
            to="/student/adventure" 
            className="p-6 border rounded-lg hover:bg-gray-50 transition-colors bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-md"
          >
            <h3 className="font-medium text-xl text-blue-700">🏰 Учебное приключение</h3>
            <p className="text-sm text-blue-600 mt-2">Продолжить обучение в увлекательной игре</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
