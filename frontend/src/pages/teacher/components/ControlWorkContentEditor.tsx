import { useState, useEffect, useRef } from 'react';
import { useGenerateControlWorkContentMutation, useUpdateLessonContentMutation } from '../../../features/lesson/lessonApi';
import { type Lesson } from '../../../types/models';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/common/Spinner';
import { FiSend, FiSave } from 'react-icons/fi';

interface LessonContentBlock {
    id: string;
    type: 'practice'; // Control works only have practice blocks
    content: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ControlWorkContentEditorProps {
    lesson: Lesson;
    onCloseModal: () => void;
}

export const ControlWorkContentEditor = ({ lesson, onCloseModal }: ControlWorkContentEditorProps) => {
    const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userMessage, setUserMessage] = useState('');
    
    const [generateContent, { isLoading: isGenerating }] = useGenerateControlWorkContentMutation();
    const [updateContent, { isLoading: isSaving }] = useUpdateLessonContentMutation();

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initialBlocks = (lesson.content?.blocks || []).map((block: any, index: number) => ({
            ...block,
            id: `block-${index}-${Date.now()}`
        }));
        setBlocks(initialBlocks);
        setChatHistory([]); // Reset chat on new lesson
    }, [lesson, lesson.content]);
    
    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

    const handleGenerateContent = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSend = userMessage.trim() || 'Сгенерируй первоначальный набор заданий для контрольной';
        const newHistory = [...chatHistory, { role: 'user' as const, content: messageToSend }];
        setChatHistory(newHistory);
        setUserMessage('');
        
        try {
            const result = await generateContent({ lessonId: lesson.id, chatHistory: newHistory }).unwrap();
            const responseData = result.data;
            const blocksWithIds = (responseData.blocks || []).map((b: any, i: number) => ({ ...b, id: `gen-block-${i}-${Date.now()}` }));
            setBlocks(blocksWithIds);
            setChatHistory(prev => [...prev, { role: 'assistant', content: responseData.chatResponse }]);
            toast.success('Задания обновлены!');
        } catch (err: any) {
            toast.error(err.data?.message || 'Не удалось сгенерировать контент.');
            setChatHistory(chatHistory); // Revert history
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
                    Начните диалог с ИИ, чтобы сгенерировать задания для контрольной. Вы можете попросить его что-то изменить, добавить или убрать.
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

            <div className="mt-4 pt-4 border-t">
                <div ref={chatContainerRef} className="space-y-2 mb-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded">
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`text-sm p-2 rounded-lg ${msg.role === 'user' ? 'bg-gray-200 ml-auto' : 'bg-blue-100'}`} style={{ maxWidth: '85%' }}>
                            {msg.content}
                        </div>
                    ))}
                    {isGenerating && <div className="text-sm p-2 rounded-lg bg-blue-100" style={{ maxWidth: '85%' }}><Spinner size="sm" /></div>}
                </div>
                <form onSubmit={handleGenerateContent} className="flex gap-2">
                    <textarea 
                        rows={1} 
                        value={userMessage} 
                        onChange={e => setUserMessage(e.target.value)} 
                        placeholder={blocks.length > 0 ? "Попросить ИИ переделать..." : "Начать генерацию..."} 
                        className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md" 
                    />
                    <button type="submit" disabled={isGenerating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        <FiSend />
                    </button>
                </form>
            </div>

            <div className="mt-6 flex justify-end items-center gap-x-4">
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
    );
};
