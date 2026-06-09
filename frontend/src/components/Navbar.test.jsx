import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../api/client', () => ({ default: { post: vi.fn().mockResolvedValue({}) } }))

import client from '../api/client'
import useAuthStore from '../store/auth'
import Navbar from './Navbar'

function renderNavbar() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  const { setAuth, logout } = useAuthStore.getState()
  useAuthStore.setState({ user: { username: 'ada', id: '1' }, token: 'tok', setAuth, logout }, true)
  vi.clearAllMocks()
})

describe('Navbar logout', () => {
  it('calls POST /auth/logout before clearing the store', async () => {
    renderNavbar()
    await userEvent.click(screen.getByRole('button', { name: /out/i }))

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/auth/logout')
    })
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  it('clears the store even if the API call fails', async () => {
    client.post.mockRejectedValueOnce(new Error('network'))
    renderNavbar()
    await userEvent.click(screen.getByRole('button', { name: /out/i }))

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })
})
