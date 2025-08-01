import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetCompletedLessonsQuery } from '../../features/student/studentApi';
import Spinner from '../../components/common/Spinner';
import { FiArrowLeft, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import type { Lesson } from '../../types/models';

const CompletedLessonsPage = () => {
    const { goalId } = useParams<{ goalId: string }>();
    const { data: completedLessons, isLoading, isError } = useGetCompletedLessonsQuery(goalId!, {
        skip: !goalId,
    });
    const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

    const groupedBySection = useMemo(() => {
        if (!completedLessons) return {};
        return completedLessons.reduce((acc: Record<string, Lesson[]>, lesson) => {
            const sectionTitle = lesson.section?.title || 'Разное';
            if (!acc[sectionTitle]) {
                acc[sectionTitle] = [];
            }
            acc[sectionTitle].push(lesson);
            return acc;
        }, {});
    }, [completedLessons]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    }

    if (isError) {
        return <div className="text-center p-8 text-red-500">Ошибка загрузки пройденных уроков.</div>;
    }

    const sections = Object.keys(groupedBySection).sort((a, b) => {
        const orderA = groupedBySection[a][0]?.section?.order || 0;
        const orderB = groupedBySection[b][0]?.section?.order || 0;
        return orderA - orderB;
    });

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <Link to="/student/stories" className="flex items-center text-gray-600 hover:text-gray-800">
                    <FiArrowLeft className="mr-2" />
                    Назад к архиву
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">Пройденные уроки</h1>

            <div className="mt-6 space-y-6">
                {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
                
                {sections.length > 0 ? (
                    sections.map(sectionTitle => (
                        <div key={sectionTitle} className="bg-white rounded-lg shadow p-4">
                            <h2 className="text-xl font-semibold text-gray-700 mb-3">{sectionTitle}</h2>
                            <div className="space-y-2">
                                {groupedBySection[sectionTitle].map(compLesson => (
                                    <div key={compLesson.id} className="bg-gray-50 rounded-lg border border-gray-200">
                                        <button onClick={() => setExpandedLessonId(prev => prev === compLesson.id ? null : compLesson.id)} className="w-full flex justify-between items-center text-left p-3">
                                            <span className="font-medium text-gray-800">{compLesson.title}</span>
                                            {expandedLessonId === compLesson.id ? <FiChevronUp /> : <FiChevronDown />}
                                        </button>
                                        {expandedLessonId === compLesson.id && (
                                            <div className="px-3 pb-3 border-t border-gray-200">
                                                {(compLesson.content?.blocks || []).map((block, index) => {
                                                    const log = compLesson.performanceLogs?.find(l => l.blockIndex === index);
                                                    return (
                                                        <div key={index} className="py-3 border-b last:border-b-0">
                                                            <div className={`p-3 border-l-4 rounded-r-md ${block.type === 'theory' ? 'border-blue-400 bg-blue-50' : 'border-purple-400 bg-purple-50'}`}>
                                                                <h4 className="font-semibold capitalize text-gray-700">{block.type === 'theory' ? "Теория" : "Практическое задание"}</h4>
                                                                <p className="mt-1 text-gray-600" dangerouslySetInnerHTML={{ __html: block.content }} />
                                                            </div>
                                                            {block.type === 'practice' && (
                                                                <div className="mt-2 pl-4">
                                                                    <p className="text-sm font-semibold text-gray-800">Ваш ответ:</p>
                                                                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm text-gray-700 italic">
                                                                        {log ? log.answer : 'Ответ не был записан'}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 mt-4">Пройденных уроков по этому приключению пока нет.</p>
                )}
            </div>
        </div>
    );
};

export default CompletedLessonsPage;
