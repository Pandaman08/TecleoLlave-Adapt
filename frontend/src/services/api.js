import axios from 'axios'

// En la APK y en la web utiliza la URL configurada en .env o la URL personalizada configurada por el usuario (ej. túnel Cloudflare)
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tl_server_url');
    if (saved && saved.trim()) return saved.trim();
  }
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
};

export const setCustomBaseUrl = (newUrl) => {
  if (typeof window !== 'undefined') {
    if (newUrl && newUrl.trim()) {
      localStorage.setItem('tl_server_url', newUrl.trim());
    } else {
      localStorage.removeItem('tl_server_url');
    }
  }
  api.defaults.baseURL = getBaseUrl();
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  config => {
    config.baseURL = getBaseUrl();
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api