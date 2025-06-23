// Файл: tutor-game/frontend/src/pages/teacher/RoadmapEditorPage.tsx
// Версия: Полная, с интеграцией просмотра ответов студента

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    useGetLearningGoalsQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    useGenerateCharacterForGoalMutation,
    useApproveCharacterForGoalMutation,
    useLazyGetPerformanceLogsQuery, // <-- Новый импорт
    type ContentSection,
    type Lesson
} from '../../features/teacher/teacherApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FiPlus, FiTrash2, FiArrowLeft, FiEdit2, FiSettings, FiMove, FiUserPlus, FiCheck, FiX, FiBookOpen, FiMaximize2, FiEye } from 'react-icons/fi';
import LessonEditorModal from './LessonEditorModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Тип для сгенерированного персонажа
interface GeneratedCharacter {
    url: string;
    prompt: string;
    imageId: string;
    genId: string;
}

// Тип для логов успеваемости
interface PerformanceLog {
    id: string;
    answer: string;
    question: string;
    createdAt: string;
    lesson: {
        title: string;
    };
}

// Компонент для увеличения изображения
const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => {
    if (!src) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl hover:opacity-75"><FiX /></button>
            <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

// Компонент для отображения статуса урока
const LessonStatusIndicator = ({ lesson }: { lesson: Lesson }) => {
    const status = lesson.storyChapter?.teacherSnippetStatus === 'APPROVED' ? 'APPROVED' : lesson.status;
    const statusMap = {
        DRAFT: { color: 'bg-gray-400', title: 'Черновик: контент или история не утверждены' },
        PENDING_APPROVAL: { color: 'bg-yellow-400', title: 'Ожидает утверждения: контент готов, нужна история' },
        APPROVED: { color: 'bg-green-500', title: 'Готов: урок полностью утвержден и доступен студенту' },
        COMPLETED: { color: 'bg-blue-500', title: 'Завершен: урок пройден студентом' },
    };
    const { color, title } = statusMap[status] || statusMap.DRAFT;

    return (
        <div className="flex items-center space-x-1.5" title={title}>
            <span className={`w-3 h-3 rounded-full inline-block ${color}`}></span>
            {lesson.storyChapter?.teacherSnippetStatus === 'APPROVED' && <FiBookOpen size={12} className="text-purple-600" title="Есть утвержденная история" />}
        </div>
    );
};

const RoadmapEditorPage = () => {
    const { goalId } = useParams<{ goalId: string }>();
    const navigate = useNavigate();

    const { data: goals, isLoading: isLoadingGoals, isFetching } = useGetLearningGoalsQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const currentGoal = goals?.find(g => g.id === goalId);

    const [roadmap, setRoadmap] = useState<ContentSection[]>([]);
    const [feedback, setFeedback] = useState('');
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState<{section: number | null, lesson: number | null}>({section: null, lesson: null});
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    
    // Новые состояния для модального окна с логами
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [getLogs, { data: performanceLogs, isLoading: isLoadingLogs }] = useLazyGetPerformanceLogsQuery();

    const [generateProposal, { isLoading: isGenerating }] = useGenerateRoadmapProposalMutation();
    const [updateRoadmap, { isLoading: isSaving }] = useUpdateRoadmapMutation();
    const [generateCharacter, { isLoading: isGeneratingCharacter }] = useGenerateCharacterForGoalMutation();
    const [approveCharacter, { isLoading: isApprovingCharacter }] = useApproveCharacterForGoalMutation();

    useEffect(() => {
        if (currentGoal?.sections) {
            setRoadmap(JSON.parse(JSON.stringify(currentGoal.sections)));
        }
    }, [currentGoal]);

    const handleShowLogs = () => {
        if (currentGoal) {
            getLogs({ goalId: currentGoal.id, studentId: currentGoal.studentId });
            setShowLogsModal(true);
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination, type } = result;
        if (!destination) return;
        const newRoadmap = [...roadmap];
        if (type === 'SECTIONS') {
            const [reorderedItem] = newRoadmap.splice(source.index, 1);
            newRoadmap.splice(destination.index, 0, reorderedItem);
        } else if (type === 'LESSONS') {
            const sourceSectionIndex = parseInt(source.droppableId.replace('lessons-', ''));
            const destSectionIndex = parseInt(destination.droppableId.replace('lessons-', ''));
            if (sourceSectionIndex === destSectionIndex) {
                const [reorderedLesson] = newRoadmap[sourceSectionIndex].lessons.splice(source.index, 1);
                newRoadmap[destSectionIndex].lessons.splice(destination.index, 0, reorderedLesson);
            } else {
                const [movedLesson] = newRoadmap[sourceSectionIndex].lessons.splice(source.index, 1);
                newRoadmap[destSectionIndex].lessons.splice(destination.index, 0, movedLesson);
            }
        }
        setRoadmap(newRoadmap);
    };

    const handleSave = async () => {
        if (!goalId) return;
        const roadmapToSave = roadmap.map((section, sectionIndex) => ({
            ...section,
            order: sectionIndex,
            lessons: section.lessons.map((lesson, lessonIndex) => ({
                ...lesson,
                order: lessonIndex,
            }))
        }));
        try {
            await updateRoadmap({ goalId, roadmap: roadmapToSave }).unwrap();
            toast.success('План успешно сохранен!');
        } catch (error) { 
            console.error('Ошибка при сохранении плана:', error);
            toast.error('Ошибка сохранения плана.'); 
        }
    };
    
    const handleGenerate = async () => {
        if (!goalId) return;
        try {
            const result = await generateProposal({ goalId, existingPlan: roadmap, feedback: feedback || undefined }).unwrap();
            const newRoadmap: ContentSection[] = result.map((sectionData, index) => ({
                id: `new-section-${index}-${Date.now()}`,
                title: sectionData.sectionTitle,
                order: index,
                lessons: sectionData.lessons.map((lessonTitle, i) => ({
                    id: `new-lesson-${index}-${i}-${Date.now()}`,
                    title: lessonTitle,
                    status: 'DRAFT',
                    order: i,
                    content: null,
                    storyChapter: null
                }))
            }));
            setRoadmap(newRoadmap);
            toast.success('Новый план сгенерирован!');
        } catch (error) { 
            console.error('Ошибка при генерации плана:', error);
            toast.error('Не удалось сгенерировать план.'); 
        }
    };
    
    const handleAddSection = () => {
        const newSection: ContentSection = { 
            id: `new-section-${Date.now()}`, 
            title: `Новый раздел ${roadmap.length + 1}`, 
            order: roadmap.length, 
            lessons: [] 
        };
        setRoadmap([...roadmap, newSection]);
    };

    const handleAddLesson = (sectionIndex: number) => {
        const newRoadmap = [...roadmap];
        const section = newRoadmap[sectionIndex];
        const newLesson: Lesson = { 
            id: `new-lesson-${Date.now()}`, 
            title: `Новый урок ${section.lessons.length + 1}`, 
            status: 'DRAFT', 
            order: section.lessons.length,
            content: null,
            storyChapter: null
        };
        section.lessons.push(newLesson);
        setRoadmap(newRoadmap);
    };

    const handleRemoveSection = (sectionIndex: number) => {
        if (window.confirm('Вы уверены, что хотите удалить этот раздел со всеми уроками?')) {
            setRoadmap(roadmap.filter((_, i) => i !== sectionIndex));
        }
    };

    const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = [...roadmap];
        newRoadmap[sectionIndex].lessons.splice(lessonIndex, 1);
        setRoadmap(newRoadmap);
    };

    const startEditing = (sectionIndex: number, lessonIndex: number) => setIsEditingTitle({ section: sectionIndex, lesson: lessonIndex });
    const stopEditing = () => setIsEditingTitle({ section: null, lesson: null });

    const handleLessonTitleChange = (value: string, sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = [...roadmap];
        newRoadmap[sectionIndex].lessons[lessonIndex].title = value;
        setRoadmap(newRoadmap);
    };

    const handleStartRegeneration = () => {
        if (currentGoal?.characterPrompt) setCharacterPrompt(currentGoal.characterPrompt);
        setIsRegenerating(true);
        setGeneratedCharacter(null);
    };

    const handleGenerateCharacter = async () => {
        if (!goalId || !characterPrompt.trim()) return;
        try {
            const response = await generateCharacter({ goalId, prompt: characterPrompt }).unwrap();
            const { url, imageId, generationId } = response.data;
            if (url && imageId && generationId) {
                setGeneratedCharacter({ url, imageId, genId: generationId, prompt: characterPrompt });
                setIsRegenerating(false);
                toast.success("Новый вариант персонажа готов!");
            } else { throw new Error("API did not return required data."); }
        } catch (error) { toast.error("Не удалось сгенерировать персонажа."); }
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
        } catch (error) { toast.error("Не удалось утвердить персонажа."); }
    };

    if (isLoadingGoals || isFetching) {
        return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    }
    
    if (!currentGoal) {
        return (
            <div className="text-center text-red-500 p-10">
                Учебный план не найден. Возможно, он был удален. <Link to="/teacher/goals" className="text-indigo-600">Вернуться к списку</Link>
            </div>
        );
    }
    
    return (
        <>
            {isLightboxOpen && generatedCharacter && <Lightbox src={generatedCharacter.url} onClose={() => setIsLightboxOpen(false)} />}
            <LessonEditorModal isOpen={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} />

            <div className="max-w-4xl mx-auto p-4 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate('/teacher/goals')} className="flex items-center text-gray-600 hover:text-gray-900"><FiArrowLeft className="mr-2" /> Назад</button>
                    <h1 className="text-2xl font-bold text-gray-900 text-center">{currentGoal.subject}</h1>
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
                    </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-800">Анализ ответов</h3>
                            <p className="text-sm text-yellow-700">
                                Посмотрите на ответы ученика, чтобы создать следующий урок максимально эффективно.
                            </p>
                        </div>
                        <button onClick={handleShowLogs} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 flex items-center">
                            <FiEye className="mr-2" /> Показать ответы
                        </button>
                    </div>
                </div>
                
                {showLogsModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={() => setShowLogsModal(false)}>
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">Ответы ученика: {currentGoal?.student.firstName}</h2>
                            <div className="overflow-y-auto flex-grow pr-4">
                                {isLoadingLogs && <Spinner />}
                                {performanceLogs && performanceLogs.length > 0 ? (
                                    <ul className="space-y-4">
                                        {(performanceLogs as PerformanceLog[]).map(log => (
                                            <li key={log.id} className="p-3 bg-gray-50 rounded-md border">
                                                <p className="text-xs text-gray-500">Урок: {log.lesson.title}</p>
                                                <p className="font-semibold mt-1">Вопрос:</p>
                                                <p className="italic text-gray-700">"{log.question}"</p>
                                                <p className="font-semibold mt-2">Ответ ученика:</p>
                                                <p className="p-2 bg-blue-50 border border-blue-200 rounded-md">"{log.answer}"</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : !isLoadingLogs && (
                                    <p>Ответов от ученика по этому плану пока нет.</p>
                                )}
                            </div>
                            <button onClick={() => setShowLogsModal(false)} className="mt-4 px-4 py-2 bg-gray-200 rounded-md self-end">
                                Закрыть
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Персонаж истории</h2>
                    {currentGoal.characterImageUrl && !isRegenerating && !generatedCharacter && (
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <img src={currentGoal.characterImageUrl} alt={currentGoal.characterPrompt || 'Character'} className="w-40 h-40 rounded-lg object-cover border" />
                            <div>
                                <p className="font-medium text-gray-800">Текущий персонаж:</p>
                                <p className="text-gray-600 italic">"{currentGoal.characterPrompt}"</p>
                                <button onClick={handleStartRegeneration} className="mt-4 px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200">Изменить</button>
                            </div>
                        </div>
                    )}
                    {(!currentGoal.characterImageUrl || isRegenerating) && !generatedCharacter && (
                         <div>
                            <p className="text-sm text-gray-600 mb-2">{isRegenerating ? "Отредактируйте промпт и попробуйте снова:" : "Персонаж еще не создан. Опишите его:"}</p>
                           <div className="flex flex-col sm:flex-row gap-2">
                               <input type="text" value={characterPrompt} onChange={(e) => setCharacterPrompt(e.target.value)} placeholder="Например: отважная девочка-исследователь..." className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isGeneratingCharacter} />
                               <button onClick={handleGenerateCharacter} disabled={isGeneratingCharacter || !characterPrompt.trim()} className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                                   {isGeneratingCharacter ? <Spinner size="sm" /> : <FiUserPlus className="mr-2" />}
                                   {isGeneratingCharacter ? "Генерация..." : (isRegenerating ? "Создать новую версию" : "Создать")}
                               </button>
                               {isRegenerating && <button onClick={() => setIsRegenerating(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Отмена</button>}
                           </div>
                       </div>
                    )}
                    {generatedCharacter && (
                        <div className="bg-indigo-50 p-4 rounded-md">
                            <p className="text-sm font-medium text-indigo-800 mb-2">Одобряете этот вариант?</p>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="w-40 h-40 relative group flex-shrink-0">
                                    <img src={generatedCharacter.url} alt={generatedCharacter.prompt} className="w-full h-full rounded-lg object-cover border" />
                                    <button onClick={() => setIsLightboxOpen(true)} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center text-white text-2xl transition-all opacity-0 group-hover:opacity-100"><FiMaximize2 /></button>
                                </div>
                                <div>
                                    <p className="text-gray-600 italic">"{generatedCharacter.prompt}"</p>
                                    <div className="mt-4 flex gap-3">
                                        <button onClick={handleApproveCharacter} disabled={isApprovingCharacter} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"><FiCheck className="mr-2"/> {isApprovingCharacter ? "Сохраняем..." : "Утвердить"}</button>
                                        <button onClick={() => { setGeneratedCharacter(null); handleStartRegeneration(); }} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"><FiX className="mr-2"/> Попробовать снова</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-6"><h2 className="text-xl font-semibold mb-2">План Уроков</h2></div>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="all-sections" direction="vertical" type="SECTIONS">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                {roadmap.map((section, sectionIndex) => (
                                    <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style} className="p-4 md:p-6 bg-white rounded-lg shadow-md">
                                                <div className="flex justify-between items-center mb-4" {...provided.dragHandleProps}>
                                                    <div className="flex items-center"><FiMove className="text-gray-400 mr-3 cursor-grab" /><h2 className="text-xl font-semibold">{section.title}</h2></div>
                                                    <button onClick={() => handleRemoveSection(sectionIndex)} className="text-red-500 hover:text-red-700 p-1" title="Удалить раздел"><FiTrash2 /></button>
                                                </div>
                                                <Droppable droppableId={`lessons-${sectionIndex}`} type="LESSONS">
                                                    {(provided) => (
                                                        <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 pl-2 min-h-[50px]">
                                                            {section.lessons.map((lesson, lessonIndex) => (
                                                                <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                                                    {(provided) => (
                                                                        <li ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style} className="flex items-center group bg-gray-50 p-2 rounded-md">
                                                                            <div {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab"><FiMove /></div>
                                                                            <LessonStatusIndicator lesson={lesson} />
                                                                            <div className="ml-2 flex-grow">
                                                                                {isEditingTitle.section === sectionIndex && isEditingTitle.lesson === lessonIndex ? (
                                                                                    <input type="text" value={lesson.title} onChange={(e) => handleLessonTitleChange(e.target.value, sectionIndex, lessonIndex)} onBlur={stopEditing} onKeyDown={(e) => e.key === 'Enter' && stopEditing()} autoFocus className="border-b-2 border-indigo-500 bg-transparent w-full focus:outline-none"/>
                                                                                ) : (<span>{lesson.title}</span>)}
                                                                            </div>
                                                                            <button onClick={() => startEditing(sectionIndex, lessonIndex)} className="ml-4 text-gray-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Редактировать название"><FiEdit2 /></button>
                                                                            <button onClick={() => setEditingLesson(lesson)} className="ml-2 text-gray-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Настроить контент"><FiSettings /></button>
                                                                            <button onClick={() => handleRemoveLesson(sectionIndex, lessonIndex)} className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Удалить урок"><FiTrash2 size={14} /></button>
                                                                        </li>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </ul>
                                                    )}
                                                </Droppable>
                                                <button onClick={() => handleAddLesson(sectionIndex)} className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-3 ml-2"><FiPlus size={16} className="mr-1" /> Добавить урок</button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                <div className="mt-8 flex justify-between">
                    <button onClick={handleAddSection} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center"><FiPlus className="mr-2" /> Добавить раздел</button>
                    <div className="flex flex-col items-end">
                        <label htmlFor="feedback" className="text-sm text-gray-600 mb-1">Запрос для ИИ (необязательно)</label>
                        <input id="feedback" type="text" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Например: добавь раздел о дробях" className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 mb-2"/>
                        <button onClick={handleGenerate} disabled={isGenerating} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {isGenerating ? 'Генерация...' : 'Сгенерировать план с ИИ'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RoadmapEditorPage;