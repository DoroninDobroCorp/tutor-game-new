import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export const TeacherDashboardPage = () => {
  // Get user data from Redux
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="container mx-auto mt-10 p-5">
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome, {user?.fullName || 'Teacher'}!
      </h1>
      <p className="mt-2 text-lg text-gray-600">
        This is your Teacher Dashboard. Let's create something new.
      </p>
      <div className="mt-6">
        <Link
          to="/game-constructor"
          className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Create New Game
        </Link>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
