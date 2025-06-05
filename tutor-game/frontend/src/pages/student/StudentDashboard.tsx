import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { BookOpenIcon, TrophyIcon, LightBulbIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

type ProgressData = {
  level: number;
  experience: number;
  nextLevelExp: number;
  completedChapters: number;
  totalChapters: number;
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
  }[];
  recentActivity: {
    id: string;
    title: string;
    type: 'chapter' | 'quiz' | 'achievement';
    date: string;
    completed: boolean;
  }[];
};

export default function StudentDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [progressData, setProgressData] = useState<ProgressData>({
    level: 1,
    experience: 0,
    nextLevelExp: 100,
    completedChapters: 0,
    totalChapters: 10,
    badges: [],
    recentActivity: [],
  });

  useEffect(() => {
    // Simulate API call
    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would be an API call
        // const response = await api.get('/api/student/progress');
        // setProgressData(response.data);
        
        // Mock data for now
        setTimeout(() => {
          setProgressData({
            level: 3,
            experience: 75,
            nextLevelExp: 200,
            completedChapters: 5,
            totalChapters: 10,
            badges: [
              { id: '1', name: 'First Steps', description: 'Complete your first chapter', icon: '🏆', earned: true },
              { id: '2', name: 'Math Whiz', description: 'Solve 10 math problems correctly', icon: '🧮', earned: true },
              { id: '3', name: 'Story Master', description: 'Complete 5 story chapters', icon: '📖', earned: false },
            ],
            recentActivity: [
              { id: '1', title: 'Completed Chapter 2: The Magic Forest', type: 'chapter', date: new Date().toISOString(), completed: true },
              { id: '2', title: 'Solved 5/5 Math Problems', type: 'quiz', date: new Date(Date.now() - 86400000).toISOString(), completed: true },
              { id: '3', title: 'Earned Math Whiz Badge', type: 'achievement', date: new Date(Date.now() - 2 * 86400000).toISOString(), completed: true },
            ],
          });
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to load progress data');
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const progressPercentage = Math.min(
    100,
    (progressData.experience / progressData.nextLevelExp) * 100
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
              <BookOpenIcon className="h-8 w-8 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Continue your math adventure where you left off.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Level Progress */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Level {progressData.level}
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {progressData.experience} / {progressData.nextLevelExp} XP
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-5">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Completed */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <BookOpenIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Chapters Completed
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {progressData.completedChapters} / {progressData.totalChapters}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-5">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{
                    width: `${
                      (progressData.completedChapters / progressData.totalChapters) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Earned */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Badges Earned
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {progressData.badges.filter((b) => b.earned).length} /{' '}
                      {progressData.badges.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-5">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-yellow-500 h-2.5 rounded-full"
                  style={{
                    width: `${
                      progressData.badges.length > 0
                        ? (progressData.badges.filter((b) => b.earned).length /
                            progressData.badges.length) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/student/story"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <BookOpenIcon className="mr-2 h-5 w-5" />
              Continue Story
            </Link>
            <Link
              to="/student/math"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LightBulbIcon className="mr-2 h-5 w-5" />
              Practice Math
            </Link>
            <Link
              to="/student/progress"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ChartBarIcon className="mr-2 h-5 w-5" />
              View Progress
            </Link>
            <Link
              to="/student/badges"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <TrophyIcon className="mr-2 h-5 w-5" />
              My Badges
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {progressData.recentActivity.length > 0 ? (
              progressData.recentActivity.map((activity) => (
                <li key={activity.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {activity.type === 'chapter' && (
                        <BookOpenIcon className="h-5 w-5 text-indigo-500" />
                      )}
                      {activity.type === 'quiz' && (
                        <LightBulbIcon className="h-5 w-5 text-green-500" />
                      )}
                      {activity.type === 'achievement' && (
                        <TrophyIcon className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.completed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {activity.completed ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                No recent activity. Start your first chapter!
              </li>
            )}
          </ul>
        </div>
        {progressData.recentActivity.length > 0 && (
          <div className="bg-gray-50 px-4 py-4 sm:px-6 text-right">
            <Link
              to="/student/activity"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all activity
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
