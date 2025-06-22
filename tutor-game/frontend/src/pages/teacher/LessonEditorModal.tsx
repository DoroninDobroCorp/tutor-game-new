import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useGenerateLessonContentMutation, useUpdateLessonContentMutation, type Lesson } from '../../features/teacher/teacherApi';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { FiTrash2 } from 'react-icons/fi';

interface LessonContentBlock {
    type: 'theory' | 'practice';
    duration: number;
    content: string;
}

interface LessonEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    lesson: Lesson | null;
}

export default function LessonEditorModal({ isOpen, onClose, lesson }: LessonEditorModalProps) {
    const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);
    
    const [generateContent, { isLoading: isGenerating }] = useGenerateLessonContentMutation();
    const [updateContent, { isLoading: isSaving }] = useUpdateLessonContentMutation();

    useEffect(() => {
        // Fill the editor with existing content when opened
        if (lesson?.content?.blocks) {
            setBlocks(lesson.content.blocks);
        } else {
            setBlocks([]); // Reset if no content
        }
    }, [lesson]);

    if (!lesson) return null;

    const handleGenerate = async () => {
        try {
            const result = await generateContent(lesson.id).unwrap();
            setBlocks(result.content?.blocks || []);
            toast.success('Content generated!');
        } catch {
            toast.error('Failed to generate content.');
        }
    };

    const handleSaveAndApprove = async () => {
        try {
            await updateContent({ lessonId: lesson.id, content: { blocks } }).unwrap();
            toast.success('Lesson approved!');
            onClose();
        } catch {
            toast.error('Failed to save.');
        }
    };
    
    const handleBlockChange = (index: number, field: keyof LessonContentBlock, value: string | number) => {
        const newBlocks = [...blocks];
        (newBlocks[index] as any)[field] = value;
        setBlocks(newBlocks);
    };

    const addBlock = (type: 'theory' | 'practice') => {
        setBlocks([...blocks, { type, duration: 5, content: '' }]);
    };

    const removeBlock = (index: number) => {
        setBlocks(blocks.filter((_, i) => i !== index));
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-40" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 border-b pb-4">
                                    Lesson Editor: <span className="text-indigo-600">{lesson.title}</span>
                                </Dialog.Title>
                                
                                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {isGenerating ? <div className="flex justify-center py-10"><Spinner/></div> : (
                                        blocks.map((block, index) => (
                                            <div key={index} className="p-4 rounded-md border bg-gray-50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${block.type === 'theory' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                        {block.type === 'theory' ? 'Theory' : 'Practice'}
                                                    </span>
                                                    <button onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700"><FiTrash2 size={16} /></button>
                                                </div>
                                                <textarea 
                                                    value={block.content}
                                                    onChange={(e) => handleBlockChange(index, 'content', e.target.value)}
                                                    rows={4}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    placeholder={block.type === 'theory' ? 'Enter theory text...' : 'Enter practice task...'}
                                                />
                                            </div>
                                        ))
                                    )}
                                     {!isGenerating && blocks.length === 0 && (
                                        <p className="text-center text-gray-500 py-10">No content for this lesson yet. Click "Generate with AI".</p>
                                     )}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button onClick={() => addBlock('theory')} className="text-sm px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700"> + Theory </button>
                                        <button onClick={() => addBlock('practice')} className="text-sm px-3 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700"> + Practice </button>
                                    </div>
                                    <div className="flex gap-2">
                                         <button type="button" onClick={handleGenerate} disabled={isGenerating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                                            {isGenerating ? 'Generating...' : 'Generate with AI'}
                                        </button>
                                        <button type="button" onClick={handleSaveAndApprove} disabled={isSaving || blocks.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                                            {isSaving ? 'Saving...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
