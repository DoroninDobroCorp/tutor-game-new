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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {user.role === 'teacher' ? 'Student Messages' : 'Chat with Teachers'}
      </h1>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Chat />
      </div>
    </div>
  );
}
