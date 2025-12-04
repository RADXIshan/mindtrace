import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const contactsApi = {
  getAll: () => api.get('/contacts/'),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts/', data),
  createWithPhoto: (formData) => api.post('/contacts/with-photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

export const faceApi = {
  syncFromDatabase: () => api.post('/face/sync-from-database'),
  recognize: (formData) => api.post('/face/recognize', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export const interactionsApi = {
  getAll: (params) => api.get('/interactions/', { params }),
  get: (id) => api.get(`/interactions/${id}`),
  create: (data) => api.post('/interactions/', data),
  toggleStar: (id) => api.put(`/interactions/${id}/star`),
};

export const alertsApi = {
  getAll: (params) => api.get('/alerts/', { params }),
  create: (data) => api.post('/alerts/', data),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  markAllRead: () => api.put('/alerts/read-all'),
  getUnreadCount: () => api.get('/alerts/unread-count'),
};

export const remindersApi = {
  getAll: (params) => api.get('/reminders/', { params }),
  create: (data) => api.post('/reminders/', data),
  update: (id, data) => api.put(`/reminders/${id}`, data),
  toggleComplete: (id) => api.put(`/reminders/${id}/toggle`),
  delete: (id) => api.delete(`/reminders/${id}`),
};

export const sosApi = {
  getContacts: () => api.get('/sos/contacts'),
  createContact: (data) => api.post('/sos/contacts', data),
  deleteContact: (id) => api.delete(`/sos/contacts/${id}`),
  getConfig: () => api.get('/sos/config'),
  updateConfig: (data) => api.put('/sos/config', data),
};

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.post('/user/change-password', data),
  deleteAccount: () => api.delete('/user/account'),
  uploadProfileImage: (formData) => api.post('/user/profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteProfileImage: () => api.delete('/user/profile-image'),
};

export default api;
