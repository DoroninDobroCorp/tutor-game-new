import { useState, useEffect, useRef } from 'react';
import { useGetCurrentLessonQuery, useSubmitLessonMutation, useLessonPracticeChatMutation, useEndLessonForReviewMutation } from '../../features/student/studentApi';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiSend, FiCoffee, FiChevronsRight, FiZap } from 'react-icons/fi';
import type { AIAssessmentResponse } from '../../types/models';

const YoutubeEmbed = ({ url }: { url: string }) => {
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

type LessonPhase = 'content' | 'assessment' | 'story';
type ChatMessage = { role: 'user' | 'assistant', content: string };

export default function StudentAdventurePage() {
    const navigate = useNavigate();
    const { data: lesson, isLoading, isError, refetch } = useGetCurrentLessonQuery();
    const [submitLesson, { isLoading: isSubmitting }] = useSubmitLessonMutation();
    const [practiceChat, { isLoading: isChatLoading }] = useLessonPracticeChatMutation();
    const [endLesson, { isLoading: isEndingLesson }] = useEndLessonForReviewMutation();

    const [lessonPhase, setLessonPhase] = useState<LessonPhase>('content');
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
    const [storyResponse, setStoryResponse] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [studentChatMessage, setStudentChatMessage] = useState('');
    const [aiResponse, setAiResponse] = useState<AIAssessmentResponse | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const blocks = lesson?.content?.blocks || [];
    const currentBlock = blocks[currentBlockIndex];

    useEffect(() => {
        if (lesson) {
            setLessonPhase('content');
            setCurrentBlockIndex(0);
            setPracticeAnswers({});
            setStoryResponse('');
            setImageFile(null);
            setChatHistory([]);
            setAiResponse(null);
        }
    }, [lesson]);
    
    useEffect(() => {
      chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

    const startAssessmentPhase = async () => {
        if (!lesson) return;
        setLessonPhase('assessment');
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
    
    const handleNextBlock = () => {
        if (currentBlock.type === 'practice' && !practiceAnswers[currentBlockIndex]?.trim()) {
            toast.error('Пожалуйста, введите ответ, чтобы продолжить.');
            return;
        }
        if (currentBlockIndex >= blocks.length - 1) {
            startAssessmentPhase();
        } else {
            setCurrentBlockIndex(prev => prev + 1);
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
            setChatHistory(chatHistory); // Revert on error
        }
    };
    
    const handleEndForReview = async () => {
        if (window.confirm("Вы уверены, что хотите закончить? Новая карточка для повторения будет добавлена в план.") && lesson) {
            try {
                await endLesson({ lessonId: lesson.id }).unwrap();
                toast.success("Урок для повторения создан. Возвращаемся в кабинет.");
                navigate('/student');
            } catch (err) {
                toast.error("Не удалось завершить урок.");
            }
        }
    };

    const handleSubmitLesson = async () => {
        if (!lesson || !storyResponse.trim()) { toast.error("Напиши, что будет дальше в истории!"); return;}
        const formData = new FormData();
        formData.append('studentResponseText', storyResponse);
        if (imageFile) formData.append('image', imageFile);
        try {
            await submitLesson({ lessonId: lesson.id, formData }).unwrap();
            toast.success("Отлично! Урок отправлен учителю на проверку.", { duration: 4000 });
            navigate('/student');
        } catch (err) {
            toast.error("Не удалось завершить урок.");
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    if (isError) return <div className="text-center text-red-500 p-10">Ошибка загрузки урока. Пожалуйста, <button onClick={() => refetch()} className="underline">обновите</button>.</div>;
    if (!lesson) return (
            <div className="text-center p-10 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold text-green-600">🎉 Поздравляем! 🎉</h2>
                <p className="mt-4 text-lg text-gray-700">Ты прошел все доступные уроки. Так держать!</p>
                <button onClick={() => navigate('/student')} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md">Вернуться в кабинет</button>
            </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
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
                                <textarea id={`answer-${currentBlockIndex}`} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" rows={3} value={practiceAnswers[currentBlockIndex] || ''} onChange={(e) => setPracticeAnswers(prev => ({ ...prev, [currentBlockIndex]: e.target.value }))} placeholder="Введите ваш ответ здесь..." />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleNextBlock} disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center gap-2">Далее <FiChevronsRight /></button>
                    </div>
                </div>
            </>)}

            {lessonPhase === 'assessment' && (<>
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <div className="flex items-center gap-3 text-xl font-semibold text-indigo-800"><FiZap />Проверка знаний с AI-помощником</div>
                    <div ref={chatContainerRef} className="h-96 bg-gray-50 rounded-lg p-3 space-y-4 overflow-y-auto">
                        {chatHistory.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-lg px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
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
                            <input type="text" value={studentChatMessage} onChange={(e) => setStudentChatMessage(e.target.value)} placeholder={aiResponse?.newQuestion ? "Введите ответ на вопрос..." : "Напишите что-нибудь..."} className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" disabled={isChatLoading} />
                            <button type="submit" disabled={!studentChatMessage.trim() || isChatLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"><FiSend /></button>
                        </form>
                    )}
                    <div className="text-center pt-4 border-t">
                        <button onClick={handleEndForReview} disabled={isEndingLesson} className="text-sm text-gray-500 hover:text-red-600 flex items-center justify-center mx-auto gap-2 disabled:opacity-50"> <FiCoffee/> Я устал, хочу закончить</button>
                    </div>
                </div>
            </>)}

            {lessonPhase === 'story' && (<>
                <div className="bg-indigo-50 rounded-lg shadow-md p-6">
                     <h2 className="text-2xl font-bold text-indigo-700 mb-4">Продолжение истории...</h2>
                     {lesson.storyChapter ? (<>
                         <div className="flex flex-col md:flex-row gap-6 items-start">
                             {lesson.storyChapter.teacherSnippetImageUrl && <img src={lesson.storyChapter.teacherSnippetImageUrl} alt="Иллюстрация" className="w-full md:w-1/3 rounded-lg object-cover shadow-lg"/>}
                             <p className="flex-1 text-gray-700 leading-relaxed italic">{lesson.storyChapter.teacherSnippetText}</p>
                         </div>
                         <div className="mt-6">
                            <label htmlFor="storyResponse" className="block text-lg font-semibold text-gray-800 mb-2">Что ты будешь делать дальше?</label>
                            <textarea id="storyResponse" rows={4} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" value={storyResponse} onChange={(e) => setStoryResponse(e.target.value)} placeholder="Напиши здесь свое действие..." disabled={isSubmitting} />
                            <div className="mt-4">
                               <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-300"><FiUpload /><span>{imageFile ? 'Изменить фото' : 'Прикрепить фото'}</span></label>
                               <input id="image-upload" type="file" className="hidden" onChange={(e) => e.target.files && setImageFile(e.target.files[0])} accept="image/png, image/jpeg, image/webp" />
                               {imageFile && (<div className="mt-2 relative inline-block align-middle ml-4"><img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-20 w-20 object-cover rounded-md border-2 border-white shadow-sm" /><button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none shadow-md hover:bg-red-600"><FiX size={12} /></button></div>)}
                            </div>
                         </div>
                         <div className="flex justify-end mt-4">
                             <button onClick={handleSubmitLesson} disabled={isSubmitting || !storyResponse.trim()} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">{isSubmitting ? 'Отправка...' : 'Отправить на проверку'}</button>
                         </div>
                     </>) : <p>К этому уроку нет истории. Можно переходить к следующему.</p>}
                 </div>
            </>)}
        </div>
    );
}
