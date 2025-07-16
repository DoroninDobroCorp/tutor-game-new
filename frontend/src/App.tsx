// Файл: tutor-game/frontend/src/App.tsx

import { Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Хуки и состояние
import { useAppSelector } from './app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';

// Компоненты и страницы
import CreateGoalPage from './pages/teacher/CreateGoalPage';
import RoadmapEditorPage from './pages/teacher/RoadmapEditorPage';
import LearningGoalsListPage from './pages/teacher/LearningGoalsListPage';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/StudentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';

import StudentAdventurePage from './pages/student/StudentAdventurePage';
import StudentStoriesListPage from './pages/student/StudentStoriesListPage';
import ChatPage from './pages/chat/ChatPage';
import NotFoundPage from './pages/NotFoundPage';
import StudentsPage from './features/teacher/StudentsPage';
import StoryHistoryPage from './pages/student/StoryHistoryPage';
import CompletedLessonsPage from './pages/student/CompletedLessonsPage';

// Создаем единый компонент-обертку для защищенных маршрутов по ролям
const PrivateRoute = ({ requiredRole }: { requiredRole: 'student' | 'teacher' }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const context = useOutletContext(); // <-- Получаем контекст из родительского Outlet

  if (!isAuthenticated) {
    // Если не аутентифицирован, перенаправляем на логин
    return <Navigate to="/login" replace />;
  }

  if (user?.role.toLowerCase() !== requiredRole) {
    // Если роль не совпадает, перенаправляем на их собственный дашборд
    const userDashboard = user?.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={userDashboard} replace />;
  }

  // Если все проверки пройдены, показываем вложенный контент и передаем контекст дальше
  return <Outlet context={context} />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Публичные роуты, которые не используют Layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Роуты, использующие общий Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          
          {/* Защищенные роуты для Студента */}
          <Route path="student" element={<PrivateRoute requiredRole="student" />}>
            <Route index element={<StudentDashboard />} />
            <Route path="adventure" element={<StudentAdventurePage />} />
            <Route path="stories" element={<StudentStoriesListPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="story/:goalId" element={<StoryHistoryPage />} />
            <Route path="goal/:goalId/completed" element={<CompletedLessonsPage />} />
          </Route>
          
          {/* Защищенные роуты для Учителя */}
          <Route path="teacher" element={<PrivateRoute requiredRole="teacher" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="goals" element={<LearningGoalsListPage />} />
            <Route path="create-goal" element={<CreateGoalPage />} />
            <Route path="goals/:goalId/edit" element={<RoadmapEditorPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="chat" element={<ChatPage />} />
          </Route>
          
          {/* Страница 404 для всех остальных путей внутри Layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
