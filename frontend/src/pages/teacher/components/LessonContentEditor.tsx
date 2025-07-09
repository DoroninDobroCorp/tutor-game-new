import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useGenerateLessonContentMutation, useUpdateLessonContentMutation } from '../../../features/lesson/lessonApi';
import { type Lesson } from '../../../features/goal/goalApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiPlus, FiTrash2, FiMove, FiYoutube } from 'react-icons/fi';

interface LessonContentBlock {
    id: string;
    type: 'theory' | 'practice' | 'youtube';
    duration: number;
    content: string;
}

interface LessonContentEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
}

export const LessonContentEditor = ({ lesson, onCloseModal }: LessonContentEditorProps) => {
    const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
    
    const [generateContent, { isLoading: isGenerating }] = useGenerateLessonContentMutation();
    const [updateContent, { isLoading: isSaving }] = useUpdateLessonContentMutation();

    useEffect(() => {
        const initialBlocks = (lesson.content?.blocks || []).map((block, index) => ({
            ...block,
            duration: block.duration || 5,
            id: `block-${index}-${Date.now()}`
        }));
        setBlocks(initialBlocks);
    }, [lesson, lesson.content]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(blocks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setBlocks(items);
    };
    
    const handleBlockChange = (index: number, field: keyof LessonContentBlock, value: string | number) => {
        const newBlocks = [...blocks];
        (newBlocks[index] as any)[field] = field === 'duration' ? Number(value) : value;
        setBlocks(newBlocks);
    };

    const addBlock = (type: 'theory' | 'practice' | 'youtube') => {
        setBlocks([...blocks, { 
            id: `block-new-${Date.now()}`,
            type, 
            duration: type === 'youtube' ? 3 : 5, 
            content: '' 
        }]);
    };

    const removeBlock = (index: number) => {
        setBlocks(blocks.filter((_, i) => i !== index));
    };

    const handleGenerateContent = async () => {
        try {
            const result = await generateContent({ lessonId: lesson.id }).unwrap();
            const blocksWithIds = (result.data.content?.blocks || []).map((b: any, i: number) => ({ ...b, id: `gen-block-${i}-${Date.now()}` }));
            setBlocks(blocksWithIds);
            toast.success('Контент сгенерирован!');
        } catch {
            toast.error('Не удалось сгенерировать контент.');
        }
    };

    const handleSaveContent = async () => {
        const blocksToSave = blocks.map(({ id, ...rest }) => rest);
        try {
            await updateContent({ lessonId: lesson.id, content: { blocks: blocksToSave } }).unwrap();
            toast.success('Контент урока сохранен!');
            onCloseModal();
        } catch {
            toast.error('Не удалось сохранить контент.');
        }
    };

    return (
        <div className="rounded-xl p-3 max-h-[70vh] flex flex-col">
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="lesson-blocks">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 pr-2 flex-grow overflow-y-auto">
                            {isGenerating ? (
                                <div className="flex justify-center py-10"><Spinner /><span className="ml-2">Генерация...</span></div>
                            ) : (
                                blocks.map((block, index) => (
                                    <Draggable key={block.id} draggableId={block.id} index={index}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} className="p-4 rounded-md border bg-gray-50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab"><FiMove /></div>
                                                        <span className={`px-2 py-0.5 text-xs font-medium capitalize rounded-full ${
                                                            block.type === 'theory' ? 'bg-blue-100 text-blue-800' : 
                                                            block.type === 'practice' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>{block.type}</span>
                                                        {block.type !== 'youtube' && (<>
                                                          <input 
                                                              type="number" 
                                                              value={block.duration} 
                                                              onChange={(e) => handleBlockChange(index, 'duration', e.target.value)}
                                                              className="w-16 p-1 text-xs border rounded-md"
                                                              title="Длительность в минутах"
                                                          />
                                                          <span className="text-xs text-gray-500">мин.</span>
                                                        </>)}
                                                    </div>
                                                    <button onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700" title="Удалить блок"><FiTrash2 size={16} /></button>
                                                </div>
                                                <textarea 
                                                    value={block.content} 
                                                    onChange={(e) => handleBlockChange(index, 'content', e.target.value)} 
                                                    rows={block.type === 'youtube' ? 1 : 4} 
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm mt-2"
                                                    placeholder={block.type === 'youtube' ? 'Вставьте полную ссылку на YouTube видео...' : 'Введите текст...'}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {!isGenerating && blocks.length === 0 && (<p className="text-center text-gray-500 py-10">Пусто. Сгенерируйте контент или добавьте вручную.</p>)}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => addBlock('theory')} className="text-sm px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700">+ Теория</button>
                    <button onClick={() => addBlock('practice')} className="text-sm px-3 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700">+ Практика</button>
                    <button onClick={() => addBlock('youtube')} className="text-sm px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700">+ YouTube</button>
                </div>
                <div className="flex gap-2">
                     <button type="button" onClick={handleGenerateContent} disabled={isGenerating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{isGenerating ? 'Генерация...' : 'Сгенерировать с ИИ'}</button>
                    <button type="button" onClick={handleSaveContent} disabled={isSaving || blocks.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">{isSaving ? 'Сохранение...' : 'Сохранить контент'}</button>
                </div>
            </div>
        </div>
    );
};
