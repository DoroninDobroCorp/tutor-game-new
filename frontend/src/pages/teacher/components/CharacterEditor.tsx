import { useState, useRef, useEffect } from 'react';
import { 
    useGenerateCharacterForGoalMutation, 
    useUploadCharacterImageMutation,
    useUpdateCharacterPromptMutation,
    LearningGoal 
} from '../../../features/goal/goalApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiUserPlus, FiMaximize2, FiX, FiRefreshCcw, FiUpload, FiSave } from 'react-icons/fi';

interface CharacterEditorProps {
  goal: LearningGoal & {
    characterPrompt?: string;
    characterImageUrl?: string | null;
  };
}

const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl hover:opacity-75">
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

export const CharacterEditor = ({ goal }: CharacterEditorProps) => {
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
            toast.error('Опишите персонажа, чтобы его создать.');
            return;
        }
        try {
            await generateCharacter({ goalId: goal.id, prompt }).unwrap();
            toast.success('Персонаж успешно сгенерирован и сохранен!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error generating character:', error);
            toast.error('Не удалось сгенерировать персонажа.');
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await uploadImage({ 
                goalId: goal.id, 
                image: file,
                prompt: prompt || 'Загруженное изображение'
            }).unwrap();
            
            toast.success('Изображение успешно загружено!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Не удалось загрузить изображение.');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSaveDescription = async () => {
        if (!prompt.trim()) {
            toast.error('Описание не может быть пустым.');
            return;
        }
        try {
            await updatePrompt({ goalId: goal.id, prompt }).unwrap();
            toast.success('Описание персонажа сохранено!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving description:', error);
            toast.error('Не удалось сохранить описание.');
        }
    };
    
    if (goal.characterImageUrl && !isEditing) {
        return (
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-40 h-40 relative group flex-shrink-0">
                    <img 
                        src={goal.characterImageUrl} 
                        alt={goal.characterPrompt || 'Character'} 
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
                    <p className="font-medium text-gray-800">Текущий персонаж:</p>
                    <p className="text-gray-600 italic">"{goal.characterPrompt}"</p>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="mt-4 px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex items-center gap-2"
                    >
                        <FiRefreshCcw /> Изменить
                    </button>
                </div>
                {isLightboxOpen && <Lightbox src={goal.characterImageUrl} onClose={() => setIsLightboxOpen(false)} />}
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm text-gray-600 mb-2">
                {goal.characterImageUrl ? "Отредактируйте описание, загрузите новое фото или сгенерируйте нового персонажа:" : "Опишите персонажа для истории или загрузите свое изображение:"}
            </p>
            <textarea
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Например: отважная девочка-исследователь с телескопом..." 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2" 
                rows={2}
                disabled={isLoading} 
            />
            <div className="flex flex-wrap gap-2">
                 {goal.characterImageUrl && (
                     <button 
                        onClick={handleSaveDescription} 
                        disabled={isLoading || !prompt.trim()} 
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSavingPrompt ? <Spinner size="sm" className="mr-2" /> : <FiSave className="mr-2" />}
                        Сохранить описание
                    </button>   
                )}
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !prompt.trim()} 
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isGenerating ? <Spinner size="sm" className="mr-2" /> : <FiUserPlus className="mr-2" />}
                    {isGenerating ? "Создание..." : (goal.characterImageUrl ? "Новый персонаж и фото" : "Создать")}
                </button>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                    {isUploading ? <Spinner size="sm" className="mr-2" /> : <FiUpload className="mr-2" />}
                    Загрузить фото
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                />
                {isEditing && goal.characterImageUrl && (
                    <button 
                        onClick={() => {
                            setIsEditing(false);
                            setPrompt(goal.characterPrompt || ''); // Revert changes
                        }} 
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Отмена
                    </button>
                )}
            </div>
        </div>
    );
};
