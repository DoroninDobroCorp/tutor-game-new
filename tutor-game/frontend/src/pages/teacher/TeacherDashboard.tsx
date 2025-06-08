import { Outlet, Navigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

export default function TeacherDashboard() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {user.firstName || 'Teacher'}!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Outlet will render the matched child route component */}
        <Outlet />
      </div>
    </div>
  );
}
