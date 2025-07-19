import { useState, useEffect, useRef, Fragment } from 'react';
import { useGetCurrentLessonQuery, useSubmitLessonMutation, useLessonPracticeChatMutation, useEndLessonForReviewMutation, useLazyGetStorySummaryQuery } from '../../features/student/studentApi';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiCoffee, FiZap, FiHelpCircle, FiX, FiChevronLeft, FiChevronRight, FiThumbsDown } from 'react-icons/fi';
import type { AIAssessmentResponse } from '../../types/models';
import { Dialog, Transition } from '@headlessui/react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    startLesson,
    updatePracticeAnswer,
    updateStoryResponse,
    resetAdventureState,
    selectPracticeAnswers,
    selectStoryResponse,
} from '../../features/student/adventureSlice';

const YoutubeEmbed = ({ url }: { url:string }) => {
    const getYouTubeId = (url: string) => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') return urlObj.pathname.slice(1);
            if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.pathname === '/watch') return urlObj.searchParams.get('v');
                if (urlObj.pathname.startsWith('/embed/')) return urlObj.pathname.split('/')[2];
            }
        } catch (e) {/* fallback */}
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    const videoId = getYouTubeId(url);
    if (!videoId) return <div className="text-red-500 p-4 bg-red-50 rounded-md my-4">Неверная ссылка на YouTube.</div>;

    return (
        <div className="relative my-4" style={{ paddingTop: '56.25%' }}>
            <iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title="Embedded youtube" className="absolute top-0 left-0 w-full h-full rounded-md" />
        </div>
    );
};

