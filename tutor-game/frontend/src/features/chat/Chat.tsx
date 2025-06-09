import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../../app/hooks';
import { PaperAirplaneIcon, UserCircleIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  content: string;
  timestamp: Date;
  read: boolean;
};

type ChatUser = {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  avatar?: string;
  lastSeen?: Date;
  isOnline: boolean;
};

export default function Chat() {
  const { user, token } = useAppSelector((state) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) {
      // Don't attempt to connect if user is not authenticated or token is missing
      return;
    }

    // Only initialize socket if we have a valid user and token
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3002', {
      auth: {
        token: token,
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
    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      // Mark as read if it's the active chat
      if (selectedUser?.id === message.senderId) {
        socket.emit('markAsRead', { messageId: message.id });
      }
    });

    socket.on('messages', (messages: Message[]) => {
      setMessages(messages);
    });

    socket.on('users', (usersList: ChatUser[]) => {
      setUsers(usersList);
    });

    // Initial data fetch
    socket.emit('getUsers');

    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation when selecting a user or when connection is re-established
  useEffect(() => {
    if (selectedUser && isConnected) {
      socketRef.current?.emit('getMessages', { userId: selectedUser.id });
    }
  }, [selectedUser, isConnected]); // Reload messages when selected user changes or connection is re-established

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socketRef.current) return;

    const message = {
      content: newMessage,
      recipientId: selectedUser.id,
    };

    socketRef.current.emit('sendMessage', message);
    setNewMessage('');
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return <div>Please log in to use the chat</div>;

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {user.role === 'teacher' ? 'Students' : 'Teachers'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users
            .filter((u) => u.id !== user.id)
            .map((userItem) => (
              <div
                key={userItem.id}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 ${
                  selectedUser?.id === userItem.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedUser(userItem)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    {userItem.avatar ? (
                      <img
                        src={userItem.avatar}
                        alt={userItem.name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        {userItem.role === 'teacher' ? (
                          <AcademicCapIcon className="h-6 w-6 text-indigo-600" />
                        ) : (
                          <UserCircleIcon className="h-6 w-6 text-indigo-600" />
                        )}
                      </div>
                    )}
                    {userItem.isOnline && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {userItem.name}
                      {userItem.role === 'teacher' && (
                        <span className="ml-1 text-xs text-indigo-600">
                          Teacher
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userItem.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="relative">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    {selectedUser.role === 'teacher' ? (
                      <AcademicCapIcon className="h-6 w-6 text-indigo-600" />
                    ) : (
                      <UserCircleIcon className="h-6 w-6 text-indigo-600" />
                    )}
                  </div>
                )}
                {selectedUser.isOnline && (
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {selectedUser.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedUser.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user.id
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 text-right ${
                          message.senderId === user.id
                            ? 'text-indigo-200'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !isConnected}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
