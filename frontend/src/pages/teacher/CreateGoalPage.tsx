import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCreateLearningGoalMutation } from '../../features/goal/goalApi';
import { getErrorMessage } from '../../app/api/errorHelpers';
import { useGetConnectedStudentsQuery } from '../../features/teacher/teacherApi';
import Spinner from '../../components/common/Spinner';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { routeTeacherGoalEdit } from '../../app/routes';
import { useTranslation } from 'react-i18next';

interface CreateGoalFormData {
    studentId: string;
    subject: string;
    setting: string;
    studentAge: number;
    language: string;
    // Optional toggle: create diagnostic lesson as the first step
    createDiagnosticFirst?: boolean;
}

export default function CreateGoalPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<CreateGoalFormData>({
        defaultValues: {
            createDiagnosticFirst: false,
        }
    });
    const { data: students, isLoading: isLoadingStudents } = useGetConnectedStudentsQuery();
    const [createGoal, { isLoading: isCreating }] = useCreateLearningGoalMutation();

    const onSubmit = async (data: CreateGoalFormData) => {
        try {
            const result = await createGoal(data).unwrap();
            toast.success(t('createGoal.success'));
            navigate(routeTeacherGoalEdit(result.id));
        } catch (error) {
            toast.error(getErrorMessage(error, t('createGoal.error') as string));
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
                <Select
                    id="studentId"
                    label={t('createGoal.student') as string}
                    error={errors.studentId ? (t('createGoal.selectStudentError') as string) : undefined}
                    disabled={!students?.length}
                    {...register('studentId', { required: true })}
                >
                    <option value="">{t('createGoal.selectStudent')}</option>
                    {students?.map(student => (
                        <option key={student.id} value={student.id}>
                            {student.firstName} {student.lastName || ''} ({student.email})
                        </option>
                    ))}
                </Select>
                <Input
                    id="subject"
                    label={t('createGoal.subject') as string}
                    placeholder={t('createGoal.subjectPlaceholder') as string}
                    error={errors.subject ? (t('createGoal.subjectError') as string) : undefined}
                    {...register('subject', { required: true })}
                />
                <Input
                    id="setting"
                    label={t('createGoal.setting') as string}
                    placeholder={t('createGoal.settingPlaceholder') as string}
                    error={errors.setting ? (t('createGoal.settingError') as string) : undefined}
                    {...register('setting', { required: true })}
                />
                <Input
                    id="studentAge"
                    type="number"
                    label={t('createGoal.studentAge') as string}
                    placeholder="8"
                    error={errors.studentAge ? (t('createGoal.studentAgeError') as string) : undefined}
                    {...register('studentAge', { required: true, min: 1, max: 18 })}
                />
                <Select
                    id="language"
                    label={t('createGoal.language') as string}
                    error={errors.language ? (t('createGoal.languageError') as string) : undefined}
                    defaultValue="Russian"
                    {...register('language', { required: true })}
                >
                    <option value="Russian">{t('createGoal.russian')}</option>
                    <option value="English">{t('createGoal.english')}</option>
                </Select>

                {/* Optional toggle to start with a diagnostic lesson */}
                <div className="flex items-center gap-3 pt-2">
                    <input
                        id="createDiagnosticFirst"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        {...register('createDiagnosticFirst')}
                    />
                    <label htmlFor="createDiagnosticFirst" className="text-sm text-gray-700">
                        Начать с диагностического урока
                    </label>
                </div>

                <Button type="submit" disabled={isCreating || !students?.length} fullWidth>
                    {isCreating ? (t('createGoal.creating') as string) : (t('createGoal.createAndGoToPlan') as string)}
                </Button>
                {!students?.length && (
                    <p className="text-sm text-yellow-600 text-center">
                        {t('createGoal.noStudents')}
                    </p>
                )}
            </form>
        </div>
    );
}
