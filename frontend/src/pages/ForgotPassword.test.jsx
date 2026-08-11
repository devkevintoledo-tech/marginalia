import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../api/client', () => ({ default: { post: vi.fn() } }))

import client from '../api/client'
import ForgotPassword from './ForgotPassword'

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ForgotPassword page', () => {
  it('submits the email and shows the neutral confirmation', async () => {
    client.post.mockResolvedValue({ data: { message: 'ok' } })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('textbox'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'ada@example.com',
      }),
    )
    await waitFor(() =>
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument(),
    )
  })
})
