import { useGetStudentAchievementsQuery } from '../../features/achievements/achievementsApi';

export default function StudentAchievementsPage() {
  const { data = [], isLoading, isError } = useGetStudentAchievementsQuery();

  if (isLoading) return <div className="p-6">Loading achievements...</div>;
  if (isError) return <div className="p-6 text-red-600">Failed to load achievements.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Achievements</h1>
      {data.length === 0 ? (
        <div className="text-gray-600">No achievements yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((a) => (
            <div key={a.id} className="card">
              {a.imageUrl && (
                <img src={a.imageUrl} alt={a.title} className="w-full h-40 object-cover rounded-lg" />
              )}
              <div className="mt-3">
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm text-gray-600">{a.reason}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
