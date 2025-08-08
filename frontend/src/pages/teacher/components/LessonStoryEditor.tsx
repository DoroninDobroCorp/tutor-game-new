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
import { FiRefreshCw, FiCheck, FiMaximize2, FiUpload, FiImage } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface LessonStoryEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
    setLightboxImage: (url: string | null) => void;
}

const LessonStoryEditor = ({ lesson, setLightboxImage }: LessonStoryEditorProps) => {
    const { t } = useTranslation();
    // State management
    const [storyText, setStoryText] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [useCharacterReference, setUseCharacterReference] = useState(false);
    
    // API and loading state
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [generateStory, { isLoading: isGeneratingStory }] = useGenerateStorySnippetMutation();
    const [regenerateImage, { isLoading: isGeneratingImage }] = useRegenerateStoryImageMutation();
    const [approveWithUrl, { isLoading: isApprovingUrl }] = useApproveStorySnippetMutation();
    const [approveWithFile, { isLoading: isApprovingFile }] = useApproveStorySnippetWithUploadMutation();
    const [checkImageStatus] = useLazyCheckStoryImageStatusQuery();
    
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
        setUseCharacterReference(false);
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
                toast.success(t('lessonStoryEditor.imageReady'));
                stopPolling();
            } else if (result.data?.status === 'FAILED') {
                toast.error(t('lessonStoryEditor.imageGenerationError'));
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
            setUseCharacterReference(result.data.useCharacterReference);
            setImageUrl(null);
            setUploadedFile(null);
            stopPolling();
            toast.success(t('lessonStoryEditor.storyAndPromptGenerated'));
        } catch (error) {
            toast.error(t('lessonStoryEditor.generateStoryError'));
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt) { toast.error(t('lessonStoryEditor.promptEmptyError')); return; }
        setUploadedFile(null);
        setImageUrl(null);
        try {
            const result = await regenerateImage({ lessonId: lesson.id, prompt: imagePrompt, useCharacterReference }).unwrap();
            startPolling(result.data.generationId);
            toast(t('lessonStoryEditor.imageGenerationStarted'));
        } catch (error) {
            toast.error(t('lessonStoryEditor.startImageGenerationError'));
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
        if (!storyText.trim()) { toast.error(t('lessonStoryEditor.storyTextEmptyError')); return; }
        
        try {
            if (uploadedFile) {
                await approveWithFile({ lessonId: lesson.id, image: uploadedFile, text: storyText, prompt: imagePrompt }).unwrap();
            } else {
                await approveWithUrl({ lessonId: lesson.id, text: storyText, imageUrl: imageUrl || '', imagePrompt }).unwrap();
            }
            toast.success(t('lessonStoryEditor.storyApproved'));
            // onCloseModal(); // Removed to keep the modal open
        } catch (error) {
            toast.error(t('lessonStoryEditor.approveStoryError'));
        }
    };

    return (
        <div className="rounded-xl p-3 max-h-[85vh] flex flex-col">
            <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('lessonStoryEditor.storyFragment')}</label>
                    <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={6} className="w-full p-2 border rounded-md" placeholder={t('lessonStoryEditor.storyTextPlaceholder')} disabled={isLoading} />
                    <div className="mt-2">
                        <input type="text" value={refinementPrompt} onChange={e => setRefinementPrompt(e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder={t('lessonStoryEditor.refinementPromptPlaceholder')} disabled={isLoading} />
                    </div>
                     <button onClick={handleGenerateStory} disabled={isGeneratingStory} className="mt-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isGeneratingStory ? <Spinner size="sm" /> : <FiRefreshCw size={16} />} <span>{t('lessonStoryEditor.generateStoryText')}</span>
                    </button>
                </div>
                
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('lessonStoryEditor.imagePrompt')}</label>
                    <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder={t('lessonStoryEditor.imagePromptPlaceholder')} disabled={isLoading} />
                    
                    <div className="mt-2 flex items-center">
                        <input
                            id="use-character-ref"
                            type="checkbox"
                            checked={useCharacterReference}
                            onChange={(e) => setUseCharacterReference(e.target.checked)}
                            className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            disabled={isLoading}
                        />
                        <label htmlFor="use-character-ref" className="ml-2 block text-sm text-gray-900">
                            {t('lessonStoryEditor.useCharacterReference')}
                        </label>
                    </div>
                     
                    <div className="mt-2 grid grid-cols-2 gap-2">
                         <button onClick={handleGenerateImage} disabled={isLoading || !imagePrompt} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isGeneratingImage || generationId ? <Spinner size="sm" /> : <FiImage size={16} />} <span>{isGeneratingImage || generationId ? t('lessonStoryEditor.generating') : t('lessonStoryEditor.createImage')}</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            <FiUpload size={16} /> <span>{t('lessonStoryEditor.uploadOwn')}</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessonStoryEditor.imagePreview')}</label>
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center relative">
                        {generationId || isGeneratingImage ? <><Spinner size="md" /><p className="ml-2 text-gray-500">{t('lessonStoryEditor.generating')}</p></>
                        : imageUrl ? (
                            <>
                                <img src={imageUrl} alt="Story" className="w-full h-full object-contain rounded-lg" />
                                <button onClick={() => setLightboxImage(imageUrl!)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/75">
                                    <FiMaximize2 size={16} />
                                </button>
                            </>
                        ) : <span className="text-gray-400">{t('lessonStoryEditor.imageWillAppearHere')}</span>}
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
                <button onClick={handleApprove} disabled={isLoading || !storyText} className="px-6 py-2 text-sm font-bold text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-50 flex items-center gap-2">
                    {isApprovingFile || isApprovingUrl ? <Spinner size="sm" /> : <FiCheck size={16} />} <span>{t('lessonStoryEditor.approveAndFinish')}</span>
                </button>
            </div>
        </div>
    );
};
export default LessonStoryEditor;
