import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      let redirectPath = '/staff';
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.role === 'PARENT') {
            redirectPath = '/parents';
          }
        } else if (window.location.pathname.startsWith('/parent')) {
          redirectPath = '/parents';
        }
      } catch (err) {
        // fallback to staff login
      }
      window.location.href = redirectPath;
    }
    return Promise.reject(error);
  }
);

export default api;
