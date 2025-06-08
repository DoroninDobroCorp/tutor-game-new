import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../app/store';

export const StudentDashboardPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Welcome, {user ? user.firstName : 'Student'}!
      </h1>
      <p className="mt-2 text-lg text-gray-600 mb-6">
        Выберите раздел, чтобы начать обучение.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          to="/student/story" 
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium text-lg">🚀 Story Mode</h3>
          <p className="text-sm text-gray-500">Начните свое учебное приключение</p>
        </Link>
        <Link 
          to="/student/math" 
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium text-lg">🧮 Math Problems</h3>
          <p className="text-sm text-gray-500">Практикуйте свои математические навыки</p>
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
