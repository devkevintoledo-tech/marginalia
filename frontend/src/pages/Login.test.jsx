import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// The login flow goes Login -> useLogin -> api/client.post. Mock the HTTP client
// so the test never makes a real request.
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }))

import client from '../api/client'
import useAuthStore from '../store/auth'
import Login from './Login'

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null })
  vi.clearAllMocks()
})

describe('Login page', () => {
  it('renders the sign-in form', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits credentials and stores the returned token', async () => {
    client.post.mockResolvedValue({
      data: { token: 'tok-123', user: { id: '1', username: 'ada' } },
    })
    const user = userEvent.setup()
    const { container } = renderLogin()

    await user.type(screen.getByRole('textbox'), 'ada@example.com')
    await user.type(container.querySelector('input[type="password"]'), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith('/auth/login', {
        email: 'ada@example.com',
        password: 'secret123',
      }),
    )
    await waitFor(() => expect(useAuthStore.getState().token).toBe('tok-123'))
    expect(useAuthStore.getState().user).toEqual({ id: '1', username: 'ada' })
  })

  it('renders the backend detail message on a failed login', async () => {
    client.post.mockRejectedValue({
      response: { data: { detail: 'Incorrect email or password' } },
    })
    const user = userEvent.setup()
    const { container } = renderLogin()

    await user.type(screen.getByRole('textbox'), 'ada@example.com')
    await user.type(container.querySelector('input[type="password"]'), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(screen.getByText('Incorrect email or password')).toBeInTheDocument(),
    )
  })
})
