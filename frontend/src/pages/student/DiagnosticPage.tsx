import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import {
  useStartDiagnosticMutation,
  useGetDiagnosticSessionQuery,
  useGetNextDiagnosticQuestionMutation,
  useAnswerDiagnosticMutation,
  useFinishDiagnosticMutation,
  useSubmitFirstAnswersMutation,
  useSubmitFollowupAnswersMutation,
} from '../../features/diagnostic/diagnosticApi';

export default function DiagnosticPage({ goalId: goalIdProp, embedded }: { goalId?: string; embedded?: boolean } = {}) {
  const { goalId: goalIdParam } = useParams<{ goalId: string }>();
  const effectiveGoalId = goalIdProp ?? goalIdParam;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSessionId = searchParams.get('sessionId') || undefined;

  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [question, setQuestion] = useState<{ topicId: string; text: string; index: number; total: number } | null>(null);
  const [answer, setAnswer] = useState('');
  const [intro, setIntro] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [initialQuestions, setInitialQuestions] = useState<Array<{ topicId: string; title: string; firstQuestion?: string | null; firstQuestionExample?: string | null }> | null>(null);
  const [firstAnswers, setFirstAnswers] = useState<Record<string, string>>({});
  const [followups, setFollowups] = useState<Array<{ topicId: string; questions: string[] }> | null>(null);
  const [followupAnswers, setFollowupAnswers] = useState<Record<string, string[]>>({});
  const [phase, setPhase] = useState<'INIT' | 'FIRST' | 'FOLLOWUPS' | 'LEGACY' | 'DONE'>('INIT');

  const { data: sessionData, isFetching: isFetchingSession } = useGetDiagnosticSessionQuery(sessionId!, { skip: !sessionId });

  const [startDiagnostic, { isLoading: isStarting }] = useStartDiagnosticMutation();
  const [fetchNext, { isLoading: isFetchingNext }] = useGetNextDiagnosticQuestionMutation();
  const [sendAnswer, { isLoading: isAnswering }] = useAnswerDiagnosticMutation();
  const [finishDiagnostic, { isLoading: isFinishing }] = useFinishDiagnosticMutation();
  const [submitFirstAnswers, { isLoading: isSubmittingFirst }] = useSubmitFirstAnswersMutation();
  const [submitFollowupAnswers, { isLoading: isSubmittingFollowups }] = useSubmitFollowupAnswersMutation();

  const started = useMemo(() => Boolean(sessionId), [sessionId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [question, sessionData]);

  const handleStart = async () => {
    if (!effectiveGoalId) return;
    try {
      const res = await startDiagnostic({ goalId: effectiveGoalId }).unwrap();
      setSessionId(res.sessionId);
      setIntro(res.intro);
      setDisclaimer(res.disclaimer || null);
      if (Array.isArray(res.initialQuestions) && res.initialQuestions.length) {
        setInitialQuestions(res.initialQuestions);
        const init: Record<string, string> = {};
        res.initialQuestions.forEach((q) => { init[q.topicId] = ''; });
        setFirstAnswers(init);
        setPhase('FIRST');
      } else {
        setPhase('LEGACY');
      }
      if (!embedded) {
        setSearchParams({ sessionId: res.sessionId });
      }
      toast.success('Диагностика начата');
    } catch (e) {
      toast.error('Не удалось начать диагностику');
    }
  };

  const handleNext = async () => {
    if (!sessionId) return;
    try {
      const res = await fetchNext({ sessionId }).unwrap();
      if (res.done) {
        setQuestion(null);
      } else if (res.topicId && res.question) {
        setQuestion({ topicId: res.topicId, text: res.question, index: res.index || 0, total: res.total || 0 });
      }
    } catch (e) {
      toast.error('Не удалось получить вопрос');
    }
  };

  const handleSendAnswer = async () => {
    if (!sessionId || !question) return;
    try {
      await sendAnswer({ sessionId, topicId: question.topicId, questionText: question.text, answer }).unwrap();
      setAnswer('');
      await handleNext();
    } catch (e) {
      toast.error('Не удалось отправить ответ');
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    try {
      await finishDiagnostic({ sessionId }).unwrap();
      toast.success('Диагностика завершена');
    } catch (e) {
      toast.error('Не удалось завершить');
    }
  };

  const handleSubmitFirst = async () => {
    if (!sessionId || !initialQuestions) return;
    const answers = initialQuestions.map(q => ({ topicId: q.topicId, answer: firstAnswers[q.topicId] || '' }));
    // Require at least some input (not enforcing per-topic to keep UX forgiving)
    try {
      const data = await submitFirstAnswers({ sessionId, answers }).unwrap();
      setFollowups(data.followups || []);
      // init followup answers structure
      const init: Record<string, string[]> = {};
      (data.followups || []).forEach(f => { init[f.topicId] = f.questions.map(() => ''); });
      setFollowupAnswers(init);
      setPhase('FOLLOWUPS');
    } catch {
      toast.error('Не удалось отправить ответы');
    }
  };

  const handleSubmitFollowups = async () => {
    if (!sessionId || !followups) return;
    try {
      const items = followups.map(f => ({
        topicId: f.topicId,
        qa: f.questions.map((q, i) => ({ question: q, answer: (followupAnswers[f.topicId] || [])[i] || '' })),
      }));
      await submitFollowupAnswers({ sessionId, items }).unwrap();
      toast.success('Диагностика завершена');
      setPhase('DONE');
      // Optionally display result.summary/suggestedRoadmap
    } catch {
      toast.error('Не удалось отправить уточняющие ответы');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Диагностика</h1>

      {!started && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="mb-4">Диагностика поможет понять твой уровень по темам. Нажми старт, чтобы начать.</p>
          <button onClick={handleStart} disabled={isStarting || !effectiveGoalId} className="btn-primary disabled:opacity-50">Старт</button>
        </div>
      )}

      {started && (
        <div className="space-y-4">
          {intro && (
            <div className="bg-indigo-50 border border-indigo-200 rounded p-4">{intro}</div>
          )}
          {disclaimer && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{disclaimer}</div>
          )}

          {phase === 'FIRST' && initialQuestions && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Первые вопросы</h3>
              <div className="space-y-4">
                {initialQuestions.map((q) => (
                  <div key={q.topicId} className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">Тема: {q.title}</div>
                    <div className="font-medium">{q.firstQuestion || 'Ответь кратко по теме'}</div>
                    {q.firstQuestionExample ? (
                      <div className="mt-1 text-xs text-gray-600">Пример: {q.firstQuestionExample}</div>
                    ) : null}
                    <textarea
                      rows={3}
                      className="w-full border rounded px-3 py-2 mt-2"
                      placeholder="Твой ответ..."
                      value={firstAnswers[q.topicId] || ''}
                      onChange={(e) => setFirstAnswers(prev => ({ ...prev, [q.topicId]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={handleSubmitFirst} disabled={isSubmittingFirst} className="btn-primary disabled:opacity-50">Отправить все ответы</button>
              </div>
            </div>
          )}

          {phase === 'FOLLOWUPS' && followups && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Уточняющие вопросы</h3>
              <div className="space-y-4">
                {followups.map((f) => (
                  <div key={f.topicId} className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">Тема</div>
                    {f.questions.length === 0 ? (
                      <div className="text-sm text-green-700">Отличный ответ! Уточнения не требуются.</div>
                    ) : (
                      <div className="space-y-3">
                        {f.questions.map((q, i) => (
                          <div key={i}>
                            <div className="font-medium">{q}</div>
                            <textarea
                              rows={3}
                              className="w-full border rounded px-3 py-2 mt-1"
                              placeholder="Твой ответ..."
                              value={(followupAnswers[f.topicId] || [])[i] || ''}
                              onChange={(e) => setFollowupAnswers(prev => ({
                                ...prev,
                                [f.topicId]: (() => {
                                  const arr = [...(prev[f.topicId] || Array(f.questions.length).fill(''))];
                                  arr[i] = e.target.value;
                                  return arr;
                                })(),
                              }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={handleSubmitFollowups} disabled={isSubmittingFollowups} className="btn-primary disabled:opacity-50">Завершить</button>
              </div>
            </div>
          )}

          {phase !== 'FIRST' && phase !== 'FOLLOWUPS' && (isFetchingSession ? (
            <div className="flex justify-center"><Spinner /></div>
          ) : sessionData ? (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-2">Состояние: {sessionData.session.status}. Пройдено тем: {sessionData.session.currentIdx}/{sessionData.totalTopics}</div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {sessionData.session.turns?.map((t) => (
                  <div key={t.id} className="p-3 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-500">Тема: {t.topic?.title}</div>
                    <div className="font-semibold">Вопрос: {t.questionText}</div>
                    <div className="mt-1">Ответ: {t.studentAnswer}</div>
                    <div className="mt-1 text-sm">Оценка: {t.aiLabel}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {phase === 'LEGACY' && !question && sessionData.session.status === 'ACTIVE' && (
                <button onClick={handleNext} disabled={isFetchingNext} className="btn-secondary mt-3 disabled:opacity-50">Следующий вопрос</button>
              )}

              {phase === 'LEGACY' && question && (
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs text-gray-500">Тема {question.index + 1} из {question.total}</div>
                    <div className="font-semibold">{question.text}</div>
                  </div>
                  <textarea rows={3} value={answer} onChange={e => setAnswer(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Твой ответ..." />
                  <div className="flex gap-2">
                    <button onClick={handleSendAnswer} disabled={isAnswering || !answer.trim()} className="btn-primary disabled:opacity-50">Отправить</button>
                    <button onClick={() => setAnswer('')} className="btn-secondary">Очистить</button>
                  </div>
                </div>
              )}

              {phase === 'LEGACY' && (
                <div className="mt-4">
                  <button onClick={handleFinish} disabled={isFinishing} className="btn-secondary disabled:opacity-50">Завершить</button>
                </div>
              )}
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}
