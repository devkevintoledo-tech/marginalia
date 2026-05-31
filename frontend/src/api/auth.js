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

export function useMe() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => client.get('/auth/me').then((r) => r.data),
    enabled: !!token,
  })
}
