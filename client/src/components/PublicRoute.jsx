import { Navigate } from 'react-router';
import { isAuthenticated } from '../services/auth';

const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
