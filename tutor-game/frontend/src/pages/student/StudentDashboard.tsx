import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

interface StudentDashboardProps {
  children?: ReactNode;
}

export default function StudentDashboard({ children }: StudentDashboardProps) {
  const { user } = useAppSelector((state) => state.auth);
  
  // If children are provided, render them in a container
  if (children) {
    return <div className="w-full">{children}</div>;
  }
  
  // Otherwise, render the default dashboard content
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome back, {user?.firstName || 'Student'}!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600 mb-4">Select an option to get started:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/student" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">Story Mode</h3>
            <p className="text-sm text-gray-500">Continue your learning journey</p>
          </Link>
          <Link 
            to="/student/math" 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">Math Problems</h3>
            <p className="text-sm text-gray-500">Practice your math skills</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
