import { useState, useEffect, useRef } from 'react';
import { 
    useGenerateStorySnippetMutation, 
    useApproveStorySnippetMutation,
    useLazyCheckStoryImageStatusQuery
} from '../../../features/lesson/lessonApi';
import { Lesson } from '../../../features/goal/goalApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiRefreshCw, FiCheck, FiMaximize2, FiX } from 'react-icons/fi';

interface GeneratedStory {
    text: string;
    imageUrl?: string;
    prompt?: string;
}

interface LessonWithPrevious extends Lesson {
    previousLesson?: Lesson | null;
}

interface LessonStoryEditorProps {
    lesson: LessonWithPrevious;
    onCloseModal: () => void;
}

const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] cursor-pointer" onClick={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl"><FiX /></button>
        <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
);

const LessonStoryEditor = ({ lesson, onCloseModal }: LessonStoryEditorProps) => {
    const [story, setStory] = useState<GeneratedStory>({ text: '', imageUrl: undefined, prompt: '' });
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [generationId, setGenerationId] = useState<string | null>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    const [generateStory] = useGenerateStorySnippetMutation();
    const [approveStory] = useApproveStorySnippetMutation();
    const [checkImageStatus] = useLazyCheckStoryImageStatusQuery();

    useEffect(() => {
        if (lesson.storyChapter) {
            setStory({
                text: lesson.storyChapter.teacherSnippetText || '',
                imageUrl: lesson.storyChapter.teacherSnippetImageUrl || undefined,
                prompt: lesson.storyChapter.teacherSnippetImagePrompt || ''
            });
        } else {
            setStory({ text: '', imageUrl: undefined, prompt: '' });
        }
    }, [lesson]);

    useEffect(() => () => { if (pollingInterval.current) clearInterval(pollingInterval.current); }, []);

    const startPolling = (id: string) => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        const poll = async () => {
            try {
                const result = await checkImageStatus(id).unwrap();
                if (result.data?.status === 'COMPLETE' && result.data?.url) {
                    setStory(prev => ({ ...prev, imageUrl: result.data.url || undefined }));
                    toast.success('Изображение сгенерировано!');
                    stopPolling();
                } else if (result.data?.status === 'FAILED') {
                    toast.error('Не удалось сгенерировать изображение');
                    stopPolling();
                }
            } catch (error) {
                toast.error('Ошибка при проверке статуса генерации');
                stopPolling();
            }
        };
        pollingInterval.current = setInterval(poll, 3000);
        poll(); // Initial check
    };
    
    const stopPolling = () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        setGenerationId(null);
    };

    const handleGenerateStory = async () => {
        setIsGenerating(true);
        try {
            const result = await generateStory({ lessonId: lesson.id, refinementPrompt: refinementPrompt || undefined }).unwrap();
            const responseData = result.data as { text?: string; imageUrl?: string; prompt?: string; generationId?: string; };
            setStory({ text: responseData.text || '', imageUrl: responseData.imageUrl, prompt: responseData.prompt || '' });
            if (responseData.generationId) {
                setGenerationId(responseData.generationId);
                startPolling(responseData.generationId);
                toast.success('Текст истории готов! Генерируем изображение...');
            } else {
                toast.success('История успешно сгенерирована!');
            }
            setRefinementPrompt('');
        } catch (error) {
            toast.error('Не удалось сгенерировать историю.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApproveStory = async () => {
        if (!story.text) { toast.error('Сгенерируйте историю перед утверждением.'); return; }
        setIsApproving(true);
        try {
            await approveStory({ lessonId: lesson.id, text: story.text, imageUrl: story.imageUrl || '', imagePrompt: story.prompt || '' }).unwrap();
            toast.success('История одобрена и доступна студенту!');
            onCloseModal();
        } catch (error) {
            toast.error('Не удалось одобрить историю.');
        } finally {
            setIsApproving(false);
        }
    };
    
    const isLoading = isGenerating || isApproving;
    const studentResponse = lesson.storyChapter?.studentSnippetText || lesson.storyChapter?.studentSnippetImageUrl;

    return (
        <div className="rounded-xl p-3 max-h-[70vh] overflow-y-auto">
            {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Текст истории (часть учителя)</label>
                    <textarea value={story.text} onChange={(e) => setStory(p => ({ ...p, text: e.target.value }))} rows={10} className="w-full p-2 border rounded-md" placeholder="Здесь появится текст истории..." disabled={isLoading} />
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Уточнение для генерации (необязательно)</label>
                        <input type="text" value={refinementPrompt} onChange={e => setRefinementPrompt(e.target.value)} className="w-full p-2 border rounded-md" placeholder="Например: сделай смешнее, добавь дракона..." disabled={isLoading} />
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 text-center mb-2">Изображение (часть учителя)</label>
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center relative">
                        {generationId ? <><Spinner size="md" /><p className="ml-2">Генерация...</p></>
                        : story.imageUrl ? (
                            <>
                                <img src={story.imageUrl} alt="Story" className="w-full h-full object-cover rounded-lg" />
                                <button onClick={() => setLightboxImage(story.imageUrl!)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/75">
                                    <FiMaximize2 size={16} />
                                </button>
                            </>
                        ) : <span className="text-gray-400">Изображение появится здесь</span>}
                    </div>
                </div>
            </div>
            
            <div className="border-t mt-6 pt-4 flex justify-between items-center">
                <p className="text-xs text-gray-500">Предыдущий ответ ученика используется как контекст для генерации.</p>
                <div className="flex gap-3">
                    <button onClick={handleGenerateStory} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        {isGenerating ? <Spinner size="sm" /> : <FiRefreshCw size={16} />} <span>Сгенерировать</span>
                    </button>
                    <button onClick={handleApproveStory} disabled={isLoading || !story.text} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                        {isApproving ? <Spinner size="sm" /> : <FiCheck size={16} />} <span>Утвердить</span>
                    </button>
                </div>
            </div>

            {studentResponse && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Ответ ученика на предыдущий шаг</h4>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        {lesson.storyChapter?.studentSnippetImageUrl && (
                            <div className="mb-2">
                                <img 
                                    src={lesson.storyChapter.studentSnippetImageUrl} 
                                    alt="Ответ ученика" 
                                    className="max-w-xs rounded-md shadow-sm cursor-pointer"
                                    onClick={() => setLightboxImage(lesson.storyChapter!.studentSnippetImageUrl!)}
                                />
                            </div>
                        )}
                        {lesson.storyChapter?.studentSnippetText && (
                            <p className="italic text-gray-700">"{lesson.storyChapter.studentSnippetText}"</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default LessonStoryEditor;
