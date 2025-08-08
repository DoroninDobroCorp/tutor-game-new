// Файл: tutor-game/frontend/src/pages/teacher/RoadmapEditorPage.tsx
// Версия: Полная, с интеграцией просмотра ответов студента и чата с ИИ

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useLazyGetPerformanceLogsQuery } from '../../features/teacher/teacherApi';
import { 
    useGetLearningGoalByIdQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    useLazyGetGoalStoryHistoryQuery
} from '../../features/goal/goalApi';
import { type ContentSection, type Lesson } from '../../types/models';

import { CharacterEditor } from './components/CharacterEditor';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FiArrowLeft, FiPlus, FiEye, FiSend, FiSave, FiBookOpen } from 'react-icons/fi';
import { RoadmapSection } from './components/RoadmapSection';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';

// Тип для логов успеваемости
interface PerformanceLog {
    id: string;
    answer: string;
    question: string;
    createdAt: string;
    lesson: { title: string };
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface RoadmapEditorContext {
    setEditingLesson: (lesson: Lesson | null) => void;
}

const RoadmapEditorPage = () => {
    const { t } = useTranslation();
    const { goalId } = useParams<{ goalId: string }>();
    // const navigate = useNavigate();
    const { setEditingLesson } = useOutletContext<RoadmapEditorContext>();

    const { data: currentGoal, isLoading, error } = useGetLearningGoalByIdQuery(goalId!, {
        skip: !goalId,
        refetchOnMountOrArgChange: true,
    });

    const [roadmap, setRoadmap] = useState<ContentSection[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userMessage, setUserMessage] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState<{section: number | null, lesson: number | null}>({section: null, lesson: null});
    const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    
    const [getLogs, { data: performanceLogs, isLoading: isLoadingLogs }] = useLazyGetPerformanceLogsQuery();
    const [getStoryHistory, { data: storyHistory, isLoading: isLoadingStory }] = useLazyGetGoalStoryHistoryQuery();
    const [generateRoadmap, { isLoading: isGenerating }] = useGenerateRoadmapProposalMutation();
    const [updateRoadmap, { isLoading: isSaving }] = useUpdateRoadmapMutation();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userMessage.trim()) {
                formRef.current?.requestSubmit();
            }
        }
    };
    useEffect(() => {
        if (currentGoal?.sections) {
            setRoadmap(JSON.parse(JSON.stringify(currentGoal.sections)));
        }
    }, [currentGoal]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

    if (isLoading || !currentGoal) return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    if (error) return <div className="text-center text-red-500 p-10">{t('roadmapEditor.loadingError')}</div>;
    
    const handleGeneratePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSend = userMessage.trim() || t('roadmapEditor.generateInitialPlan');
        const newHistory = [...chatHistory, { role: 'user' as const, content: messageToSend }];
        setChatHistory(newHistory);
        setUserMessage('');
    
        try {
            const result = await generateRoadmap({
                goalId: goalId!,
                chatHistory: newHistory,
            }).unwrap();
    
            const aiResponse = { role: 'assistant' as const, content: result.chatResponse };
            
            const newSections = result.roadmap.map((s: any, sectionIndex: number) => ({
                id: `new-s-${Date.now()}-${sectionIndex}`,
                title: s.sectionTitle,
                order: sectionIndex,
                lessons: s.lessons.map((l: string, lessonIndex: number) => ({
                    id: `new-l-${Date.now()}-${sectionIndex}-${lessonIndex}`,
                    title: l,
                    status: 'DRAFT' as const,
                    order: lessonIndex,
                    content: null,
                    storyChapter: null
                }))
            }));
    
            setRoadmap(newSections);
            setChatHistory(prev => [...prev, aiResponse]);
            toast.success(t('roadmapEditor.planUpdated'));
        } catch (err) {
            toast.error(t('roadmapEditor.generateError'));
            setChatHistory(chatHistory); // Revert on error
        }
    };

    const handleSave = async () => {
        if (!goalId) return;
        const roadmapWithOrder = roadmap.map((section, sectionIndex) => ({
            ...section,
            order: sectionIndex,
            lessons: section.lessons.map((lesson, lessonIndex) => ({
                ...lesson,
                order: lessonIndex,
            }))
        }));
        
        toast.promise(
            updateRoadmap({ goalId, roadmap: roadmapWithOrder }).unwrap(),
            {
                loading: t('roadmapEditor.savingPlan'),
                success: t('roadmapEditor.planSaved'),
                error: t('roadmapEditor.saveError'),
            }
        );
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, type } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

        let newRoadmap = JSON.parse(JSON.stringify(roadmap));

        if (type === 'SECTIONS') {
            const [reorderedItem] = newRoadmap.splice(source.index, 1);
            newRoadmap.splice(destination.index, 0, reorderedItem);
        } else if (type === 'LESSONS') {
            const sourceSectionIndex = parseInt(source.droppableId.replace('lessons-', ''), 10);
            const destSectionIndex = parseInt(destination.droppableId.replace('lessons-', ''), 10);
            const [movedLesson] = newRoadmap[sourceSectionIndex].lessons.splice(source.index, 1);
            newRoadmap[destSectionIndex].lessons.splice(destination.index, 0, movedLesson);
        } else {
            return;
        }

        setRoadmap(newRoadmap);
        handleSave(); // Auto-save on reorder
    };
    
    const handleAddSection = () => setRoadmap([...roadmap, { id: `new-section-${Date.now()}`, title: t('roadmapEditor.newSection', { number: roadmap.length + 1 }), order: roadmap.length, lessons: [] }]);
    const handleAddLesson = (sectionIndex: number) => {
        const newRoadmap = [...roadmap];
        const section = newRoadmap[sectionIndex];
        section.lessons.push({ id: `new-lesson-${Date.now()}`, title: t('roadmapEditor.newLesson'), type: 'THEORY', status: 'DRAFT', order: section.lessons.length, content: null, storyChapter: null });
        setRoadmap(newRoadmap);
    };
    const handleRemoveSection = (sectionIndex: number) => setRoadmap(roadmap.filter((_, i) => i !== sectionIndex));
    const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
        const newRoadmap = [...roadmap];
        newRoadmap[sectionIndex].lessons.splice(lessonIndex, 1);
        setRoadmap(newRoadmap);
    };
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

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <Link to="/teacher/goals" className="flex items-center text-gray-600 hover:text-gray-900"><FiArrowLeft className="mr-2" /> {t('roadmapEditor.back')}</Link>
                <h1 className="text-2xl font-bold text-gray-900 text-center">{currentGoal.subject}</h1>
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><FiSave />{t('roadmapEditor.save')}</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h2 className="text-xl font-semibold mb-4">{t('roadmapEditor.storyCharacter')}</h2>
                      <CharacterEditor goal={currentGoal} />
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-xl font-semibold">{t('roadmapEditor.lessonPlan')}</h2>
                             <div className="flex gap-2">
                                <button onClick={async () => { if (!goalId) return; await getLogs({ studentId: currentGoal.student.id, goalId }).unwrap(); setShowLogsModal(true); }} className="text-sm flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"><FiEye /> {t('roadmapEditor.viewAnswers')}</button>
                                <button onClick={async () => { if (!goalId) return; getStoryHistory(goalId); setShowStoryModal(true);}} className="text-sm flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"><FiBookOpen /> {t('roadmapEditor.viewStory')}</button>
                            </div>
                        </div>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="all-sections" direction="vertical" type="SECTIONS">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                        {roadmap.map((section, sectionIndex) => (
                                            <RoadmapSection key={section.id} section={section} sectionIndex={sectionIndex} onRemoveSection={handleRemoveSection} onAddLesson={handleAddLesson} onRemoveLesson={handleRemoveLesson} onEditLesson={(lesson) => setEditingLesson(lesson)} onTitleChange={handleLessonTitleChange} onSectionTitleChange={handleSectionTitleChange} editingTitle={isEditingTitle} editingSectionIndex={editingSectionIndex} setEditingSectionIndex={setEditingSectionIndex} startEditing={(si, li) => setIsEditingTitle({section: si, lesson: li})} stopEditing={() => setIsEditingTitle({section: null, lesson: null})} />
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        <div className="mt-8">
                            <button onClick={handleAddSection} className="btn-secondary flex items-center"><FiPlus className="mr-2" /> {t('roadmapEditor.addSection')}</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 flex flex-col h-[calc(100vh-12rem)]">
                    <h2 className="text-xl font-semibold mb-4 text-center">{t('roadmapEditor.aiDialog')}</h2>
                    <div ref={chatContainerRef} className="flex-grow bg-gray-50 rounded-lg p-3 overflow-y-auto space-y-3 mb-4">
                        {chatHistory.length === 0 && <div className="text-center text-gray-400 h-full flex items-center justify-center">{t('roadmapEditor.startDialog')}</div>}
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`p-3 rounded-lg max-w-[90%] text-sm ${msg.role === 'user' ? 'bg-indigo-100 self-end ml-auto' : 'bg-gray-200 self-start mr-auto'}`}>
                              <p className="font-bold capitalize mb-1">{msg.role}</p>
                              <p>{msg.content}</p>
                          </div>
                        ))}
                        {isGenerating && <div className="p-3 rounded-lg bg-gray-200 self-start mr-auto"><Spinner size="sm" /></div>}
                    </div>
                    <form ref={formRef} onSubmit={handleGeneratePlan} className="flex gap-2">
                        <textarea rows={2} value={userMessage} onChange={e => setUserMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('roadmapEditor.askAiToChangePlan')} className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        <button type="submit" disabled={isGenerating || !userMessage.trim()} className="btn-primary p-3 disabled:opacity-50"><FiSend /></button>
                    </form>                </div>
            </div>
            
            {showLogsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={() => setShowLogsModal(false)}>
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">{t('roadmapEditor.studentAnswers', { name: currentGoal?.student?.firstName || t('roadmapEditor.student') })}</h2>
                        <div className="overflow-y-auto flex-grow pr-4">
                            {isLoadingLogs ? <Spinner /> : performanceLogs?.length ? (
                                <div className="space-y-4">
                                    {(performanceLogs as PerformanceLog[]).map(log => (
                                        <div key={log.id} className="p-3 bg-gray-50 rounded-md border">
                                            <p className="font-semibold mt-1">{t('roadmapEditor.question')}: <span className="italic text-gray-700 font-normal">"{log.question}"</span></p>
                                            <p className="font-semibold mt-2">{t('roadmapEditor.studentAnswer')}: <span className="p-2 bg-blue-50 border border-blue-200 rounded-md">"{log.answer}"</span></p>
                                        </div>
                                    ))}
                                </div>
                            ) : (<p className="text-gray-500">{t('roadmapEditor.noStudentAnswers')}</p>)}
                        </div>
                    </div>
                </div>
            )}

            {showStoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={() => setShowStoryModal(false)}>
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">{t('roadmapEditor.adventureStory')}</h2>
                        <div className="overflow-y-auto flex-grow pr-4">
                            {isLoadingStory ? <Spinner /> : storyHistory?.length ? (
                                <div className="space-y-12">
                                    {storyHistory.map((chapter, index) => (
                                        <div key={chapter.id} className="bg-gray-50 rounded-lg p-6 border">
                                            <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-indigo-200">
                                                {t('roadmapEditor.chapter', { number: index + 1, title: chapter.lesson.title })}
                                            </h3>
                                            
                                            {chapter.teacherSnippetText && (
                                                <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
                                                    {chapter.teacherSnippetImageUrl && (
                                                        <img
                                                            src={chapter.teacherSnippetImageUrl}
                                                            alt={t('roadmapEditor.chapterIllustration', { number: index + 1 })}
                                                            className="w-full md:w-1/3 rounded-lg shadow-lg object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-700">{t('roadmapEditor.narrator')}:</p>
                                                        <p className="mt-2 text-gray-700 italic leading-relaxed whitespace-pre-wrap">{chapter.teacherSnippetText}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {chapter.studentSnippetText && (
                                                <div className="flex justify-end mt-4">
                                                    <div className="w-full md:w-5/6 bg-blue-50 p-4 rounded-lg shadow-inner border-l-4 border-blue-400">
                                                        <p className="font-semibold text-blue-800">{t('roadmapEditor.studentAnswer')}:</p>
                                                         {chapter.studentSnippetImageUrl && (
                                                            <img
                                                                src={chapter.studentSnippetImageUrl}
                                                                alt={t('roadmapEditor.studentSubmittedImage')}
                                                                className="mt-2 w-full md:w-1/2 rounded-lg shadow-md object-cover"
                                                            />
                                                        )}
                                                        <p className="mt-2 text-gray-800 leading-relaxed whitespace-pre-wrap">{chapter.studentSnippetText}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (<p className="text-gray-500">{t('roadmapEditor.noStoryYet')}</p>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoadmapEditorPage;
