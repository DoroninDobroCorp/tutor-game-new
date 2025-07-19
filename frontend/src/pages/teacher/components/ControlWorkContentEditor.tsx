import { useState, useEffect } from 'react';
import { useGenerateControlWorkContentMutation, useUpdateLessonContentMutation } from '../../../features/lesson/lessonApi';
import { type Lesson } from '../../../types/models';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiZap, FiSave } from 'react-icons/fi';

interface LessonContentBlock {
    id: string;
    type: 'practice'; // Control works only have practice blocks
    content: string;
}

interface ControlWorkContentEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
}

export const ControlWorkContentEditor = ({ lesson, onCloseModal }: ControlWorkContentEditorProps) => {
    const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
    
    const [generateContent, { isLoading: isGenerating }] = useGenerateControlWorkContentMutation();
    const [updateContent, { isLoading: isSaving }] = useUpdateLessonContentMutation();

    useEffect(() => {
        const initialBlocks = (lesson.content?.blocks || []).map((block: any, index: number) => ({
            ...block,
            id: `block-${index}-${Date.now()}`
        }));
        setBlocks(initialBlocks);
    }, [lesson, lesson.content]);

    const handleGenerateContent = async () => {
        try {
            const result = await generateContent({ lessonId: lesson.id }).unwrap();
            const blocksWithIds = (result.data.blocks || []).map((b: any, i: number) => ({ ...b, id: `gen-block-${i}-${Date.now()}` }));
            setBlocks(blocksWithIds);
            toast.success('Задания для контрольной сгенерированы!');
        } catch (err: any) {
            toast.error(err.data?.message || 'Не удалось сгенерировать контент.');
        }
    };

    const handleSaveContent = async () => {
        const blocksToSave = blocks.map(({ id, ...rest }) => rest);
        try {
            await updateContent({ lessonId: lesson.id, content: { blocks: blocksToSave } }).unwrap();
            toast.success('Контрольная работа сохранена!');
            onCloseModal();
        } catch {
            toast.error('Не удалось сохранить контент.');
        }
    };

    const handleBlockContentChange = (index: number, newContent: string) => {
        const newBlocks = [...blocks];
        newBlocks[index].content = newContent;
        setBlocks(newBlocks);
    };

    return (
        <div className="rounded-xl p-3 max-h-[75vh] flex flex-col">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                <p className="text-sm text-gray-600">
                    Нажмите "Сгенерировать задания", чтобы ИИ создал упражнения на основе тем из этого раздела. Вы можете отредактировать их перед сохранением.
                </p>
                {blocks.length > 0 && (
                    <div className="space-y-3">
                        {blocks.map((block, index) => (
                            <div key={block.id} className="p-4 rounded-md border bg-amber-50 border-amber-200">
                                <label className="font-semibold text-gray-700">Задание {index + 1}</label>
                                <textarea 
                                    value={block.content} 
                                    onChange={(e) => handleBlockContentChange(index, e.target.value)}
                                    rows={4} 
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm mt-2" 
                                    placeholder="Текст задания..." 
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t flex justify-between items-center gap-x-4">
                <button 
                    type="button" 
                    onClick={handleGenerateContent} 
                    disabled={isGenerating} 
                    className="flex-1 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isGenerating ? <Spinner size="sm" /> : <FiZap />}
                    Сгенерировать задания
                </button>
                <div className="flex items-center gap-x-4">
                    <button 
                        type="button" 
                        onClick={onCloseModal} 
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        Закрыть
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSaveContent} 
                        disabled={isSaving || isGenerating || blocks.length === 0} 
                        className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Spinner size="sm" /> : <FiSave />}
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};
