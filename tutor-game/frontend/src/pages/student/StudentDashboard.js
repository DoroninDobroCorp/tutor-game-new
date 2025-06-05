import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
export default function StudentDashboard({ children }) {
    const { user } = useAppSelector((state) => state.auth);
    // If children are provided, render them in a container
    if (children) {
        return _jsx("div", { className: "w-full", children: children });
    }
    // Otherwise, render the default dashboard content
    return (_jsxs("div", { className: "p-6", children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800 mb-6", children: ["Welcome back, ", user?.firstName || 'Student', "!"] }), _jsxs("div", { className: "bg-white p-6 rounded-lg shadow", children: [_jsx("p", { className: "text-gray-600 mb-4", children: "Select an option to get started:" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs(Link, { to: "/student", className: "p-4 border rounded-lg hover:bg-gray-50 transition-colors", children: [_jsx("h3", { className: "font-medium text-lg", children: "Story Mode" }), _jsx("p", { className: "text-sm text-gray-500", children: "Continue your learning journey" })] }), _jsxs(Link, { to: "/student/math", className: "p-4 border rounded-lg hover:bg-gray-50 transition-colors", children: [_jsx("h3", { className: "font-medium text-lg", children: "Math Problems" }), _jsx("p", { className: "text-sm text-gray-500", children: "Practice your math skills" })] })] })] })] }));
}
