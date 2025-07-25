import { Link } from 'react-router-dom';
import { useGetLearningGoalsQuery, useDeleteLearningGoalMutation } from '../../features/goal/goalApi';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { FiTrash2 } from 'react-icons/fi';

export default function LearningGoalsListPage() {
  const { data: goals, isLoading, error } = useGetLearningGoalsQuery();
  const [deleteLearningGoal, { isLoading: isDeleting }] = useDeleteLearningGoalMutation();

  const handleDelete = async (goalId: string, goalSubject: string) => {
    if (window.confirm(`Are you sure you want to delete the plan "${goalSubject}"? This action is irreversible.`)) {
      try {
        await deleteLearningGoal(goalId).unwrap();
        toast.success('Learning plan deleted successfully.');
        // refetch() is no longer needed, invalidatesTags will do the job
      } catch (err) {
        toast.error('Failed to delete plan.');
        console.error(err);
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading learning plans.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Learning Plans</h1>
        <Link
          to="/teacher/create-goal"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          + Create New Plan
        </Link>
      </div>
      <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {goals && goals.length > 0 ? (
            goals.map((goal) => (
              <li key={goal.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <Link to={`/teacher/goals/${goal.id}/edit`} className="block flex-grow">
                    <div>
                      <p className="text-sm font-medium text-gray-600 truncate">{goal.subject}</p>
                      <p className="text-sm text-gray-500">For student: {goal.student?.firstName} {goal.student?.lastName}</p>
                    </div>
                  </Link>
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {goal.sections?.length || 0} section(s)
                    </p>
                    <button
                      onClick={() => handleDelete(goal.id, goal.subject)}
                      disabled={isDeleting}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Delete plan"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="p-8 text-center text-gray-500">
              You haven't created any learning plans yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
