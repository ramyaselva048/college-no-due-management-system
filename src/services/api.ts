import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token (localStorage, fallback to sessionStorage)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Refresh Token
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If login request itself returned 401, don't attempt refresh loop
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
      const isPublicOrAuthMe =
        originalRequest.url?.includes('/auth/me') ||
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/verify');

      if (!refreshToken) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (!isPublicOrAuthMe) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        const newAccessToken = res.data.access_token;
        const newRefreshToken = res.data.refresh_token;

        localStorage.setItem('token', newAccessToken);
        sessionStorage.setItem('token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
          sessionStorage.setItem('refreshToken', newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (!isPublicOrAuthMe) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
