import axios from 'axios';

const api = axios.create({
  baseURL: 'https://gossips-bn3l.onrender.com/api',
  withCredentials: true, // Crucial for Flask session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
