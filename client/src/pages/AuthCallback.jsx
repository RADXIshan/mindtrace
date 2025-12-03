import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Authenticating...</div>
    </div>
  );
};

export default AuthCallback;
