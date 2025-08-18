import React, { useEffect, useState } from 'react';
import { FiX, FiRefreshCw, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useGenerateDiagnosticTopicsMutation } from '../../../features/goal/goalApi';
import { useSaveDiagnosticTopicsMutation } from '../../../features/lesson/lessonApi';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../../app/api/errorHelpers';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';

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
      const res = await generateTopics({ goalId, teacherNote: note || undefined }).unwrap();
      toast.success(t('diagnostics.generated', { defaultValue: 'Темы сгенерированы' }));
      if (res?.topics?.length) {
        const mapped: TopicRow[] = (res.topics as any[]).map((x: any) => typeof x === 'string' ? { title: x } : { title: x.title || '', firstQuestion: x.firstQuestion || '' });
        setTopics(mapped);
      } else {
        toast.error(t('diagnostics.noTopicsGenerated', { defaultValue: 'Не удалось сгенерировать темы' }));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('diagnostics.generateError', { defaultValue: 'Ошибка генерации тем' }) as string));
    }
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
      await saveTopics({ lessonId, topics: cleaned }).unwrap();
      toast.success(t('diagnostics.saved', { defaultValue: 'Темы сохранены' }));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('diagnostics.saveError', { defaultValue: 'Ошибка сохранения' }) as string));
    }
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
          <Button type="button" aria-label={t('common.close', { defaultValue: 'Закрыть' }) as string} onClick={onClose} variant="ghost" className="text-gray-500 hover:text-gray-700"><FiX size={18} /></Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('diagnostics.teacherNote', { defaultValue: 'Пожелания к темам (необязательно)' })}</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="disabled:opacity-70" disabled={isGenerating || isSaving} placeholder={t('diagnostics.notePlaceholder', { defaultValue: 'Например: больше по алгебре, меньше теории множеств' }) as string} />
            <Button type="button" aria-label={t('diagnostics.generateTopics', { defaultValue: 'Сгенерировать темы' }) as string} disabled={isGenerating} onClick={handleGenerate} variant="secondary" className="mt-2 flex items-center gap-2 disabled:opacity-50">
              <FiRefreshCw className={isGenerating ? 'animate-spin' : ''} /> {isGenerating ? t('diagnostics.generating', { defaultValue: 'Генерация…' }) : t('diagnostics.generateTopics', { defaultValue: 'Сгенерировать темы' })}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{t('diagnostics.topicList', { defaultValue: 'Список тем' })}</h3>
              <Button type="button" aria-label={t('diagnostics.addTopic', { defaultValue: 'Добавить тему' }) as string} onClick={addTopic} disabled={isGenerating || isSaving} variant="secondary" className="text-sm flex items-center gap-1 disabled:opacity-50"><FiPlus /> {t('common.add', { defaultValue: 'Добавить' })}</Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {topics.map((topic, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Input value={topic.title} onChange={(e) => updateTopicField(idx, 'title', e.target.value)} className="flex-1 disabled:opacity-70" disabled={isGenerating || isSaving} placeholder={t('diagnostics.topicPlaceholder', { defaultValue: 'Тема' }) as string} />
                    <Button type="button" aria-label={t('diagnostics.removeTopic', { defaultValue: 'Удалить тему' }) as string} onClick={() => removeTopic(idx)} disabled={isGenerating || isSaving} variant="secondary" className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"><FiTrash2 /></Button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('diagnostics.firstQuestion', { defaultValue: 'Первый вопрос (обязательно)' })}</label>
                    <Input value={topic.firstQuestion || ''} onChange={(e) => updateTopicField(idx, 'firstQuestion', e.target.value)} className="w-full disabled:opacity-70" disabled={isGenerating || isSaving} placeholder={t('diagnostics.firstQuestionPlaceholder', { defaultValue: 'Например: Объясни, что такое дробь и приведи пример.' }) as string} />
                  </div>
                </div>
              ))}
              {!topics.length && <div className="text-sm text-gray-500">{t('diagnostics.noTopics', { defaultValue: 'Темы пока не добавлены' })}</div>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={isGenerating || isSaving} variant="secondary" className="disabled:opacity-50">{t('common.cancel', { defaultValue: 'Отмена' })}</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isGenerating} className="flex items-center gap-2 disabled:opacity-50">
            <FiSave className={isSaving ? 'animate-pulse' : ''} /> {isSaving ? t('diagnostics.saving', { defaultValue: 'Сохранение…' }) : t('common.save', { defaultValue: 'Сохранить' })}
          </Button>
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
