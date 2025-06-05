import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { Navigate } from 'react-router-dom';
export default function TeacherDashboard({ children }) {
    const { user } = useAppSelector((state) => state.auth);
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    // If children are provided, render them in a container
    if (children) {
        return _jsx("div", { className: "w-full", children: children });
    }
    // Otherwise, render the default dashboard content
    return (_jsxs("div", { className: "p-6", children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800 mb-6", children: ["Welcome, ", user.firstName || 'Teacher', "!"] }), _jsxs("div", { className: "bg-white p-6 rounded-lg shadow", children: [_jsx("p", { className: "text-gray-600 mb-4", children: "Teacher Dashboard Options:" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs(Link, { to: "/teacher/students", className: "p-4 border rounded-lg hover:bg-gray-50 transition-colors", children: [_jsx("h3", { className: "font-medium text-lg", children: "Manage Students" }), _jsx("p", { className: "text-sm text-gray-500", children: "View and manage your students" })] }), _jsxs(Link, { to: "/teacher/progress", className: "p-4 border rounded-lg hover:bg-gray-50 transition-colors", children: [_jsx("h3", { className: "font-medium text-lg", children: "View Progress" }), _jsx("p", { className: "text-sm text-gray-500", children: "Track student progress" })] })] })] })] }));
}
