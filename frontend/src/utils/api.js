import axios from 'axios';

const normalizeApiUrl = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
};

const getApiBaseUrl = () => normalizeApiUrl(process.env.REACT_APP_API_URL) || '/api';

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
      const storedUser = localStorage.getItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      let redirectPath = '/staff';
      try {
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
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
