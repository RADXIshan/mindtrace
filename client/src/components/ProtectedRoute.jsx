import { Navigate, useLocation } from 'react-router';
import { isAuthenticated } from '../services/auth';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
