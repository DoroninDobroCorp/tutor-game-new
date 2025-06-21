import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../../app/hooks'; // Импорт верный
import { 
  setInitialUnreadCounts, 
  incrementUnreadCount, 
  clearUnreadCount
} from './chatSlice';
import { PaperAirplaneIcon, UserCircleIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

// Типы, вынесенные для чистоты
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
  // --- ИСПРАВЛЕНИЕ ОПЕЧАТКИ ---
  const dispatch = useAppDispatch(); // Теперь здесь правильное имя useAppDispatch
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Этот useEffect будет автоматически выбирать первого пользователя из списка,
  // когда список загружается.
  useEffect(() => {
    // Если список пользователей загружен, а активный чат еще не выбран
    if (users.length > 0 && !selectedUser) {
        console.log('[WebSocket Client] Пользователи загружены, автоматически выбираем первого:', users[0].name);
        setSelectedUser(users[0]);
    }
  }, [users]); // Зависимость только от `users`
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadCounts = useAppSelector((state) => state.chat.unreadCounts);

  useEffect(() => {
    // 1. Условие выхода: не подключаемся, если нет пользователя или токена.
    if (!user || !token) {
        console.log('[WebSocket Client] Пользователь не аутентифицирован, пропускаем подключение.');
        return;
    }

    // 2. Лог, который покажет, что мы пытаемся подключиться.
    console.log('[WebSocket Client] Попытка подключения к сокету...');

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'], // Используем только WebSocket для стабильности
        reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // 3. Обработчики событий
    socket.on('connect', () => {
        console.log(`[WebSocket Client] УСПЕШНО ПОДКЛЮЧЕНО с ID: ${socket.id}. Отправляем событие "getUsers".`);
        setIsConnected(true);
        socket.emit('getUsers'); // <-- Ключевое событие
    });

    socket.on('disconnect', (reason) => {
        console.warn(`[WebSocket Client] Отключено. Причина: ${reason}`);
        setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
        console.error('[WebSocket Client] Ошибка подключения:', error);
    });

    socket.on('users', (usersList: ChatUser[]) => {
        console.log('[WebSocket Client] Получено событие "users" со списком:', usersList);
        const uniqueUsers = Array.from(new Map(usersList.map(item => [item.id, item])).values());
        setUsers(uniqueUsers);
    });
    
    // Здесь оставьте все остальные ваши обработчики: 'message', 'initialUnreadCounts' и т.д.
    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== user?.id) {
        if (selectedUser?.id !== message.senderId || document.hidden) {
          dispatch(incrementUnreadCount(message.senderId));
        } else {
          socket.emit('markAsRead', { messageId: message.id });
        }
      }
    });

    socket.on('messages', (messages: Message[]) => {
        setMessages(messages);
    });

    socket.on('initialUnreadCounts', (counts: Record<string, number>) => {
        dispatch(setInitialUnreadCounts(counts));
    });
    
    socket.on('user_status_change', ({ userId, status }: { userId: string, status: 'online' | 'offline' }) => {
        setUsers(prevUsers => prevUsers.map(u => 
            u.id === userId ? { ...u, isOnline: status === 'online' } : u
        ));
    });


    // 4. Функция очистки: отключаемся при размонтировании компонента.
    return () => {
        console.log('[WebSocket Client] Компонент размонтирован. Отключаем сокет.');
        socket.disconnect();
    };
  }, [user, token, dispatch]); // Зависимости: хук сработает только при входе/выходе пользователя.

  
  // Загрузка истории для выбранного пользователя
  useEffect(() => {
    if (selectedUser && socketRef.current?.connected) {
      socketRef.current?.emit('getMessages', { userId: selectedUser.id });
      dispatch(clearUnreadCount(selectedUser.id));
    }
  }, [selectedUser, dispatch]);


  // Авто-прокрутка
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socketRef.current) return;
    socketRef.current.emit('sendMessage', {
      content: newMessage,
      recipientId: selectedUser.id,
    });
    setNewMessage('');
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return <div>Пожалуйста, войдите, чтобы использовать чат.</div>;

  // JSX остается полным и без изменений
  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {user.role === 'teacher' ? 'Студенты' : 'Учителя'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users
            .filter((u) => u && u.id && u.id !== user.id)
            .map((userItem) => (
              <div
                key={userItem.id}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 ${
                  selectedUser?.id === userItem.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedUser(userItem)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center min-w-0">
                    <div className="relative">
                      {userItem.avatar ? (
                        <img src={userItem.avatar} alt={userItem.name} className="h-10 w-10 rounded-full"/>
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
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{userItem.name}</p>
                      <p className="text-xs text-gray-500 truncate">{userItem.isOnline ? 'Онлайн' : 'Офлайн'}</p>
                    </div>
                  </div>
                  {unreadCounts[userItem.id] > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {unreadCounts[userItem.id]}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="relative">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.name} className="h-10 w-10 rounded-full"/>
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
                <p className="text-sm font-medium text-gray-900">{selectedUser.name}</p>
                <p className="text-xs text-gray-500">{selectedUser.isOnline ? 'Онлайн' : 'Офлайн'}</p>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user.id
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 text-right ${
                          message.senderId === user.id ? 'text-indigo-200' : 'text-gray-500'
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

            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Напишите сообщение..."
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
            <p>Выберите собеседника, чтобы начать чат</p>
          </div>
        )}
      </div>
    </div>
  );
}