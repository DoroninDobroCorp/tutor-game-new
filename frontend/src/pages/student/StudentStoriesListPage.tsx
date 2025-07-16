import { Link } from 'react-router-dom';
import { useGetStudentProfileQuery } from '../../features/student/studentApi';
import type { LearningGoal } from '../../types/models';
import Spinner from '../../components/common/Spinner';
import { FiBookOpen, FiClock } from 'react-icons/fi';

export default function StudentStoriesListPage() {
  const { data: profile, isLoading, isError } = useGetStudentProfileQuery();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (isError) {
    return <div className="text-center p-8 text-red-500">Ошибка загрузки данных.</div>;
  }

  const learningGoals = profile?.learningGoals || [];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Архив заданий</h1>
      
      {learningGoals.length > 0 ? (
        <div className="space-y-4">
          {learningGoals.map((goal: LearningGoal) => (
            <div 
              key={goal.id}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-700">{goal.subject}</h2>
                  <p className="text-sm text-gray-500 mt-1">Сеттинг: {goal.setting}</p>
                </div>
                <FiBookOpen className="w-8 h-8 text-gray-300" />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center space-x-6">
                <Link to={`/student/story/${goal.id}`} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                    <FiBookOpen className="mr-2" />
                    Читать историю
                </Link>
                <Link to={`/student/goal/${goal.id}/completed`} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                    <FiClock className="mr-2" />
                    Пройденные уроки
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <p className="text-gray-500">У вас пока нет начатых приключений.</p>
          <p className="mt-2 text-sm">Ваш учитель скоро создаст для вас новый учебный план!</p>
        </div>
      )}
    </div>
  );
}
