import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from './client'

export function useSearchBooks(query) {
  return useQuery({
    queryKey: ['books', 'search', query],
    queryFn: () => client.get('/books/search', { params: { q: query } }).then((r) => r.data),
    enabled: query.length > 1,
  })
}

export function useBook(id) {
  return useQuery({
    queryKey: ['books', id],
    queryFn: () => client.get(`/books/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useBookThreads(id) {
  return useQuery({
    queryKey: ['books', id, 'threads'],
    queryFn: () => client.get(`/books/${id}/threads`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useAddToShelf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => client.post(`/books/${id}/shelf`, { status }).then((r) => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['books', id] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUpdateShelf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => client.put(`/books/${id}/shelf`, { status }).then((r) => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['books', id] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRemoveFromShelf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) => client.delete(`/books/${id}/shelf`).then((r) => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['books', id] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
