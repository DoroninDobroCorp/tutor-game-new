import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGenerateRoadmapProposalMutation, useUpdateRoadmapMutation } from '../../features/teacher/teacherApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FiPlus, FiTrash2, FiArrowLeft, FiEdit2 } from 'react-icons/fi';

interface RoadmapSection { 
  sectionTitle: string; 
  lessons: string[]; 
}

export default function RoadmapEditorPage() {
    const { goalId } = useParams<{ goalId: string }>();
    const navigate = useNavigate();
    const [roadmap, setRoadmap] = useState<RoadmapSection[]>([]);
    const [isEditing, setIsEditing] = useState<{section: number | null, lesson: number | null}>({section: null, lesson: null});
    const [feedback, setFeedback] = useState('');
    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    
    const [generateProposal, { isLoading: isGenerating }] = useGenerateRoadmapProposalMutation();
    const [updateRoadmap, { isLoading: isSaving }] = useUpdateRoadmapMutation();

    const handleGenerate = async () => {
        if (!goalId) return;
        try {
            const proposal = await generateProposal({ 
                goalId, 
                ...(roadmap.length > 0 && { existingPlan: roadmap }),
                ...(feedback && { feedback })
            }).unwrap();
            setRoadmap(proposal);
            setFeedback('');
            toast.success('План обновлен!');
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Не удалось обновить план.');
        }
    };

    const handleSave = async () => {
        if (!goalId) return;
        try {
            await updateRoadmap({ goalId, roadmap }).unwrap();
            toast.success('План успешно сохранен!');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Ошибка сохранения.');
        }
    };

    const handleAddSection = () => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap.push({ sectionTitle: 'Новый раздел', lessons: ['Новое занятие'] });
        setRoadmap(newRoadmap);
    };

    const handleAddLesson = (sectionIndex: number) => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap[sectionIndex].lessons.push('Новое занятие');
        setRoadmap(newRoadmap);
    };

    const handleRemoveSection = (sectionIndex: number) => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap.splice(sectionIndex, 1);
        setRoadmap(newRoadmap);
    };

    const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap[sectionIndex].lessons.splice(lessonIndex, 1);
        setRoadmap(newRoadmap);
    };

    const handleSectionTitleChange = (sectionIndex: number, value: string) => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap[sectionIndex].sectionTitle = value;
        setRoadmap(newRoadmap);
    };

    const handleLessonChange = (sectionIndex: number, lessonIndex: number, value: string) => {
        const newRoadmap = JSON.parse(JSON.stringify(roadmap));
        newRoadmap[sectionIndex].lessons[lessonIndex] = value;
        setRoadmap(newRoadmap);
    };

    const startEditing = (sectionIndex: number, lessonIndex: number | null = null) => {
        setIsEditing({ section: sectionIndex, lesson: lessonIndex });
    };

    const stopEditing = () => {
        setIsEditing({ section: null, lesson: null });
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                    <FiArrowLeft className="mr-1" /> Назад
                </button>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
                    >
                        {isGenerating ? <Spinner size="sm" className="mr-2" /> : null}
                        {isGenerating ? 'Генерация...' : 'Сгенерировать с ИИ'}
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || roadmap.length === 0} 
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
                    >
                        {isSaving ? <Spinner size="sm" className="mr-2" /> : null}
                        {isSaving ? 'Сохранение...' : 'Сохранить план'}
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
                    <div key={sectionIndex} className="p-6 bg-white rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            {isEditing.section === sectionIndex ? (
                                <input
                                    type="text"
                                    value={section.sectionTitle}
                                    onChange={(e) => handleSectionTitleChange(sectionIndex, e.target.value)}
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
                                    {section.sectionTitle}
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
                        
                        <ul className="space-y-2 pl-4">
                            {section.lessons.map((lesson, lessonIndex) => (
                                <li key={lessonIndex} className="flex items-center group">
                                    <span className="mr-2 text-gray-500 w-6">{lessonIndex + 1}.</span>
                                    {isEditing.section === sectionIndex && isEditing.lesson === lessonIndex ? (
                                        <input
                                            type="text"
                                            value={lesson}
                                            onChange={(e) => handleLessonChange(sectionIndex, lessonIndex, e.target.value)}
                                            onBlur={stopEditing}
                                            onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                                            autoFocus
                                            className="p-1 border-b-2 border-blue-300 w-full focus:outline-none focus:border-blue-500"
                                        />
                                    ) : (
                                        <>
                                            <div className="flex-1 flex items-center">
                                                <span 
                                                    className="cursor-text flex-1"
                                                    onClick={() => startEditing(sectionIndex, lessonIndex)}
                                                >
                                                    {lesson}
                                                </span>
                                                <button
                                                    className="ml-2 text-blue-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100"
                                                    onClick={() => {
                                                        startEditing(sectionIndex, lessonIndex);
                                                    }}
                                                    title="Редактировать"
                                                >
                                                    <FiEdit2 size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveLesson(sectionIndex, lessonIndex)}
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"
                                                title="Удалить занятие"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </li>
                            ))}
                            <li>
                                <button
                                    onClick={() => handleAddLesson(sectionIndex)}
                                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2"
                                >
                                    <FiPlus size={16} className="mr-1" />
                                    Добавить занятие
                                </button>
                            </li>
                        </ul>
                    </div>
                ))}

                {roadmap.length > 0 && (
                    <div className="flex justify-between mt-6">
                        <button
                            onClick={handleAddSection}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                        >
                            <FiPlus className="mr-1" /> Добавить раздел
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Spinner size="sm" className="mr-2" />
                                    Сохранение...
                                </>
                            ) : 'Сохранить изменения'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
