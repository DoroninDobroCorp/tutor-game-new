import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useGetLearningGoalsQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    useGenerateCharacterForGoalMutation,
    useApproveCharacterForGoalMutation,
    type ContentSection,
    type Lesson
} from '../../features/teacher/teacherApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FiPlus, FiTrash2, FiArrowLeft, FiEdit2, FiSettings, FiMove, FiUserPlus, FiCheck, FiX } from 'react-icons/fi';
import LessonEditorModal from './LessonEditorModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type LessonStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';

const LessonStatusIndicator = ({ status }: { status: LessonStatus }) => {
    const statusMap = {
        DRAFT: { text: 'Черновик', color: 'bg-gray-400', title: 'Контент не создан' },
        PENDING_APPROVAL: { text: 'На проверке', color: 'bg-yellow-400', title: 'Контент ожидает утверждения' },
        APPROVED: { text: 'Утвержден', color: 'bg-green-500', title: 'Контент готов для студента' },
        COMPLETED: { text: 'Пройден', color: 'bg-blue-500', title: 'Урок пройден студентом' },
    };
    const { color, title } = statusMap[status] || statusMap.DRAFT;
    return <span className={`w-3 h-3 rounded-full inline-block ${color}`} title={title}></span>;
};

const RoadmapEditorPage = () => {
    const { goalId } = useParams<{ goalId: string }>();
    const navigate = useNavigate();

    // --- ЗАГРУЗКА ДАННЫХ ---
    const { data: goals, isLoading: isLoadingGoals } = useGetLearningGoalsQuery();
    const currentGoal = goals?.find(g => g.id === goalId);

    // --- СОСТОЯНИЕ РЕДАКТОРА ---
    const [roadmap, setRoadmap] = useState<ContentSection[]>([]);
    const [feedback, setFeedback] = useState('');
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [isEditing, setIsEditing] = useState<{section: number | null, lesson: number | null}>({section: null, lesson: null});
    
    // Character state
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    
    const [generateCharacter, { isLoading: isGeneratingCharacter }] = useGenerateCharacterForGoalMutation();
    const [approveCharacter, { isLoading: isApprovingCharacter }] = useApproveCharacterForGoalMutation();
    
    interface GeneratedCharacter {
        url: string;
        prompt: string;
        imageId: string;
        genId: string;
    }

    const [generateProposal, { isLoading: isGenerating }] = useGenerateRoadmapProposalMutation();
    const [updateRoadmap, { isLoading: isSaving }] = useUpdateRoadmapMutation();

    useEffect(() => {
        if (currentGoal) setRoadmap(currentGoal.sections || []);
    }, [currentGoal]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, type } = result;
        if (!destination) return;

        const newRoadmap = [...roadmap];

        if (type === 'SECTIONS') {
            const [reorderedItem] = newRoadmap.splice(source.index, 1);
            newRoadmap.splice(destination.index, 0, reorderedItem);
            setRoadmap(newRoadmap);
            return;
        }

        if (type === 'LESSONS') {
            const sourceSectionIndex = parseInt(source.droppableId.replace('lessons-', ''));
            const destSectionIndex = parseInt(destination.droppableId.replace('lessons-', ''));
            const sourceSection = newRoadmap[sourceSectionIndex];
            const destSection = newRoadmap[destSectionIndex];

            if (sourceSectionIndex === destSectionIndex) {
                const [reorderedLesson] = sourceSection.lessons.splice(source.index, 1);
                destSection.lessons.splice(destination.index, 0, reorderedLesson);
            } else {
                const [movedLesson] = sourceSection.lessons.splice(source.index, 1);
                destSection.lessons.splice(destination.index, 0, movedLesson);
            }
            setRoadmap(newRoadmap);
        }
    };

    const handleSave = async () => {
        if (!goalId) return;
        const roadmapToSave = roadmap.map(section => ({
            sectionTitle: section.title,
            lessons: section.lessons.map(lesson => lesson.title),
        }));
        try {
            await updateRoadmap({ goalId, roadmap: roadmapToSave }).unwrap();
            toast.success('План успешно сохранен!');
        } catch (error) { 
            console.error('Save error:', error);
            toast.error('Ошибка сохранения.'); 
        }
    };

    const handleGenerate = async () => { 
        if (!goalId) return;
        try {
            const result = await generateProposal({ 
                goalId, 
                existingPlan: roadmap.map(s => ({
                    sectionTitle: s.title,
                    lessons: s.lessons.map(l => l.title)
                })),
                feedback: feedback || undefined
            }).unwrap();
            
            const newRoadmap = result.map((section, index) => ({
                id: `section-${index}-${Date.now()}`,
                title: section.sectionTitle,
                order: index,
                lessons: section.lessons.map((title, i) => ({
                    id: `lesson-${index}-${i}-${Date.now()}`,
                    title,
                    status: 'DRAFT' as const,
                    order: i
                }))
            }));
            
            setRoadmap(newRoadmap);
            toast.success('Новый план сгенерирован!');
        } catch (error) {
            console.error('Ошибка генерации плана:', error);
            toast.error('Не удалось сгенерировать план. Пожалуйста, попробуйте еще раз.');
        }
    };

    // This function is used in the JSX to add new sections to the roadmap
    const handleAddSection = () => {
        const newSection: ContentSection = {
            id: `section-${Date.now()}`,
            title: `Раздел ${roadmap.length + 1}`,
            order: roadmap.length,
            lessons: []
        };
        setRoadmap([...roadmap, newSection]);
    };

    const handleAddLesson = (sectionIndex: number) => {
        const newRoadmap = [...roadmap];
        const section = newRoadmap[sectionIndex];
        const newLesson: Lesson = {
            id: `lesson-${sectionIndex}-${section.lessons.length}-${Date.now()}`,
            title: `Урок ${section.lessons.length + 1}`,
            status: 'DRAFT',
            order: section.lessons.length
        };
        section.lessons.push(newLesson);
        setRoadmap(newRoadmap);
    };

    const handleRemoveSection = (sectionIndex: number) => {
        if (window.confirm('Вы уверены, что хотите удалить этот раздел? Все уроки внутри также будут удалены.')) {
            const newRoadmap = roadmap.filter((_, i) => i !== sectionIndex);
            setRoadmap(newRoadmap);
        }
    };

    const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = [...roadmap];
        newRoadmap[sectionIndex].lessons = newRoadmap[sectionIndex].lessons.filter((_, i) => i !== lessonIndex);
        setRoadmap(newRoadmap);
    };

    const handleStartRegeneration = () => {
        if (currentGoal?.characterPrompt) {
            setCharacterPrompt(currentGoal.characterPrompt);
        }
        setIsRegenerating(true);
        setGeneratedCharacter(null);
    };

    const handleGenerateCharacter = async () => {
        if (!goalId || !characterPrompt.trim()) {
            toast.error("Пожалуйста, введите описание персонажа.");
            return;
        }
        try {
            const response = await generateCharacter({ 
                goalId, 
                prompt: characterPrompt 
            }).unwrap();
            
            if (response.data && response.data.imageId && response.data.generationId && response.data.url) {
                setGeneratedCharacter({
                    url: response.data.url,
                    prompt: characterPrompt,
                    imageId: response.data.imageId,
                    genId: response.data.generationId
                });
                setIsRegenerating(false);
                toast.success("Новый вариант персонажа готов!");
            } else {
                throw new Error("Ответ от API не содержит всех необходимых данных.");
            }
        } catch (error) {
            console.error("Ошибка создания персонажа:", error);
            toast.error("Не удалось сгенерировать персонажа. Попробуйте снова.");
        }
    };

    const handleApproveCharacter = async () => {
        if (!goalId || !generatedCharacter) return;
        try {
            await approveCharacter({
                goalId,
                prompt: generatedCharacter.prompt,
                imageId: generatedCharacter.imageId,
                genId: generatedCharacter.genId,
                imageUrl: generatedCharacter.url
            }).unwrap();
            toast.success("Персонаж утвержден и сохранен!");
            setGeneratedCharacter(null);
        } catch (error) {
            console.error("Не удалось утвердить персонажа:", error);
            toast.error("Не удалось утвердить персонажа.");
        }
    };

    const startEditing = (sectionIndex: number, lessonIndex: number) => { 
        setIsEditing({ section: sectionIndex, lesson: lessonIndex }); 
    };
    
    const stopEditing = () => { 
        setIsEditing({ section: null, lesson: null }); 
    };
    
    const handleLessonTitleChange = (value: string, sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap[sectionIndex].lessons[lessonIndex].title = value;
        setRoadmap(newRoadmap);
    };

    if (isLoadingGoals) return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    if (!currentGoal) return <div className="text-center text-red-500">Учебный план не найден.</div>;

    return (
        <>
            <LessonEditorModal isOpen={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />

            <div className="max-w-4xl mx-auto p-4 md:p-6">
                {/* Character Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Персонаж истории</h2>

                {/* 1. Saved character view (not regenerating) */}
                {currentGoal.characterImageUrl && !isRegenerating && !generatedCharacter && (
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <img src={currentGoal.characterImageUrl} alt={currentGoal.characterPrompt || 'Character'} className="w-40 h-40 rounded-lg object-cover border" />
                        <div>
                            <p className="font-medium text-gray-800">Текущий персонаж:</p>
                            <p className="text-gray-600 italic">"{currentGoal.characterPrompt}"</p>
                            <button onClick={handleStartRegeneration} className="mt-4 px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200">
                                Изменить и перегенерировать
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Input form for new character or regeneration */}
                {(!currentGoal.characterImageUrl || isRegenerating) && !generatedCharacter && (
                    <div>
                        <p className="text-sm text-gray-600 mb-2">
                            {isRegenerating ? "Отредактируйте промпт и попробуйте снова:" : "Персонаж еще не создан. Опишите его:"}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={characterPrompt}
                                onChange={(e) => setCharacterPrompt(e.target.value)}
                                placeholder="Например: отважная девочка-исследователь..."
                                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={isGeneratingCharacter}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateCharacter()}
                            />
                            <button
                                onClick={handleGenerateCharacter}
                                disabled={isGeneratingCharacter || !characterPrompt.trim()}
                                className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isGeneratingCharacter ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <>
                                        <FiUserPlus className="mr-2" />
                                        {isGeneratingCharacter ? "Генерация..." : (isRegenerating ? "Создать новую версию" : "Создать персонажа")}
                                    </>
                                )}
                            </button>
                            {isRegenerating && (
                                <button onClick={() => setIsRegenerating(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                                    Отмена
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Generated character preview for approval */}
                {generatedCharacter && (
                    <div className="bg-indigo-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-indigo-800 mb-2">Одобряете этот вариант?</p>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <img src={generatedCharacter.url} alt={generatedCharacter.prompt} className="w-40 h-40 rounded-lg object-cover border" />
                            <div>
                                <p className="text-gray-600 italic">"{generatedCharacter.prompt}"</p>
                                <div className="mt-4 flex gap-3">
                                    <button 
                                        onClick={handleApproveCharacter} 
                                        disabled={isApprovingCharacter} 
                                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <FiCheck className="mr-2"/> {isApprovingCharacter ? "Сохраняем..." : "Утвердить"}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setGeneratedCharacter(null);
                                            handleStartRegeneration();
                                        }} 
                                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                    >
                                        <FiX className="mr-2"/> Попробовать снова
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900">
                        <FiArrowLeft className="mr-2" /> Назад
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{currentGoal.subject}</h1>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleGenerate} 
                            disabled={isGenerating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isGenerating ? 'Генерация...' : 'Сгенерировать план'}
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                        Обратная связь для ИИ (необязательно):
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="feedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Например: добавьте больше практических заданий..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="all-sections" direction="vertical" type="SECTIONS">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                {roadmap.map((section, sectionIndex) => (
                                    <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                                        {(provided) => (
                                            <div 
                                                ref={provided.innerRef} 
                                                {...provided.draggableProps} 
                                                style={provided.draggableProps.style}
                                                className="p-4 md:p-6 bg-white rounded-lg shadow-md"
                                            >
                                                <div className="flex justify-between items-center mb-4" {...provided.dragHandleProps}>
                                                    <div className="flex items-center">
                                                        <FiMove className="text-gray-400 mr-3 cursor-grab" />
                                                        <h2 className="text-xl font-semibold">{section.title}</h2>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveSection(sectionIndex)} 
                                                        className="text-red-500 hover:text-red-700 p-1" 
                                                        title="Удалить раздел"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                                
                                                <Droppable droppableId={`lessons-${sectionIndex}`} type="LESSONS">
                                                    {(provided) => (
                                                        <ul 
                                                            {...provided.droppableProps} 
                                                            ref={provided.innerRef} 
                                                            className="space-y-3 pl-2 min-h-[50px]"
                                                        >
                                                            {section.lessons.map((lesson, lessonIndex) => (
                                                                <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                                                    {(provided) => (
                                                                        <li
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            style={provided.draggableProps.style}
                                                                            className="flex items-center group bg-gray-50 p-2 rounded-md"
                                                                        >
                                                                            <div {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab">
                                                                                <FiMove />
                                                                            </div>
                                                                            <LessonStatusIndicator status={lesson.status} />
                                                                            <div className="ml-1 flex-grow">
                                                                                {isEditing.section === sectionIndex && isEditing.lesson === lessonIndex ? (
                                                                                    <input
                                                                                        type="text"
                                                                                        value={lesson.title}
                                                                                        onChange={(e) => handleLessonTitleChange(e.target.value, sectionIndex, lessonIndex)}
                                                                                        onBlur={stopEditing}
                                                                                        onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                                                                                        autoFocus
                                                                                        className="border-b-2 border-indigo-500 bg-transparent w-full focus:outline-none"
                                                                                    />
                                                                                ) : (
                                                                                    <span>{lesson.title}</span>
                                                                                )}
                                                                            </div>
                                                                            <button 
                                                                                onClick={() => startEditing(sectionIndex, lessonIndex)} 
                                                                                className="ml-4 text-gray-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                                                title="Редактировать название"
                                                                            >
                                                                                <FiEdit2 />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setEditingLesson(lesson)} 
                                                                                className="ml-2 text-gray-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                                                title="Настроить контент"
                                                                            >
                                                                                <FiSettings />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRemoveLesson(sectionIndex, lessonIndex);
                                                                                }}
                                                                                className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                title="Удалить урок"
                                                                            >
                                                                                <FiTrash2 size={14} />
                                                                            </button>
                                                                        </li>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </ul>
                                                    )}
                                                </Droppable>
                                                
                                                <button 
                                                    onClick={() => handleAddLesson(sectionIndex)} 
                                                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2 ml-2"
                                                >
                                                    <FiPlus size={16} className="mr-1" /> Добавить урок
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
                
                <div className="mt-6">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        {isGenerating ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Генерация...
                            </>
                        ) : 'Обновить с ИИ'}
                    </button>
                    
                    <button
                        onClick={handleAddSection}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                        <FiPlus className="mr-2" />
                        Добавить раздел
                    </button>
                </div>
            </div>
        </>
    );
};

export default RoadmapEditorPage;
