import axios from 'axios';
import { API_BASE_URL } from './config';

// Use dynamic base URL based on environment
const API = axios.create({
    baseURL: API_BASE_URL,
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
