import { useState, useEffect, useRef, Fragment } from 'react';
import { useTranslation, Trans } from 'react-i18next';
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
    const { t } = useTranslation();
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
    if (!videoId) return <div className="text-red-500 p-4 bg-red-50 rounded-md my-4">{t('studentAdventure.invalidYouTubeLink')}</div>;

    return (
        <div className="relative my-4" style={{ paddingTop: '56.25%' }}>
            <iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title="Embedded youtube" className="absolute top-0 left-0 w-full h-full rounded-md" />
        </div>
    );
};

const SummaryModal = ({ isOpen, onClose, summary, isLoading }: { isOpen: boolean; onClose: () => void; summary: string; isLoading: boolean; }) => {
    const { t } = useTranslation();
    return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-start">
                  {t('studentAdventure.summaryTitle')}
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

// Simple confetti component
const ConfettiPiece = ({ style, color }: {style: React.CSSProperties, color: string}) => (
    <div 
        className={`absolute w-2 h-4 rounded-full ${color}`}
        style={style}
    />
);

const Confetti = () => {
    const colors = ['bg-yellow-300', 'bg-green-400', 'bg-blue-400', 'bg-red-400', 'bg-purple-400'];
    const pieces = [...Array(100)].map((_, i) => ({
        id: i,
        style: {
            top: '-10%',
            left: `${Math.random() * 100}%`,
            animation: `fall ${Math.random() * 3 + 4}s ${Math.random() * 2}s linear infinite`,
            transform: `rotate(${Math.random() * 360}deg)`,
        },
        color: colors[i % colors.length],
    }));

    return (
        <div className="absolute inset-0 pointer-events-none z-0">
            <style>{`
            @keyframes fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
            `}</style>
            {pieces.map(p => <ConfettiPiece key={p.id} style={p.style} color={p.color}/>)}
        </div>
    );
}

type LessonPhase = 'content' | 'assessment' | 'story' | 'control_work';
type ChatMessage = { role: 'user' | 'assistant', content: string };

export default function StudentAdventurePage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data: lesson, isLoading, isError, refetch } = useGetCurrentLessonQuery();
    const [submitLesson, { isLoading: isSubmitting }] = useSubmitLessonMutation();
    const [practiceChat, { isLoading: isChatLoading }] = useLessonPracticeChatMutation();
    const [ , { isLoading: isEndingLesson }] = useEndLessonForReviewMutation();
    const [ , { isLoading: isSummaryLoading }] = useLazyGetStorySummaryQuery();

    const [lessonPhase, setLessonPhase] = useState<LessonPhase>('content');
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

    // Specific state for Control Work
    const [controlWorkQuestions, setControlWorkQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [requiredAnswers, setRequiredAnswers] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [isControlWorkComplete, setIsControlWorkComplete] = useState(false);

    const practiceAnswers = useAppSelector(selectPracticeAnswers);
    const storyResponse = useAppSelector(selectStoryResponse);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [studentChatMessage, setStudentChatMessage] = useState('');
    const [aiResponse, setAiResponse] = useState<AIAssessmentResponse | null>(null);

    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [summaryText] = useState('');

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
                setRequiredAnswers(cwQuestions.length);
                setCorrectAnswers(0);
                setIsControlWorkComplete(false);
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
            toast.error(t('studentAdventure.enterAnswerToContinue'));
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
            toast.error(t('studentAdventure.startPracticeDialogError'));
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
            toast.error(t('studentAdventure.sendMessageError'));
            setChatHistory(chatHistory);
        }
    };
    
    const handleControlWorkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentChatMessage.trim() || !lesson || isChatLoading) return;

        const answer = studentChatMessage;
        const currentFullHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: answer }];
        setChatHistory(currentFullHistory);
        setStudentChatMessage('');

        const evaluationChat = currentFullHistory.slice(-2);

        try {
            const result = await practiceChat({ lessonId: lesson.id, chatHistory: evaluationChat }).unwrap();
            const { isSessionComplete, responseText, newQuestion } = result.data;
            
            let assistantResponse = responseText;
            if (newQuestion) {
                 assistantResponse += `\n\n<hr class='my-2'>\n\n${newQuestion.content}`;
            }
            setChatHistory(prev => [...prev, { role: 'assistant', content: assistantResponse }]);

            if (isSessionComplete) {
                 const newCorrectCount = correctAnswers + 1;
                setCorrectAnswers(newCorrectCount);

                const newProgress = requiredAnswers > 0 ? (newCorrectCount / requiredAnswers) * 100 : 0;
                if (newProgress >= 100) {
                    toast.success(t('studentAdventure.submitControlWorkSuccess'), { duration: 3000 });
                    setIsControlWorkComplete(true);
                    return;
                }

                const nextIndex = currentQuestionIndex + 1;
                if (nextIndex < controlWorkQuestions.length) {
                    setCurrentQuestionIndex(nextIndex);
                    setChatHistory(prev => [...prev, { role: 'assistant', content: controlWorkQuestions[nextIndex].content }]);
                } else {
                    const commandHistory: ChatMessage[] = [...currentFullHistory, { role: 'user', content: "GENERATE_NEW_QUESTION_ON_FAILED_TOPIC" }];
                    const newQuestionResult = await practiceChat({ lessonId: lesson.id, chatHistory: commandHistory }).unwrap();
                    const { responseText: newQResponseText, newQuestion: newQ } = newQuestionResult.data;
                    
                    if (newQ) {
                        setChatHistory(prev => [...prev, { role: 'assistant', content: `${newQResponseText}\n\n<hr class='my-2'>\n\n${newQ.content}` }]);
                    } else {
                        toast.success(t('studentAdventure.submitControlWorkSuccess'), { duration: 3000 });
                        setIsControlWorkComplete(true);
                    }
                }
            } else {
                setRequiredAnswers(prev => prev + 3);
            }
        } catch (err) {
            toast.error(t('studentAdventure.checkAnswerError'));
            setChatHistory(chatHistory);
        }
    };

    const handleGiveUp = () => {
        if (window.confirm(t('studentAdventure.giveUpConfirmation'))) {
            dispatch(resetAdventureState());
            navigate('/student');
        }
    };
    
    const handleSubmitLesson = async () => {
        if (!lesson || !storyResponse.trim()) {
            toast.error(t('studentAdventure.writeStoryContinuation'));
            return;
        }

        const progress = requiredAnswers > 0 ? (correctAnswers / requiredAnswers) * 100 : 0;
        const isControlWorkSuccess = lesson.type === 'CONTROL_WORK' && progress >= 100;
        
        if (lesson.type === 'CONTROL_WORK' && !isControlWorkSuccess) {
            toast.error(t('studentAdventure.controlWorkNotCompletedError'));
            return;
        }

        const practiceAnswersArray = (lesson.type === 'CONTROL_WORK') 
            ? [] 
            : blocks
                .map((block: any, index: number) => ({ block, index }))
                .filter(({ block }: any) => block.type === 'practice')
                .map(({ index }: any) => practiceAnswers[index] || '');

        const formData = new FormData();
        formData.append('studentResponseText', storyResponse);
        formData.append('practiceAnswers', JSON.stringify(practiceAnswersArray));
        
        try {
            await submitLesson({ lessonId: lesson.id, formData }).unwrap();
            toast.success(t('studentAdventure.lessonSubmitSuccess'), { duration: 4000 });
            dispatch(resetAdventureState());
            navigate('/student');
        } catch (err) {
            toast.error(t('studentAdventure.lessonSubmitError'));
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    if (isError) return (
        <div className="text-center text-red-500 p-10">
            <Trans i18nKey="studentAdventure.lessonLoadingError">
                Ошибка загрузки урока. Пожалуйста, <button onClick={() => refetch()} className="underline">обновите</button>.
            </Trans>
        </div>
    );

    const renderContent = () => {
        if (!lesson) {
             return (
                <div className="text-center p-10 bg-white rounded-lg shadow">
                    <h2 className="text-2xl font-bold text-green-600">{t('studentAdventure.congratulations')}</h2>
                    <p className="mt-4 text-lg text-gray-700">{t('studentAdventure.allLessonsCompleted')}</p>
                    <button onClick={() => navigate('/student')} className="mt-6 btn-primary">{t('studentAdventure.backToCabinet')}</button>
                </div>
            );
        }

        // 1. Story phase is the final destination, check it first.
        if (lessonPhase === 'story') {
            return (
                 <div className="bg-gray-50 rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-gray-700">{t('studentAdventure.storyContinuation')}</h2>
                        <button onClick={() => {}} className="px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center gap-2">
                            <FiHelpCircle /> {t('studentAdventure.summary')}
                        </button>
                    </div>
                    {lesson.storyChapter ? (<>
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {lesson.storyChapter.teacherSnippetImageUrl && <img src={lesson.storyChapter.teacherSnippetImageUrl} alt="image" className="w-full md:w-1/3 rounded-lg object-cover shadow-lg"/>}
                            <p className="flex-1 text-gray-700 leading-relaxed italic whitespace-pre-wrap">{lesson.storyChapter.teacherSnippetText}</p>
                        </div>
                        <div className="mt-6">
                            <label htmlFor="storyResponse" className="block text-lg font-semibold text-gray-800 mb-2">{t('studentAdventure.whatWillYouDoNext')}</label>
                            <textarea id="storyResponse" rows={4} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500" value={storyResponse} onChange={handleStoryResponseChange} placeholder={t('studentAdventure.writeYourAction')} disabled={isSubmitting} />
                        </div>
                        <div className="flex justify-end mt-4">
                            <button onClick={handleSubmitLesson} disabled={isSubmitting || !storyResponse.trim()} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">{isSubmitting ? t('studentAdventure.sending') : t('studentAdventure.sendForReview')}</button>
                        </div>
                    </>) : <p>{t('studentAdventure.noStoryForLesson')}</p>}
                </div>
            );
        }

        // 2. Intermediate success screen for completed control work
        if (lesson.type === 'CONTROL_WORK' && isControlWorkComplete) {
            return (
                <div className="text-center p-10 bg-white rounded-lg shadow-lg relative overflow-hidden">
                    <Confetti />
                    <h2 className="text-3xl font-bold text-green-600 z-10 relative">{t('studentAdventure.congratulations')}</h2>
                    <p className="mt-4 text-lg text-gray-700 z-10 relative">{t('studentAdventure.controlWorkPassed')}</p>
                    <button 
                        onClick={() => setLessonPhase('story')} 
                        className="mt-8 px-8 py-4 bg-green-500 text-white text-xl font-bold rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105 z-10 relative"
                    >
                        {t('studentAdventure.goToStory')}
                    </button>
                </div>
            );
        }

        // 3. Control work solving phase
        if (lessonPhase === 'control_work') {
            const progress = requiredAnswers > 0 ? Math.min(100, (correctAnswers / requiredAnswers) * 100) : 0;
            return (
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900 text-center">{lesson.title}</h1>
                    <div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-center text-sm text-gray-600 mt-2">{t('studentAdventure.progress')}: {Math.round(progress)}% ({correctAnswers} / {requiredAnswers})</p>
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
                        <input type="text" value={studentChatMessage} onChange={(e) => setStudentChatMessage(e.target.value)} placeholder={t('studentAdventure.yourAnswerPlaceholder')} className="input flex-1" disabled={isChatLoading} />
                        <button type="submit" disabled={!studentChatMessage.trim() || isChatLoading} className="btn-primary disabled:opacity-50"><FiSend /></button>
                    </form>
                    <div className="text-center pt-4 border-t">
                        <button onClick={handleGiveUp} className="text-sm text-gray-500 hover:text-red-600 flex items-center justify-center mx-auto gap-2"> <FiThumbsDown/> {t('studentAdventure.giveUp')}</button>
                    </div>
                </div>
            );
        }
        
        // 4. Regular lesson phases (content & assessment)
        return (
             <>
                <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
                {lessonPhase === 'content' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-500 mb-4">{currentBlockIndex + 1} / {blocks.length}</p>
                        <div className={`p-4 rounded-r-lg ${ currentBlock.type === 'theory' ? 'block-theory' : currentBlock.type === 'practice' ? 'block-practice' : 'block-alert' }`}>
                            <h3 className="font-semibold capitalize text-lg mb-2">{currentBlock.type === 'youtube' ? t('studentAdventure.video') : currentBlock.type}</h3>
                            {currentBlock.type === 'youtube' ? <YoutubeEmbed url={currentBlock.content} /> : <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: currentBlock.content }} />}
                            {currentBlock.type === 'practice' && (
                                <div className="mt-4">
                                    <label htmlFor={`answer-${currentBlockIndex}`} className="block text-sm font-medium text-gray-700 mb-1">{t('studentAdventure.yourAnswerLabel')}:</label>
                                    <textarea id={`answer-${currentBlockIndex}`} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500" rows={3} value={practiceAnswers[currentBlockIndex] || ''} onChange={(e) => handlePracticeAnswerChange(currentBlockIndex, e.target.value)} placeholder={t('studentAdventure.yourAnswerPlaceholder')} />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <button onClick={handlePreviousBlock} disabled={currentBlockIndex === 0} className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                <FiChevronLeft /> {t('studentAdventure.previous')}
                            </button>
                            <button onClick={handleNextBlock} disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                                {currentBlockIndex >= blocks.length - 1 ? t('studentAdventure.finishLesson') : t('studentAdventure.next')} <FiChevronRight />
                            </button>
                        </div>
                    </div>
                 )}
    
                {lessonPhase === 'assessment' && (
                    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                        <div className="flex items-center gap-3 text-xl font-semibold text-gray-800"><FiZap />{t('studentAdventure.assessmentTitle')}</div>
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
                                <p className="text-green-700 font-semibold mb-4">{t('studentAdventure.assessmentSuccessMessage')}</p>
                                <button onClick={() => setLessonPhase('story')} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">{t('studentAdventure.continueStory')}</button>
                            </div>
                        ) : (
                            <form onSubmit={handleStudentChatSubmit} className="flex gap-2">
                                <input type="text" value={studentChatMessage} onChange={(e) => setStudentChatMessage(e.target.value)} placeholder={t('studentAdventure.yourAnswerPlaceholder')} className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500" disabled={isChatLoading} />
                                <button type="submit" disabled={!studentChatMessage.trim() || isChatLoading} className="btn-primary disabled:opacity-50"><FiSend /></button>
                            </form>
                        )}
                        <div className="text-center pt-4 border-t">
                            <button onClick={() => { if (lesson) toast.error(t('common.notImplemented')); }} disabled={isEndingLesson} className="text-sm text-gray-500 hover:text-red-600 flex items-center justify-center mx-auto gap-2 disabled:opacity-50"> <FiCoffee/> {t('studentAdventure.giveUp')}</button>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
            <SummaryModal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} summary={summaryText} isLoading={isSummaryLoading} />
            {renderContent()}
        </div>
    );
}
