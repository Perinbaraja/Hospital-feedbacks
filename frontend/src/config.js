// Use environment variable for API URL, with fallback for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? '/api' : 'https://hospital-feedbacks.onrender.com/api');