import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export const StudentDashboardPage = () => {
  // Get user data from Redux to display a personalized greeting
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="container mx-auto mt-10 p-5">
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome, {user?.fullName || 'Student'}!
      </h1>
      <p className="mt-2 text-lg text-gray-600">
        This is your personal dashboard. Let's start learning!
      </p>
      <div className="mt-6">
        <Link
          to="/game"
          className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Go to Game
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
