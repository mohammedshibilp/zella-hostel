import axios from 'axios';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (isLocal ? '/api/v1' : 'https://zella-hostel.onrender.com/api/v1'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hostel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if session expired
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('hostel_token');
        localStorage.removeItem('hostel_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
