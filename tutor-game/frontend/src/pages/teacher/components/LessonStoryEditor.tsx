import { useState, useEffect } from 'react';
import { useGenerateStorySnippetMutation, useApproveStorySnippetMutation } from '../../../features/lesson/lessonApi';
import { Lesson } from '../../../features/goal/goalApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiRefreshCw, FiCheck, FiX, FiMaximize2, FiImage } from 'react-icons/fi';

interface GeneratedStory {
    teacherSnippetText: string;
    teacherSnippetImageUrl?: string;
    teacherSnippetImagePrompt?: string;
}

interface LightboxProps {
    src: string;
    onClose: () => void;
}

const Lightbox = ({ src, onClose }: LightboxProps) => {
    if (!src) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]"
            onClick={onClose}
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white text-3xl hover:opacity-75"
            >
                <FiX />
            </button>
            <img 
                src={src} 
                alt="Full view" 
                className="max-w-[90vw] max-h-[90vh] object-contain" 
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

interface LessonStoryEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
    onStorySaved?: () => void;
}

export const LessonStoryEditor = ({ 
    lesson, 
    onCloseModal,
    onStorySaved
}: LessonStoryEditorProps) => {
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    
    const [generateStory, { isLoading: isGenerating }] = useGenerateStorySnippetMutation();
    const [approveStory, { isLoading: isApproving }] = useApproveStorySnippetMutation();

    // Initialize with existing story data if available
    useEffect(() => {
        if (lesson.storyChapter) {
            setGeneratedStory({
                teacherSnippetText: lesson.storyChapter.teacherSnippetText || '',
                teacherSnippetImageUrl: lesson.storyChapter.teacherSnippetImageUrl || undefined,
                teacherSnippetImagePrompt: lesson.storyChapter.teacherSnippetImagePrompt || ''
            });
        }
    }, [lesson.id]);

    const handleGenerateStory = async (regenerate = false) => {
        if (!lesson.id) return;
        
        try {
            const response = await generateStory({
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                previousLessonId: (lesson as any).previousLesson?.id,
                refinementPrompt: regenerate ? refinementPrompt : undefined
            }).unwrap();
            
            if (response.data) {
                setGeneratedStory({
                    teacherSnippetText: response.data.teacherSnippetText,
                    teacherSnippetImageUrl: response.data.teacherSnippetImageUrl,
                    teacherSnippetImagePrompt: response.data.teacherSnippetImagePrompt || ''
                });
                
                if (regenerate) {
                    toast.success("История успешно перегенерирована!");
                } else {
                    toast.success("История успешно сгенерирована!");
                }
            }
        } catch (error) {
            console.error('Error generating story:', error);
            toast.error("Не удалось сгенерировать историю. Пожалуйста, попробуйте ещё раз.");
        }
    };

    const handleApproveStory = async () => {
        if (!lesson.id || !generatedStory) return;
        
        try {
            await approveStory({
                lessonId: lesson.id,
                text: generatedStory.teacherSnippetText,
                imageUrl: generatedStory.teacherSnippetImageUrl || '',
                imagePrompt: generatedStory.teacherSnippetImagePrompt || ''
            }).unwrap();
            
            toast.success("История успешно утверждена!");
            onStorySaved?.();
        } catch (error) {
            console.error('Error approving story:', error);
            toast.error("Не удалось сохранить историю. Пожалуйста, попробуйте ещё раз.");
        }
    };

    const isStoryApproved = lesson.storyChapter?.teacherSnippetStatus === 'APPROVED';
    const hasGeneratedStory = !!generatedStory?.teacherSnippetText;
    
    return (
        <div className="rounded-xl p-3">
            <h3 className="text-lg font-medium mb-4">Редактор истории</h3>
            
            {isStoryApproved && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
                    История для этого урока уже утверждена и доступна студенту.
                </div>
            )}
            
            <div className="space-y-4">
                {hasGeneratedStory && (
                    <div className="bg-white p-4 rounded-lg border">
                        <div className="flex flex-col md:flex-row gap-4">
                            {generatedStory.teacherSnippetImageUrl && (
                                <div className="md:w-1/3">
                                    <div className="relative group">
                                        <img 
                                            src={generatedStory.teacherSnippetImageUrl} 
                                            alt="Сгенерированная иллюстрация" 
                                            className="w-full h-48 object-cover rounded-md border cursor-pointer"
                                            onClick={() => setIsLightboxOpen(true)}
                                        />
                                        <button 
                                            onClick={() => setIsLightboxOpen(true)}
                                            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiMaximize2 size={24} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        Нажмите для просмотра в полном размере
                                    </p>
                                </div>
                            )}
                            
                            <div className={`${generatedStory.teacherSnippetImageUrl ? 'md:w-2/3' : 'w-full'}`}>
                                <div className="bg-gray-50 p-3 rounded-md h-48 overflow-y-auto">
                                    {generatedStory.teacherSnippetText.split('\n').map((paragraph, i) => (
                                        <p key={i} className="mb-2">
                                            {paragraph || <br />}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {!isStoryApproved && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="text-sm font-medium mb-2">Хотите что-то изменить?</h4>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={refinementPrompt}
                                        onChange={(e) => setRefinementPrompt(e.target.value)}
                                        placeholder="Например: сделай историю короче, добавь больше диалогов..."
                                        className="flex-grow p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                    <button
                                        onClick={() => handleGenerateStory(true)}
                                        disabled={isGenerating}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center justify-center whitespace-nowrap"
                                    >
                                        {isGenerating ? (
                                            <Spinner size="sm" className="mr-2" />
                                        ) : (
                                            <FiRefreshCw size={16} className="mr-2" />
                                        )}
                                        Перегенерировать
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {!hasGeneratedStory && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <FiImage size={32} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 mb-4">История для этого урока ещё не создана</p>
                        <button
                            onClick={() => handleGenerateStory(false)}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
                        >
                            {isGenerating ? (
                                <Spinner size="sm" className="mr-2" />
                            ) : (
                                <FiRefreshCw size={16} className="mr-2" />
                            )}
                            Сгенерировать историю
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t flex justify-between">
                <button
                    onClick={onCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                    Назад
                </button>
                
                {hasGeneratedStory && !isStoryApproved && (
                    <button
                        onClick={handleApproveStory}
                        disabled={isApproving}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                        {isApproving ? (
                            <Spinner size="sm" className="mr-2" />
                        ) : (
                            <FiCheck size={16} className="mr-2" />
                        )}
                        Утвердить историю
                    </button>
                )}
            </div>
            
            {isLightboxOpen && generatedStory?.teacherSnippetImageUrl && (
                <Lightbox 
                    src={generatedStory.teacherSnippetImageUrl} 
                    onClose={() => setIsLightboxOpen(false)} 
                />
            )}
        </div>
    );
};
