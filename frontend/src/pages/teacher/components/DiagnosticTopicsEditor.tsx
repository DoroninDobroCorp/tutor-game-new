import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import { 
  useGetGoalTopicsQuery,
  useUpsertGoalTopicsMutation,
  useDeleteGoalTopicMutation
} from '../../../features/goal/goalApi';

interface TopicDraft { id?: string; title: string; description?: string | null }

export function DiagnosticTopicsEditor({ goalId }: { goalId: string }) {
  const { t } = useTranslation();
  const { data: topics, isLoading, refetch } = useGetGoalTopicsQuery(goalId);
  const [upsertTopics, { isLoading: isSaving }] = useUpsertGoalTopicsMutation();
  const [deleteTopic] = useDeleteGoalTopicMutation();

  const [drafts, setDrafts] = useState<TopicDraft[]>([]);

  useEffect(() => {
    if (topics) setDrafts(topics.map(t => ({ id: t.id, title: t.title, description: t.description ?? '' })));
  }, [topics]);

  const canSave = useMemo(() => drafts.every(d => d.title.trim().length > 0), [drafts]);

  const handleAdd = () => setDrafts(prev => [...prev, { title: '', description: '' }]);
  const handleRemove = async (index: number) => {
    const toRemove = drafts[index];
    if (toRemove?.id) {
      await deleteTopic({ goalId, topicId: toRemove.id }).unwrap();
      await refetch();
    } else {
      setDrafts(prev => prev.filter((_, i) => i !== index));
    }
  };
  const handleSave = async () => {
    await upsertTopics({ goalId, topics: drafts }).unwrap();
    await refetch();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t('diagnostics.topicsTitle', 'Диагностические темы')}</h2>
        <div className="flex gap-2">
          <button onClick={handleAdd} className="btn-secondary flex items-center gap-2"><FiPlus />{t('common.add', 'Добавить')}</button>
          <button onClick={handleSave} disabled={!canSave || isSaving} className="btn-primary flex items-center gap-2 disabled:opacity-50"><FiSave />{t('common.save', 'Сохранить')}</button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">{t('common.loading', 'Загрузка...')}</div>
      ) : (
        <div className="space-y-3">
          {drafts.length === 0 && <div className="text-gray-500">{t('diagnostics.noTopics', 'Тем пока нет')}</div>}
          {drafts.map((d, idx) => (
            <div key={d.id || `new-${idx}`} className="border rounded-md p-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input
                  value={d.title}
                  onChange={(e) => setDrafts(prev => prev.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))}
                  placeholder={t('diagnostics.topicTitle', 'Название темы') as string}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button onClick={() => handleRemove(idx)} className="text-red-600 hover:text-red-800 p-2" title={t('common.delete', 'Удалить') as string}>
                  <FiTrash2 />
                </button>
              </div>
              <textarea
                value={d.description || ''}
                onChange={(e) => setDrafts(prev => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                placeholder={t('diagnostics.topicDescription', 'Краткое описание (необязательно)') as string}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
