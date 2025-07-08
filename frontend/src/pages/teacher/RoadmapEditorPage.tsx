// Файл: tutor-game/frontend/src/pages/teacher/RoadmapEditorPage.tsx
// Версия: Полная, с интеграцией просмотра ответов студента

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLazyGetPerformanceLogsQuery } from '../../features/teacher/teacherApi';
import { 
    useGetLearningGoalByIdQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    type ContentSection,
    type Lesson
} from '../../features/goal/goalApi';

// Extend the Lesson type to include previousLesson for the editor
interface LessonWithPrevious extends Lesson {
    previousLesson?: Lesson | null;
}
import { CharacterEditor } from './components/CharacterEditor';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FiArrowLeft, FiPlus, FiEye } from 'react-icons/fi';
import LessonEditorModal from './LessonEditorModal';
import { RoadmapSection } from './components/RoadmapSection';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

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




const RoadmapEditorPage = () => {
    const { goalId } = useParams<{ goalId: string }>();
    const navigate = useNavigate();

    // Fetch the specific goal by ID
    const { data: currentGoal, isLoading, error, refetch } = useGetLearningGoalByIdQuery(goalId!, {
        skip: !goalId,
        refetchOnMountOrArgChange: true,
    });

    // Local state
    const [roadmap, setRoadmap] = useState<ContentSection[]>([]);
    const [feedback, setFeedback] = useState('');
    const [editingLesson, setEditingLesson] = useState<LessonWithPrevious | null>(null);
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
    if (error) {
        return (
            <div className="text-center text-red-500 p-10 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold">Ошибка</h2>
                <p className="mt-2">Не удалось загрузить учебный план. Пожалуйста, попробуйте снова.</p>
                <Link to="/teacher/goals" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md">
                    Вернуться к списку планов
                </Link>
            </div>
        );
    }

    // Early return if goal is not found
    if (!isLoading && !currentGoal) {
        return (
            <div className="text-center text-red-500 p-10 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold">План не найден</h2>
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

        // Clone the roadmap to avoid mutating the state directly
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));

        // Handle section reordering
        if (type === 'SECTIONS') {
            const [reorderedItem] = newRoadmap.splice(source.index, 1);
            newRoadmap.splice(destination.index, 0, reorderedItem);
        }
        // Handle lesson reordering
        else if (type === 'LESSONS') {
            // Get indices directly from droppableId
            const sourceSectionIndex = parseInt(source.droppableId.replace('lessons-', ''), 10);
            const destSectionIndex = parseInt(destination.droppableId.replace('lessons-', ''), 10);

            // Validate indices (though with this approach it's unlikely to be needed)
            if (isNaN(sourceSectionIndex) || isNaN(destSectionIndex)) return;

            // Remove lesson from source section
            const [movedLesson] = newRoadmap[sourceSectionIndex].lessons.splice(source.index, 1);
            // Insert lesson into target section
            newRoadmap[destSectionIndex].lessons.splice(destination.index, 0, movedLesson);
        } else {
            return;
        }

        // Update local state for immediate UI response
        setRoadmap(newRoadmap);

        // Prepare data for saving to the server
        const roadmapToSave = newRoadmap.map((section: ContentSection, sectionIndex: number) => ({
            ...section,
            order: sectionIndex, // Update section order
            lessons: section.lessons.map((lesson: Lesson, lessonIndex: number) => ({
                ...lesson,
                order: lessonIndex, // Update lesson order
            }))
        }));

        // Asynchronously save the changes
        toast.promise(
            updateRoadmap({ goalId: goalId!, roadmap: roadmapToSave }).unwrap(),
            {
                loading: 'Сохранение порядка...',
                success: 'Порядок успешно сохранен!',
                error: 'Ошибка при сохранении порядка.',
            }
        );
    };

    const handleSave = async () => {
        if (!goalId) return;
        try {
            // Ensure we're only sending the required fields to the API
            const roadmapForApi = roadmap.map(section => ({
                id: section.id,
                title: section.title,
                order: section.order,
                lessons: section.lessons.map(lesson => ({
                    id: lesson.id,
                    title: lesson.title,
                    status: lesson.status,
                    order: lesson.order,
                    content: lesson.content,
                    // Don't include storyChapter or previousLesson in the update
                }))
            }));
            
            await updateRoadmap({ goalId, roadmap: roadmapForApi }).unwrap();
            toast.success('Изменения успешно сохранены');
        } catch (error) {
            console.error('Ошибка при сохранении изменений:', error);
            toast.error('Не удалось сохранить изменения');
        }
    };
    
    const handleGeneratePlan = async (goalId: string) => {
        try {
            await generateRoadmap({
                goalId,
                feedback,
                existingPlan: roadmap
            }).unwrap();
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
                                        <RoadmapSection
                                            key={section.id}
                                            section={section}
                                            sectionIndex={sectionIndex}
                                            onRemoveSection={handleRemoveSection}
                                            onAddLesson={handleAddLesson}
                                            onRemoveLesson={handleRemoveLesson}
                                            onEditLesson={(lesson, currentSectionIndex, currentLessonIndex) => {
                                                const prevLesson = currentLessonIndex > 0
                                                    ? roadmap[currentSectionIndex].lessons[currentLessonIndex - 1]
                                                    : (currentSectionIndex > 0 ? 
                                                        roadmap[currentSectionIndex - 1].lessons[roadmap[currentSectionIndex - 1].lessons.length - 1] : null);
                                                
                                                setEditingLesson({ 
                                                    ...lesson, 
                                                    previousLesson: prevLesson || null 
                                                });
                                            }}
                                            onTitleChange={handleLessonTitleChange}
                                            onSectionTitleChange={handleSectionTitleChange}
                                            editingTitle={isEditingTitle}
                                            editingSectionIndex={editingSectionIndex}
                                            setEditingSectionIndex={setEditingSectionIndex}
                                            startEditing={startEditing}
                                            stopEditing={stopEditing}
                                        />
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