import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  const [initialQuestions, setInitialQuestions] = useState<Array<{ topicId: string; title: string; firstQuestion?: string | null }> | null>(null);
  const [followups, setFollowups] = useState<Array<{ topicId: string; questions: string[] }> | null>(null);
  const [phase, setPhase] = useState<'INIT' | 'FIRST' | 'GENERATING' | 'EVALUATING' | 'FOLLOWUPS' | 'LEGACY' | 'DONE'>('INIT');
  const [finalSummary, setFinalSummary] = useState<any | null>(null);
  const [finalRoadmap, setFinalRoadmap] = useState<any[] | null>(null);
  // Sequential state for FIRST phase
  const [firstIdx, setFirstIdx] = useState<number>(0);
  const [firstAnswers, setFirstAnswers] = useState<Array<{ topicId: string; answer: string }>>([]);
  const [firstAnswerText, setFirstAnswerText] = useState<string>('');
  // Sequential state for FOLLOWUPS phase
  const [followupIdx, setFollowupIdx] = useState<number>(0);
  const [followupLinear, setFollowupLinear] = useState<Array<{ topicId: string; question: string }>>([]);
  const [followupAnswerText, setFollowupAnswerText] = useState<string>('');
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);

  const { data: sessionData, isFetching: isFetchingSession } = useGetDiagnosticSessionQuery(sessionId!, { skip: !sessionId });

  const [startDiagnostic, { isLoading: isStarting }] = useStartDiagnosticMutation();
  const [fetchNext, { isLoading: isFetchingNext }] = useGetNextDiagnosticQuestionMutation();
  const [sendAnswer, { isLoading: isAnswering }] = useAnswerDiagnosticMutation();
  const [finishDiagnostic, { isLoading: isFinishing }] = useFinishDiagnosticMutation();
  const [submitFirstAnswers, { isLoading: isSubmittingFirst }] = useSubmitFirstAnswersMutation();
  const [submitFollowupAnswers, { isLoading: isSubmittingFollowups }] = useSubmitFollowupAnswersMutation();

  const started = useMemo(() => Boolean(sessionId), [sessionId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [question, sessionData]);

  // Auto-redirect to adventure when diagnostic is done
  useEffect(() => {
    if (phase === 'DONE') {
      // Slight delay to allow success UI to render
      const id = setTimeout(() => navigate('/student/adventure'), 500);
      return () => clearTimeout(id);
    }
  }, [phase, navigate]);

  const extractErr = (e: unknown): { status?: number; message?: string } => {
    const anyE = e as any;
    return {
      status: anyE?.status ?? anyE?.originalStatus ?? anyE?.data?.status,
      message: anyE?.data?.message || anyE?.error || anyE?.message,
    };
  };

  const handleStart = async () => {
    if (!effectiveGoalId) return;
    try {
      // reset state for a clean session
      setFinalSummary(null);
      setFinalRoadmap(null);
      setInitialQuestions(null);
      setFollowups(null);
      setFirstIdx(0);
      setFirstAnswers([]);
      setFirstAnswerText('');
      setFollowupIdx(0);
      setFollowupLinear([]);
      setFollowupAnswers([]);
      setFollowupAnswerText('');
      setPhase('INIT');

      const res = await startDiagnostic({ goalId: effectiveGoalId }).unwrap();
      setSessionId(res.sessionId);
      setIntro(res.intro);
      setDisclaimer(res.disclaimer || null);
      if (Array.isArray(res.initialQuestions) && res.initialQuestions.length) {
        setInitialQuestions(res.initialQuestions);
        setFirstIdx(0);
        setFirstAnswers([]);
        setPhase('FIRST');
        setFirstAnswerText('');
      } else {
        setPhase('LEGACY');
      }
      if (!embedded) {
        setSearchParams({ sessionId: res.sessionId });
      }
      toast.success('Диагностика начата');
    } catch (e) {
      const err = extractErr(e);
      if (err.message?.includes('Goal not found or access denied') || err.status === 404) {
        toast.error('Нет доступа к этой цели. Откройте ссылку как ученик данной цели (или войдите под учеником).');
      } else {
        toast.error('Не удалось начать диагностику');
      }
    }
  };

  const handleRestart = async () => {
    if (!effectiveGoalId) return;
    try {
      // Clear local state and start a fresh server session
      setFinalSummary(null);
      setFinalRoadmap(null);
      setInitialQuestions(null);
      setFollowups(null);
      setFirstIdx(0);
      setFirstAnswers([]);
      setFirstAnswerText('');
      setFollowupIdx(0);
      setFollowupLinear([]);
      setFollowupAnswers([]);
      setFollowupAnswerText('');
      setPhase('INIT');

      const res = await startDiagnostic({ goalId: effectiveGoalId, forceNew: true } as any).unwrap();
      setSessionId(res.sessionId);
      setIntro(res.intro);
      setDisclaimer(res.disclaimer || null);
      if (Array.isArray(res.initialQuestions) && res.initialQuestions.length) {
        setInitialQuestions(res.initialQuestions);
        setFirstIdx(0);
        setFirstAnswers([]);
        setPhase('FIRST');
        setFirstAnswerText('');
      } else {
        setPhase('LEGACY');
      }
      if (!embedded) {
        setSearchParams({ sessionId: res.sessionId });
      }
      toast.success('Начата новая сессия диагностики');
    } catch (e) {
      const err = extractErr(e);
      if (err.message?.includes('Goal not found or access denied') || err.status === 404) {
        toast.error('Нет доступа к этой цели. Откройте ссылку как ученик данной цели (или войдите под учеником).');
      } else {
        toast.error('Не удалось перезапустить диагностику');
      }
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

  const handleSubmitFirst = async (answersOverride?: Array<{ topicId: string; answer: string }>) => {
    if (!sessionId || !initialQuestions) return;
    try {
      const payload = answersOverride ?? firstAnswers;
      setPhase('GENERATING');
      const data = await submitFirstAnswers({ sessionId, answers: payload }).unwrap();
      setFollowups(data.followups || []);
      // Flatten followups to linear queue of questions
      const linear: Array<{ topicId: string; question: string }> = [];
      (data.followups || []).forEach((f: { topicId: string; questions: string[] }) => {
        f.questions.forEach((q: string) => linear.push({ topicId: f.topicId, question: q }));
      });
      setFollowupLinear(linear);
      setFollowupIdx(0);
      setFollowupAnswers(Array(linear.length).fill(''));
      setFollowupAnswerText('');
      if ((data.followups?.length || 0) === 0) {
        // No follow-ups required — finish immediately
        try {
          setPhase('EVALUATING');
          const finishRes = await submitFollowupAnswers({ sessionId, items: [] }).unwrap();
          setFinalSummary(finishRes.summary || null);
          setFinalRoadmap(finishRes.suggestedRoadmap || null);
          toast.success('Диагностика завершена');
          setPhase('DONE');
        } catch {
          toast.error('Ошибка завершения диагностики');
        }
      } else {
        // If server returned followups but mapping produced zero, show first as text fallback
        if (linear.length === 0) {
          const flat = (data.followups || []).flatMap((f: any) => f.questions || []);
          if (flat.length > 0) {
            setFollowupLinear([{ topicId: (data.followups![0]?.topicId || ''), question: flat[0] }]);
            setFollowupAnswers(['']);
          }
        }
        setPhase('FOLLOWUPS');
      }
    } catch {
      toast.error('Не удалось отправить ответы');
    }
  };

  const handleFirstAnswerNext = () => {
    if (!initialQuestions) return;
    const current = initialQuestions[firstIdx];
    if (!current) return;
    const answerTrim = firstAnswerText.trim();
    const next = [...firstAnswers, { topicId: current.topicId, answer: answerTrim }];
    setFirstAnswers(next);
    if (firstIdx + 1 < initialQuestions.length) {
      setFirstIdx(firstIdx + 1);
      setFirstAnswerText('');
    } else {
      // Done with first questions, submit all at once
      void handleSubmitFirst(next);
    }
  };

  // removed legacy bulk followups submit handler

  const handleFollowupAnswerNext = async () => {
    if (!sessionId) return;
    // Push current answer into array
    const answerTrim = followupAnswerText.trim();
    const nextAnswers = [...followupAnswers];
    nextAnswers[followupIdx] = answerTrim;
    setFollowupAnswers(nextAnswers);
    setFollowupAnswerText('');
    if (followupIdx + 1 < followupLinear.length) {
      setFollowupIdx(followupIdx + 1);
    } else {
      // Compose grouped items by topicId from collected answers
      const grouped: Record<string, { topicId: string; qa: Array<{ question: string; answer: string }> }> = {};
      followupLinear.forEach(({ topicId, question }, i) => {
        if (!grouped[topicId]) grouped[topicId] = { topicId, qa: [] };
        grouped[topicId].qa.push({ question, answer: nextAnswers[i] || '' });
      });
      const items = Object.values(grouped);
      try {
        setPhase('EVALUATING');
        const res = await submitFollowupAnswers({ sessionId, items }).unwrap();
        setFinalSummary(res.summary || null);
        setFinalRoadmap(res.suggestedRoadmap || null);
        toast.success('Диагностика завершена');
        setPhase('DONE');
      } catch {
        toast.error('Не удалось отправить уточняющие ответы');
      }
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
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {intro && (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-4">{intro}</div>
              )}
            </div>
            <div className="ml-3">
              <button onClick={handleRestart} className="btn-secondary">Начать заново</button>
            </div>
          </div>
          {disclaimer && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{disclaimer}</div>
          )}

          {phase === 'FIRST' && initialQuestions && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Первые вопросы</h3>
              <div className="space-y-2">
                <div className="border rounded p-3 bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">Тема {firstIdx + 1} из {initialQuestions.length}: {initialQuestions[firstIdx]?.title}</div>
                  <div className="font-medium">{initialQuestions[firstIdx]?.firstQuestion || 'Ответь кратко по теме'}</div>
                  <textarea rows={4} value={firstAnswerText} onChange={(e) => setFirstAnswerText(e.target.value)} className="w-full mt-2 border rounded px-3 py-2" placeholder="Твой ответ..." />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Шаг {firstIdx + 1}/{initialQuestions.length}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={handleFirstAnswerNext} disabled={isSubmittingFirst || !firstAnswerText.trim()} className="btn-primary disabled:opacity-50">Ответить</button>
              </div>
            </div>
          )}

          {phase === 'FOLLOWUPS' && followups && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Уточняющие вопросы</h3>
              {followupLinear.length === 0 ? (
                <div className="text-sm text-green-700">Отличный ответ! Уточнения не требуются.</div>
              ) : (
                <div className="space-y-2">
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">Вопрос {followupIdx + 1} из {followupLinear.length}</div>
                    <div className="font-medium">{followupLinear[followupIdx]?.question}</div>
                    <textarea rows={4} value={followupAnswerText} onChange={(e) => setFollowupAnswerText(e.target.value)} className="w-full mt-2 border rounded px-3 py-2" placeholder="Твой ответ..." />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Шаг {followupIdx + 1}/{followupLinear.length}</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button onClick={handleFollowupAnswerNext} disabled={isSubmittingFollowups || !followupAnswerText.trim()} className="btn-primary disabled:opacity-50">Ответить</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === 'GENERATING' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Spinner />
                <span>ИИ готовит уточняющие вопросы…</span>
              </div>
            </div>
          )}

          {phase === 'EVALUATING' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Spinner />
                <span>ИИ оценивает ответы…</span>
              </div>
            </div>
          )}

          {phase !== 'FIRST' && phase !== 'FOLLOWUPS' && phase !== 'DONE' && phase !== 'GENERATING' && (isFetchingSession ? (
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

          {phase === 'DONE' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded mb-3">Спасибо! Диагностика завершена. Отличная работа!</div>
              <div className="mb-3 flex gap-2">
                <button onClick={() => navigate('/student/adventure')} className="btn-primary">Начать историю</button>
                <button onClick={handleRestart} className="btn-secondary">Пройти заново</button>
              </div>
              {finalSummary && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Итоги по темам</h3>
                  <div className="text-sm text-gray-700">Всего тем: {finalSummary.totalTopics}</div>
                  <div className="text-sm">Отлично: {finalSummary.labels?.EXCELLENT || 0} • Повторение: {finalSummary.labels?.REFRESH || 0} • Неизвестно: {finalSummary.labels?.UNKNOWN || 0}</div>
                </div>
              )}
              {finalRoadmap && finalRoadmap.length > 0 && (
                <div className="mb-2">
                  <h3 className="font-semibold mb-1">Предложенный план</h3>
                  <div className="space-y-2">
                    {finalRoadmap.map((sec: any, i: number) => (
                      <div key={i} className="border rounded p-2">
                        <div className="font-medium">{sec.sectionTitle}</div>
                        <ul className="list-disc pl-5 text-sm">
                          {sec.lessons?.map((l: string, j: number) => <li key={j}>{l}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
