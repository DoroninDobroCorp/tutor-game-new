import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import Chat from '../../features/chat/Chat';
export default function ChatPage() {
    const { user } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();
    // Redirect to login if not authenticated
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);
    if (!user) {
        return null; // or a loading spinner
    }
    return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800 mb-6", children: user.role === 'teacher' ? 'Student Messages' : 'Chat with Teachers' }), _jsx("div", { className: "bg-white rounded-lg shadow-md overflow-hidden", children: _jsx(Chat, {}) })] }));
}
