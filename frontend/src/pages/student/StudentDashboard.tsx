import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { useGetStudentProfileQuery } from '../../features/student/studentApi';
import type { LearningGoal } from '../../types/models'; // <-- Исправленный импорт типа
import Spinner from '../../components/common/Spinner';

export default function StudentDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: profile, isLoading, isError } = useGetStudentProfileQuery();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-red-500">
        Ошибка загрузки данных. Пожалуйста, попробуйте позже.
      </div>
    );
  }

  const learningGoals = profile?.learningGoals || [];
  
  return (
    <div className="w-full p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Добро пожаловать, {user?.firstName || 'Студент'}!
      </h1>
      
      <div className="space-y-8">
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Быстрый доступ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              to="/student/adventure" 
              className="p-6 border rounded-lg hover:bg-gray-50 transition-colors bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-md"
            >
              <h3 className="font-medium text-xl text-blue-700">🏰 Продолжить приключение</h3>
              <p className="text-sm text-blue-600 mt-2">Вернуться к последнему уроку</p>
            </Link>
            
            <Link 
              to="/student/chat" 
              className="p-6 border rounded-lg hover:bg-gray-50 transition-colors bg-gradient-to-br from-green-50 to-teal-50 border-green-100 hover:shadow-md"
            >
              <h3 className="font-medium text-xl text-green-700">💬 Чат с учителем</h3>
              <p className="text-sm text-green-600 mt-2">Задать вопрос или получить помощь</p>
            </Link>
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Мои учебные цели</h2>
          {learningGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Явно указываем тип 'goal' для строгости */}
              {learningGoals.map((goal: LearningGoal) => (
                <div 
                  key={goal.id} 
                  className="border rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">{goal.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1">Сеттинг: {goal.setting}</p>
                    {goal.studentAge && (
                      <p className="text-sm text-gray-500 mt-1">Возраст: {goal.studentAge}</p>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link 
                      to={`/student/story/${goal.id}`}
                      className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Читать историю
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>У вас пока нет назначенных учебных целей.</p>
              <p className="mt-2">Обратитесь к вашему учителю для создания приключения!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
