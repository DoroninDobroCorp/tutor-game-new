import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useGetLearningGoalsQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    type LearningGoal,
    type ContentSection,
    type Lesson,
    type RoadmapProposal
} from '../../features/teacher/teacherApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FiPlus, FiTrash2, FiArrowLeft, FiEdit2 } from 'react-icons/fi';

type LessonStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';

// Компонент для отображения статуса урока
const LessonStatusIndicator = ({ status }: { status: Lesson['status'] }) => {
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
    const { data: goals } = useGetLearningGoalsQuery();
    const [, setCurrentGoal] = useState<LearningGoal | null>(null);

    // --- СОСТОЯНИЕ РЕДАКТОРА ---
    const [roadmap, setRoadmap] = useState<ContentSection[]>([]);
    const [isEditing, setIsEditing] = useState<{section: number | null, lesson: number | null}>({section: null, lesson: null});
    const [feedback, setFeedback] = useState('');
    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    const [generateProposal, { isLoading: isGenerating }] = useGenerateRoadmapProposalMutation();
    const [updateRoadmap, { isLoading: isSaving }] = useUpdateRoadmapMutation();
    
    // Combine loading states
    const isLoading = isGenerating || isSaving;

    // --- ЭФФЕКТ ДЛЯ ЗАПОЛНЕНИЯ ДАННЫХ ПРИ ЗАГРУЗКЕ ---
    useEffect(() => {
        if (goals && goalId) {
            const foundGoal = goals.find(g => g.id === goalId);
            if (foundGoal) {
                setCurrentGoal(foundGoal);
                // Заполняем roadmap из данных, если они есть
                setRoadmap(foundGoal.sections || []);
            }
        }
    }, [goals, goalId]);

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    const handleGenerate = async () => {
        if (!goalId) return;
        // Loading state is now handled by RTK Query
        // Преобразуем текущий план в формат, который ожидает ИИ
        const existingPlanForAI = roadmap.map(section => ({
            sectionTitle: section.title,
            lessons: section.lessons.map(lesson => lesson.title),
        }));
        
        try {
            const proposal = await generateProposal({
                goalId,
                existingPlan: existingPlanForAI.length > 0 ? existingPlanForAI : undefined,
                feedback,
            }).unwrap();
            
            // Преобразуем ответ ИИ обратно в нашу структуру ContentSection/Lesson
            const newRoadmap: ContentSection[] = proposal.map((sec: RoadmapProposal, secIndex: number) => ({
                id: `new-section-${secIndex}`,
                title: sec.sectionTitle,
                order: secIndex,
                lessons: sec.lessons.map((lesson, lesIndex) => ({
                    id: `new-lesson-${secIndex}-${lesIndex}`,
                    title: typeof lesson === 'string' ? lesson : lesson.title,
                    status: 'DRAFT' as LessonStatus,
                    order: lesIndex
                }))
            }));

            setRoadmap(newRoadmap);
            setFeedback('');
            toast.success('Предложение по плану сгенерировано!');
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Не удалось обновить план.');
        }
    };

    const handleTitleChange = (type: 'section' | 'lesson', value: string, sectionIndex: number, lessonIndex?: number) => {
        const newRoadmap = [...roadmap];
        if (type === 'section') {
            newRoadmap[sectionIndex].title = value;
        } else if (typeof lessonIndex === 'number') {
            newRoadmap[sectionIndex].lessons[lessonIndex].title = value;
        }
        setRoadmap(newRoadmap);
    };

    const handleSave = async () => {
        if (!goalId) return;
        // Loading state is now handled by RTK Query
        // Convert to the format expected by the API
        const roadmapToSave: RoadmapProposal[] = roadmap.map(section => ({
            sectionTitle: section.title,
            lessons: section.lessons.map(lesson => ({
                title: lesson.title,
                status: lesson.status as LessonStatus
            }))
        }));
        
        try {
            await updateRoadmap({ goalId, roadmap: roadmapToSave }).unwrap();
            toast.success('План успешно сохранен!');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Ошибка сохранения.');
        }
    };

    // Обработчики для добавления/удаления разделов и уроков
    const handleAddSection = () => {
        const newSection: ContentSection = {
            id: `new-section-${Date.now()}`,
            title: 'Новый раздел',
            order: roadmap.length,
            lessons: []
        };
        setRoadmap([...roadmap, newSection]);
    };

    const handleAddLesson = (sectionIndex: number) => {
        const updatedRoadmap = [...roadmap];
        const newLesson: Lesson = {
            id: `new-lesson-${Date.now()}`,
            title: 'Новое занятие',
            status: 'DRAFT',
            order: updatedRoadmap[sectionIndex].lessons.length
        };
        updatedRoadmap[sectionIndex].lessons.push(newLesson);
        setRoadmap(updatedRoadmap);
    };

    const handleRemoveSection = (sectionIndex: number) => {
        const updatedRoadmap = roadmap.filter((_, idx) => idx !== sectionIndex);
        setRoadmap(updatedRoadmap);
    };

    const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
        const updatedRoadmap = [...roadmap];
        updatedRoadmap[sectionIndex].lessons = updatedRoadmap[sectionIndex].lessons.filter(
            (_, idx) => idx !== lessonIndex
        );
        setRoadmap(updatedRoadmap);
    };

    const startEditing = (sectionIndex: number, lessonIndex: number | null = null) => {
        setIsEditing({ section: sectionIndex, lesson: lessonIndex });
    };

    const stopEditing = () => {
        setIsEditing({ section: null, lesson: null });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="mr-4 p-2 rounded-full hover:bg-gray-100"
                    title="Назад"
                >
                    <FiArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold">
                    {goals?.find(g => g.id === goalId)?.subject || 'Редактор плана обучения'}
                </h1>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Генерация...
                            </>
                        ) : 'Сгенерировать с ИИ'}
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading || roadmap.length === 0} 
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Сохранение...
                            </>
                        ) : 'Сохранить план'}
                    </button>
                </div>
            </div>

            {/* Feedback Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                        Пожелания для ИИ
                    </label>
                    {!isEditingFeedback && feedback && (
                        <button 
                            onClick={() => setIsEditingFeedback(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                            <FiEdit2 className="mr-1" size={14} /> Редактировать
                        </button>
                    )}
                </div>
                
                {isEditingFeedback || !feedback ? (
                    <div>
                        <textarea
                            id="feedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Например: 'Сделай первый раздел короче' или 'Добавь тему про проценты'"
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button
                                onClick={() => {
                                    setFeedback('');
                                    setIsEditingFeedback(false);
                                }}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => setIsEditingFeedback(false)}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-2 bg-white rounded border border-gray-200">
                        <p className="text-gray-800">{feedback}</p>
                    </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                    Опишите, что вы хотите изменить, и снова нажмите "Сгенерировать с ИИ", чтобы улучшить текущий план.
                </p>
            </div>

            {roadmap.length === 0 && !isGenerating && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">План обучения пуст</p>
                    <button
                        onClick={handleGenerate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Сгенерировать с ИИ
                    </button>
                    <p className="mt-2 text-sm text-gray-500">или</p>
                    <button
                        onClick={handleAddSection}
                        className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                        Создать раздел вручную
                    </button>
                </div>
            )}

            {isGenerating && (
                <div className="text-center py-12">
                    <Spinner size="lg" />
                    <p className="mt-2 text-gray-600">Генерируем план обучения...</p>
                </div>
            )}

            <div className="space-y-6">
                {roadmap.map((section, sectionIndex) => (
                    <div key={section.id} className="p-6 bg-white rounded-lg shadow mb-6">
                        <div className="flex justify-between items-center mb-4">
                            {isEditing.section === sectionIndex ? (
                                <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => handleTitleChange('section', e.target.value, sectionIndex)}
                                    onBlur={stopEditing}
                                    onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                                    autoFocus
                                    className="text-xl font-semibold p-1 border-b-2 border-blue-300 w-full focus:outline-none focus:border-blue-500"
                                />
                            ) : (
                                <h2 
                                    className="text-xl font-semibold cursor-text"
                                    onClick={() => startEditing(sectionIndex)}
                                >
                                    {section.title}
                                </h2>
                            )}
                            <button
                                onClick={() => handleRemoveSection(sectionIndex)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Удалить раздел"
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                        
                        <ul className="mt-4 space-y-2">
                            {section.lessons.map((lesson, lessonIndex) => (
                                <li 
                                    key={lesson.id} 
                                    className="group flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                                >
                                    <div className="flex items-center space-x-2 flex-1">
                                        <LessonStatusIndicator status={lesson.status} />
                                        {isEditing.lesson === lessonIndex ? (
                                            <input
                                                type="text"
                                                value={lesson.title}
                                                onChange={(e) => handleTitleChange('lesson', e.target.value, sectionIndex, lessonIndex)}
                                                onBlur={stopEditing}
                                                onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                                                autoFocus
                                                className="p-1 border-b-2 border-blue-300 w-full focus:outline-none focus:border-blue-500"
                                            />
                                        ) : (
                                            <span 
                                                className="cursor-text flex-1"
                                                onClick={() => startEditing(sectionIndex, lessonIndex)}
                                            >
                                                {lesson.title}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex space-x-1">
                                        <button
                                            className="text-blue-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100"
                                            onClick={() => startEditing(sectionIndex, lessonIndex)}
                                            title="Редактировать"
                                        >
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveLesson(sectionIndex, lessonIndex);
                                            }}
                                            className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100"
                                            title="Удалить занятие"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                            <li>
                                <button
                                    onClick={() => handleAddLesson(sectionIndex)}
                                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2 p-2"
                                >
                                    <FiPlus size={16} className="mr-1" />
                                    Добавить занятие
                                </button>
                            </li>
                        </ul>
                    </div>
                ))}

                <div className="flex justify-between mt-6">
                    <button
                        onClick={handleAddSection}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                        disabled={isGenerating}
                    >
                        <FiPlus size={16} className="mr-1" />
                        Добавить раздел
                    </button>
                    {roadmap.length > 0 && (
                        <div className="space-x-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                            >
                                {isGenerating ? (
                                    <>
                                        <Spinner size="sm" className="mr-2" />
                                        Генерация...
                                    </>
                                ) : 'Обновить с ИИ'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoadmapEditorPage;
