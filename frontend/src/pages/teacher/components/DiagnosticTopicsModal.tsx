import React, { useEffect, useState } from 'react';
import { FiX, FiRefreshCw, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useGenerateDiagnosticTopicsMutation } from '../../../features/goal/goalApi';
import { useSaveDiagnosticTopicsMutation } from '../../../features/lesson/lessonApi';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface DiagnosticTopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  lessonId: string;
  initialTopics?: any[];
}

type TopicRow = { title: string; firstQuestion?: string };

export const DiagnosticTopicsModal: React.FC<DiagnosticTopicsModalProps> = ({ isOpen, onClose, goalId, lessonId, initialTopics }) => {
  const { t } = useTranslation();
  const [topics, setTopics] = useState<TopicRow[]>(() =>
    (initialTopics || []).map((t: any) =>
      typeof t === 'string'
        ? { title: t }
        : { title: String(t?.title ?? ''), firstQuestion: String(t?.firstQuestion ?? '') }
    )
  );
  const [note, setNote] = useState('');
  const [generateTopics, { isLoading: isGenerating }] = useGenerateDiagnosticTopicsMutation();
  const [saveTopics, { isLoading: isSaving }] = useSaveDiagnosticTopicsMutation();

  useEffect(() => {
    if (isOpen) {
      const normalized: TopicRow[] = (initialTopics || []).map((t: any) =>
        typeof t === 'string'
          ? { title: t }
          : { title: String(t?.title ?? ''), firstQuestion: String(t?.firstQuestion ?? '') }
      );
      setTopics(normalized);
    }
  }, [isOpen, initialTopics]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      const res = await toast.promise(
        generateTopics({ goalId, teacherNote: note || undefined }).unwrap(),
        {
          loading: t('diagnostics.generating', { defaultValue: 'Генерация…' }),
          success: t('diagnostics.generated', { defaultValue: 'Темы сгенерированы' }),
          error: t('diagnostics.generateError', { defaultValue: 'Ошибка генерации тем' }),
        }
      );
      if (res?.topics?.length) {
        const mapped: TopicRow[] = (res.topics as any[]).map((x: any) => typeof x === 'string' ? { title: x } : { title: x.title || '', firstQuestion: x.firstQuestion || '' });
        setTopics(mapped);
      } else {
        toast.error(t('diagnostics.noTopicsGenerated', { defaultValue: 'Не удалось сгенерировать темы' }));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!topics.length) {
      toast.error(t('diagnostics.topicsRequired', { defaultValue: 'Добавьте хотя бы одну тему' }));
      return;
    }
    const cleaned = topics
      .map(t => ({
        title: (t.title || '').trim(),
        firstQuestion: (t.firstQuestion || '').trim() || undefined,
      }))
      .filter(t => !!t.title);
    try {
      await toast.promise(
        saveTopics({ lessonId, topics: cleaned }).unwrap(),
        {
          loading: t('diagnostics.saving', { defaultValue: 'Сохранение…' }),
          success: t('diagnostics.saved', { defaultValue: 'Темы сохранены' }),
          error: t('diagnostics.saveError', { defaultValue: 'Ошибка сохранения' }),
        }
      );
      onClose();
    } catch {}
  };

  const addTopic = () => setTopics([...topics, { title: '', firstQuestion: '' }]);
  const updateTopicField = (idx: number, field: keyof TopicRow, value: string) => {
    const next = [...topics];
    next[idx] = { ...next[idx], [field]: value };
    setTopics(next);
  };
  const removeTopic = (idx: number) => setTopics(topics.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('diagnostics.modalTitle', { defaultValue: 'Темы диагностики' })}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('diagnostics.teacherNote', { defaultValue: 'Пожелания к темам (необязательно)' })}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full border rounded-md p-2 disabled:opacity-70" disabled={isGenerating || isSaving} placeholder={t('diagnostics.notePlaceholder', { defaultValue: 'Например: больше по алгебре, меньше теории множеств' }) as string} />
            <button type="button" disabled={isGenerating} onClick={handleGenerate} className="mt-2 btn-secondary flex items-center gap-2 disabled:opacity-50">
              <FiRefreshCw className={isGenerating ? 'animate-spin' : ''} /> {isGenerating ? t('diagnostics.generating', { defaultValue: 'Генерация…' }) : t('diagnostics.generateTopics', { defaultValue: 'Сгенерировать темы' })}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{t('diagnostics.topicList', { defaultValue: 'Список тем' })}</h3>
              <button type="button" onClick={addTopic} disabled={isGenerating || isSaving} className="text-sm btn-secondary flex items-center gap-1 disabled:opacity-50"><FiPlus /> {t('common.add', { defaultValue: 'Добавить' })}</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {topics.map((topic, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input value={topic.title} onChange={(e) => updateTopicField(idx, 'title', e.target.value)} className="flex-1 border rounded-md p-2 disabled:opacity-70" disabled={isGenerating || isSaving} placeholder={t('diagnostics.topicPlaceholder', { defaultValue: 'Тема' }) as string} />
                    <button type="button" onClick={() => removeTopic(idx)} disabled={isGenerating || isSaving} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"><FiTrash2 /></button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('diagnostics.firstQuestion', { defaultValue: 'Первый вопрос (обязательно)' })}</label>
                    <input value={topic.firstQuestion || ''} onChange={(e) => updateTopicField(idx, 'firstQuestion', e.target.value)} className="w-full border rounded-md p-2 disabled:opacity-70" disabled={isGenerating || isSaving} placeholder={t('diagnostics.firstQuestionPlaceholder', { defaultValue: 'Например: Объясни, что такое дробь и приведи пример.' }) as string} />
                  </div>
                  {/* example removed */}
                </div>
              ))}
              {!topics.length && <div className="text-sm text-gray-500">{t('diagnostics.noTopics', { defaultValue: 'Темы пока не добавлены' })}</div>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isGenerating || isSaving} className="btn-secondary disabled:opacity-50">{t('common.cancel', { defaultValue: 'Отмена' })}</button>
          <button type="button" onClick={handleSave} disabled={isSaving || isGenerating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <FiSave className={isSaving ? 'animate-pulse' : ''} /> {isSaving ? t('diagnostics.saving', { defaultValue: 'Сохранение…' }) : t('common.save', { defaultValue: 'Сохранить' })}
          </button>
        </div>

        {isGenerating && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-gray-700">
              <FiRefreshCw className="animate-spin" />
              <span>{t('diagnostics.generating', { defaultValue: 'Генерация…' })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
