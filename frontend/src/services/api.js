import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect on 401 if:
        // 1. We're not on the login or register page (those should handle 401 differently)
        // 2. The request was to a protected route (not auth routes)
        if (error.response?.status === 401) {
            const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                error.config?.url?.includes('/auth/register');

            if (!isAuthRoute) {
                // Token expired on a protected route - redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getProfile: () => api.get('/auth/me'),
    getUsers: () => api.get('/auth/users'),
    updateUserRole: (userId, role) => api.put(`/auth/users/${userId}/role`, { role }),
    deleteUser: (userId) => api.delete(`/auth/users/${userId}`)
};

// Video API
export const videoAPI = {
    getVideos: (params) => api.get('/videos', { params }),
    getVideo: (id) => api.get(`/videos/${id}`),
    uploadVideo: (formData, onUploadProgress) =>
        api.post('/videos/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress
        }),
    updateVideo: (id, data) => api.put(`/videos/${id}`, data),
    deleteVideo: (id) => api.delete(`/videos/${id}`),
    assignVideo: (id, userIds) => api.put(`/videos/${id}/assign`, { userIds }),
    getStats: () => api.get('/videos/stats'),
    getStreamUrl: (id) => `${API_URL}/videos/${id}/stream`
};

export default api;
