import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useGenerateLessonContentMutation, useUpdateLessonContentMutation } from '../../../features/lesson/lessonApi';
import { type Lesson } from '../../../types/models';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiTrash2, FiMove, FiSend } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../../app/api/errorHelpers';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';

interface LessonContentBlock {
    id: string;
    type: 'theory' | 'practice' | 'youtube';
    duration: number;
    content: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface LessonContentEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
}

export const LessonContentEditor = ({ lesson, onCloseModal }: LessonContentEditorProps) => {
    const { t } = useTranslation();
    const formRef = useRef<HTMLFormElement>(null);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userMessage.trim()) {
                formRef.current?.requestSubmit();
            }
        }
    };    const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userMessage, setUserMessage] = useState('');
    
    const [generateContent, { isLoading: isGenerating }] = useGenerateLessonContentMutation();
    const [updateContent, { isLoading: isSaving }] = useUpdateLessonContentMutation();

    useEffect(() => {
        const initialBlocks = (lesson.content?.blocks || []).map((block: any, index: number) => ({
            ...block,
            duration: block.duration || 5,
            id: `block-${index}-${Date.now()}`
        }));
        setBlocks(initialBlocks);
        setChatHistory([]); // Reset chat on new lesson
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

    const handleGenerateContent = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSend = userMessage.trim() || t('lessonContentEditor.generateInitialContent');
        const newHistory = [...chatHistory, { role: 'user' as const, content: messageToSend }];
        setChatHistory(newHistory);
        setUserMessage('');
        
        try {
            const result = await generateContent({ lessonId: lesson.id, chatHistory: newHistory }).unwrap();
            const responseData = result.data;
            const blocksWithIds = (responseData.blocks || []).map((b: any, i: number) => ({ ...b, id: `gen-block-${i}-${Date.now()}` }));
            setBlocks(blocksWithIds);
            setChatHistory(prev => [...prev, { role: 'assistant', content: responseData.chatResponse }]);
            toast.success(t('lessonContentEditor.contentUpdated'));
        } catch (err) {
            toast.error(getErrorMessage(err, t('lessonContentEditor.generateError') as string));
            setChatHistory(chatHistory); // Revert history on error
        }
    };

    const handleSaveContent = async () => {
        const blocksToSave = blocks.map(({ id, ...rest }) => rest);
        try {
            await updateContent({ lessonId: lesson.id, content: { blocks: blocksToSave } }).unwrap();
            toast.success(t('lessonContentEditor.contentSaved'));
        } catch (err) {
            toast.error(getErrorMessage(err, t('lessonContentEditor.saveError') as string));
        }
    };

    return (
        <div className="rounded-xl p-3 max-h-[75vh] flex flex-col">
            <div className="flex-grow overflow-y-auto pr-2">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="lesson-blocks">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {blocks.map((block, index) => (
                                    <Draggable key={block.id} draggableId={block.id} index={index}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} className="p-4 rounded-md border bg-gray-50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab"><FiMove /></div>
                                                        <span className={`px-2 py-0.5 text-xs font-medium capitalize rounded-full ${ block.type === 'theory' ? 'bg-blue-100 text-blue-800' :  block.type === 'practice' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800' }`}>{block.type}</span>
                                                        {block.type !== 'youtube' && (<>
                                                          <Input type="number" value={block.duration} onChange={(e) => handleBlockChange(index, 'duration', e.target.value)} className="w-16 p-1 text-xs" title={t('lessonContentEditor.durationInMinutes') as string} />
                                                          <span className="text-xs text-gray-500">{t('lessonContentEditor.minutes')}</span>
                                                        </>)}
                                                    </div>
                                                    <button onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700" title={t('lessonContentEditor.removeBlock')}><FiTrash2 size={16} /></button>
                                                </div>
                                                <Textarea value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} rows={block.type === 'youtube' ? 1 : 4} className="text-sm mt-2" placeholder={(block.type === 'youtube' ? t('lessonContentEditor.youtubeLinkPlaceholder') : t('lessonContentEditor.textPlaceholder')) as string} />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                <div className="mt-4 flex gap-2">
                    <Button variant="secondary" className="text-sm" onClick={() => addBlock('theory')}>+ {t('lessonContentEditor.theory')}</Button>
                    <Button variant="secondary" className="text-sm" onClick={() => addBlock('practice')}>+ {t('lessonContentEditor.practice')}</Button>
                    <Button variant="secondary" className="text-sm" onClick={() => addBlock('youtube')}>+ YouTube</Button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t">
                <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`text-sm p-2 rounded-lg ${msg.role === 'user' ? 'bg-gray-200 ml-auto' : 'bg-blue-100'}`} style={{ maxWidth: '85%' }}>
                            {msg.content}
                        </div>
                    ))}
                    {isGenerating && <div className="text-sm p-2 rounded-lg bg-blue-100" style={{ maxWidth: '85%' }}><Spinner size="sm" /></div>}
                </div>
                <form ref={formRef} onSubmit={handleGenerateContent} className="flex gap-2">
                    <Textarea rows={2} value={userMessage} onChange={e => setUserMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={(blocks.length > 0 ? t('lessonContentEditor.askAiToRedoContent') : t('lessonContentEditor.askAiToMakeContent')) as string} className="flex-1 w-full" />
                   <Button type="submit" disabled={isGenerating || !userMessage.trim()} className="text-sm disabled:opacity-50"><FiSend /></Button>
                </form>
            </div>
            
            <div className="mt-6 flex justify-end gap-x-4">
                <Button 
                    type="button" 
                    onClick={onCloseModal} 
                    variant="secondary"
                    className="text-sm"
                >
                    {t('lessonContentEditor.close')}
                </Button>
                <Button 
                    type="button" 
                    onClick={handleSaveContent} 
                    disabled={isSaving || isGenerating || blocks.length === 0} 
                    className="text-sm disabled:opacity-50"
                >
                    {isSaving ? t('lessonContentEditor.saving') : t('lessonContentEditor.saveContent')}
                </Button>
            </div>
        </div>
    );
};
