import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAppSelector } from '../../app/hooks';
import { PaperAirplaneIcon, UserCircleIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
export default function Chat() {
    const { user } = useAppSelector((state) => state.auth);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    // Initialize WebSocket connection
    useEffect(() => {
        if (!user)
            return;
        // In a real app, use your backend URL from environment variables
        const socket = io('http://localhost:3001', {
            auth: {
                token: localStorage.getItem('token'),
            },
            query: {
                userId: user.id,
                role: user.role,
            },
        });
        socketRef.current = socket;
        // Connection events
        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            setIsConnected(true);
        });
        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setIsConnected(false);
        });
        // Message events
        socket.on('message', (message) => {
            setMessages((prev) => [...prev, message]);
            // Mark as read if it's the active chat
            if (selectedUser?.id === message.senderId) {
                socket.emit('markAsRead', { messageId: message.id });
            }
        });
        socket.on('messages', (messages) => {
            setMessages(messages);
        });
        socket.on('users', (usersList) => {
            setUsers(usersList);
        });
        // Initial data fetch
        socket.emit('getUsers');
        // Clean up on unmount
        return () => {
            socket.disconnect();
        };
    }, [user]);
    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    // Load conversation when selecting a user
    useEffect(() => {
        if (selectedUser && socketRef.current?.connected) {
            socketRef.current.emit('getMessages', { userId: selectedUser.id });
        }
    }, [selectedUser]);
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser || !socketRef.current)
            return;
        const message = {
            content: newMessage,
            recipientId: selectedUser.id,
        };
        socketRef.current.emit('sendMessage', message);
        setNewMessage('');
    };
    const formatTime = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    if (!user)
        return _jsx("div", { children: "Please log in to use the chat" });
    return (_jsxs("div", { className: "flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden", children: [_jsxs("div", { className: "w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col", children: [_jsx("div", { className: "p-4 border-b border-gray-200", children: _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: user.role === 'teacher' ? 'Students' : 'Teachers' }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: users
                            .filter((u) => u.id !== user.id)
                            .map((userItem) => (_jsx("div", { className: `p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 ${selectedUser?.id === userItem.id ? 'bg-blue-50' : ''}`, onClick: () => setSelectedUser(userItem), children: _jsxs("div", { className: "flex items-center", children: [_jsxs("div", { className: "relative", children: [userItem.avatar ? (_jsx("img", { src: userItem.avatar, alt: userItem.name, className: "h-10 w-10 rounded-full" })) : (_jsx("div", { className: "h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center", children: userItem.role === 'teacher' ? (_jsx(AcademicCapIcon, { className: "h-6 w-6 text-indigo-600" })) : (_jsx(UserCircleIcon, { className: "h-6 w-6 text-indigo-600" })) })), userItem.isOnline && (_jsx("span", { className: "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" }))] }), _jsxs("div", { className: "ml-3", children: [_jsxs("p", { className: "text-sm font-medium text-gray-900", children: [userItem.name, userItem.role === 'teacher' && (_jsx("span", { className: "ml-1 text-xs text-indigo-600", children: "Teacher" }))] }), _jsx("p", { className: "text-xs text-gray-500", children: userItem.isOnline ? 'Online' : 'Offline' })] })] }) }, userItem.id))) })] }), _jsx("div", { className: "flex-1 flex flex-col", children: selectedUser ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p-4 border-b border-gray-200 flex items-center", children: [_jsxs("div", { className: "relative", children: [selectedUser.avatar ? (_jsx("img", { src: selectedUser.avatar, alt: selectedUser.name, className: "h-10 w-10 rounded-full" })) : (_jsx("div", { className: "h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center", children: selectedUser.role === 'teacher' ? (_jsx(AcademicCapIcon, { className: "h-6 w-6 text-indigo-600" })) : (_jsx(UserCircleIcon, { className: "h-6 w-6 text-indigo-600" })) })), selectedUser.isOnline && (_jsx("span", { className: "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" }))] }), _jsxs("div", { className: "ml-3", children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: selectedUser.name }), _jsx("p", { className: "text-xs text-gray-500", children: selectedUser.isOnline ? 'Online' : 'Offline' })] })] }), _jsx("div", { className: "flex-1 p-4 overflow-y-auto bg-gray-50", children: _jsxs("div", { className: "space-y-4", children: [messages.map((message) => (_jsx("div", { className: `flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderId === user.id
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`, children: [_jsx("p", { className: "text-sm", children: message.content }), _jsx("p", { className: `text-xs mt-1 text-right ${message.senderId === user.id
                                                        ? 'text-indigo-200'
                                                        : 'text-gray-500'}`, children: formatTime(message.timestamp) })] }) }, message.id))), _jsx("div", { ref: messagesEndRef })] }) }), _jsx("div", { className: "p-4 border-t border-gray-200", children: _jsxs("form", { onSubmit: handleSendMessage, className: "flex space-x-2", children: [_jsx("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), placeholder: "Type a message...", className: "flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500", disabled: !isConnected }), _jsx("button", { type: "submit", disabled: !newMessage.trim() || !isConnected, className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed", children: _jsx(PaperAirplaneIcon, { className: "h-5 w-5 -rotate-45" }) })] }) })] })) : (_jsx("div", { className: "flex-1 flex items-center justify-center text-gray-500", children: _jsx("p", { children: "Select a user to start chatting" }) })) })] }));
}
