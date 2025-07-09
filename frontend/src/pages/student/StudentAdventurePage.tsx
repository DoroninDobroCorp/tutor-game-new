import { useState, useEffect } from 'react';
import { useGetCurrentLessonQuery, useSubmitLessonMutation } from '../../features/student/studentApi';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX } from 'react-icons/fi';

export default function StudentAdventurePage() {
    const navigate = useNavigate();
    const { data: lesson, isLoading, isError, refetch } = useGetCurrentLessonQuery();
    const [submitLesson, { isLoading: isSubmitting }] = useSubmitLessonMutation();

    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
    const [storyResponse, setStoryResponse] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    const blocks = lesson?.content?.blocks || [];
    const currentBlock = blocks[currentBlockIndex];
    const isContentViewFinished = currentBlockIndex >= blocks.length;

    useEffect(() => {
        if (lesson) {
            setCurrentBlockIndex(0);
            setPracticeAnswers({});
            setStoryResponse('');
            setImageFile(null);
        }
    }, [lesson]);
    
    const handleAnswerChange = (text: string) => {
        setPracticeAnswers(prev => ({
            ...prev,
            [currentBlockIndex]: text,
        }));
    };

    const handleNextBlock = () => {
        if (!currentBlock) return;
        if (currentBlock.type === 'practice' && !practiceAnswers[currentBlockIndex]?.trim()) {
            toast.error('Пожалуйста, введите ответ, чтобы продолжить.');
            return;
        }
        setCurrentBlockIndex(prev => prev + 1);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
        }
    };

    const handleSubmitLesson = async () => {
        if (!lesson || !storyResponse.trim()) {
            toast.error("Напиши, что будет дальше в истории!");
            return;
        }

        const orderedPracticeAnswers = blocks
            .map((block, index) => ({ block, index }))
            .filter(({ block }) => block.type === 'practice')
            .map(({ index }) => practiceAnswers[index] || '');

        const formData = new FormData();
        formData.append('studentResponseText', storyResponse);
        formData.append('answers', JSON.stringify(orderedPracticeAnswers));
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            await submitLesson({
                lessonId: lesson.id,
                formData: formData,
            }).unwrap();
            
            toast.success("Отлично! Урок завершен. Загружаем следующий...", { duration: 3000 });
            // The query will refetch automatically due to invalidation.
        } catch (err) {
            console.error('Error submitting lesson:', err);
            toast.error("Не удалось завершить урок.");
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    }

    if (isError) {
        return <div className="text-center text-red-500 p-10">Ошибка загрузки урока. Пожалуйста, <button onClick={() => refetch()} className="underline">обновите</button>.</div>;
    }

    if (!lesson) {
        return (
            <div className="text-center p-10 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold text-green-600">🎉 Поздравляем! 🎉</h2>
                <p className="mt-4 text-lg text-gray-700">Ты прошел все доступные уроки в этом учебном плане. Так держать!</p>
                <button onClick={() => navigate('/student')} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md">Вернуться в кабинет</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>

            {!isContentViewFinished && currentBlock && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-sm text-gray-500 mb-4">Шаг {currentBlockIndex + 1} из {blocks.length}</p>
                    <div className={`p-4 border-l-4 rounded-r-lg ${currentBlock.type === 'theory' ? 'border-blue-500 bg-blue-50' : 'border-purple-500 bg-purple-50'}`}>
                        <h3 className="font-semibold text-lg mb-2">{currentBlock.type === 'theory' ? '📚 Теория' : '✏️ Задание'}</h3>
                        <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: currentBlock.content }} />
                        
                        {currentBlock.type === 'practice' && (
                            <div className="mt-4">
                                <label htmlFor={`answer-${currentBlockIndex}`} className="block text-sm font-medium text-gray-700 mb-1">Ваш ответ:</label>
                                <textarea
                                    id={`answer-${currentBlockIndex}`}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    rows={3}
                                    value={practiceAnswers[currentBlockIndex] || ''}
                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                    placeholder="Введите ваш ответ здесь..."
                                />
                                <div className="mt-4">
                                    <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-300">
                                        <FiUpload />
                                        <span>{imageFile ? 'Изменить фото' : 'Прикрепить фото'}</span>
                                    </label>
                                    <input id="image-upload" type="file" className="hidden" onChange={handleFileSelect} accept="image/png, image/jpeg, image/webp" />
                                    {imageFile && (
                                    <div className="mt-2 relative inline-block align-middle ml-4">
                                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-20 w-20 object-cover rounded-md border-2 border-white shadow-sm" />
                                        <button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none shadow-md hover:bg-red-600">
                                            <FiX size={12} />
                                        </button>
                                    </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleNextBlock} disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                            Далее
                        </button>
                    </div>
                </div>
            )}

            {isContentViewFinished && (
                 <div className="bg-indigo-50 rounded-lg shadow-md p-6">
                     <h2 className="text-2xl font-bold text-indigo-700 mb-4">Продолжение истории...</h2>
                     {lesson.storyChapter ? (
                         <>
                             <div className="flex flex-col md:flex-row gap-6 items-start">
                                 {lesson.storyChapter.teacherSnippetImageUrl && (
                                     <img src={lesson.storyChapter.teacherSnippetImageUrl} alt="Иллюстрация" className="w-full md:w-1/3 rounded-lg object-cover shadow-lg"/>
                                 )}
                                 <p className="flex-1 text-gray-700 leading-relaxed italic">{lesson.storyChapter.teacherSnippetText}</p>
                             </div>
                             <div className="mt-6">
                                 <label htmlFor="storyResponse" className="block text-lg font-semibold text-gray-800 mb-2">
                                     Что ты будешь делать дальше?
                                 </label>
                                 <textarea
                                     id="storyResponse"
                                     rows={4}
                                     className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                     value={storyResponse}
                                     onChange={(e) => setStoryResponse(e.target.value)}
                                     placeholder="Напиши здесь свое действие..."
                                     disabled={isSubmitting}
                                 />
                             </div>
                             <div className="flex justify-end mt-4">
                                 <button onClick={handleSubmitLesson} disabled={isSubmitting || !storyResponse.trim()} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
                                     {isSubmitting ? 'Отправка...' : 'Завершить урок'}
                                 </button>
                             </div>
                         </>
                     ) : (
                         <p>К этому уроку нет истории. Можно переходить к следующему.</p>
                     )}
                 </div>
            )}
        </div>
    );
}
