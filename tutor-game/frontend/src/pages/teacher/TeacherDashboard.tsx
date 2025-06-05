import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { Navigate } from 'react-router-dom';

interface TeacherDashboardProps {
  children?: ReactNode;
}

export default function TeacherDashboard({ children }: TeacherDashboardProps) {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If children are provided, render them in a container
  if (children) {
    return <div className="w-full">{children}</div>;
  }

  // Otherwise, render the default dashboard content
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {user.firstName || 'Teacher'}!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600 mb-4">Teacher Dashboard Options:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/teacher/students" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">Manage Students</h3>
            <p className="text-sm text-gray-500">View and manage your students</p>
          </Link>
          <Link 
            to="/teacher/progress" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">View Progress</h3>
            <p className="text-sm text-gray-500">Track student progress</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
