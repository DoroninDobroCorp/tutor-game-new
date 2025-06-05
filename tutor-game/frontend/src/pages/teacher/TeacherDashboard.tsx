import React from 'react';
import { useAppSelector } from '@/app/hooks';
import { Navigate } from 'react-router-dom';

const TeacherDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Teacher Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user.email}!</h2>
        <p className="text-gray-700">
          This is the teacher dashboard. Here you can manage your students, view their progress,
          and create new learning materials.
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboard;
