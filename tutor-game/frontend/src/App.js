import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppSelector } from './app/hooks';
import { selectCurrentToken } from './features/auth/authSlice';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/StudentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MathProblemSolver from './pages/student/MathProblemSolver';
import StudentProgress from './pages/teacher/StudentProgress';
import ChatPage from './pages/chat/ChatPage';
import NotFoundPage from './pages/NotFoundPage';
// Temporary component for development
const StoryGenerator = () => _jsx("div", { children: "Story Generator (Coming Soon)" });
// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const token = useAppSelector(selectCurrentToken);
    if (!token) {
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
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Layout, { children: _jsx(HomePage, {}) }) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsxs(Route, { path: "/student", element: _jsx(ProtectedRoute, { children: _jsx(RoleBasedRoute, { role: "student", children: _jsx(Layout, { children: _jsx(StudentDashboard, {}) }) }) }), children: [_jsx(Route, { index: true, element: _jsx(StudentDashboard, {}) }), _jsx(Route, { path: "math", element: _jsx(StudentDashboard, { children: _jsx(MathProblemSolver, {}) }) }), _jsx(Route, { path: "chat", element: _jsx(StudentDashboard, { children: _jsx(ChatPage, {}) }) })] }), _jsxs(Route, { path: "/teacher", element: _jsx(ProtectedRoute, { children: _jsx(RoleBasedRoute, { role: "teacher", children: _jsx(Layout, { children: _jsx(TeacherDashboard, {}) }) }) }), children: [_jsx(Route, { index: true, element: _jsx(TeacherDashboard, {}) }), _jsx(Route, { path: "students", element: _jsx(TeacherDashboard, { children: _jsx("div", { children: "Students Management" }) }) }), _jsx(Route, { path: "students/:studentId", element: _jsx(TeacherDashboard, { children: _jsx(StudentProgress, {}) }) }), _jsx(Route, { path: "progress", element: _jsx(TeacherDashboard, { children: _jsx("div", { children: "Progress Overview" }) }) }), _jsx(Route, { path: "chat", element: _jsx(TeacherDashboard, { children: _jsx(ChatPage, {}) }) })] }), _jsx(Route, { path: "*", element: _jsx(Layout, { children: _jsx(NotFoundPage, {}) }) })] }), _jsx(Toaster, { position: "top-right" })] }));
}
export default App;
