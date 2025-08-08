// Файл: tutor-game/frontend/src/components/common/WebSocketManager.tsx
// Версия: Полная, исправленная и готовая к работе

import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { addMessage } from '../../features/chat/chatSlice';
import { SocketContext } from '../../context/SocketContext';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { StudentSubmittedLessonEvent, TeacherReviewedLessonEvent, StudentRequestedReviewEvent } from '../../types/websocket';
import { useTranslation } from 'react-i18next';

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { t: translate } = useTranslation();
  const { user, token } = useAppSelector((state) => ({
    user: state.auth.user,
    token: state.auth.token,
  }));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);

  // Обработчик для уведомления УЧИТЕЛЯ, когда ученик сдал урок
  const handleStudentSubmitted = useCallback((data: StudentSubmittedLessonEvent) => {
    console.log('📬 [WebSocket] Received student_submitted_lesson:', data);
    toast.custom(
      (t) => (
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">📚</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{translate('webSocket.newStudentAnswer')}</p>
                <p className="mt-1 text-sm text-gray-500">{translate('webSocket.studentWaitingForStory', { name: data.studentName })}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                // Переходим прямо в редактор нужного плана
                navigate(`/teacher/goals/${data.goalId}/edit`);
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium brand-text hover:opacity-90 focus:outline-none focus:ring-2"
            >
              {translate('webSocket.goTo')}
            </button>
          </div>
        </div>
      ), { 
        duration: Infinity, // Уведомление будет "висеть" до закрытия
        position: 'top-right' 
      }
    );
  }, [navigate, translate]);

  // Handler for when student requests a review lesson
  const handleStudentRequestedReview = useCallback((data: StudentRequestedReviewEvent) => {
    console.log('📬 [WebSocket] Received student_requested_review:', data);
    toast.custom(
      (t) => (
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-lg">💡</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{translate('webSocket.reviewRequest')}</p>
                <p className="mt-1 text-sm text-gray-500">{data.message}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                navigate(`/teacher/goals/${data.goalId}/edit`);
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium brand-text hover:opacity-90 focus:outline-none focus:ring-2"
            >
              {translate('webSocket.toPlan')}
            </button>
          </div>
        </div>
      ), { 
        duration: Infinity, 
        position: 'top-right' 
      }
    );
  }, [navigate, translate]);

  // Обработчик для уведомления СТУДЕНТА, когда учитель утвердил урок
  const handleTeacherReviewed = useCallback((data: TeacherReviewedLessonEvent) => {
    console.log('✅ [WebSocket] Received teacher_reviewed_lesson:', data);
    toast.custom(
      (t) => (
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
           <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                 <span className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🎉</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{translate('webSocket.newAdventureWaiting')}</p>
                <p className="mt-1 text-sm text-gray-500">{translate('webSocket.teacherPreparedContinuation', { name: data.teacherName })}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                // Переходим на страницу приключения
                navigate('/student/adventure');
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium brand-text hover:opacity-90 focus:outline-none focus:ring-2"
            >
              {translate('webSocket.start')}
            </button>
          </div>
        </div>
      ), { 
        duration: Infinity, // Уведомление будет "висеть" до закрытия
        position: 'top-right' 
      }
    );
  }, [navigate, translate]);

  useEffect(() => {
    if (user && token) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      setSocket(newSocket);

      // --- Единое место для всех слушателей ---
      newSocket.on('connect', () => console.log('[WebSocket] Connected to server.'));
      newSocket.on('disconnect', () => console.log('[WebSocket] Disconnected from server.'));

      // Слушатель для чата
      newSocket.on('message', (message: any) => {
        // Оптимистичное обновление для мгновенного отклика UI
        dispatch(addMessage({ message, currentUserId: user.id }));
      });

      // Слушатели для событий урока
      newSocket.on('student_submitted_lesson', handleStudentSubmitted);
      newSocket.on('student_requested_review', handleStudentRequestedReview);
      newSocket.on('teacher_reviewed_lesson', handleTeacherReviewed);
      
      // Функция очистки при размонтировании компонента
      return () => {
        console.log('[WebSocket] Disconnecting socket.');
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('message');
        newSocket.off('student_submitted_lesson');
        newSocket.off('student_requested_review');
        newSocket.off('teacher_reviewed_lesson');
        newSocket.disconnect();
      };
    }
  }, [user, token, dispatch, handleStudentSubmitted, handleTeacherReviewed, handleStudentRequestedReview]);

  return (
    <SocketContext.Provider value={socket}>
      <Toaster />
      {children}
    </SocketContext.Provider>
  );
};
