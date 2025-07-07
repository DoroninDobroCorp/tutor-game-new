import { useForm, SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useGetConnectedStudentsQuery, useCreateLearningGoalMutation } from '../../features/teacher/teacherApi';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

interface IFormInput { 
    studentId: string; 
    subject: string; 
    setting: string; 
    studentAge: number; 
    language: string;
}

export default function CreateGoalPage() {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<IFormInput>();
    const { data: students, isLoading: isLoadingStudents } = useGetConnectedStudentsQuery();
    const [createLearningGoal, { isLoading: isCreating }] = useCreateLearningGoalMutation();

    const onSubmit: SubmitHandler<IFormInput> = async (data) => {
        try {
            const result = await createLearningGoal(data).unwrap();
            toast.success('Учебная цель создана! Теперь создайте план.');
            navigate(`/teacher/goals/${result.id}/edit`);
        } catch (error) {
            toast.error('Не удалось создать цель.');
        }
    };

    if (isLoadingStudents) return <Spinner />;

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-6">Создать новую учебную цель</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">Студент</label>
                    <select 
                        id="studentId" 
                        {...register('studentId', { required: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        disabled={!students?.length}
                    >
                        <option value="">Выберите студента</option>
                        {students?.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName || ''} ({student.email})
                            </option>
                        ))}
                    </select>
                    {errors.studentId && <p className="mt-1 text-sm text-red-600">Выберите студента</p>}
                </div>
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Предмет / Цель</label>
                    <input 
                        type="text" 
                        id="subject" 
                        {...register('subject', { required: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
                        placeholder="Например, Математика, 3 класс"
                    />
                    {errors.subject && <p className="mt-1 text-sm text-red-600">Введите предмет или цель</p>}
                </div>
                <div>
                    <label htmlFor="setting" className="block text-sm font-medium text-gray-700">Сеттинг истории</label>
                    <input 
                        type="text" 
                        id="setting" 
                        {...register('setting', { required: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
                        placeholder="Космос, Динозавры, Школа магии"
                    />
                    {errors.setting && <p className="mt-1 text-sm text-red-600">Введите сеттинг</p>}
                </div>
                <div>
                    <label htmlFor="studentAge" className="block text-sm font-medium text-gray-700">Возраст</label>
                    <input 
                        type="number" 
                        id="studentAge" 
                        {...register('studentAge', { required: true, min: 4, max: 18, valueAsNumber: true })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                    {errors.studentAge && (
                        <p className="mt-1 text-sm text-red-600">
                            Возраст должен быть от 4 до 18 лет
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">Язык обучения</label>
                    <select
                        id="language"
                        {...register('language', { required: true })}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        defaultValue="Russian"
                    >
                        <option value="Russian">Русский</option>
                        <option value="English">English</option>
                    </select>
                    {errors.language && <p className="mt-1 text-sm text-red-600">Выберите язык обучения</p>}
                </div>
                <button 
                    type="submit" 
                    disabled={isCreating || !students?.length}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreating ? 'Создание...' : 'Создать и перейти к плану'}
                </button>
                {!students?.length && (
                    <p className="text-sm text-yellow-600 text-center">
                        У вас пока нет подключенных студентов. Сначала добавьте студентов в разделе "Мои студенты".
                    </p>
                )}
            </form>
        </div>
    );
}
