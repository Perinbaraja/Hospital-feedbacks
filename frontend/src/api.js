import axios from 'axios';

// Unified URL Configuration
// Use environment variables if set, otherwise fallback to smart defaults
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
let resolvedApiUrl = envApiUrl || (import.meta.env.DEV ? '/api' : 'https://hospital-feedbacks.onrender.com/api');

// Auto-fix: Ensure full URLs end with /api if they don't already
if (resolvedApiUrl.startsWith('http') && !resolvedApiUrl.toLowerCase().endsWith('/api')) {
    console.warn(`[API] Base URL is missing '/api' suffix. Appending it automatically: ${resolvedApiUrl} -> ${resolvedApiUrl}/api`);
    resolvedApiUrl = `${resolvedApiUrl.replace(/\/$/, '')}/api`;
}

export const API_BASE_URL = resolvedApiUrl;

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
    
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Use the determined BASE_ASSET_URL
    const fullUrl = `${BASE_ASSET_URL}${cleanPath}`;
    
    // Optional: Log for debugging if needed (will show in browser console)
    // console.log(`[Asset] Resolving ${path} -> ${fullUrl}`);
    
    return fullUrl;
};

// Create axios instance
const API = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Request Interceptor: Add Authorization token & Normalize URLs
API.interceptors.request.use((req) => {
    // Axios Bugfix: If baseURL has a path (like /api) and request has leading slash (like /users), 
    // the baseURL path is often stripped. We remove the leading slash to preserve the baseURL path.
    if (req.baseURL?.endsWith('/api') && req.url?.startsWith('/')) {
        req.url = req.url.substring(1);
    }

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
