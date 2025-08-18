import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { useGetProfileQuery, useRefreshTokenMutation } from './features/auth/authApi';
import { logout, setUser, selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';
import Spinner from './components/common/Spinner';
import { WebSocketProvider } from './components/common/WebSocketManager';

export default function AuthInitializer({ children }: { children: JSX.Element }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const [attemptedRefresh, setAttemptedRefresh] = useState(false);
  const [refreshToken] = useRefreshTokenMutation();

  const { data: profileData, isError, isFetching } = useGetProfileQuery(undefined, { skip: !token });

  useEffect(() => {
    const init = async () => {
      // Try refresh once if there is no token
      if (!token && !attemptedRefresh) {
        try {
          setAttemptedRefresh(true);
          await refreshToken().unwrap();
        } catch {
          // ignore: user may be logged out, proceed to init
        }
      }

      if (!isFetching) {
        if (isError) {
          dispatch(logout());
        } else if (profileData?.data.user) {
          dispatch(setUser(profileData.data.user));
        }
        setIsInitialized(true);
      }
    };
    void init();
  }, [attemptedRefresh, dispatch, isError, isFetching, profileData, refreshToken, token]);

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const publicPages = ['/login', '/register'];
  if (isAuthenticated && publicPages.includes(location.pathname)) {
    const targetPath = user?.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={targetPath} replace />;
  }

  // Wrap children with WebSocketProvider if authenticated
  return isAuthenticated ? <WebSocketProvider>{children}</WebSocketProvider> : children;
}
