import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as request from '@/utils/request'

// Mock request module - 模拟真实的后端响应格式
vi.mock('@/utils/request', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('Auth Store Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Login Flow', () => {
    it('should complete full login flow and set user correctly', async () => {
      const store = useAuthStore()

      // 模拟后端返回的真实响应格式 (snake_case)
      // 注意：request.ts 拦截器会将其转换为 camelCase
      const mockLoginResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          department: '研发中心',
          is_active: true,
          role_id: 1,
          role: {
            id: 1,
            name: 'admin',
            description: 'Administrator with full access',
            permissions: ['*'],
          },
        },
      }

      // 模拟经过 camelcaseKeys 转换后的响应
      vi.mocked(request.http.post).mockResolvedValue({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        tokenType: 'bearer',
        expiresIn: 86400,
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          department: '研发中心',
          isActive: true,
          roleId: 1,
          role: {
            id: 1,
            name: 'admin',
            description: 'Administrator with full access',
            permissions: ['*'],
          },
        },
      })

      await store.login({
        username: 'admin',
        password: 'password123',
      })

      // 验证 store 状态
      expect(store.token).toBe('test_access_token')
      expect(store.refreshToken).toBe('test_refresh_token')
      expect(store.user?.username).toBe('admin')
      expect(store.user?.role?.name).toBe('admin')
      expect(store.isAuthenticated).toBe(true)
      expect(store.isAdmin).toBe(true)

      // 验证 localStorage
      expect(localStorage.getItem('token')).toBe('test_access_token')
      expect(localStorage.getItem('refreshToken')).toBe('test_refresh_token')
    })
  })

  describe('Token Refresh Flow', () => {
    it('should handle token refresh with real backend response format', async () => {
      const store = useAuthStore()
      store.setTokens('old_access_token', 'valid_refresh_token')

      // 模拟后端 /auth/refresh 的真实响应格式
      // 后端只返回 access_token 和 token_type
      vi.mocked(request.http.post).mockResolvedValue({
        accessToken: 'new_access_token',
        tokenType: 'bearer',
      })

      await store.refreshAccessToken()

      // 验证 token 已更新
      expect(store.token).toBe('new_access_token')
      expect(localStorage.getItem('token')).toBe('new_access_token')
      // refreshToken 应该保持不变
      expect(store.refreshToken).toBe('valid_refresh_token')
    })

    it('should throw error when refresh token is invalid', async () => {
      const store = useAuthStore()
      store.setTokens('expired_token', 'invalid_refresh_token')

      vi.mocked(request.http.post).mockRejectedValue(
        new Error('Invalid refresh token')
      )

      await expect(store.refreshAccessToken()).rejects.toThrow(
        'Invalid refresh token'
      )
    })
  })

  describe('API Error Handling', () => {
    it('should not clear tokens when fetchCurrentUser fails with 401', async () => {
      const store = useAuthStore()
      store.setTokens('expired_access_token', 'valid_refresh_token')

      vi.mocked(request.http.get).mockRejectedValue(new Error('401 Unauthorized'))

      // 应该抛出错误，让请求拦截器处理 token 刷新
      await expect(store.fetchCurrentUser()).rejects.toThrow('401 Unauthorized')

      // token 不应该被清除
      expect(store.token).toBe('expired_access_token')
      expect(store.refreshToken).toBe('valid_refresh_token')
    })
  })
})
