import axios from 'axios';

// Unified URL Configuration
// Use environment variables if set, otherwise fallback to smart defaults
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = envApiUrl || '/api';

// For assets like images: Dev uses localhost:5000, Prod uses relative paths
const envAssetUrl = import.meta.env.VITE_ASSET_URL;
export const BASE_ASSET_URL = envAssetUrl !== undefined ? envAssetUrl : (import.meta.env.DEV ? 'http://localhost:5000' : '');

/**
 * Robust helper to get full Asset URL
 * Handles full URLs, Base64, and relative paths automatically
 */
export const getAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_ASSET_URL}${cleanPath}`;
};

// Create axios instance
const API = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Request Interceptor: Add Authorization token
API.interceptors.request.use((req) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            const { token } = JSON.parse(userInfo);
            if (token) {
                req.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('API Error: Auth token parsing failed', error);
            localStorage.removeItem('userInfo');
        }
    }
    return req;
});

// Response Interceptor: Handle errors globally
API.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized errors (Token expired/invalid)
        if (error.response?.status === 401) {
            localStorage.removeItem('userInfo');
            // Redirect to login if we're not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default API;
