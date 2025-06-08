import { Navigate } from 'react-router-dom';
import { useAppSelector } from './app/hooks';
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export const RoleBasedRoute = ({
  role,
  children,
}: {
  role: 'student' | 'teacher';
  children: JSX.Element;
}) => {
  const user = useAppSelector(selectCurrentUser);
  
  if (!user || user.role.toLowerCase() !== role.toLowerCase()) {
    // If role doesn't match, redirect to home instead of login
    return <Navigate to="/" replace />;
  }
  
  return children;
};