const SummaryModal = ({ isOpen, onClose, summary, isLoading }: { isOpen: boolean; onClose: () => void; summary: string; isLoading: boolean; }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-start">
                  Краткое содержание
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><FiX /></button>
                </Dialog.Title>
                <div className="mt-4 min-h-[10rem]">
                  {isLoading ? 
                    <div className="flex justify-center items-center h-full"><Spinner /></div> : 
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{summary}</p>
                  }
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

type LessonPhase = 'content' | 'assessment' | 'story' | 'control_work';
type ChatMessage = { role: 'user' | 'assistant', content: string };

export default function StudentAdventurePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data: lesson, isLoading, isError, refetch } = useGetCurrentLessonQuery();
    const [submitLesson, { isLoading: isSubmitting }] = useSubmitLessonMutation();
    const [practiceChat, { isLoading: isChatLoading }] = useLessonPracticeChatMutation();
    const [endLesson, { isLoading: isEndingLesson }] = useEndLessonForReviewMutation();
    const [triggerGetSummary, { isLoading: isSummaryLoading }] = useLazyGetStorySummaryQuery();

    const [lessonPhase, setLessonPhase] = useState<LessonPhase>('content');
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

    // Specific state for Control Work
    const [controlWorkQuestions, setControlWorkQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [cwProgress, setCwProgress] = useState(0);

    const practiceAnswers = useAppSelector(selectPracticeAnswers);
    const storyResponse = useAppSelector(selectStoryResponse);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [studentChatMessage, setStudentChatMessage] = useState('');
    const [aiResponse, setAiResponse] = useState<AIAssessmentResponse | null>(null);

    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [summaryText, setSummaryText] = useState('');

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const blocks = lesson?.content?.blocks || [];
    const currentBlock = blocks[currentBlockIndex];

    useEffect(() => {
        if (lesson) {
            dispatch(startLesson(lesson.id));
            if (lesson.type === 'CONTROL_WORK') {
                const cwQuestions = lesson.content?.blocks || [];
                setLessonPhase('control_work');
                setControlWorkQuestions(cwQuestions);
                setCurrentQuestionIndex(0);
                setCwProgress(0);
                setChatHistory(cwQuestions.length > 0 ? [{ role: 'assistant', content: cwQuestions[0].content }] : []);
            } else {
                setLessonPhase('content');
                setCurrentBlockIndex(0);
            }
            setAiResponse(null);
        }
    }, [lesson, dispatch]);
    
    useEffect(() => {
      chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

    const handlePracticeAnswerChange = (blockIndex: number, answer: string) => {
        dispatch(updatePracticeAnswer({ blockIndex, answer }));
    };
    
    const handleStoryResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(updateStoryResponse(e.target.value));
    };

    const handleNextBlock = () => {
        if (currentBlock.type === 'practice' && !practiceAnswers[currentBlockIndex]?.trim()) {
            toast.error('Пожалуйста, введите ответ, чтобы продолжить.');
            return;
        }
        if (currentBlockIndex >= blocks.length - 1) {
            setLessonPhase('assessment');
            startAssessmentPhase();
        } else {
            setCurrentBlockIndex(prev => prev + 1);
        }
    };

    const handlePreviousBlock = () => {
        if (currentBlockIndex > 0) {
            setCurrentBlockIndex(prev => prev + 1);
        }
    };

    const startAssessmentPhase = async () => {
        if (!lesson) return;
        const initialAnswers = blocks
            .map((block: any, index: number) => ({ block, index }))
            .filter(({ block }: any) => block.type === 'practice')
            .map(({ index }: any) => practiceAnswers[index] || '');

        try {
            const result = await practiceChat({ lessonId: lesson.id, initialAnswers }).unwrap();
            setAiResponse(result.data);
            setChatHistory([{ role: 'assistant', content: result.data.responseText }]);
        } catch (err) {
            toast.error("Не удалось начать диалог с помощником. Попробуйте снова.");
            setLessonPhase('content');
            setCurrentBlockIndex(blocks.length - 1);
        }
    };

    const handleStudentChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentChatMessage.trim() || !lesson) return;
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: studentChatMessage }];
        setChatHistory(newHistory);
        setStudentChatMessage('');
        try {
            const result = await practiceChat({ lessonId: lesson.id, chatHistory: newHistory }).unwrap();
            setAiResponse(result.data);
            setChatHistory(prev => [...prev, { role: 'assistant', content: result.data.responseText }]);
        } catch (err) {
            toast.error("Ошибка при отправке сообщения. Попробуйте еще раз.");
            setChatHistory(chatHistory);
        }
    };
    
    const handleControlWorkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentChatMessage.trim() || !lesson) return;

        const questionContent = controlWorkQuestions[currentQuestionIndex].content;
        const answer = studentChatMessage;
        
        const currentChat: ChatMessage[] = [
            { role: 'assistant', content: questionContent },
            { role: 'user', content: answer }
        ];

        setChatHistory(prev => [...prev, { role: 'user', content: answer }]);
        setStudentChatMessage('');

        try {
            const result = await practiceChat({ lessonId: lesson.id, chatHistory: currentChat }).unwrap();
            const { isCorrect, responseText } = result.data;
            
            setChatHistory(prev => [...prev, { role: 'assistant', content: responseText }]);

            const progressStep = 100 / controlWorkQuestions.length;
            
            if (isCorrect) {
                const newProgress = cwProgress + progressStep;
                setCwProgress(newProgress);
                
                if (newProgress >= 99.9) { // Use a threshold to avoid floating point issues
                    toast.success('Контрольная работа успешно сдана!', { duration: 3000 });
                    setTimeout(() => setLessonPhase('story'), 1500);
                } else {
                    const nextIndex = currentQuestionIndex + 1;
                    setCurrentQuestionIndex(nextIndex);
                    setChatHistory(prev => [...prev, { role: 'assistant', content: controlWorkQuestions[nextIndex].content }]);
                }
            } else {
                setCwProgress(prev => Math.max(0, prev - progressStep));
                // Do not advance, let the student try again on the same question
            }
        } catch (err) {
            toast.error("Ошибка при проверке ответа. Попробуйте еще раз.");
            setChatHistory(chatHistory); // Revert chat on error
        }
    };

    const handleGiveUp = () => {
        if (window.confirm("Вы уверены, что хотите сдаться? Прогресс не будет сохранен, и вы не получите продолжение истории.")) {
            dispatch(resetAdventureState());
            navigate('/student');
        }
    };
    
    const handleSubmitLesson = async () => {
        if (!lesson || !storyResponse.trim()) {
            toast.error("Напиши, что будет дальше в истории!");
            return;
        }

        const practiceAnswersArray = (lesson.type === 'CONTROL_WORK') 
            ? controlWorkQuestions.map((q, i) => q.answer || 'Ответ не записан') // Placeholder, as CW answers are in chat
            : blocks
                .map((block: any, index: number) => ({ block, index }))
                .filter(({ block }: any) => block.type === 'practice')
                .map(({ index }: any) => practiceAnswers[index] || '');

        const formData = new FormData();
        formData.append('studentResponseText', storyResponse);
        formData.append('practiceAnswers', JSON.stringify(practiceAnswersArray));
        
        try {
            await submitLesson({ lessonId: lesson.id, formData }).unwrap();
            toast.success("Отлично! Урок отправлен учителю на проверку.", { duration: 4000 });
            dispatch(resetAdventureState());
            navigate('/student');
        } catch (err) {
            toast.error("Не удалось завершить урок.");
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    if (isError) return <div className="text-center text-red-500 p-10">Ошибка загрузки урока. Пожалуйста, <button onClick={() => refetch()} className="underline">обновите</button>.</div>;

    const renderContent = () => {
        if (!lesson) {
             return (
                <div className="text-center p-10 bg-white rounded-lg shadow">
                    <h2 className="text-2xl font-bold text-green-600">🎉 Поздравляем! 🎉</h2>
                    <p className="mt-4 text-lg text-gray-700">Ты прошел все доступные уроки. Так держать!</p>
                    <button onClick={() => navigate('/student')} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md">Вернуться в кабинет</button>
                </div>
            );
        }

        if (lesson.type === 'CONTROL_WORK') {
            return (
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900 text-center">{lesson.title}</h1>
                    <div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${cwProgress}%` }}></div>
                        </div>
                        <p className="text-center text-sm text-gray-600 mt-2">Прогресс: {Math.round(cwProgress)}%</p>
                    </div>

                    <div ref={chatContainerRef} className="h-96 bg-gray-50 rounded-lg p-3 space-y-4 overflow-y-auto">
                        {chatHistory.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-lg px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border'}`} dangerouslySetInnerHTML={{ __html: msg.content }}>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && <div className="flex justify-start"><div className="px-4 py-2 rounded-lg shadow bg-white"><Spinner size="sm"/></div></div>}
                    </div>
                    <form onSubmit={handleControlWorkSubmit} className="flex gap-2">
                        <input type="text" value={studentChatMessage} onChange={(e) => setStudentChatMessage(e.target.value)} placeholder="Введите ваш ответ..." className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" disabled={isChatLoading} />
                        <button type="submit" disabled={!studentChatMessage.trim() || isChatLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"><FiSend /></button>
                    </form>
                    <div className="text-center pt-4 border-t">
                        <button onClick={handleGiveUp} className="text-sm text-gray-500 hover:text-red-600 flex items-center justify-center mx-auto gap-2"> <FiThumbsDown/> Сдаться</button>
                    </div>
                </div>
            );
        }

        return (
             <>
                <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
                {lessonPhase === 'content' && (<>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-500 mb-4">Шаг {currentBlockIndex + 1} из {blocks.length}</p>
                        <div className={`p-4 border-l-4 rounded-r-lg ${ currentBlock.type === 'theory' ? 'border-blue-500 bg-blue-50' : currentBlock.type === 'practice' ? 'border-purple-500 bg-purple-50' : 'border-red-500 bg-red-50' }`}>
                            <h3 className="font-semibold capitalize text-lg mb-2">{currentBlock.type === 'youtube' ? "📺 Видео" : currentBlock.type}</h3>
                            {currentBlock.type === 'youtube' ? <YoutubeEmbed url={currentBlock.content} /> : <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: currentBlock.content }} />}
                            {currentBlock.type === 'practice' && (
                                <div className="mt-4">
                                    <label htmlFor={`answer-${currentBlockIndex}`} className="block text-sm font-medium text-gray-700 mb-1">Ваш ответ:</label>
                                    <textarea id={`answer-${currentBlockIndex}`} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500" rows={3} value={practiceAnswers[currentBlockIndex] || ''} onChange={(e) => handlePracticeAnswerChange(currentBlockIndex, e.target.value)} placeholder="Введите ваш ответ здесь..." />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <button onClick={handlePreviousBlock} disabled={currentBlockIndex === 0} className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                <FiChevronLeft /> Назад
                            </button>
                            <button onClick={handleNextBlock} disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center gap-2">
                                {currentBlockIndex >= blocks.length - 1 ? 'Завершить практику' : 'Далее'} <FiChevronRight />
                            </button>
                        </div>
                    </div>
                </>)}

                {lessonPhase === 'assessment' && (<>
                    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                        <div className="flex items-center gap-3 text-xl font-semibold text-gray-800"><FiZap />Проверка знаний с AI-помощником</div>
                        <div ref={chatContainerRef} className="h-96 bg-gray-50 rounded-lg p-3 space-y-4 overflow-y-auto">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-lg px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-gray-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && <div className="flex justify-start"><div className="px-4 py-2 rounded-lg shadow bg-white"><Spinner size="sm"/></div></div>}
                        </div>
                        {aiResponse && aiResponse.isSessionComplete ? (
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-green-700 font-semibold mb-4">Отлично! С этим разобрались. Можно двигаться дальше!</p>
                                <button onClick={() => setLessonPhase('story')} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Продолжить историю</button>
                            </div>
                        ) : (
                            <form onSubmit={handleStudentChatSubmit} className="flex gap-2">
                                <input type="text" value={studentChatMessage} onChange={(e) => setStudentChatMessage(e.target.value)} placeholder={aiResponse?.newQuestion ? "Введите ответ на вопрос..." : "Напишите что-нибудь..."} className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500" disabled={isChatLoading} />
                                <button type="submit" disabled={!studentChatMessage.trim() || isChatLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50"><FiSend /></button>
                            </form>
                        )}
                        <div className="text-center pt-4 border-t">
                            <button onClick={() => { if (lesson) toast.error('This feature is not implemented yet.'); }} disabled={isEndingLesson} className="text-sm text-gray-500 hover:text-red-600 flex items-center justify-center mx-auto gap-2 disabled:opacity-50"> <FiCoffee/> Я устал, хочу закончить</button>
                        </div>
                    </div>
                </>)}

                {lessonPhase === 'story' && (<>
                    <div className="bg-gray-50 rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-gray-700">Продолжение истории...</h2>
                            <button onClick={() => {}} className="px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center gap-2">
                                <FiHelpCircle /> Краткое содержание
                            </button>
                        </div>
                        {lesson.storyChapter ? (<>
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                {lesson.storyChapter.teacherSnippetImageUrl && <img src={lesson.storyChapter.teacherSnippetImageUrl} alt="Иллюстрация" className="w-full md:w-1/3 rounded-lg object-cover shadow-lg"/>}
                                <p className="flex-1 text-gray-700 leading-relaxed italic whitespace-pre-wrap">{lesson.storyChapter.teacherSnippetText}</p>
                            </div>
                            <div className="mt-6">
                                <label htmlFor="storyResponse" className="block text-lg font-semibold text-gray-800 mb-2">Что ты будешь делать дальше?</label>
                                <textarea id="storyResponse" rows={4} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500" value={storyResponse} onChange={handleStoryResponseChange} placeholder="Напиши здесь свое действие..." disabled={isSubmitting} />
                            </div>
                            <div className="flex justify-end mt-4">
                                <button onClick={handleSubmitLesson} disabled={isSubmitting || !storyResponse.trim()} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">{isSubmitting ? 'Отправка...' : 'Отправить на проверку'}</button>
                            </div>
                        </>) : <p>К этому уроку нет истории. Можно переходить к следующему.</p>}
                    </div>
                </>)}
            </>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
            <SummaryModal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} summary={summaryText} isLoading={isSummaryLoading} />
            {renderContent()}
        </div>
    );
}
