import axios from 'axios';

// Unified URL Configuration
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
let resolvedApiUrl;

if (envApiUrl) {
    resolvedApiUrl = envApiUrl;
} else if (import.meta.env.DEV) {
    resolvedApiUrl = '/api';
} else {
    // In production with Netlify functions, use the same domain via /api proxy
    resolvedApiUrl = '/api';
}

// Auto-fix: Ensure full URLs end with /api/ if they don't already
// For Axios to correctly handle relative paths without stripping the /api suffix,
// the baseURL MUST end with a trailing slash.
if (resolvedApiUrl.toLowerCase().endsWith('/api')) {
    resolvedApiUrl = `${resolvedApiUrl}/`;
} else if (!resolvedApiUrl.toLowerCase().endsWith('/api/')) {
    resolvedApiUrl = `${resolvedApiUrl.replace(/\/$/, '')}/api/`;
}

export const API_BASE_URL = resolvedApiUrl;

// For assets like images: Requests go through the proxy (Dev) or relative path (Prod)
const envAssetUrl = import.meta.env.VITE_ASSET_URL;
export const BASE_ASSET_URL = envAssetUrl !== undefined ? envAssetUrl : '';

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
    
    return fullUrl;
};

// Create axios instance
const API = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // Increase to 120s for large uploads and slow connections
});

// Request Interceptor: Add Authorization token & Normalize URLs
API.interceptors.request.use((req) => {
    // Axios Logic: If req.url starts with a slash, it overrides the entire path in baseURL.
    // Example: baseURL='.../api/' and url='/users' -> '.../users' (strips /api/)
    // Re-fix: Always remove the leading slash from the request URL so it's treated as relative to the /api/ base.
    if (req.url?.startsWith('/')) {
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
