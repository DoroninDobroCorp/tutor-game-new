import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

export default function StudentDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  
  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome back, {user?.firstName || 'Student'}!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Outlet will render the matched child route component */}
        <Outlet />
      </div>
    </div>
  );
}
