// Файл: tutor-game/frontend/src/App.tsx (100% ПРАВИЛЬНАЯ ВЕРСИЯ)

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Хуки и состояние
import { useAppSelector } from './app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';

// Компоненты и страницы
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/StudentDashboard'; // <--- ПРАВИЛЬНЫЙ ПУТЬ
import TeacherDashboard from './pages/teacher/TeacherDashboard'; // <--- ПРАВИЛЬНЫЙ ПУТЬ
import MathProblemSolver from './pages/student/MathProblemSolver'; // <--- ПРАВИЛЬНЫЙ ПУТЬ
import StoryGenerator from './pages/student/StoryGenerator'; // <--- ПРАВИЛЬНЫЙ ПУТЬ
import StudentProgress from './pages/teacher/StudentProgress';
import ChatPage from './pages/chat/ChatPage';
import NotFoundPage from './pages/NotFoundPage';

// Создаем единый компонент-обертку для защищенных маршрутов по ролям
const PrivateRoute = ({ requiredRole }: { requiredRole: 'student' | 'teacher' }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  if (!isAuthenticated) {
    // Если не аутентифицирован, перенаправляем на логин
    return <Navigate to="/login" replace />;
  }

  if (user?.role.toLowerCase() !== requiredRole) {
    // Если роль не совпадает, перенаправляем на главную (или на их собственный дашборд)
    const userDashboard = user?.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={userDashboard} replace />;
  }

  // Если все проверки пройдены, показываем вложенный контент
  return <Outlet />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Публичные роуты, которые не используют Layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Роуты, использующие общий Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          
          {/* Защищенные роуты для Студента */}
          <Route element={<PrivateRoute requiredRole="student" />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/math" element={<MathProblemSolver />} />
            <Route path="/student/story" element={<StoryGenerator />} />
            <Route path="/student/chat" element={<ChatPage />} />
          </Route>
          
          {/* Защищенные роуты для Учителя */}
          <Route element={<PrivateRoute requiredRole="teacher" />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/students" element={<div>Students Management Page</div>} />
            <Route path="/teacher/students/:studentId" element={<StudentProgress />} />
            <Route path="/teacher/progress" element={<div>Progress Overview Page</div>} />
            <Route path="/teacher/chat" element={<ChatPage />} />
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