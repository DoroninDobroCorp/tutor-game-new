import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegisterMutation } from '@/features/auth/authApi';
import { toast } from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from '@/features/auth/authSlice';
import { useTranslation } from 'react-i18next';


const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'teacher']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
    },
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      toast.success(t('auth.registerSuccess'));
      const targetPath = user.role.toLowerCase() === 'teacher' ? '/teacher' : '/student';
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (formData: RegisterFormData) => {
    try {
      setError('');

      const registrationData = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      await registerUser(registrationData).unwrap();

    } catch (error: unknown) {
      console.error('Registration error:', error);
      let errorMessage = t('auth.registerFailedDefault');
      
      if (error && typeof error === 'object') {
        if ('status' in error && 'data' in error) {
          const data = error.data as { message?: string };
          errorMessage = data?.message || errorMessage;
        } else if ('message' in error) {
          errorMessage = String(error.message);
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-heading font-extrabold text-gray-900">
            {t('register.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('register.alreadyMember')}{' '}
            <Link
              to="/login"
              className="font-medium text-gray-600 hover:text-gray-500"
            >
              {t('register.signIn')}
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6 card" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="first-name" className="sr-only">
                  First name
                </label>
                <input
                  id="first-name"
                  type="text"
                  autoComplete="given-name"
                  className={`input ${errors.firstName ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                  placeholder={t('register.firstName')}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="last-name" className="sr-only">
                  Last name
                </label>
                <input
                  id="last-name"
                  type="text"
                  autoComplete="family-name"
                  className={`input ${errors.lastName ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                  placeholder={t('register.lastName')}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                placeholder={t('register.email')}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                placeholder={t('register.password')}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.confirmPassword ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                placeholder="Confirm password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">{t('register.iAmA')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  id="student-role"
                  type="radio"
                  value="student"
                  className="hidden peer"
                  {...register('role')}
                />
                <label
                  htmlFor="student-role"
                  className={`block w-full px-4 py-2 text-sm font-medium text-center rounded-xl border ${
                    watch('role') === 'student'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'border-gray-300 text-gray-700 hover:bg-white/70'
                  } cursor-pointer transition`}
                >
                  {t('register.student')}
                </label>
              </div>
              <div>
                <input
                  id="teacher-role"
                  type="radio"
                  value="teacher"
                  className="hidden peer"
                  {...register('role')}
                />
                <label
                  htmlFor="teacher-role"
                  className={`block w-full px-4 py-2 text-sm font-medium text-center rounded-xl border ${
                    watch('role') === 'teacher'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'border-gray-300 text-gray-700 hover:bg-white/70'
                  } cursor-pointer transition`}
                >
                  {t('register.teacher')}
                </label>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary w-full ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? t('register.creatingAccount') : t('register.createAccount')}
            </button>
          </div>

          <div className="text-sm text-center">
            <p className="text-gray-600">
              {t('register.tosNote.prefix')}{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                {t('register.tosNote.terms')}
              </a>{' '}
              {t('register.tosNote.and')}{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                {t('register.tosNote.privacy')}
              </a>
              .
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
