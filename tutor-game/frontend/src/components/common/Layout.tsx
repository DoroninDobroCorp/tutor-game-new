import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  HomeIcon,
  BookOpenIcon,
  CalculatorIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useLogoutMutation } from '../../features/auth/authApi';
import { logout } from '../../features/auth/authSlice';
import { selectTotalUnreadCount } from '../../features/chat/chatSlice';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  current: boolean;
  showBadge?: boolean;
}

const studentNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/student', icon: HomeIcon, current: false },
  { name: 'Story Mode', href: '/student/story', icon: BookOpenIcon, current: false },
  { name: 'Math Problems', href: '/student/math', icon: CalculatorIcon, current: false },
  {
    name: 'Chat',
    href: '/student/chat',
    icon: UserGroupIcon,
    current: false,
    showBadge: true,
  },
];

const teacherNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/teacher', icon: HomeIcon, current: false },
  { name: 'Students', href: '/teacher/students', icon: UserGroupIcon, current: false },
  { name: 'Progress', href: '/teacher/progress', icon: ChartBarIcon, current: false },
  {
    name: 'Chat',
    href: '/teacher/chat',
    icon: UserGroupIcon,
    current: false,
    showBadge: true,
  },
];

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const totalUnreadCount = useAppSelector(selectTotalUnreadCount);
  const [logoutUser] = useLogoutMutation();

  // Update browser tab title with unread count
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) Math Quest`;
    } else {
      document.title = 'Math Quest';
    }
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'Math Quest';
    };
  }, [totalUnreadCount]);

  const getNavItems = () => {
    if (!isAuthenticated) return []; // Не создаем навигацию для анонимных пользователей
    const items = user?.role === 'teacher' ? teacherNavigation : studentNavigation;
    return items.map(item => ({
      ...item,
      current: location.pathname === item.href,
    }));
  };
  
  const navigation = getNavItems();

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      // Logout locally regardless of API call result
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
      // Even if the API call fails, still logout locally
      dispatch(logout());
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Боковая панель будет отображаться только для аутентифицированных пользователей */}
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
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4">
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
                                ? 'bg-indigo-700 text-white'
                                : 'text-indigo-200 hover:bg-indigo-700 hover:text-white',
                              'group flex items-center justify-between rounded-md p-2 text-sm font-semibold leading-6'
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {/* Block 1: Icon and Name */}
                            <div className="flex items-center gap-x-3">
                              <item.icon
                                className={classNames(
                                  item.current ? 'text-white' : 'text-indigo-200 group-hover:text-white',
                                  'h-6 w-6 shrink-0'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </div>

                            {/* Block 2: Notification Badge */}
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
                            <div className="text-xs font-semibold leading-6 text-indigo-200">
                              {user?.email}
                            </div>
                            <button
                              onClick={handleLogout}
                              className="mt-2 flex items-center gap-x-2 text-sm font-medium text-indigo-200 hover:text-white"
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
          <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4">
              <div className="flex h-16 shrink-0 items-center">
                <Link to="/" className="text-2xl font-bold text-white">Tutor Game</Link>
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
                                ? 'bg-indigo-700 text-white'
                                : 'text-indigo-200 hover:bg-indigo-700 hover:text-white',
                              'group flex items-center justify-between rounded-md p-2 text-sm font-semibold leading-6'
                            )}
                          >
                            {/* Block 1: Icon and Name */}
                            <div className="flex items-center gap-x-3">
                              <item.icon
                                className={classNames(
                                  item.current ? 'text-white' : 'text-indigo-200 group-hover:text-white',
                                  'h-6 w-6 shrink-0'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </div>

                            {/* Block 2: Notification Badge */}
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
                    <div className="text-xs font-semibold leading-6 text-indigo-200">
                      {user?.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="mt-2 flex items-center gap-x-2 text-sm font-medium text-indigo-200 hover:text-white"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      Sign out
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div className={isAuthenticated ? "lg:pl-72" : ""}>
        {/* Header */}
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
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                  onClick={handleLogout}
                >
                  <span className="sr-only">Sign out</span>
                  <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                </button>
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

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}