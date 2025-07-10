import { useState, useEffect, useRef } from 'react';
import { 
    useGenerateStorySnippetMutation, 
    useApproveStorySnippetMutation,
    useLazyCheckStoryImageStatusQuery,
    useRegenerateStoryImageMutation,
    useApproveStorySnippetWithUploadMutation
} from '../../../features/lesson/lessonApi';
import { Lesson } from '../../../types/models';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiRefreshCw, FiCheck, FiMaximize2, FiX, FiUpload, FiImage } from 'react-icons/fi';

interface LessonStoryEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
}

const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] cursor-pointer" onClick={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl"><FiX /></button>
        <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
);

const LessonStoryEditor = ({ lesson, onCloseModal }: LessonStoryEditorProps) => {
    // State management
    const [storyText, setStoryText] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    
    // API and loading state
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [generateStory, { isLoading: isGeneratingStory }] = useGenerateStorySnippetMutation();
    const [regenerateImage, { isLoading: isGeneratingImage }] = useRegenerateStoryImageMutation();
    const [approveWithUrl, { isLoading: isApprovingUrl }] = useApproveStorySnippetMutation();
    const [approveWithFile, { isLoading: isApprovingFile }] = useApproveStorySnippetWithUploadMutation();
    const [checkImageStatus, { isFetching: isPolling }] = useLazyCheckStoryImageStatusQuery();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    const isLoading = isGeneratingStory || isGeneratingImage || isApprovingUrl || isApprovingFile || !!generationId;

    // Effects
    useEffect(() => {
        if (lesson.storyChapter) {
            setStoryText(lesson.storyChapter.teacherSnippetText || '');
            setImageUrl(lesson.storyChapter.teacherSnippetImageUrl || null);
            setImagePrompt(lesson.storyChapter.teacherSnippetImagePrompt || '');
        } else {
            setStoryText('');
            setImageUrl(null);
            setImagePrompt('');
        }
    }, [lesson]);

    useEffect(() => () => { stopPolling(); }, []);

    // Polling logic
    const stopPolling = () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        setGenerationId(null);
    };

    const startPolling = (id: string) => {
        stopPolling();
        setGenerationId(id);
        const poll = async () => {
            const result = await checkImageStatus(id).unwrap();
            if (result.data?.status === 'COMPLETE' && result.data?.url) {
                setImageUrl(result.data.url);
                toast.success('Изображение готово!');
                stopPolling();
            } else if (result.data?.status === 'FAILED') {
                toast.error('Ошибка генерации изображения');
                stopPolling();
            }
        };
        pollingInterval.current = setInterval(poll, 3000);
        poll();
    };

    // Handlers
    const handleGenerateStory = async () => {
        try {
            const result = await generateStory({ lessonId: lesson.id, refinementPrompt }).unwrap();
            setStoryText(result.data.text);
            setImagePrompt(result.data.imagePrompt);
            setImageUrl(null);
            setUploadedFile(null);
            stopPolling();
            toast.success('Текст и промпт для картинки сгенерированы!');
        } catch (error) {
            toast.error('Не удалось сгенерировать историю.');
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt) { toast.error("Промпт не может быть пустым."); return; }
        setUploadedFile(null);
        setImageUrl(null);
        try {
            const result = await regenerateImage({ lessonId: lesson.id, prompt: imagePrompt }).unwrap();
            startPolling(result.data.generationId);
            toast('Начали генерацию изображения...');
        } catch (error) {
            toast.error('Не удалось запустить генерацию изображения.');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setImageUrl(URL.createObjectURL(file));
            stopPolling();
        }
    };
    
    const handleApprove = async () => {
        if (!storyText.trim()) { toast.error("Текст истории не может быть пустым."); return; }
        
        try {
            if (uploadedFile) {
                await approveWithFile({ lessonId: lesson.id, image: uploadedFile, text: storyText, prompt: imagePrompt }).unwrap();
            } else {
                await approveWithUrl({ lessonId: lesson.id, text: storyText, imageUrl: imageUrl || '', imagePrompt }).unwrap();
            }
            toast.success('История утверждена!');
            onCloseModal();
        } catch (error) {
            toast.error('Не удалось утвердить историю.');
        }
    };

    return (
        <div className="rounded-xl p-3 max-h-[85vh] flex flex-col">
            {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
            
            <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Фрагмент истории</label>
                    <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={6} className="w-full p-2 border rounded-md" placeholder="Здесь появится текст истории..." disabled={isLoading} />
                    <div className="mt-2">
                        <input type="text" value={refinementPrompt} onChange={e => setRefinementPrompt(e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder="Уточнение для генерации (напр. 'сделай смешнее')..." disabled={isLoading} />
                    </div>
                     <button onClick={handleGenerateStory} disabled={isGeneratingStory} className="mt-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isGeneratingStory ? <Spinner size="sm" /> : <FiRefreshCw size={16} />} <span>Сгенерировать текст истории</span>
                    </button>
                </div>
                
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Промпт для изображения</label>
                    <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder="Здесь появится промпт для изображения..." disabled={isLoading} />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                         <button onClick={handleGenerateImage} disabled={isLoading || !imagePrompt} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isGeneratingImage || generationId ? <Spinner size="sm" /> : <FiImage size={16} />} <span>{isGeneratingImage || generationId ? "Генерация..." : "Создать картинку"}</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            <FiUpload size={16} /> <span>Загрузить свою</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Предпросмотр изображения</label>
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center relative">
                        {generationId || isGeneratingImage ? <><Spinner size="md" /><p className="ml-2 text-gray-500">Генерация...</p></>
                        : imageUrl ? (
                            <>
                                <img src={imageUrl} alt="Story" className="w-full h-full object-cover rounded-lg" />
                                <button onClick={() => setLightboxImage(imageUrl!)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/75">
                                    <FiMaximize2 size={16} />
                                </button>
                            </>
                        ) : <span className="text-gray-400">Изображение появится здесь</span>}
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
                <button onClick={handleApprove} disabled={isLoading || !storyText} className="px-6 py-2 text-sm font-bold text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-50 flex items-center gap-2">
                    {isApprovingFile || isApprovingUrl ? <Spinner size="sm" /> : <FiCheck size={16} />} <span>УТВЕРДИТЬ И ЗАВЕРШИТЬ</span>
                </button>
            </div>
        </div>
    );
};
export default LessonStoryEditor;
