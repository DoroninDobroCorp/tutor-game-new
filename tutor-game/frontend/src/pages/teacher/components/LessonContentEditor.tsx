import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useGenerateLessonContentMutation, useUpdateLessonContentMutation } from '../../../features/lesson/lessonApi';
import { type Lesson } from '../../../features/goal/goalApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiPlus, FiTrash2, FiMove } from 'react-icons/fi';

interface Block {
    id: string;
    type: 'theory' | 'practice';
    content: string;
}

interface LessonContentEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
    onContentSaved?: () => void;
}

export const LessonContentEditor = ({ lesson, onCloseModal, onContentSaved }: LessonContentEditorProps) => {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    
    const [generateContent, { isLoading: isGenerating }] = useGenerateLessonContentMutation();
    const [updateContent, { isLoading: isSaving }] = useUpdateLessonContentMutation();

    useEffect(() => {
        if (lesson.content?.blocks?.length) {
            setBlocks(lesson.content.blocks.map((block, index) => ({
                ...block,
                id: `block-${Date.now()}-${index}`
            })));
        } else {
            setBlocks([]);
        }
    }, [lesson.id, lesson.content]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(blocks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setBlocks(items);
        setIsEditing(true);
    };
    
    const handleBlockChange = (id: string, newContent: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
        setIsEditing(true);
    };

    const addBlock = (type: Block['type']) => {
        setBlocks([...blocks, { id: `new-${Date.now()}`, type, content: '' }]);
        setIsEditing(true);
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
        setIsEditing(true);
    };

    const handleGenerateContent = async () => {
        try {
            const response = await generateContent({ lessonId: lesson.id }).unwrap();
            if (response.data?.content?.blocks) {
                setBlocks(response.data.content.blocks.map((b: any, i: number) => ({...b, id: `gen-${Date.now()}-${i}`})));
                toast.success("Контент успешно сгенерирован!");
                setIsEditing(true);
            }
        } catch (error) {
            toast.error("Не удалось сгенерировать контент.");
        }
    };

    const handleSaveContent = async () => {
        try {
            await updateContent({ lessonId: lesson.id, content: { blocks } }).unwrap();
            toast.success("Изменения сохранены!");
            setIsEditing(false);
            onContentSaved?.();
            onCloseModal();
        } catch (error) {
            toast.error("Не удалось сохранить изменения.");
        }
    };

    return (
        <div className="rounded-xl p-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Редактор контента урока</h3>
                <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 flex items-center"
                >
                    {isGenerating ? <Spinner size="sm" className="mr-2" /> : <FiPlus className="mr-1" />}
                    Сгенерировать с ИИ
                </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto pr-2">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="blocks">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {blocks.map((block, index) => (
                                    <Draggable key={block.id} draggableId={block.id} index={index}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} className="p-3 border rounded-md bg-white shadow-sm flex items-start gap-2">
                                                <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab p-1 pt-2">
                                                    <FiMove />
                                                </div>
                                                <div className="flex-grow">
                                                    <span className={`text-xs font-semibold ${block.type === 'theory' ? 'text-blue-600' : 'text-purple-600'}`}>{block.type.toUpperCase()}</span>
                                                    <textarea
                                                        value={block.content}
                                                        onChange={(e) => handleBlockChange(block.id, e.target.value)}
                                                        className="w-full p-2 mt-1 border rounded focus:ring-2 focus:ring-blue-500"
                                                        rows={3}
                                                        placeholder={`Содержимое блока "${block.type}"...`}
                                                    />
                                                </div>
                                                <button onClick={() => removeBlock(block.id)} className="text-red-500 hover:text-red-700 p-1" title="Удалить блок">
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
                <div className="space-x-2">
                    <button onClick={() => addBlock('theory')} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Добавить теорию</button>
                    <button onClick={() => addBlock('practice')} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Добавить практику</button>
                </div>
                <div className="space-x-2">
                    <button onClick={onCloseModal} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Отмена</button>
                    <button 
                        onClick={handleSaveContent} 
                        disabled={!isEditing || isSaving} 
                        className="px-4 py-2 text-white rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center min-w-[100px]"
                    >
                        {isSaving ? (
                            <span className="flex items-center">
                                <Spinner size="sm" className="mr-2" />
                                Сохранение...
                            </span>
                        ) : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};
