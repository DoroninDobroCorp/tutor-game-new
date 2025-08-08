import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCreateLearningGoalMutation } from '../../features/goal/goalApi';
import { useGetConnectedStudentsQuery } from '../../features/teacher/teacherApi';
import Spinner from '../../components/common/Spinner';
import { useTranslation } from 'react-i18next';

interface CreateGoalFormData {
    studentId: string;
    subject: string;
    setting: string;
    studentAge: number;
    language: string;
    illustrationStyle: string;
}

export default function CreateGoalPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<CreateGoalFormData>();
    const { data: students, isLoading: isLoadingStudents } = useGetConnectedStudentsQuery();
    const [createGoal, { isLoading: isCreating }] = useCreateLearningGoalMutation();

    const onSubmit = async (data: CreateGoalFormData) => {
        try {
            const result = await createGoal(data).unwrap();
            toast.success(t('createGoal.success'));
            navigate(`/teacher/goals/${result.id}/edit`);
        } catch (error) {
            toast.error(t('createGoal.error'));
        }
    };

    if (isLoadingStudents) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-6">{t('createGoal.title')}</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">{t('createGoal.student')}</label>
                    <select 
                        id="studentId" 
                        {...register('studentId', { required: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        disabled={!students?.length}
                    >
                        <option value="">{t('createGoal.selectStudent')}</option>
                        {students?.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName || ''} ({student.email})
                            </option>
                        ))}
                    </select>
                    {errors.studentId && <p className="mt-1 text-sm text-red-600">{t('createGoal.selectStudentError')}</p>}
                </div>
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">{t('createGoal.subject')}</label>
                    <input 
                        type="text" 
                        id="subject" 
                        {...register('subject', { required: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
                        placeholder={t('createGoal.subjectPlaceholder')}
                    />
                    {errors.subject && <p className="mt-1 text-sm text-red-600">{t('createGoal.subjectError')}</p>}
                </div>
                <div>
                    <label htmlFor="setting" className="block text-sm font-medium text-gray-700">{t('createGoal.setting')}</label>
                    <input 
                        type="text" 
                        id="setting" 
                        {...register('setting', { required: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
                        placeholder={t('createGoal.settingPlaceholder')}
                    />
                    {errors.setting && <p className="mt-1 text-sm text-red-600">{t('createGoal.settingError')}</p>}
                </div>
                <div>
                    <label htmlFor="studentAge" className="block text-sm font-medium text-gray-700">{t('createGoal.studentAge')}</label>
                    <input 
                        type="number" 
                        id="studentAge" 
                        {...register('studentAge', { required: true, min: 1, max: 18 })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
                        placeholder="8"
                    />
                    {errors.studentAge && <p className="mt-1 text-sm text-red-600">{t('createGoal.studentAgeError')}</p>}
                </div>
                <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">{t('createGoal.language')}</label>
                    <select
                        id="language"
                        {...register('language', { required: true })}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        defaultValue="Russian"
                    >
                        <option value="Russian">{t('createGoal.russian')}</option>
                        <option value="English">{t('createGoal.english')}</option>
                    </select>
                    {errors.language && <p className="mt-1 text-sm text-red-600">{t('createGoal.languageError')}</p>}
                </div>
                <div>
                    <label htmlFor="illustrationStyle" className="block text-sm font-medium text-gray-700">{t('createGoal.illustrationStyle')}</label>
                    <select
                        id="illustrationStyle"
                        {...register('illustrationStyle', { required: true })}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        defaultValue="ILLUSTRATION"
                    >
                        <option value="ILLUSTRATION">{t('createGoal.illustrationStandard')}</option>
                        <option value="ANIME">{t('createGoal.anime')}</option>
                    </select>
                    {errors.illustrationStyle && <p className="mt-1 text-sm text-red-600">{t('createGoal.illustrationStyleError')}</p>}
                </div>
                <button 
                    type="submit" 
                    disabled={isCreating || !students?.length}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreating ? t('createGoal.creating') : t('createGoal.createAndGoToPlan')}
                </button>
                {!students?.length && (
                    <p className="text-sm text-yellow-600 text-center">
                        {t('createGoal.noStudents')}
                    </p>
                )}
            </form>
        </div>
    );
}
