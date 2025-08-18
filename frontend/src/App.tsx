// Файл: tutor-game/frontend/src/App.tsx

import { Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';

// Хуки и состояние
import { useAppSelector } from './app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';

// Компоненты и страницы (ленивая загрузка)
import Layout from './components/common/Layout';
import Spinner from './components/common/Spinner';
import { routeLogin, routeTeacherDashboard, routeStudentDashboard } from './app/routes';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const CreateGoalPage = lazy(() => import('./pages/teacher/CreateGoalPage'));
const RoadmapEditorPage = lazy(() => import('./pages/teacher/RoadmapEditorPage'));
const LearningGoalsListPage = lazy(() => import('./pages/teacher/LearningGoalsListPage'));
const TeacherAchievementsPage = lazy(() => import('./pages/teacher/TeacherAchievementsPage'));
const StudentAdventurePage = lazy(() => import('./pages/student/StudentAdventurePage'));
const StudentAchievementsPage = lazy(() => import('./pages/student/StudentAchievementsPage'));
const StudentStoriesListPage = lazy(() => import('./pages/student/StudentStoriesListPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const StudentsPage = lazy(() => import('./features/teacher/StudentsPage'));
const StoryHistoryPage = lazy(() => import('./pages/student/StoryHistoryPage'));
const CompletedLessonsPage = lazy(() => import('./pages/student/CompletedLessonsPage'));
const DiagnosticPage = lazy(() => import('./pages/student/DiagnosticPage'));

// Создаем единый компонент-обертку для защищенных маршрутов по ролям
const PrivateRoute = ({ requiredRole }: { requiredRole: 'student' | 'teacher' }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const context = useOutletContext(); // <-- Получаем контекст из родительского Outlet

  if (!isAuthenticated) {
    // Если не аутентифицирован, перенаправляем на логин
    return <Navigate to={routeLogin} replace />;
  }

  if (user?.role.toLowerCase() !== requiredRole) {
    // Если роль не совпадает, перенаправляем на их собственный дашборд
    const userDashboard = user?.role === 'teacher' ? routeTeacherDashboard : routeStudentDashboard;
    return <Navigate to={userDashboard} replace />;
  }

  // Если все проверки пройдены, показываем вложенный контент и передаем контекст дальше
  return <Outlet context={context} />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="flex justify-center items-center h-screen bg-gray-50"><Spinner size="lg" /></div>}>
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
            <Route path="achievements" element={<StudentAchievementsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="story/:goalId" element={<StoryHistoryPage />} />
            <Route path="goal/:goalId/completed" element={<CompletedLessonsPage />} />
            <Route path="goal/:goalId/diagnostic" element={<DiagnosticPage />} />
          </Route>
          
          {/* Защищенные роуты для Учителя */}
          <Route path="teacher" element={<PrivateRoute requiredRole="teacher" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="goals" element={<LearningGoalsListPage />} />
            <Route path="create-goal" element={<CreateGoalPage />} />
            <Route path="goals/:goalId/edit" element={<RoadmapEditorPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="achievements" element={<TeacherAchievementsPage />} />
            <Route path="chat" element={<ChatPage />} />
          </Route>
          
          {/* Страница 404 для всех остальных путей внутри Layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Routes>
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
