import { LearningGoal } from '../../../features/teacher/teacherApi';
import Spinner from '../../../components/common/Spinner';

interface PerformanceLog {
    id: string;
    answer: string;
    question: string;
    createdAt: string;
    lesson: {
        title: string;
    };
}

interface StudentLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal: LearningGoal;
    logs?: PerformanceLog[];
    isLoading?: boolean;
    onLoadLogs: () => void;
}

export const StudentLogsModal = ({ 
    isOpen, 
    onClose, 
    goal, 
    logs = [], 
    isLoading = false, 
    onLoadLogs 
}: StudentLogsModalProps) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" 
            onClick={onClose}
        >
            <div 
                className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" 
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4">
                    Ответы ученика: {goal.student?.firstName} {goal.student?.lastName}
                </h2>
                
                <div className="overflow-y-auto flex-grow pr-4">
                    {isLoading ? (
                        <div className="flex justify-center">
                            <Spinner />
                        </div>
                    ) : logs.length > 0 ? (
                        <ul className="space-y-4">
                            {logs.map((log) => (
                                <li key={log.id} className="p-3 bg-gray-50 rounded-md border">
                                    <p className="text-xs text-gray-500">
                                        Урок: {log.lesson?.title || 'Без названия'}
                                    </p>
                                    <p className="font-semibold mt-1">Вопрос:</p>
                                    <p className="italic text-gray-700">"{log.question}"</p>
                                    <p className="font-semibold mt-2">Ответ ученика:</p>
                                    <p className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                                        "{log.answer}"
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center py-4">
                            Ответов от ученика по этому плану пока нет.
                        </p>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};
