import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

export const getStoredToken = () => localStorage.getItem('alphadrop_token') || ''

export const setStoredToken = (token) => {
  if (!token) {
    localStorage.removeItem('alphadrop_token')
    delete api.defaults.headers.common.Authorization
    return
  }

  localStorage.setItem('alphadrop_token', token)
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  return config
})

export default api
