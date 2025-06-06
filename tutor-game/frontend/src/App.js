import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppSelector } from './app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';
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
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const { isLoading } = useGetProfileQuery(undefined, {
        // Skip the query if we already have the user data
        skip: isAuthenticated,
    });
    if (isLoading) {
        return (_jsx("div", { className: "flex justify-center items-center h-screen", children: _jsx(Spinner, { size: "lg" }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return children;
};
// Role-based Route Component
const RoleBasedRoute = ({ role, children, }) => {
    const { user } = useAppSelector((state) => state.auth);
    if (!user || user.role.toLowerCase() !== role.toLowerCase()) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return children;
};
function App() {
    // Get user from Redux store
    const user = useAppSelector(selectCurrentUser);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    // Only fetch profile if authenticated but user data is not in store
    const { isLoading } = useGetProfileQuery(undefined, {
        skip: !!user || !isAuthenticated,
        refetchOnMountOrArgChange: false,
    });
    // Show loading spinner while checking authentication
    if (isLoading) {
        return (_jsx("div", { className: "flex justify-center items-center h-screen", children: _jsx(Spinner, { size: "lg" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Layout, { children: _jsx(HomePage, {}) }) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsxs(Route, { path: "/student", element: _jsx(ProtectedRoute, { children: _jsx(RoleBasedRoute, { role: "student", children: _jsx(Layout, { children: _jsx(StudentDashboard, {}) }) }) }), children: [_jsx(Route, { index: true, element: _jsx(StudentDashboardPage, {}) }), _jsx(Route, { path: "math", element: _jsx(StudentDashboard, { children: _jsx(MathProblemSolver, {}) }) }), _jsx(Route, { path: "chat", element: _jsx(StudentDashboard, { children: _jsx(ChatPage, {}) }) })] }), _jsxs(Route, { path: "/teacher", element: _jsx(ProtectedRoute, { children: _jsx(RoleBasedRoute, { role: "teacher", children: _jsx(Layout, { children: _jsx(TeacherDashboard, {}) }) }) }), children: [_jsx(Route, { index: true, element: _jsx(TeacherDashboardPage, {}) }), _jsx(Route, { path: "students", element: _jsx(TeacherDashboard, { children: _jsx("div", { children: "Students Management" }) }) }), _jsx(Route, { path: "students/:studentId", element: _jsx(TeacherDashboard, { children: _jsx(StudentProgress, {}) }) }), _jsx(Route, { path: "progress", element: _jsx(TeacherDashboard, { children: _jsx("div", { children: "Progress Overview" }) }) }), _jsx(Route, { path: "chat", element: _jsx(TeacherDashboard, { children: _jsx(ChatPage, {}) }) })] }), _jsx(Route, { path: "*", element: _jsx(Layout, { children: _jsx(NotFoundPage, {}) }) })] }), _jsx(Toaster, { position: "top-right" })] }));
}
export default App;
