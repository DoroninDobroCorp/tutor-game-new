import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { addMessage } from '../../features/chat/chatSlice';
import { SocketContext } from '../../context/SocketContext';



export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Подключаемся, только если есть пользователь и токен
    if (user && token) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('[WebSocketManager] Connected to server.');
      });

      // --- ГЛАВНОЕ ИЗМЕНЕНИЕ ---
      // Ловим ВСЕ сообщения и отправляем в Redux.
      // Логика "для меня / не для меня" будет внутри редьюсера.
      newSocket.on('message', (message: any) => {
        console.log('[WebSocketManager] Received message, dispatching addMessage.');
        // Передаем и само сообщение, и ID текущего пользователя для логики в редьюсере
        dispatch(addMessage({ message, currentUserId: user.id }));
      });
      
      newSocket.on('disconnect', () => {
        console.log('[WebSocketManager] Disconnected.');
      });

      // Функция очистки при выходе пользователя
      return () => {
        console.log('[WebSocketManager] Disconnecting socket.');
        newSocket.disconnect();
      };
    }
  }, [user, token, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
