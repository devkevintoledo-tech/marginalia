import axios from 'axios'
import useAuthStore from '../store/auth'

const client = axios.create({
  baseURL: '/api',
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On a 401, clear auth state so the app falls back to the signed-out view.
// We don't redirect here — routing/components decide what to show.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export default client
