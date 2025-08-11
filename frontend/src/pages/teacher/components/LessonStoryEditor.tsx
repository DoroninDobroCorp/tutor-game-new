import { useState, useEffect, useRef } from 'react';
import { 
    useGenerateStorySnippetMutation, 
    useApproveStorySnippetMutation,
    useRegenerateStoryImageMutation,
    useApproveStorySnippetWithUploadMutation
} from '../../../features/lesson/lessonApi';
import { Lesson } from '../../../types/models';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiMaximize2, FiX, FiRefreshCcw, FiSend, FiPaperclip, FiUpload, FiCheckCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface LessonStoryEditorProps {
    lesson: Lesson;
    goalId: string;
    onClose: () => void;
}

const LessonStoryEditor = ({ lesson, goalId, onClose }: LessonStoryEditorProps) => {
    const { t } = useTranslation();
    const [storyText, setStoryText] = useState(lesson.storyChapter?.teacherSnippetText || '');
    const [imagePrompt, setImagePrompt] = useState(lesson.storyChapter?.teacherSnippetImagePrompt || '');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(lesson.storyChapter?.teacherSnippetImageUrl || null);
    const [useCharacterReference, setUseCharacterReference] = useState(true);
    const [showLightbox, setShowLightbox] = useState(false);
    const [refinementPrompt, setRefinementPrompt] = useState('');

    const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // API mutations
    const [generateStorySnippet, { isLoading: isGeneratingSnippet }] = useGenerateStorySnippetMutation();
    const [approveStorySnippet, { isLoading: isApproving }] = useApproveStorySnippetMutation();
    const [regenerateStoryImage, { isLoading: isRegeneratingImage }] = useRegenerateStoryImageMutation();
    const [approveWithUpload, { isLoading: isUploading }] = useApproveStorySnippetWithUploadMutation();

    const isGeneratingImage = isRegeneratingImage;
    const isLoading = isGeneratingSnippet || isApproving || isRegeneratingImage || isUploading;

    useEffect(() => {
        setStoryText(lesson.storyChapter?.teacherSnippetText || '');
        setImagePrompt(lesson.storyChapter?.teacherSnippetImagePrompt || '');
        setGeneratedImageUrl(lesson.storyChapter?.teacherSnippetImageUrl || null);
    }, [lesson]);

    const handleGenerateSnippet = async () => {
        try {
            const result = await generateStorySnippet({ 
                lessonId: lesson.id, 
                refinementPrompt 
            }).unwrap();
            setStoryText(result.data.text);
            setImagePrompt(result.data.imagePrompt);
            setUseCharacterReference(result.data.useCharacterReference);
            setGeneratedImageUrl(null); // Reset image on new text
            toast.success(t('lessonStoryEditor.snippetGenerated'));
        } catch (err) {
            toast.error(t('lessonStoryEditor.snippetGenerationFailed'));
            console.error(err);
        }
    };
    
    const handleRegenerateImage = async () => {
        if (!imagePrompt) {
            toast.error(t('lessonStoryEditor.promptRequired'));
            return;
        }
        try {
            const result = await regenerateStoryImage({ 
                lessonId: lesson.id, 
                prompt: imagePrompt, 
                useCharacterReference 
            }).unwrap();
            setGeneratedImageUrl(result.data.imageUrl);
            setUploadedImageFile(null); // Clear uploaded file if any
            toast.success(t('lessonStoryEditor.imageGenerated'));
        } catch (err: any) {
            const errorMessage = err?.data?.message || t('lessonStoryEditor.imageGenerationFailed');
            toast.error(errorMessage);
            console.error(err);
        }
    };

    const handleApprove = async () => {
        if (uploadedImageFile) {
            // Approve with a newly uploaded file
            await handleApproveWithUpload();
        } else {
            // Approve with a generated URL or no image
            if (!storyText.trim()) {
                toast.error(t('lessonStoryEditor.storyTextRequired'));
                return;
            }
            try {
                await approveStorySnippet({
                    lessonId: lesson.id,
                    goalId,
                    text: storyText,
                    imageUrl: generatedImageUrl,
                    imagePrompt: imagePrompt,
                }).unwrap();
                toast.success(t('lessonStoryEditor.lessonApproved'));
                onClose();
            } catch (err) {
                toast.error(t('lessonStoryEditor.approvalFailed'));
                console.error(err);
            }
        }
    };

    const handleApproveWithUpload = async () => {
        if (!uploadedImageFile || !storyText.trim()) {
            toast.error(t('lessonStoryEditor.textAndImageRequired'));
            return;
        }
        try {
            await approveWithUpload({
                lessonId: lesson.id,
                text: storyText,
                prompt: imagePrompt || 'Uploaded image',
                image: uploadedImageFile,
            }).unwrap();
            toast.success(t('lessonStoryEditor.lessonApprovedWithUpload'));
            onClose();
        } catch(err) {
            toast.error(t('lessonStoryEditor.approvalFailed'));
            console.error(err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedImageFile(file);
            setGeneratedImageUrl(URL.createObjectURL(file)); // Show preview
            toast.success(`${t('lessonStoryEditor.fileSelected')}: ${file.name}`);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-gray-800">{t('lessonStoryEditor.title')} "{lesson.title}"</h3>
            
            {/* Story Text */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('lessonStoryEditor.storyText')}</label>
                <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t('lessonStoryEditor.storyTextPlaceholder')}
                />
            </div>
            
            {/* Refinement Prompt */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('lessonStoryEditor.refinementPrompt')}</label>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t('lessonStoryEditor.refinementPromptPlaceholder')}
                    />
                    <button
                        onClick={handleGenerateSnippet}
                        disabled={isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
                    >
                        {isGeneratingSnippet ? <Spinner size="sm" /> : <FiSend className="mr-2" />}
                         {t('lessonStoryEditor.generateText')}
                    </button>
                </div>
            </div>

            <hr />

            {/* Image Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t('lessonStoryEditor.imagePrompt')}</label>
                    <div className="flex space-x-2">
                        <textarea
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            rows={3}
                            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={t('lessonStoryEditor.imagePromptPlaceholder')}
                        />
                         <div className="flex flex-col space-y-2">
                            <button
                                onClick={handleRegenerateImage}
                                disabled={isLoading || !imagePrompt}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 flex items-center justify-center"
                            >
                                {isGeneratingImage ? <Spinner size="sm"/> : <FiRefreshCcw className="mr-2" />}
                                {t('lessonStoryEditor.generateImage')}
                            </button>
                             <button
                                 onClick={() => fileInputRef.current?.click()}
                                 disabled={isLoading}
                                 className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 flex items-center justify-center"
                             >
                                <FiUpload className="mr-2" />
                                {t('lessonStoryEditor.uploadImage')}
                            </button>
                             <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png, image/jpeg, image/webp" />
                        </div>
                    </div>
                    <div className="flex items-center mt-2">
                        <input
                            id="use-character-ref"
                            type="checkbox"
                            checked={useCharacterReference}
                            onChange={(e) => setUseCharacterReference(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="use-character-ref" className="ml-2 block text-sm text-gray-900">
                             {t('lessonStoryEditor.useCharacterReference')}
                        </label>
                    </div>
                </div>

                 {/* Image Preview */}
                 <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex justify-center items-center h-64 bg-gray-50">
                    {isGeneratingImage ? (
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-2 text-sm text-gray-500">{t('lessonStoryEditor.imageGenerating')}</p>
                        </div>
                    ) : generatedImageUrl ? (
                        <div className="relative group">
                            <img src={generatedImageUrl} alt="Generated story" className="max-h-56 object-contain rounded-md" />
                             <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setShowLightbox(true)} className="p-2 bg-white text-black rounded-full">
                                    <FiMaximize2 size={24} />
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">{t('lessonStoryEditor.imagePreview')}</p>
                    )}
                </div>
            </div>

            {/* Approval Button */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleApprove}
                    disabled={isLoading || !storyText}
                    className="px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center"
                >
                    {isLoading ? <Spinner size="sm"/> : <FiCheckCircle className="mr-2" />}
                     {t('lessonStoryEditor.approveAndSend')}
                </button>
            </div>

             {/* Lightbox */}
            {showLightbox && generatedImageUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={() => setShowLightbox(false)}>
                    <img src={generatedImageUrl} alt="Enlarged story" className="max-w-[90vw] max-h-[90vh] object-contain" />
                    <button onClick={() => setShowLightbox(false)} className="absolute top-4 right-4 text-white text-4xl">
                        <FiX />
                    </button>
                </div>
            )}
        </div>
    );
};
export default LessonStoryEditor;