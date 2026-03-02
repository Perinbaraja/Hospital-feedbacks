import axios from 'axios';

// Vite proxies to the local Node.js backend when using /api route
const API = axios.create({
    baseURL: '/api',
});

// Add token to requests
API.interceptors.request.use((req) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        const { token } = JSON.parse(userInfo);
        if (token) {
            req.headers.Authorization = `Bearer ${token}`;
        }
    }
    return req;
});

export default API;
