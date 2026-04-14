import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as request from '@/utils/request'

// Mock request module
vi.mock('@/utils/request', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('refreshAccessToken', () => {
    it('should correctly handle camelCase response from refresh endpoint', async () => {
      const store = useAuthStore()
      store.setTokens('old_access_token', 'valid_refresh_token')

      // Mock response with camelCase (after camelcaseKeys transformation)
      // Backend returns: { access_token, token_type }
      // After camelcaseKeys: { accessToken, tokenType }
      const mockResponse = {
        accessToken: 'new_access_token',
        tokenType: 'bearer',
      }
      vi.mocked(request.http.post).mockResolvedValue(mockResponse)

      await store.refreshAccessToken()

      // Verify token was correctly extracted from camelCase response
      expect(store.token).toBe('new_access_token')
      expect(localStorage.getItem('token')).toBe('new_access_token')
    })

    it('should throw error when refresh token is missing', async () => {
      const store = useAuthStore()
      store.clearTokens()

      await expect(store.refreshAccessToken()).rejects.toThrow('No refresh token')
    })

    it('should throw error when refresh request fails', async () => {
      const store = useAuthStore()
      store.setTokens('old_token', 'valid_refresh_token')

      vi.mocked(request.http.post).mockRejectedValue(new Error('Refresh failed'))

      await expect(store.refreshAccessToken()).rejects.toThrow('Refresh failed')
    })
  })

  describe('fetchCurrentUser', () => {
    it('should fetch and set user data', async () => {
      const store = useAuthStore()
      store.setTokens('valid_token', 'valid_refresh_token')

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: { name: 'user', permissions: [] },
      }
      vi.mocked(request.http.get).mockResolvedValue(mockUser)

      await store.fetchCurrentUser()

      expect(store.user).toEqual(mockUser)
    })

    it('should throw error when request fails (allowing interceptor to handle 401)', async () => {
      const store = useAuthStore()
      store.setTokens('expired_token', 'valid_refresh_token')

      vi.mocked(request.http.get).mockRejectedValue(new Error('Unauthorized'))

      // Should throw error so request interceptor can handle token refresh
      await expect(store.fetchCurrentUser()).rejects.toThrow('Unauthorized')
      // Token should NOT be cleared here - let the interceptor handle it
      expect(store.token).toBe('expired_token')
    })
  })
})
