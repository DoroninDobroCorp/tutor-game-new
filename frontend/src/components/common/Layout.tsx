import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Fragment, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BookOpenIcon,
  HomeIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  ChevronDoubleLeftIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useLogoutMutation } from '../../features/auth/authApi';
import { useGetUnreadSummaryQuery } from '../../features/chat/chatApi';
import { logout } from '../../features/auth/authSlice';
import { selectTotalUnreadCount, setUnreadCounts } from '../../features/chat/chatSlice';
import type { Lesson } from '../../types/models';
import LessonEditorModal from '../../pages/teacher/LessonEditorModal';
import {
  routeHome,
  routeLogin,
  routeRegister,
  routeStudentRoot,
  routeStudentAdventure,
  routeStudentStories,
  routeStudentAchievements,
  routeStudentChat,
  routeTeacherRoot,
  routeTeacherGoals,
  routeTeacherStudents,
  routeTeacherAchievements,
  routeTeacherChat,
} from '../../app/routes';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  current: boolean;
  showBadge?: boolean;
}

function getStudentNavigation(t: (key: string) => string): NavigationItem[] {
  return [
    { name: t('studentNavigation.dashboard'), href: routeStudentRoot, icon: HomeIcon, current: false },
    { name: t('studentNavigation.adventure'), href: routeStudentAdventure, icon: RocketLaunchIcon, current: false },
    { name: t('studentNavigation.stories'), href: routeStudentStories, icon: BookOpenIcon, current: false },
    { name: t('studentNavigation.achievements'), href: routeStudentAchievements, icon: TrophyIcon, current: false },
    {
      name: t('studentNavigation.chat'),
      href: routeStudentChat,
      icon: ChatBubbleLeftEllipsisIcon,
      current: false,
      showBadge: true,
    },
  ];
}

function getTeacherNavigation(t: (key: string) => string): NavigationItem[] {
  return [
    { name: t('teacherNavigation.dashboard'), href: routeTeacherRoot, icon: HomeIcon, current: false },
    { name: t('teacherNavigation.goals'), href: routeTeacherGoals, icon: DocumentTextIcon, current: false },
    { name: t('teacherNavigation.students'), href: routeTeacherStudents, icon: UserGroupIcon, current: false },
    { name: t('teacherNavigation.achievements'), href: routeTeacherAchievements, icon: TrophyIcon, current: false },
    {
      name: t('teacherNavigation.chat'),
      href: routeTeacherChat,
      icon: ChatBubbleLeftEllipsisIcon,
      current: false,
      showBadge: true,
    },
  ];
}

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="btn-secondary text-sm px-3 py-1"
    >
      {i18n.language === 'ru' ? 'EN' : 'RU'}
    </button>
  );
};

const ThemeSwitcher = () => {
  const themes = [
    { id: 'default', label: 'Default' },
    { id: 'warm', label: 'Warm' },
    { id: 'mono', label: 'Mono' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'playful', label: 'Playful' },
    { id: 'vibrant', label: 'Vibrant' },
  ];

  const applyTheme = (themeId: string) => {
    const root = document.documentElement;
    if (themeId === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', themeId);
    }
    try {
      localStorage.setItem('mq_theme', themeId);
    } catch (_) {}
  };

  // init from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mq_theme');
      if (saved) applyTheme(saved);
    } catch (_) {}
  }, []);

  return (
    <div className="relative">
      <select
        aria-label="Theme"
        className="select text-sm pr-8"
        defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('mq_theme') || 'default') : 'default'}
        onChange={(e) => applyTheme(e.target.value)}
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </div>
  );
};

