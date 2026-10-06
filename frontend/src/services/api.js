import axios from 'axios'

// En la APK y en la web utiliza la URL configurada en el archivo .env (ej. VPS o túnel)
const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
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