import axios from 'axios';


const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://roscaapp.com',
});
// Add token to requests if it exists
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;