export default function Layout() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const totalUnreadCount = useAppSelector(selectTotalUnreadCount);
  const [logoutUser] = useLogoutMutation();
  const chatPath = user?.role === 'teacher' ? routeTeacherChat : routeStudentChat;

  // Use polling to periodically check for unread messages
  const { data: unreadData } = useGetUnreadSummaryQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30000, // Check every 30 seconds
    refetchOnMountOrArgChange: true,
  });

  // Update the unread counts when new data is received
  useEffect(() => {
    if (unreadData) {
      dispatch(setUnreadCounts(unreadData));
    }
  }, [unreadData, dispatch]);

  // Update browser tab title with unread count
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) ${i18n.t('app.name')}`;
    } else {
      document.title = i18n.t('app.name');
    }
    return () => {
      document.title = i18n.t('app.name');
    };
  }, [totalUnreadCount]);

  const getNavItems = () => {
    if (!isAuthenticated) return [];
    const navigationItems = user?.role === 'teacher' ? getTeacherNavigation(t) : getStudentNavigation(t);
    return navigationItems.map(item => ({
      ...item,
      current: location.pathname.startsWith(item.href) && (item.href !== '/' || location.pathname === '/'),
    }));
  };
  
  const navigation = getNavItems();

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      dispatch(logout());
      navigate(routeLogin);
    } catch (err) {
      console.error('Failed to logout:', err);
      dispatch(logout());
      navigate(routeLogin);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl animate-float"
        style={{ background: 'linear-gradient(45deg, var(--swirl-from), var(--swirl-to))' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full blur-3xl animate-float"
        style={{ background: 'linear-gradient(45deg, var(--swirl-to), var(--swirl-from))' }}
      />
      {/* Modal is now managed by Layout to persist its state */}
      {editingLesson && user?.role === 'teacher' && (
        <LessonEditorModal 
          isOpen={!!editingLesson}
          onClose={() => setEditingLesson(null)} 
          lesson={editingLesson} 
        />
      )}

      {isAuthenticated && (
        <>
          {/* Mobile sidebar */}
          <Transition.Root show={sidebarOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
              <Transition.Child
                as={Fragment}
                enter="transition-opacity ease-linear duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-900/80" />
              </Transition.Child>

              <div className="fixed inset-0 flex">
                <Transition.Child
                  as={Fragment}
                  enter="transition ease-in-out duration-300 transform"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transition ease-in-out duration-300 transform"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                      <div className="flex h-16 shrink-0 items-center">
                        <Link to={routeHome} className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/70 transition">
                          <span className="inline-block h-6 w-6 rounded-lg brand-bg" />
                          <span className="text-lg font-heading font-extrabold brand-text">{t('app.name')}</span>
                        </Link>
                      </div>
                      <nav className="flex flex-1 flex-col">
                        <ul role="list" className="flex flex-1 flex-col gap-y-7">
                          <li>
                            <ul role="list" className="-mx-2 space-y-1">
                              {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={classNames(item.current ? 'nav-item-active' : 'nav-item')}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <div className="flex items-center gap-x-3">
                              <item.icon className={classNames('h-6 w-6 shrink-0 nav-icon', item.current && 'text-white')} aria-hidden="true" />
                              {item.name}
                            </div>

                            {item.showBadge && totalUnreadCount > 0 && (
                              <span className="badge px-2 py-1">
                                {totalUnreadCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                            </ul>
                          </li>
                          <li className="mt-auto">
                            <div className="text-xs font-semibold leading-6 text-gray-600">
                              {user?.email}
                            </div>
                            <button
                              onClick={handleLogout}
                              className="mt-2 flex items-center gap-x-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5" />
                              {t('logout.signOut')}
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </Dialog>
          </Transition.Root>

          {/* Desktop sidebar */}
          <div className={classNames(
            'hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
          )}>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/90 backdrop-blur px-4 pb-4">
              <div className="flex h-16 shrink-0 items-center justify-between px-2">
                <Link to={routeHome} className={classNames(
                  'flex items-center gap-2 whitespace-nowrap transition-opacity duration-200',
                  isSidebarCollapsed && 'opacity-0 w-0'
                )}>
                  <span className="inline-block h-6 w-6 rounded-lg brand-bg" />
                  <span className="text-xl font-heading font-extrabold brand-text">{t('app.name')}</span>
                </Link>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="text-gray-500 hover:text-gray-800 p-2"
                    title={isSidebarCollapsed ? t('layout.expandPanel') : t('layout.collapsePanel')}
                >
                    <ChevronDoubleLeftIcon className={classNames("h-6 w-6 transition-transform duration-300", isSidebarCollapsed && "rotate-180")}/>
                </button>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => (
                        <li key={item.name} className="relative">
                          <Link
                            to={item.href}
                            title={isSidebarCollapsed ? item.name : undefined}
                            className={classNames(item.current ? 'nav-item-active' : 'nav-item')}
                          >
                            <div className={classNames(
                                'flex items-center gap-x-3',
                                isSidebarCollapsed && 'justify-center w-full'
                            )}>
                              <item.icon className={classNames('h-6 w-6 shrink-0 nav-icon', item.current && 'text-white')} aria-hidden="true" />
                               <span className={classNames(isSidebarCollapsed && 'hidden')}>{item.name}</span>
                            </div>

                             {item.showBadge && totalUnreadCount > 0 && !isSidebarCollapsed && (
                                <span className="badge px-2 py-1">
                                    {totalUnreadCount}
                                </span>
                            )}
                          </Link>
                          {item.showBadge && totalUnreadCount > 0 && isSidebarCollapsed && (
                            <span className="pointer-events-none absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--badge-bg)', boxShadow: '0 0 0 2px #fff' }} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="mt-auto">
                    <div className="flex items-center justify-between px-2 gap-2">
                      <div className={classNames('text-xs font-semibold leading-6 text-soft truncate', isSidebarCollapsed && 'hidden')}>
                        {user?.email}
                      </div>
                      {/* Controls moved to header */}
                    </div>
                    <button
                      onClick={handleLogout}
                      title={isSidebarCollapsed ? t('logout.signOut') : undefined}
                      className={classNames(
                          'mt-2 flex w-full items-center gap-x-2 rounded-xl p-2 text-sm font-medium text-soft hover:text-inherit hover:bg-white/70',
                          isSidebarCollapsed && 'justify-center'
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
                      <span className={classNames(isSidebarCollapsed && 'hidden')}>{t('logout.signOut')}</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div className={classNames('transition-all duration-300 ease-in-out', isAuthenticated ? (isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72") : "")}>
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 glass rounded-b-2xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          {isAuthenticated && (
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">{t('layout.openSidebar')}</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          )}

          <div className="flex flex-1 justify-end gap-x-3 self-stretch lg:gap-x-4">
            <div className="flex items-center gap-x-3 lg:gap-x-4">
              {isAuthenticated ? (
                <>
                  <ThemeSwitcher />
                  <LanguageSwitcher />
                  <Link to={chatPath} className="relative icon-link">
                    <span className="sr-only">{t('layout.viewMessages')}</span>
                    <ChatBubbleLeftEllipsisIcon className="h-6 w-6" aria-hidden="true" />
                    {totalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center badge px-1.5 py-0.5">
                        {totalUnreadCount}
                      </span>
                    )}
                  </Link>

                  <button
                    type="button"
                    className="-m-2.5 p-2.5 icon-link"
                    onClick={handleLogout}
                  >
                    <span className="sr-only">{t('logout.signOut')}</span>
                    <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-x-3">
                  <ThemeSwitcher />
                  <LanguageSwitcher />
                  <Link to={routeLogin} className="btn-secondary text-sm">
                    {t('login.short')}
                  </Link>
                  <Link to={routeRegister} className="btn-primary text-sm">
                    {t('register.short')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet context={{ setEditingLesson }} />
          </div>
        </main>
      </div>
    </div>
  );
}
