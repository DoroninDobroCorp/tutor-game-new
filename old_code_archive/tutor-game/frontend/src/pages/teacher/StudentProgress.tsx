import React from 'react';
import { useParams } from 'react-router-dom';

const StudentProgress: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  
  // Mock data - in a real app, this would come from an API
  const studentData = {
    id: studentId || '123',
    name: 'John Doe',
    email: 'john@example.com',
    level: 5,
    experience: 1250,
    nextLevelExp: 1500,
    completedLessons: 12,
    averageScore: 85,
    lastActive: '2023-06-01T14:30:00Z',
    progress: [
      { topic: 'Algebra', progress: 75 },
      { topic: 'Geometry', progress: 60 },
      { topic: 'Calculus', progress: 90 },
    ],
    recentActivities: [
      { id: 1, activity: 'Completed lesson: Quadratic Equations', date: '2023-06-01T14:30:00Z' },
      { id: 2, activity: 'Earned badge: Math Whiz', date: '2023-05-30T10:15:00Z' },
      { id: 3, activity: 'Completed quiz: Linear Algebra', score: 90, date: '2023-05-28T16:45:00Z' },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Progress</h1>
        <div className="text-sm text-gray-500">
          Last active: {new Date(studentData.lastActive).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Student Information</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {studentData.name}</p>
            <p><span className="font-medium">Email:</span> {studentData.email}</p>
            <p><span className="font-medium">Level:</span> {studentData.level}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Progress</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Experience:</span> {studentData.experience}/{studentData.nextLevelExp} XP</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${(studentData.experience / studentData.nextLevelExp) * 100}%` }}
              ></div>
            </div>
            <p><span className="font-medium">Completed Lessons:</span> {studentData.completedLessons}</p>
            <p><span className="font-medium">Average Score:</span> {studentData.averageScore}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Topic Mastery</h3>
          <div className="space-y-2">
            {studentData.progress.map((topic) => (
              <div key={topic.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{topic.topic}</span>
                  <span>{topic.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${topic.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {studentData.recentActivities.map((activity) => (
            <div key={activity.id} className="border-b pb-2 last:border-0 last:pb-0">
              <div className="flex justify-between">
                <p>{activity.activity}</p>
                <span className="text-sm text-gray-500">
                  {new Date(activity.date).toLocaleDateString()}
                </span>
              </div>
              {'score' in activity && (
                <div className="text-sm text-gray-600 mt-1">
                  Score: {activity.score}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;
