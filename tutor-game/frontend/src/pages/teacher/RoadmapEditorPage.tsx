// Файл: tutor-game/frontend/src/pages/teacher/RoadmapEditorPage.tsx
// Версия: Полная, с интеграцией просмотра ответов студента

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLazyGetPerformanceLogsQuery } from '../../features/teacher/teacherApi';
import { 
    useGetLearningGoalsQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    type ContentSection,
    type Lesson
} from '../../features/goal/goalApi';
import { CharacterEditor } from './components/CharacterEditor';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiPlus, 
  FiTrash2, 
  FiMove,
  FiBookOpen,
  FiEye
} from 'react-icons/fi';
import LessonEditorModal from './LessonEditorModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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

    // Fetch goals data
    const { data: goals, isLoading, error, refetch } = useGetLearningGoalsQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    
    // Get current goal from the goals list
    const currentGoal = useMemo(() => {
        return goals?.find(g => g.id === goalId) || null;
    }, [goals, goalId]);

    // Local state
    const [roadmap, setRoadmap] = useState<ContentSection[]>([]);
    const [feedback, setFeedback] = useState('');
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState<{section: number | null, lesson: number | null}>({section: null, lesson: null});
    const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [getLogs, { data: performanceLogs, isLoading: isLoadingLogs }] = useLazyGetPerformanceLogsQuery();
    
    // API mutations
    const [generateRoadmap, { isLoading: isGenerating }] = useGenerateRoadmapProposalMutation();
    const [updateRoadmap] = useUpdateRoadmapMutation();
    
    // Handle character generation and approval logic

    useEffect(() => {
        if (currentGoal?.sections) {
            setRoadmap(JSON.parse(JSON.stringify(currentGoal.sections)));
        }
    }, [currentGoal?.sections]);

    // Early return for loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    // Early return for error state (goal not found)
    if (error || !currentGoal) {
        return (
            <div className="text-center text-red-500 p-10 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold">Ошибка</h2>
                <p className="mt-2">Учебный план с ID "{goalId}" не найден или у вас нет к нему доступа.</p>
                <Link to="/teacher/goals" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md">
                    Вернуться к списку планов
                </Link>
            </div>
        );
    }

    const handleShowLogs = async () => {
        if (!currentGoal?.student?.id || !goalId) return;
        try {
            await getLogs({ studentId: currentGoal.student.id, goalId }).unwrap();
            setShowLogsModal(true);
        } catch (error) {
            console.error('Ошибка при загрузке логов:', error);
            toast.error('Не удалось загрузить логи успеваемости');
        }
    };

    const renderLogsModal = () => {
        if (!showLogsModal) return null;
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={() => setShowLogsModal(false)}>
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-4">Ответы ученика: {currentGoal?.student?.firstName || 'Студент'}</h2>
                    <div className="overflow-y-auto flex-grow pr-4">
                        {isLoadingLogs ? (
                            <div className="flex justify-center items-center h-32">
                                <Spinner size="md" />
                            </div>
                        ) : performanceLogs?.length ? (
                            <div className="space-y-4">
                                {(performanceLogs as PerformanceLog[]).map(log => (
                                    <div key={log.id} className="p-3 bg-gray-50 rounded-md border">
                                        <p className="text-xs text-gray-500">Урок: {log.lesson?.title || 'Без названия'}</p>
                                        <p className="font-semibold mt-1">Вопрос:</p>
                                        <p className="italic text-gray-700">"{log.question}"</p>
                                        <p className="font-semibold mt-2">Ответ ученика:</p>
                                        <p className="p-2 bg-blue-50 border border-blue-200 rounded-md">"{log.answer}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Ответов от ученика по этому плану пока нет.</p>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={() => setShowLogsModal(false)} 
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Handle drag end for sections and lessons
    const onDragEnd = (result: {
        destination: { droppableId: string; index: number } | null;
        source: { droppableId: string; index: number };
        type: string;
    }) => {
        const { destination, source, type } = result;

        // If there's no destination or the item was dropped in the same place
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        // Handle section reordering
        if (type === 'SECTIONS') {
            const newRoadmap = Array.from(roadmap);
            const [movedSection] = newRoadmap.splice(source.index, 1);
            newRoadmap.splice(destination.index, 0, movedSection);
            setRoadmap(newRoadmap);
            // TODO: Save the new order to the backend
            return;
        }

        // Handle lesson reordering within the same section
        if (type === 'LESSONS' && source.droppableId === destination.droppableId) {
            const sectionId = source.droppableId.replace('section-', '');
            const sectionIndex = roadmap.findIndex(s => s.id === sectionId);
            if (sectionIndex === -1) return;

            const newRoadmap = [...roadmap];
            const section = { ...newRoadmap[sectionIndex] };
            const newLessons = [...(section.lessons || [])];
            const [movedLesson] = newLessons.splice(source.index, 1);
            newLessons.splice(destination.index, 0, movedLesson);
            
            section.lessons = newLessons;
            newRoadmap[sectionIndex] = section;
            setRoadmap(newRoadmap);
            // TODO: Save the new order to the backend
            return;
        }

        // Handle moving lessons between sections
        if (type === 'LESSONS' && source.droppableId !== destination.droppableId) {
            const sourceSectionId = source.droppableId.replace('section-', '');
            const destSectionId = destination.droppableId.replace('section-', '');
            
            const sourceSectionIndex = roadmap.findIndex(s => s.id === sourceSectionId);
            const destSectionIndex = roadmap.findIndex(s => s.id === destSectionId);
            
            if (sourceSectionIndex === -1 || destSectionIndex === -1) return;

            const newRoadmap = [...roadmap];
            const sourceSection = { ...newRoadmap[sourceSectionIndex] };
            const destSection = { ...newRoadmap[destSectionIndex] };
            
            const sourceLessons = [...(sourceSection.lessons || [])];
            const [movedLesson] = sourceLessons.splice(source.index, 1);
            
            const destLessons = [...(destSection.lessons || [])];
            destLessons.splice(destination.index, 0, movedLesson);
            
            sourceSection.lessons = sourceLessons;
            destSection.lessons = destLessons;
            
            newRoadmap[sourceSectionIndex] = sourceSection;
            newRoadmap[destSectionIndex] = destSection;
            
            setRoadmap(newRoadmap);
            // TODO: Save the new order to the backend
        }
    };

    const handleSave = async () => {
        if (!goalId) return;
        try {
            await updateRoadmap({ goalId, roadmap } as any).unwrap();
            toast.success('Изменения успешно сохранены');
        } catch (error) {
            console.error('Ошибка при сохранении изменений:', error);
            toast.error('Не удалось сохранить изменения');
        }
    };
    
    const handleGeneratePlan = async (goalId: string) => {
        try {
            // Using type assertion as the API expects a different type
            await (generateRoadmap as any)({ goalId, feedback }).unwrap();
            await refetch();
            setFeedback('');
            toast.success('План успешно обновлен с учетом ваших пожеланий');
        } catch (error) {
            console.error('Ошибка при генерации плана:', error);
            toast.error('Не удалось обновить план');
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
        const section = { ...newRoadmap[sectionIndex] };
        if (section.lessons) {
            section.lessons.splice(lessonIndex, 1);
            newRoadmap[sectionIndex] = section;
            setRoadmap(newRoadmap);
        }
    };

    const startEditing = (sectionIndex: number, lessonIndex: number) => setIsEditingTitle({ section: sectionIndex, lesson: lessonIndex });
    const stopEditing = () => setIsEditingTitle({ section: null, lesson: null });

    const handleLessonTitleChange = (value: string, sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = [...roadmap];
        newRoadmap[sectionIndex].lessons[lessonIndex].title = value;
        setRoadmap(newRoadmap);
    };

    const handleSectionTitleChange = (value: string, sectionIndex: number) => {
        const newRoadmap = [...roadmap];
        newRoadmap[sectionIndex].title = value;
        setRoadmap(newRoadmap);
    };

    if (isLoading) {
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
        <div>

            
            {editingLesson && (
                <LessonEditorModal 
                    isOpen={!!editingLesson} 
                    onClose={() => setEditingLesson(null)} 
                    lesson={editingLesson} 
                />
            )}

            <div className="max-w-4xl mx-auto p-4 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate('/teacher/goals')} className="flex items-center text-gray-600 hover:text-gray-900"><FiArrowLeft className="mr-2" /> Назад</button>
                    <h1 className="text-2xl font-bold text-gray-900 text-center">{currentGoal.subject}</h1>
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={false} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">Сохранить</button>
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
                
                {renderLogsModal()}
                
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Персонаж истории</h2>
                    <CharacterEditor goal={currentGoal} />

                    <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">План Уроков</h2>
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
                                                        <div className="flex items-center flex-grow">
                                                            <FiMove className="text-gray-400 mr-3 cursor-grab flex-shrink-0" />
                                                            {editingSectionIndex === sectionIndex ? (
                                                                <input
                                                                    type="text"
                                                                    value={section.title}
                                                                    onChange={(e) => handleSectionTitleChange(e.target.value, sectionIndex)}
                                                                    onBlur={() => setEditingSectionIndex(null)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingSectionIndex(null)}
                                                                    autoFocus
                                                                    className="text-xl font-semibold border-b-2 border-indigo-500 bg-transparent w-full focus:outline-none"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center group" onClick={() => setEditingSectionIndex(sectionIndex)}>
                                                                    <h2 className="text-xl font-semibold cursor-pointer">{section.title}</h2>
                                                                    <button 
                                                                        className="ml-2 text-gray-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                                        title="Редактировать название"
                                                                    >
                                                                        <FiEdit2 />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveSection(sectionIndex)} 
                                                            className="text-red-500 hover:text-red-700 p-1 flex-shrink-0" 
                                                            title="Удалить раздел"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                    <Droppable droppableId={`section-${sectionIndex}`} type="LESSONS">
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
                                                                                style={provided.draggableProps.style} 
                                                                                className="flex items-center group bg-gray-50 p-2 rounded-md"
                                                                            >
                                                                                <div {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab">
                                                                                    <FiMove />
                                                                                </div>
                                                                                <LessonStatusIndicator lesson={lesson} />
                                                                                <div className="ml-2 flex-grow">
                                                                                    {isEditingTitle.section === sectionIndex && isEditingTitle.lesson === lessonIndex ? (
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
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleRemoveLesson(sectionIndex, lessonIndex);
                                                                                    }} 
                                                                                    className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                    title="Удалить урок"
                                                                                >
                                                                                    <FiTrash2 size={16} />
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
                                                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-3 ml-2"
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
                    <div className="mt-8 flex justify-between">
                        <button 
                            onClick={handleAddSection} 
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center"
                        >
                            <FiPlus className="mr-2" /> Добавить раздел
                        </button>
                        <div className="flex flex-col items-end">
                            <label htmlFor="feedback" className="text-sm text-gray-600 mb-1">
                                Запрос для ИИ (необязательно)
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    id="feedback" 
                                    type="text" 
                                    value={feedback} 
                                    onChange={e => setFeedback(e.target.value)} 
                                    placeholder="Например: добавь раздел о дробях" 
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                />
                                <button 
                                    onClick={() => handleGeneratePlan(goalId!)} 
                                    disabled={isGenerating} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isGenerating ? 'Генерация...' : 'Сгенерировать'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoadmapEditorPage;