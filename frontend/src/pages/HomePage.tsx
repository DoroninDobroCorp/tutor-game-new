import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { BookOpenIcon, AcademicCapIcon, LightBulbIcon } from '@/components/icons';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <div className="">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-300 to-red-300 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center card">
             <h1 className="text-4xl font-heading font-extrabold tracking-tight text-gray-900 sm:text-6xl">
              {t('home.title')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t('home.subtitle')}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {isAuthenticated ? (
                <Link
                  to={user?.role === 'student' ? '/student' : '/teacher'}
                  className="btn-primary"
                >
                  {t('home.goToDashboard', { role: user?.role })}
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary"
                  >
                    {t('register.short')}
                  </Link>
                  <Link
                    to="/login"
                    className="btn-secondary text-sm"
                  >
                    {t('login.short')} <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-300 to-blue-300 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
      
      {/* Features section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="chip">{t('home.features.superTitle')}</h2>
            <p className="mt-4 text-3xl font-heading font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              {t('home.features.title')}
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t('home.features.subtitle')}
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {[{
                  name: t('home.features.list.0.name'),
                  description: t('home.features.list.0.description'),
                  icon: BookOpenIcon,
                },
                {
                  name: t('home.features.list.1.name'),
                  description: t('home.features.list.1.description'),
                  icon: AcademicCapIcon,
                },
                {
                  name: t('home.features.list.2.name'),
                  description: t('home.features.list.2.description'),
                  icon: LightBulbIcon,
                },
              ].map((feature) => (
                <div key={feature.name} className="relative pl-16 card">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-200">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      
      {/* CTA section */}
      <div className="">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-heading font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              {t('home.cta.title')}
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
              {t('home.cta.subtitle')}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="btn-primary"
              >
                {t('home.getStarted')}
              </Link>
              <Link to="/login" className="btn-secondary text-sm">
                {t('login.short')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
