import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
const StudentProgress = () => {
    const { studentId } = useParams();
    // Mock data - in a real app, this would come from an API
    const studentData = {
        id: studentId || '123',
        name: 'John Doe',
        email: 'john@example.com',
        level: 5,
        experience: 1250,
        nextLevelExp: 1500,
        completedLessons: 12,
        averageScore: 85,
        lastActive: '2023-06-01T14:30:00Z',
        progress: [
            { topic: 'Algebra', progress: 75 },
            { topic: 'Geometry', progress: 60 },
            { topic: 'Calculus', progress: 90 },
        ],
        recentActivities: [
            { id: 1, activity: 'Completed lesson: Quadratic Equations', date: '2023-06-01T14:30:00Z' },
            { id: 2, activity: 'Earned badge: Math Whiz', date: '2023-05-30T10:15:00Z' },
            { id: 3, activity: 'Completed quiz: Linear Algebra', score: 90, date: '2023-05-28T16:45:00Z' },
        ],
    };
    return (_jsxs("div", { className: "max-w-6xl mx-auto p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Student Progress" }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Last active: ", new Date(studentData.lastActive).toLocaleString()] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8", children: [_jsxs("div", { className: "bg-white p-6 rounded-lg shadow", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Student Information" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Name:" }), " ", studentData.name] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Email:" }), " ", studentData.email] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Level:" }), " ", studentData.level] })] })] }), _jsxs("div", { className: "bg-white p-6 rounded-lg shadow", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Progress" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Experience:" }), " ", studentData.experience, "/", studentData.nextLevelExp, " XP"] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: "bg-blue-600 h-2.5 rounded-full", style: { width: `${(studentData.experience / studentData.nextLevelExp) * 100}%` } }) }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Completed Lessons:" }), " ", studentData.completedLessons] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Average Score:" }), " ", studentData.averageScore, "%"] })] })] }), _jsxs("div", { className: "bg-white p-6 rounded-lg shadow", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Topic Mastery" }), _jsx("div", { className: "space-y-2", children: studentData.progress.map((topic) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { children: topic.topic }), _jsxs("span", { children: [topic.progress, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-green-500 h-2 rounded-full", style: { width: `${topic.progress}%` } }) })] }, topic.topic))) })] })] }), _jsxs("div", { className: "bg-white p-6 rounded-lg shadow", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Recent Activity" }), _jsx("div", { className: "space-y-4", children: studentData.recentActivities.map((activity) => (_jsxs("div", { className: "border-b pb-2 last:border-0 last:pb-0", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("p", { children: activity.activity }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(activity.date).toLocaleDateString() })] }), 'score' in activity && (_jsxs("div", { className: "text-sm text-gray-600 mt-1", children: ["Score: ", activity.score, "%"] }))] }, activity.id))) })] })] }));
};
export default StudentProgress;
