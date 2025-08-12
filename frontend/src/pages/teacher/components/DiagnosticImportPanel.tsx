import { FiRefreshCcw, FiDownload } from 'react-icons/fi';
import { useGetLatestDiagnosticSummaryForGoalTeacherQuery } from '../../../features/goal/goalApi';
import Spinner from '../../../components/common/Spinner';

export interface SuggestedSection { sectionTitle: string; lessons: string[] }

export function DiagnosticImportPanel({ goalId, onImport }: { goalId: string; onImport: (sections: SuggestedSection[]) => void }) {
  const { data, isFetching, refetch } = useGetLatestDiagnosticSummaryForGoalTeacherQuery(goalId);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Сводка диагностики</h2>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2"><FiRefreshCcw />Обновить</button>
      </div>

      {isFetching ? (
        <div className="flex justify-center"><Spinner /></div>
      ) : !data?.exists ? (
        <div className="text-gray-500">Нет завершённой диагностики по этой цели</div>
      ) : (
        <div className="space-y-4">
          {data.summary && (
            <div className="flex gap-4 text-sm">
              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded">Excellent: <b>{data.summary.labels.EXCELLENT}</b></div>
              <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded">Refresh: <b>{data.summary.labels.REFRESH}</b></div>
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded">Unknown: <b>{data.summary.labels.UNKNOWN}</b></div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Предложенный план</h3>
            <div className="space-y-3">
              {data.suggestedRoadmap?.map((s, idx) => (
                <div key={idx} className="border rounded p-3 bg-gray-50">
                  <div className="font-semibold mb-1">{s.sectionTitle}</div>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {s.lessons.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => {
                if (data?.suggestedRoadmap?.length) {
                  onImport(data.suggestedRoadmap as SuggestedSection[]);
                }
              }}
            >
              <FiDownload /> Импортировать в план
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
