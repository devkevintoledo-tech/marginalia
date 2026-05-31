import { useQuery } from '@tanstack/react-query'
import client from './client'

export function useProfile(username) {
  return useQuery({
    queryKey: ['users', username],
    queryFn: () => client.get(`/users/${username}`).then((r) => r.data),
    enabled: !!username,
  })
}
