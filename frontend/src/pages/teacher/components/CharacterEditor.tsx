import { useState, useRef, useEffect } from 'react';
import { 
    useGenerateCharacterForGoalMutation, 
    useUploadCharacterImageMutation,
    useUpdateCharacterPromptMutation
} from '../../../features/goal/goalApi';
import type { LearningGoal } from '../../../types/models';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiUserPlus, FiMaximize2, FiX, FiRefreshCcw, FiUpload, FiSave } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../../app/api/errorHelpers';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';

interface CharacterEditorProps {
  goal: LearningGoal & {
    characterPrompt?: string;
    characterImageUrl?: string | null;
  };
}

const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl hover:opacity-75">
                <FiX />
            </button>
            <img 
                src={src} 
                alt={t('characterEditor.fullView')} 
                className="max-w-[90vw] max-h-[90vh] object-contain" 
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    );
};

export const CharacterEditor = ({ goal }: CharacterEditorProps) => {
    const { t } = useTranslation();
    const [prompt, setPrompt] = useState(goal.characterPrompt || '');
    const [isEditing, setIsEditing] = useState(!goal.characterImageUrl);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // API Hooks
    const [generateCharacter, { isLoading: isGenerating }] = useGenerateCharacterForGoalMutation();
    const [uploadImage, { isLoading: isUploading }] = useUploadCharacterImageMutation();
    const [updatePrompt, { isLoading: isSavingPrompt }] = useUpdateCharacterPromptMutation();
    
    const isLoading = isGenerating || isUploading || isSavingPrompt;
    
    useEffect(() => {
        setPrompt(goal.characterPrompt || '');
    }, [goal.characterPrompt]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error(t('characterEditor.describeCharacterError'));
            return;
        }
        try {
            await generateCharacter({ goalId: goal.id, prompt }).unwrap();
            toast.success(t('characterEditor.characterGeneratedSuccess'));
            setIsEditing(false);
        } catch (error) {
            console.error('Error generating character:', error);
            toast.error(getErrorMessage(error, t('characterEditor.generateError') as string));
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await uploadImage({ 
                goalId: goal.id, 
                image: file,
                prompt: prompt || t('characterEditor.uploadedImage')
            }).unwrap();
            toast.success(t('characterEditor.imageUploadedSuccess'));
            setIsEditing(false);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(getErrorMessage(error, t('characterEditor.uploadError') as string));
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSaveDescription = async () => {
        if (!prompt.trim()) {
            toast.error(t('characterEditor.descriptionEmptyError'));
            return;
        }
        try {
            await updatePrompt({ goalId: goal.id, prompt }).unwrap();
            toast.success(t('characterEditor.descriptionSavedSuccess'));
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving description:', error);
            toast.error(getErrorMessage(error, t('characterEditor.saveError') as string));
        }
    };
    
    if (goal.characterImageUrl && !isEditing) {
        return (
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-40 h-40 relative group flex-shrink-0">
                    <img 
                        src={goal.characterImageUrl} 
                        alt={goal.characterPrompt || t('characterEditor.character')} 
                        className="w-full h-full rounded-lg object-cover border"
                    />
                    <button 
                        onClick={() => setIsLightboxOpen(true)}
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center text-white text-2xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <FiMaximize2 />
                    </button>
                </div>
                <div>
                    <p className="font-medium text-gray-800">{t('characterEditor.currentCharacter')}:</p>
                    <p className="text-gray-600 italic">"{goal.characterPrompt}"</p>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
                    >
                        <FiRefreshCcw /> {t('characterEditor.change')}
                    </button>
                </div>
                {isLightboxOpen && <Lightbox src={goal.characterImageUrl} onClose={() => setIsLightboxOpen(false)} />}
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm text-gray-600 mb-2">
                {goal.characterImageUrl ? t('characterEditor.editDescriptionText') : t('characterEditor.describeCharacterText')}
            </p>
            <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('characterEditor.characterPlaceholder') as string}
                className="mb-2"
                rows={2}
                disabled={isLoading}
            />
            <div className="flex flex-wrap gap-2">
                 {goal.characterImageUrl && (
                    <Button 
                       onClick={handleSaveDescription}
                       disabled={isLoading || !prompt.trim()}
                       className="disabled:opacity-50"
                   >
                       {isSavingPrompt ? <Spinner size="sm" className="mr-2" /> : <FiSave className="mr-2" />}
                       {t('characterEditor.saveDescription')}
                   </Button>   
                )}
                <Button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    variant="secondary"
                    className="disabled:opacity-50"
                >
                    {isGenerating ? <Spinner size="sm" className="mr-2" /> : <FiUserPlus className="mr-2" />}
                    {isGenerating ? t('characterEditor.creating') : (goal.characterImageUrl ? t('characterEditor.newCharacterAndPhoto') : t('characterEditor.create'))}
                </Button>
                <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="disabled:opacity-50"
                >
                    {isUploading ? <Spinner size="sm" className="mr-2" /> : <FiUpload className="mr-2" />}
                    {t('characterEditor.uploadPhoto')}
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                />
                {isEditing && goal.characterImageUrl && (
                    <Button 
                        onClick={() => {
                            setIsEditing(false);
                            setPrompt(goal.characterPrompt || ''); // Revert changes
                        }} 
                        variant="secondary"
                    >
                        {t('characterEditor.cancel')}
                    </Button>
                )}
            </div>
        </div>
    );
};
