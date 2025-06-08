import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/StudentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import MathProblemSolver from './pages/student/MathProblemSolver';
import StudentProgress from './pages/teacher/StudentProgress';
import ChatPage from './pages/chat/ChatPage';
import StoryGenerator from './pages/student/StoryGenerator';
import NotFoundPage from './pages/NotFoundPage';
import { ProtectedRoute, RoleBasedRoute } from './AuthRoutes';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Student Routes */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute>
              <RoleBasedRoute role="student">
                <Layout><StudentDashboard /></Layout>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboardPage />} />
          <Route path="math" element={<MathProblemSolver />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="story" element={<StoryGenerator />} />
        </Route>
        
        {/* Protected Teacher Routes */}
        <Route 
          path="/teacher" 
          element={
            <ProtectedRoute>
              <RoleBasedRoute role="teacher">
                <Layout><TeacherDashboard /></Layout>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboardPage />} />
          <Route path="students" element={<div>Students Management</div>} />
          <Route path="students/:studentId" element={<StudentProgress />} />
          <Route path="progress" element={<div>Progress Overview</div>} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
