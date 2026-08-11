import { describe, it, expect, beforeEach, vi } from 'vitest'
import client from './client'
import useAuthStore from '../store/auth'

beforeEach(() => {
  useAuthStore.setState({ user: { id: '1' }, token: 'tok' })
})

describe('client 401 interceptor', () => {
  it('clears the auth store on a 401 response', async () => {
    // Grab the rejected handler registered on the response interceptor.
    const handler = client.interceptors.response.handlers.find((h) => h && h.rejected)
    expect(handler).toBeTruthy()

    const err = { response: { status: 401 } }
    await expect(handler.rejected(err)).rejects.toBe(err)
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('does not clear the store on non-401 responses', async () => {
    const handler = client.interceptors.response.handlers.find((h) => h && h.rejected)
    const err = { response: { status: 500 } }
    await expect(handler.rejected(err)).rejects.toBe(err)
    expect(useAuthStore.getState().token).toBe('tok')
  })
})
