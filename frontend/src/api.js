import axios from 'axios';

// Use environment variable if available, otherwise fallback based on environment
// For local development (Vite), default to localhost:5000. For production, default to empty string (relative paths).
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
export const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
export const BASE_ASSET_URL = BASE_URL;

// Create axios instance with proper baseURL for API calls
const API = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 10000,
});

// Add token to requests
API.interceptors.request.use((req) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            const { token } = JSON.parse(userInfo);
            if (token) {
                req.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error parsing user info from localStorage:', error);
            localStorage.removeItem('userInfo');
        }
    }
    return req;
});

// Handle response errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, clear storage
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API;
