import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  return response.data;
};

export const signup = async (email, password, fullName) => {
  const response = await api.post('/auth/signup', { 
    email, 
    password, 
    full_name: fullName 
  });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  return response.data;
};



export const logout = async (setLoading = null) => {
  try {
    if (setLoading) setLoading(true);
    
    // Optional: Call backend to invalidate session/cookie if applicable
    await api.post('/auth/logout');
    
    // Add a small delay to show the loading animation
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    if (setLoading) setLoading(false);
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
