import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { useGetProfileQuery } from "./features/auth/authApi";
import {
  logout,
  setUser,
  selectIsAuthenticated,
  selectCurrentUser,
} from "./features/auth/authSlice";
import Spinner from "./components/common/Spinner";
import { WebSocketProvider } from "./components/common/WebSocketManager";

export default function AuthInitializer({
  children,
}: {
  children: JSX.Element;
}) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    data: profileData,
    isError,
    isFetching,
  } = useGetProfileQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    if (!token) {
      setIsInitialized(true);
      return;
    }
    if (!isFetching) {
      if (isError) {
        dispatch(logout());
      } else if (profileData?.data.user) {
        dispatch(setUser(profileData.data.user));
        // The unread summary is now fetched in Layout.tsx
      }
      setIsInitialized(true);
    }
  }, [isFetching, isError, token, profileData, dispatch]);

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const publicPages = ["/login", "/register"];
  if (isAuthenticated && publicPages.includes(location.pathname)) {
    const targetPath = user?.role === "teacher" ? "/teacher" : "/student";
    return <Navigate to={targetPath} replace />;
  }

  // Wrap children with WebSocketProvider if authenticated
  return isAuthenticated ? (
    <WebSocketProvider>{children}</WebSocketProvider>
  ) : (
    children
  );
}
