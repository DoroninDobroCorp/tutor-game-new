import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppSelector } from './app/hooks';
import { selectIsAuthenticated } from './features/auth/authSlice';
import { useGetProfileQuery } from './features/auth/authApi';
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
import NotFoundPage from './pages/NotFoundPage';
import Spinner from '@/components/common/Spinner';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { isLoading } = useGetProfileQuery(undefined, {
    // Skip the query if we already have the user data
    skip: isAuthenticated,
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Role-based Route Component
const RoleBasedRoute = ({
  role,
  children,
}: {
  role: 'student' | 'teacher';
  children: JSX.Element;
}) => {
  const { user } = useAppSelector((state) => state.auth);
  
  if (!user || user.role.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  // This will automatically run on app load if there's a token
  const { isLoading } = useGetProfileQuery(undefined, {
    // Skip if we already have the user data in the store
    skip: false,
    // Don't refetch on mount if we already have data
    refetchOnMountOrArgChange: false,
  });
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
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
          <Route index element={<StudentDashboard />} />
          <Route path="dashboard" element={<StudentDashboardPage />} />
          <Route path="math" element={<StudentDashboard><MathProblemSolver /></StudentDashboard>} />
          <Route path="chat" element={<StudentDashboard><ChatPage /></StudentDashboard>} />
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
          <Route index element={<TeacherDashboard />} />
          <Route path="dashboard" element={<TeacherDashboardPage />} />
          <Route path="students" element={<TeacherDashboard><div>Students Management</div></TeacherDashboard>} />
          <Route path="students/:studentId" element={<TeacherDashboard><StudentProgress /></TeacherDashboard>} />
          <Route path="progress" element={<TeacherDashboard><div>Progress Overview</div></TeacherDashboard>} />
          <Route path="chat" element={<TeacherDashboard><ChatPage /></TeacherDashboard>} />
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
      </Routes>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
