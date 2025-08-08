import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLoginMutation } from '@/features/auth/authApi';
import { toast } from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from '@/features/auth/authSlice';
import { useTranslation } from 'react-i18next';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      toast.success(t('auth.loginSuccess'));
      const targetPath = user.role.toLowerCase() === 'teacher' ? '/teacher' : '/student';
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      // Call the API and let the useEffect handle navigation
      await login(data).unwrap();
    } catch (error: unknown) {
      let errorMessage = t('auth.loginFailedDefault');

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
            {t('login.title')}
          </h2>
          <p className="mt-2 text-sm text-soft">
            {t('login.or')}{' '}
            <Link
              to="/register"
              className="font-medium brand-text hover:opacity-90"
            >
              {t('login.createAccount')}
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
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                {t('login.email')}
              </label>
              <input
                id="email-address"
                type="email"
                autoComplete="email"
                className={`input rounded-b-none ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                placeholder={t('login.email')}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`input rounded-t-none ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-rose-100' : ''}`}
                placeholder={t('login.password')}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                {t('login.rememberMe')}
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-gray-600 hover:text-gray-500"
              >
                {t('login.forgotPassword')}
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary w-full ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
