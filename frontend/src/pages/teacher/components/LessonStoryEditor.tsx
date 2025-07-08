import { useState, useEffect, useRef } from 'react';
import { 
    useGenerateStorySnippetMutation, 
    useApproveStorySnippetMutation,
    useLazyCheckStoryImageStatusQuery
} from '../../../features/lesson/lessonApi';
import { Lesson } from '../../../features/goal/goalApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiRefreshCw, FiCheck, FiMaximize2 } from 'react-icons/fi';

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

const LessonStoryEditor = ({ lesson, onCloseModal }: LessonStoryEditorProps) => {
    const [story, setStory] = useState<GeneratedStory>({
        text: '',
        imageUrl: undefined,
        prompt: ''
    });
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [generationId, setGenerationId] = useState<string | null>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    const [generateStory] = useGenerateStorySnippetMutation();
    const [approveStory] = useApproveStorySnippetMutation();
    const [checkImageStatus] = useLazyCheckStoryImageStatusQuery();

    useEffect(() => {
        if (lesson.storyChapter) {
            const storyChapter = lesson.storyChapter;
            
            setStory({
                text: storyChapter?.teacherSnippetText || '',
                imageUrl: storyChapter?.teacherSnippetImageUrl || undefined,
                prompt: storyChapter?.teacherSnippetImagePrompt || ''
            });
        } else {
            setStory({
                text: '',
                imageUrl: undefined,
                prompt: ''
            });
        }
    }, [lesson]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

    // Poll for image generation status
    const startPolling = (id: string) => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
        }

        pollingInterval.current = setInterval(async () => {
            try {
                const result = await checkImageStatus(id).unwrap();
                
                if (result.data?.status === 'COMPLETE' && result.data?.url) {
                    setStory(prev => ({
                        ...prev,
                        imageUrl: result.data?.url || undefined
                    }));
                    toast.success('Изображение сгенерировано!');
                    if (pollingInterval.current) {
                        clearInterval(pollingInterval.current);
                        pollingInterval.current = null;
                    }
                    setGenerationId(null);
                } else if (result.data?.status === 'FAILED') {
                    toast.error('Не удалось сгенерировать изображение');
                    if (pollingInterval.current) {
                        clearInterval(pollingInterval.current);
                        pollingInterval.current = null;
                    }
                    setGenerationId(null);
                }
            } catch (error) {
                console.error('Error checking image status:', error);
                toast.error('Ошибка при проверке статуса генерации');
                if (pollingInterval.current) {
                    clearInterval(pollingInterval.current);
                    pollingInterval.current = null;
                }
                setGenerationId(null);
            }
        }, 3000); // Poll every 3 seconds
    };

    const handleGenerateStory = async () => {
        try {
            setIsGenerating(true);
            // Get previous story context if available
            const previousStory = lesson.previousLesson?.storyChapter?.studentSnippetText;
            const result = await generateStory({
                lessonId: lesson.id,
                refinementPrompt: refinementPrompt || undefined,
                previousStory: previousStory || undefined,
            }).unwrap();

            if (result.data) {
                const responseData = result.data as {
                    text?: string;
                    imageUrl?: string;
                    prompt?: string;
                    generationId?: string;
                };
                
                setStory({
                    text: responseData.text || '',
                    imageUrl: responseData.imageUrl,
                    prompt: responseData.prompt || ''
                });
                
                // If we have a generation ID, start polling for the image
                if (responseData.generationId) {
                    setGenerationId(responseData.generationId);
                    startPolling(responseData.generationId);
                    toast.success('Текст истории готов! Генерируем изображение...');
                } else {
                    toast.success('История успешно сгенерирована!');
                }
                
                setRefinementPrompt('');
            }
        } catch (error) {
            console.error('Failed to generate story:', error);
            toast.error('Не удалось сгенерировать историю. Пожалуйста, попробуйте снова.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApproveStory = async () => {
        if (!story.text) {
            toast.error('Пожалуйста, сгенерируйте историю перед утверждением.');
            return;
        }

        try {
            setIsApproving(true);
            await approveStory({
                lessonId: lesson.id,
                text: story.text,
                imageUrl: story.imageUrl || '',
                prompt: story.prompt || ''
            }).unwrap();
            
            toast.success('История одобрена и доступна студентам!');
            onCloseModal();
        } catch (error) {
            console.error('Failed to approve story:', error);
            toast.error('Не удалось одобрить историю. Пожалуйста, попробуйте снова.');
        } finally {
            setIsApproving(false);
        }
    };

    const isLoading = isGenerating || isApproving;
    
    // Handle text changes safely
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setStory(prev => ({
            ...prev,
            text: e.target.value
        }));
    };

    return (
        <div className="rounded-xl p-3">
            {isLightboxOpen && story?.imageUrl && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] cursor-pointer" 
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <img 
                        src={story.imageUrl} 
                        alt="Full view" 
                        className="max-w-[90vw] max-h-[90vh] object-contain" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Текст истории</label>
                    <textarea 
                        value={story.text} 
                        onChange={handleTextChange} 
                        rows={10} 
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Здесь появится текст истории..."
                        disabled={isLoading}
                    />
                    
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Уточнение для генерации (необязательно)
                        </label>
                        <input
                            type="text"
                            value={refinementPrompt}
                            onChange={e => setRefinementPrompt(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Например: сделай смешнее, добавь дракона..."
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 text-center mb-2">Изображение</label>
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                        {generationId ? (
                            <div className="flex flex-col items-center">
                                <Spinner size="lg" />
                                <p className="mt-2 text-gray-600">Генерируем изображение...</p>
                            </div>
                        ) : story?.imageUrl ? (
                            <div className="relative w-full h-full">
                                <img
                                    src={story.imageUrl}
                                    alt="Story illustration"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                                <button
                                    onClick={() => setIsLightboxOpen(true)}
                                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition"
                                >
                                    <FiMaximize2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <span className="text-gray-400">Изображение появится здесь</span>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleGenerateStory} 
                        disabled={isLoading} 
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <Spinner size="sm" />
                        ) : (
                            <FiRefreshCw size={16} />
                        )}
                        <span>Сгенерировать</span>
                    </button>
                    
                    <button 
                        onClick={handleApproveStory} 
                        disabled={isLoading || !story?.text} 
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isApproving ? (
                            <Spinner size="sm" />
                        ) : (
                            <FiCheck size={16} />
                        )}
                        <span>Утвердить</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LessonStoryEditor;
