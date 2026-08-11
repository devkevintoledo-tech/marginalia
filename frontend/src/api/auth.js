import { useMutation, useQuery } from '@tanstack/react-query'
import client from './client'
import useAuthStore from '../store/auth'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: (credentials) => client.post('/auth/login', credentials).then((r) => r.data),
    onSuccess: (data) => setAuth(data.user, data.token),
  })
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: (payload) => client.post('/auth/register', payload).then((r) => r.data),
    onSuccess: (data) => setAuth(data.user, data.token),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload) =>
      client.post('/auth/forgot-password', payload).then((r) => r.data),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload) =>
      client.post('/auth/reset-password', payload).then((r) => r.data),
  })
}

export function useMe() {
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  return useQuery({
    queryKey: ['me'],
    // Reconcile the persisted user with the server on load. A 401 is handled by
    // the client interceptor (clears the store); a 200 refreshes stale user data.
    queryFn: () =>
      client.get('/auth/me').then((r) => {
        setAuth(r.data, useAuthStore.getState().token)
        return r.data
      }),
    enabled: !!token,
  })
}
