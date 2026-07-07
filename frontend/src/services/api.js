import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5050/api',
  withCredentials: true, // Crucial for Flask session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
