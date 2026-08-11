import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../api/client', () => ({ default: { post: vi.fn() } }))

import client from '../api/client'
import ResetPassword from './ResetPassword'

function renderPage(entry = '/reset-password?token=abc') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <ResetPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ResetPassword page', () => {
  it('submits the token and new password', async () => {
    client.post.mockResolvedValue({ data: { message: 'ok' } })
    const user = userEvent.setup()
    const { container } = renderPage()

    const pwInputs = container.querySelectorAll('input[type="password"]')
    await user.type(pwInputs[0], 'newsecret123')
    await user.type(pwInputs[1], 'newsecret123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'abc',
        new_password: 'newsecret123',
      }),
    )
  })

  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()

    const pwInputs = container.querySelectorAll('input[type="password"]')
    await user.type(pwInputs[0], 'newsecret123')
    await user.type(pwInputs[1], 'different123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(client.post).not.toHaveBeenCalled()
    expect(screen.getByText(/do not match/i)).toBeInTheDocument()
  })
})
