import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import {
    useGenerateLessonContentMutation,
    useUpdateLessonContentMutation,
    useGenerateStorySnippetMutation,
    useApproveStorySnippetMutation,
    useRegenerateStoryImageMutation,
    useApproveStorySnippetWithUploadMutation,
    type Lesson
} from '../../features/teacher/teacherApi';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { FiBookOpen, FiEdit, FiTrash2, FiMove, FiMaximize2, FiX } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// --- NEW LIGHTBOX COMPONENT ---
const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => {
    if (!src) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl"><FiX /></button>
            <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

interface LessonContentBlock {
    id: string;
    type: 'theory' | 'practice';
    duration: number;
    content: string;
}

function classNames(...classes: (string | boolean)[]) {
    return classes.filter(Boolean).join(' ')
}

export default function LessonEditorModal({ isOpen, onClose, lesson }: { isOpen: boolean; onClose: () => void; lesson: Lesson | null; }) {
    // Состояние для вкладки "Контент"
    const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);

    // Состояние для вкладки "История"
    const [storyText, setStoryText] = useState('');
    const [storyImageUrl, setStoryImageUrl] = useState('');
    const [storyImagePrompt, setStoryImagePrompt] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false); // <-- State for lightbox
    const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);

    // Обработчик выбора файла
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedImageFile(file);
            setStoryImageUrl(URL.createObjectURL(file));
            setStoryImagePrompt('User uploaded image'); // Устанавливаем дефолтный промпт
        }
    };

    // Мутации API
    const [generateContent, { isLoading: isGeneratingContent }] = useGenerateLessonContentMutation();
    const [updateContent, { isLoading: isSavingContent }] = useUpdateLessonContentMutation();
    const [generateStory, { isLoading: isGeneratingStory }] = useGenerateStorySnippetMutation();
    const [regenerateImage, { isLoading: isRegeneratingImage }] = useRegenerateStoryImageMutation();
    const [approveStory, { isLoading: isApprovingStory }] = useApproveStorySnippetMutation();
    const [approveStoryWithUpload, { isLoading: isApprovingWithUpload }] = useApproveStorySnippetWithUploadMutation();

    useEffect(() => {
        if (lesson) {
            // Заполняем редактор контента
            const blocksWithIds = (lesson.content?.blocks || []).map((block, index) => ({
                ...block,
                id: `block-${index}-${Date.now()}`
            }));
            setBlocks(blocksWithIds);

            // Заполняем данными для истории
            setStoryText(lesson.storyChapter?.teacherSnippetText || '');
            setStoryImageUrl(lesson.storyChapter?.teacherSnippetImageUrl || '');
            setStoryImagePrompt(lesson.storyChapter?.teacherSnippetImagePrompt || '');
        } else {
            // Сбрасываем все состояния при закрытии модального окна
            setBlocks([]);
            setStoryText('');
            setStoryImageUrl('');
        }
    }, [lesson, isOpen]); // Перезаполняем при каждом открытии

    if (!lesson) return null;

    // --- Обработчики для вкладки "Контент" ---

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        const reorderedBlocks = Array.from(blocks);
        const [movedBlock] = reorderedBlocks.splice(source.index, 1);
        reorderedBlocks.splice(destination.index, 0, movedBlock);
        setBlocks(reorderedBlocks);
    };

    const handleBlockChange = (index: number, field: keyof Omit<LessonContentBlock, 'id'>, value: string | number) => {
        const newBlocks = [...blocks];
        (newBlocks[index] as any)[field] = value;
        setBlocks(newBlocks);
    };
    
    const addBlock = (type: 'theory' | 'practice') => {
        setBlocks([...blocks, { 
            id: `block-new-${Date.now()}`,
            type, 
            duration: 5, 
            content: '' 
        }]);
    };

    const removeBlock = (index: number) => {
        setBlocks(blocks.filter((_, i) => i !== index));
    };

    const handleGenerateContent = async () => {
        try {
            const result = await generateContent(lesson.id).unwrap();
            const blocksWithIds = (result.content?.blocks || []).map((b, i) => ({ ...b, id: `gen-block-${i}` }));
            setBlocks(blocksWithIds);
            toast.success('Контент сгенерирован!');
        } catch {
            toast.error('Не удалось сгенерировать контент.');
        }
    };

    const handleSaveAndApproveContent = async () => {
        const blocksToSave = blocks.map(({ id, ...rest }) => rest);
        try {
            await updateContent({ lessonId: lesson.id, content: { blocks: blocksToSave } }).unwrap();
            toast.success('Контент урока утвержден!');
            onClose();
        } catch {
            toast.error('Не удалось сохранить контент.');
        }
    };

    // --- Обработчики для вкладки "История" ---

    const handleGenerateStory = async () => {
        try {
            const result = await generateStory({
                lessonId: lesson.id,
                refinementPrompt: refinementPrompt || undefined
            }).unwrap();
            setStoryText(result.text);
            setStoryImageUrl(result.imageUrl);
            setStoryImagePrompt(result.prompt);
            setRefinementPrompt(''); // Reset refinement prompt after generation
            toast.success("Фрагмент истории и картинка сгенерированы!");
        } catch {
            toast.error("Не удалось сгенерировать историю.");
        }
    };

    const handleRegenerateImage = async () => {
        if (!storyImagePrompt) {
            toast.error("Промпт для изображения пуст.");
            return;
        }
        try {
            const result = await regenerateImage({ 
                lessonId: lesson.id, 
                prompt: storyImagePrompt 
            }).unwrap();
            setStoryImageUrl(result.imageUrl);
            toast.success("Картинка успешно перегенерирована!");
        } catch {
            toast.error("Не удалось перегенерировать картинку.");
        }
    };

    const handleApproveStory = async () => {
        if (!storyText || !storyImageUrl || !storyImagePrompt) {
            toast.error("Пожалуйста, сгенерируйте историю перед утверждением");
            return;
        }
        
        try {
            if (uploadedImageFile) {
                // Если загружен файл, используем новую мутацию с загрузкой
                const formData = new FormData();
                formData.append('text', storyText);
                formData.append('prompt', storyImagePrompt);
                formData.append('image', uploadedImageFile);
                
                // Вызываем новую мутацию (её добавим позже)
                await approveStoryWithUpload({
                    lessonId: lesson.id,
                    text: storyText,
                    prompt: storyImagePrompt,
                    image: uploadedImageFile
                }).unwrap();
            } else {
                // Или используем существующую логику с URL
                await approveStory({ 
                    lessonId: lesson.id, 
                    text: storyText, 
                    imageUrl: storyImageUrl,
                    prompt: storyImagePrompt 
                }).unwrap();
            }
            
            toast.success("История утверждена!");
            onClose();
        } catch (error) {
            console.error('Error approving story:', error);
            toast.error("Не удалось утвердить историю.");
        }
    };


    return (
        <>
            {/* Lightbox will render here, outside the modal, to be on top of everything */}
            {isLightboxOpen && <Lightbox src={storyImageUrl} onClose={() => setIsLightboxOpen(false)} />}
            
            <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-40" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 border-b pb-4">
                                    Редактор урока: <span className="text-indigo-600">{lesson.title}</span>
                                </Dialog.Title>

                                <Tab.Group>
                                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mt-4">
                                        <Tab className={({ selected }) => classNames('w-full rounded-lg py-2.5 text-sm font-medium leading-5', 'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2', selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white')}>
                                            <FiEdit className="inline mr-2" /> Контент урока
                                        </Tab>
                                        <Tab className={({ selected }) => classNames('w-full rounded-lg py-2.5 text-sm font-medium leading-5', 'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2', selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white')}>
                                            <FiBookOpen className="inline mr-2" /> История
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels className="mt-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                        {/* Панель 1: Контент урока */}
                                        <Tab.Panel className="rounded-xl p-3">
                                            <DragDropContext onDragEnd={onDragEnd}>
                                                <Droppable droppableId="lesson-blocks">
                                                    {(provided) => (
                                                        <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4 space-y-4 pr-2">
                                                            {isGeneratingContent ? (
                                                                <div className="flex justify-center py-10"><Spinner /><span className="ml-2">Генерация контента...</span></div>
                                                            ) : (
                                                                blocks.map((block, index) => (
                                                                    <Draggable key={block.id} draggableId={block.id} index={index}>
                                                                        {(provided) => (
                                                                            <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style} className="p-4 rounded-md border bg-gray-50">
                                                                                <div className="flex justify-between items-center mb-2">
                                                                                    <div className="flex items-center">
                                                                                        <div {...provided.dragHandleProps} className="text-gray-400 mr-2 cursor-grab"><FiMove /></div>
                                                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${block.type === 'theory' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{block.type === 'theory' ? 'Теория' : 'Практика'}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center">
                                                                                        <button onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700" title="Удалить блок"><FiTrash2 size={16} /></button>
                                                                                    </div>
                                                                                </div>
                                                                                <textarea value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} rows={4} className="w-full p-2 border border-gray-300 rounded-md text-sm mt-2" placeholder={block.type === 'theory' ? 'Введите теоретический материал...' : 'Введите практическое задание...'}/>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))
                                                            )}
                                                            {!isGeneratingContent && blocks.length === 0 && (<p className="text-center text-gray-500 py-10">Нет контента. Сгенерируйте его с помощью ИИ или добавьте вручную.</p>)}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <button onClick={() => addBlock('theory')} className="text-sm px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700">+ Теория</button>
                                                    <button onClick={() => addBlock('practice')} className="text-sm px-3 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700">+ Практика</button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={handleGenerateContent} disabled={isGeneratingContent} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{isGeneratingContent ? 'Генерация...' : 'Сгенерировать с ИИ'}</button>
                                                    <button type="button" onClick={handleSaveAndApproveContent} disabled={isSavingContent || blocks.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">{isSavingContent ? 'Сохранение...' : 'Утвердить контент'}</button>
                                                </div>
                                            </div>
                                        </Tab.Panel>

                                        {/* Панель 2: История */}
                                        <Tab.Panel className="rounded-xl p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Текст истории</label>
                                            <textarea 
                                                value={storyText} 
                                                onChange={e => setStoryText(e.target.value)} 
                                                rows={10} 
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" 
                                                placeholder="Здесь появится текст истории..." 
                                            />
                                            <div className="mt-4">
                                                <label className="block text-sm font-medium text-gray-700">Уточнение для генерации (необязательно)</label>
                                                <input
                                                    type="text"
                                                    value={refinementPrompt}
                                                    onChange={e => setRefinementPrompt(e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    placeholder="Например: сделай смешнее, добавь дракона..."
                                                />
                                                <p className="mt-1 text-xs text-gray-500">Оставьте пустым для стандартной генерации</p>
                                            </div>
                                            <div className="mt-4">
                                                <label className="block text-sm font-medium text-gray-700">Промпт для изображения</label>
                                                <textarea
                                                    rows={3}
                                                    value={storyImagePrompt}
                                                    onChange={e => setStoryImagePrompt(e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    placeholder="Промпт, использованный для генерации изображения..."
                                                    disabled={!storyImageUrl}
                                                />
                                                <p className="mt-1 text-xs text-gray-500">Вы можете отредактировать промпт перед сохранением</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="block text-sm font-medium text-gray-700 text-center mb-2">Изображение</label>
                                            <div className="w-full space-y-2">
                                                <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center border-2 border-dashed relative group">
                                                    {isGeneratingStory ? (
                                                        <Spinner />
                                                    ) : storyImageUrl ? (
                                                        <>
                                                            <img 
                                                                src={storyImageUrl} 
                                                                alt="Story snippet" 
                                                                className="object-contain h-full w-full rounded-md p-2"
                                                            />
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsLightboxOpen(true);
                                                                }} 
                                                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center text-white text-2xl transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <FiMaximize2 />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">Здесь будет картинка</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="file"
                                                        id="imageUpload"
                                                        className="hidden"
                                                        accept="image/png, image/jpeg, image/webp"
                                                        onChange={handleFileChange}
                                                    />
                                                    <label 
                                                        htmlFor="imageUpload" 
                                                        className="cursor-pointer px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                                                    >
                                                        Загрузить свою картинку
                                                    </label>
                                                    {storyImageUrl && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setUploadedImageFile(null);
                                                                setStoryImageUrl('');
                                                                setStoryImagePrompt('');
                                                            }}
                                                            className="text-xs text-red-500 hover:text-red-700"
                                                        >
                                                            Удалить
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                                        <button 
                                            onClick={handleGenerateStory} 
                                            disabled={isGeneratingStory || isRegeneratingImage || isApprovingStory} 
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isGeneratingStory ? 'Генерация...' : 'Сгенерировать/Обновить'}
                                        </button>
                                        <button 
                                            onClick={handleRegenerateImage} 
                                            disabled={!storyImagePrompt || isGeneratingStory || isRegeneratingImage || isApprovingStory} 
                                            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            {isRegeneratingImage ? 'Перегенерация...' : 'Перегенерировать изображение'}
                                        </button>
                                        <button 
                                            onClick={handleApproveStory} 
                                            disabled={!storyText || !storyImageUrl || isApprovingStory || isApprovingWithUpload || isGeneratingStory || isRegeneratingImage} 
                                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isApprovingStory || isApprovingWithUpload ? 'Утверждение...' : 'Утвердить историю'}
                                        </button>
                                    </div>
                                </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
            </Transition>
        </>
    );
}