// Импортируем тип Lesson из центрального файла goalApi.ts
import { Lesson } from '../../../types/models';
import { FiBookOpen } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

export const LessonStatusIndicator = ({ lesson }: { lesson: Lesson }) => {
    const { t } = useTranslation();
    const status = lesson.storyChapter?.teacherSnippetStatus === 'APPROVED' ? 'APPROVED' : lesson.status;
    const statusMap = {
        DRAFT: { color: 'bg-gray-400', title: t('lessonStatusIndicator.draft') },
        PENDING_APPROVAL: { color: 'bg-yellow-400', title: t('lessonStatusIndicator.pendingApproval') },
        APPROVED: { color: 'bg-green-500', title: t('lessonStatusIndicator.approved') },
        COMPLETED: { color: 'bg-blue-500', title: t('lessonStatusIndicator.completed') },
    };
    const { color, title } = statusMap[status as keyof typeof statusMap] || statusMap.DRAFT;

    return (
        <div className="flex items-center space-x-1.5" title={title}>
            <span className={`w-3 h-3 rounded-full inline-block ${color}`}></span>
            {lesson.storyChapter?.teacherSnippetStatus === 'APPROVED' && 
                <FiBookOpen size={12} className="text-purple-600" title={t('lessonStatusIndicator.hasApprovedStory')} />}
        </div>
    );
};
