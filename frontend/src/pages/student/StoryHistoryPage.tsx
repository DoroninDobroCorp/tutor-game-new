import { useParams, Link } from 'react-router-dom';
import { useGetStoryHistoryQuery } from '../../features/student/studentApi';
import Spinner from '../../components/common/Spinner';
import { FiArrowLeft } from 'react-icons/fi';

const StoryHistoryPage = () => {
    const { goalId } = useParams<{ goalId: string }>();
    const { data: storyChapters, isLoading, isError } = useGetStoryHistoryQuery(goalId!, {
        skip: !goalId,
    });

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    }

    if (isError) {
        return <div className="text-center p-8 text-red-500">Ошибка загрузки истории.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <Link to="/student" className="flex items-center text-gray-600 hover:text-gray-800">
                    <FiArrowLeft className="mr-2" />
                    Назад к панели управления
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">История вашего приключения</h1>

            <div className="space-y-12">
                {storyChapters && storyChapters.length > 0 ? (
                    storyChapters.map((chapter, index) => (
                        <div key={chapter.id} className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">
                                Глава {index + 1}: {chapter.lesson.title}
                            </h2>
                            
                            {chapter.teacherSnippetText && (
                                <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
                                    {chapter.teacherSnippetImageUrl && (
                                        <img
                                            src={chapter.teacherSnippetImageUrl}
                                            alt={`Illustration for chapter ${index + 1}`}
                                            className="w-full md:w-1/3 rounded-lg shadow-lg object-cover"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-700">Рассказчик:</p>
                                        <p className="mt-2 text-gray-700 italic leading-relaxed whitespace-pre-wrap">{chapter.teacherSnippetText}</p>
                                    </div>
                                </div>
                            )}

                            {chapter.studentSnippetText && (
                                <div className="flex justify-end mt-4">
                                    <div className="w-full md:w-5/6 bg-blue-50 p-4 rounded-lg shadow-inner border-l-4 border-blue-400">
                                        <p className="font-semibold text-blue-800">Ваш ответ:</p>
                                         {chapter.studentSnippetImageUrl && (
                                            <img
                                                src={chapter.studentSnippetImageUrl}
                                                alt="Your submitted image"
                                                className="mt-2 w-full md:w-1/2 rounded-lg shadow-md object-cover"
                                            />
                                        )}
                                        <p className="mt-2 text-gray-800 leading-relaxed whitespace-pre-wrap">{chapter.studentSnippetText}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg shadow">
                        <p className="text-gray-500">История этого приключения еще не началась.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryHistoryPage;
