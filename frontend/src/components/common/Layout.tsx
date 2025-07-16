import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Fragment, useState, useEffect } from 'react';
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
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useLogoutMutation } from '../../features/auth/authApi';
import { useGetUnreadSummaryQuery } from '../../features/chat/chatApi';
import { logout } from '../../features/auth/authSlice';
import { selectTotalUnreadCount, setUnreadCounts } from '../../features/chat/chatSlice';
import type { Lesson } from '../../types/models';
import LessonEditorModal from '../../pages/teacher/LessonEditorModal';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  current: boolean;
  showBadge?: boolean;
}

const studentNavigation: NavigationItem[] = [
  { name: 'Панель управления', href: '/student', icon: HomeIcon, current: false },
  { name: 'Продолжить приключение', href: '/student/adventure', icon: RocketLaunchIcon, current: false },
  { name: 'Архив заданий', href: '/student/stories', icon: BookOpenIcon, current: false },
  {
    name: 'Чат',
    href: '/student/chat',
    icon: ChatBubbleLeftEllipsisIcon,
    current: false,
    showBadge: true,
  },
];

const teacherNavigation: NavigationItem[] = [
  { name: 'Панель управления', href: '/teacher', icon: HomeIcon, current: false },
  { name: 'Учебные планы', href: '/teacher/goals', icon: DocumentTextIcon, current: false },
  { name: 'Студенты', href: '/teacher/students', icon: UserGroupIcon, current: false },
  {
    name: 'Чат',
    href: '/teacher/chat',
    icon: ChatBubbleLeftEllipsisIcon,
    current: false,
    showBadge: true,
  },
];

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const totalUnreadCount = useAppSelector(selectTotalUnreadCount);
  const [logoutUser] = useLogoutMutation();
  const chatPath = user?.role === 'teacher' ? '/teacher/chat' : '/student/chat';

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
      document.title = `(${totalUnreadCount}) Math Quest`;
    } else {
      document.title = 'Math Quest';
    }
    return () => {
      document.title = 'Math Quest';
    };
  }, [totalUnreadCount]);

  const getNavItems = () => {
    if (!isAuthenticated) return [];
    const items = user?.role === 'teacher' ? teacherNavigation : studentNavigation;
    return items.map(item => ({
      ...item,
      current: location.pathname.startsWith(item.href) && (item.href !== '/' || location.pathname === '/'),
    }));
  };
  
  const navigation = getNavItems();

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
      dispatch(logout());
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-800 px-6 pb-4">
                      <div className="flex h-16 shrink-0 items-center">
                        <h1 className="text-2xl font-bold text-white">Tutor Game</h1>
                      </div>
                      <nav className="flex flex-1 flex-col">
                        <ul role="list" className="flex flex-1 flex-col gap-y-7">
                          <li>
                            <ul role="list" className="-mx-2 space-y-1">
                              {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={classNames(
                              item.current
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                              'group flex items-center justify-between rounded-md p-2 text-sm font-semibold leading-6'
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <div className="flex items-center gap-x-3">
                              <item.icon
                                className={classNames(
                                  item.current ? 'text-white' : 'text-gray-300 group-hover:text-white',
                                  'h-6 w-6 shrink-0'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </div>

                            {item.showBadge && totalUnreadCount > 0 && (
                              <span className="inline-block rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-white">
                                {totalUnreadCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                            </ul>
                          </li>
                          <li className="mt-auto">
                            <div className="text-xs font-semibold leading-6 text-gray-400">
                              {user?.email}
                            </div>
                            <button
                              onClick={handleLogout}
                              className="mt-2 flex items-center gap-x-2 text-sm font-medium text-gray-300 hover:text-white"
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5" />
                              Sign out
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
            'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
          )}>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-800 px-4 pb-4">
              <div className="flex h-16 shrink-0 items-center justify-between px-2">
                <Link to="/" className={classNames(
                  'text-xl font-bold text-white whitespace-nowrap transition-opacity duration-200',
                  isSidebarCollapsed && 'opacity-0 w-0'
                )}>
                  Tutor Game
                </Link>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="text-gray-300 hover:text-white p-2"
                    title={isSidebarCollapsed ? "Expand panel" : "Collapse panel"}
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
                            className={classNames(
                              item.current
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                              'group flex items-center justify-between rounded-md p-2 text-sm font-semibold leading-6'
                            )}
                          >
                            <div className={classNames(
                                'flex items-center gap-x-3',
                                isSidebarCollapsed && 'justify-center w-full'
                            )}>
                              <item.icon
                                className={classNames(
                                  item.current ? 'text-white' : 'text-gray-300 group-hover:text-white',
                                  'h-6 w-6 shrink-0'
                                )}
                                aria-hidden="true"
                              />
                               <span className={classNames(isSidebarCollapsed && 'hidden')}>{item.name}</span>
                            </div>

                            {item.showBadge && totalUnreadCount > 0 && !isSidebarCollapsed && (
                                <span className="inline-block rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-white">
                                    {totalUnreadCount}
                                </span>
                            )}
                          </Link>
                          {item.showBadge && totalUnreadCount > 0 && isSidebarCollapsed && (
                            <span className="pointer-events-none absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-800" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="mt-auto">
                    <div className={classNames('px-2 text-xs font-semibold leading-6 text-gray-400 truncate', isSidebarCollapsed && 'hidden')}>
                      {user?.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      title={isSidebarCollapsed ? 'Sign out' : undefined}
                      className={classNames(
                          'mt-2 flex w-full items-center gap-x-2 rounded-md p-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700',
                          isSidebarCollapsed && 'justify-center'
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
                      <span className={classNames(isSidebarCollapsed && 'hidden')}>Sign out</span>
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
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          {isAuthenticated && (
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          )}

          <div className="flex flex-1 justify-end gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {isAuthenticated ? (
                <>
                  <Link to={chatPath} className="relative text-gray-400 hover:text-gray-500">
                    <span className="sr-only">View messages</span>
                    <ChatBubbleLeftEllipsisIcon className="h-6 w-6" aria-hidden="true" />
                    {totalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                        {totalUnreadCount}
                      </span>
                    )}
                  </Link>

                  <button
                    type="button"
                    className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                    onClick={handleLogout}
                  >
                    <span className="sr-only">Sign out</span>
                    <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-x-4">
                  <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Log in
                  </Link>
                  <Link to="/register" className="text-sm font-medium text-white bg-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-700">
                    Register
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
