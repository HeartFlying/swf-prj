/**
 * Auth API Tests
 * 认证相关API单元测试
 *
 * @description 测试auth.ts中所有API函数的正确性和与后端OpenAPI的一致性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock request模块 - 在工厂函数内定义mock
vi.mock('@/utils/request', () => {
  const mockGet = vi.fn()
  const mockPost = vi.fn()
  return {
    http: {
      get: mockGet,
      post: mockPost,
    },
    mockGet,
    mockPost,
  }
})

import {
  login,
  logout,
  refreshToken,
  getCurrentUser,
} from '@/api/auth'
import type {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '@/types/api'

const { mockGet, mockPost } = await import('@/utils/request')

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('should login with credentials', async () => {
      const loginData: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      }
      const mockResponse: LoginResponse = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@test.com',
          department: 'Dev',
          isActive: true,
        },
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await login(loginData)

      expect(mockPost).toHaveBeenCalledWith('/auth/login', loginData)
      expect(result).toEqual(mockResponse)
      expect(result.accessToken).toBe('access_token_123')
      expect(result.refreshToken).toBe('refresh_token_123')
    })

    it('should return user info in login response', async () => {
      const mockResponse: LoginResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@test.com',
          department: 'Dev',
          isActive: true,
        },
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await login({ username: 'test', password: 'pass' })

      expect(result.user).toBeDefined()
      expect(result.user.username).toBe('testuser')
    })
  })

  describe('logout', () => {
    it('should logout without refresh token', async () => {
      const mockResponse: LogoutResponse = {
        message: 'Logged out successfully',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout', {})
      expect(result).toEqual(mockResponse)
    })

    it('should logout with refresh token', async () => {
      const logoutData: LogoutRequest = {
        refreshToken: 'refresh_token_123',
      }
      const mockResponse: LogoutResponse = {
        message: 'Logged out successfully',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await logout(logoutData)

      expect(mockPost).toHaveBeenCalledWith('/auth/logout', logoutData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('refreshToken', () => {
    it('should refresh access token (Task 1.4)', async () => {
      const refreshData: RefreshTokenRequest = {
        refreshToken: 'refresh_token_123',
      }
      const mockResponse: RefreshTokenResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await refreshToken(refreshData)

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', refreshData)
      expect(result).toEqual(mockResponse)
    })

    it('should return new tokens after refresh', async () => {
      const mockResponse: RefreshTokenResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        tokenType: 'Bearer',
        expiresIn: 7200,
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await refreshToken({ refreshToken: 'old_refresh' })

      expect(result.accessToken).toBe('new_access_token')
      expect(result.refreshToken).toBe('new_refresh_token')
      expect(result.expiresIn).toBe(7200)
    })

    it('should use correct field names in response (API alignment)', async () => {
      const mockResponse: RefreshTokenResponse = {
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        tokenType: 'Bearer',
        expiresIn: 3600,
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await refreshToken({ refreshToken: 'refresh' })

      // 验证使用camelCase字段名
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('tokenType')
      expect(result).toHaveProperty('expiresIn')
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch current user info', async () => {
      const mockResponse: User = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        department: 'Dev',
        isActive: true,
        roleId: 1,
        avatar: 'https://example.com/avatar.png',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getCurrentUser()

      expect(mockGet).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse)
    })

    it('should return user with all fields', async () => {
      const mockResponse: User = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        department: 'Dev',
        isActive: true,
        roleId: 2,
        avatar: 'avatar.png',
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getCurrentUser()

      expect(result.id).toBe(1)
      expect(result.username).toBe('testuser')
      expect(result.email).toBe('test@test.com')
      expect(result.isActive).toBe(true)
    })
  })
})
