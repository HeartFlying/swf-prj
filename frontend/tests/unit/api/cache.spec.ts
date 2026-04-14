/**
 * Cache API Tests
 * 缓存管理相关API单元测试
 *
 * @description 测试cache.ts中所有API函数的正确性和与后端OpenAPI的一致性
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
  getCacheStats,
  clearAllCache,
  clearCacheByPattern,
  checkCacheHealth,
} from '@/api/cache'
import type { CacheStats, ClearCacheResponse, CacheHealthResponse } from '@/types/api'

const { mockGet, mockPost } = await import('@/utils/request')

describe('Cache API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCacheStats', () => {
    it('should fetch cache statistics', async () => {
      const mockResponse: CacheStats = {
        enabled: true,
        keysCount: 100,
        statsKeys: 10,
        dashboardKeys: 5,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getCacheStats()

      expect(mockGet).toHaveBeenCalledWith('/cache/stats')
      expect(result).toEqual(mockResponse)
    })

    it('should map snake_case response to camelCase (Task 3.1)', async () => {
      // 验证API对齐：后端返回snake_case，前端使用camelCase
      const mockResponse: CacheStats = {
        enabled: true,
        keysCount: 100,      // 映射 keys_count
        statsKeys: 10,       // 映射 stats_keys
        dashboardKeys: 5,    // 映射 dashboard_keys
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getCacheStats()

      // 验证类型定义正确映射后端字段
      expect(result).toHaveProperty('keysCount')
      expect(result).toHaveProperty('statsKeys')
      expect(result).toHaveProperty('dashboardKeys')
    })
  })

  describe('clearAllCache', () => {
    it('should clear all cache without params', async () => {
      const mockResponse: ClearCacheResponse = {
        clearedKeys: 10,
        cacheType: 'all',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await clearAllCache()

      expect(mockPost).toHaveBeenCalledWith('/cache/clear', null, { params: {} })
      expect(result).toEqual(mockResponse)
    })

    it('should clear cache with cacheType param (Task 2.5)', async () => {
      const mockResponse: ClearCacheResponse = {
        clearedKeys: 5,
        cacheType: 'stats',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await clearAllCache({ cacheType: 'stats' })

      expect(mockPost).toHaveBeenCalledWith('/cache/clear', null, {
        params: { cache_type: 'stats' },
      })
      expect(result.clearedKeys).toBe(5)
    })

    it('should convert camelCase params to snake_case (API alignment)', async () => {
      // 验证API对齐：前端camelCase参数转换为后端snake_case
      mockPost.mockResolvedValue({ clearedKeys: 1 } as ClearCacheResponse)

      await clearAllCache({
        cacheType: 'user',
        userId: 123,
        projectId: 456,
      })

      const callArgs = mockPost.mock.calls[0]
      const params = callArgs[2].params

      // 验证参数名转换为snake_case
      expect(params).toHaveProperty('cache_type', 'user')
      expect(params).toHaveProperty('user_id', 123)
      expect(params).toHaveProperty('project_id', 456)

      // 验证没有camelCase参数
      expect(params).not.toHaveProperty('cacheType')
      expect(params).not.toHaveProperty('userId')
      expect(params).not.toHaveProperty('projectId')
    })

    it('should handle all cache types', async () => {
      const cacheTypes = ['all', 'stats', 'user', 'project', 'dashboard', 'trend'] as const

      for (const cacheType of cacheTypes) {
        vi.clearAllMocks()
        mockPost.mockResolvedValue({ clearedKeys: 1 } as ClearCacheResponse)

        await clearAllCache({ cacheType })

        const callArgs = mockPost.mock.calls[0]
        expect(callArgs[2].params).toHaveProperty('cache_type', cacheType)
      }
    })

    it('should only include defined params', async () => {
      mockPost.mockResolvedValue({ clearedKeys: 1 } as ClearCacheResponse)

      await clearAllCache({ cacheType: 'all' })

      const callArgs = mockPost.mock.calls[0]
      const params = callArgs[2].params

      // 只应包含cache_type，user_id和project_id不应存在
      expect(params).toHaveProperty('cache_type')
      expect(params).not.toHaveProperty('user_id')
      expect(params).not.toHaveProperty('project_id')
    })
  })

  describe('clearCacheByPattern', () => {
    it('should clear cache by pattern with params (Task 1.3)', async () => {
      const mockResponse: ClearCacheResponse = {
        clearedKeys: 3,
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await clearCacheByPattern('user:*')

      expect(mockPost).toHaveBeenCalledWith('/cache/clear-pattern', null, {
        params: { pattern: 'user:*' },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should pass pattern as query param', async () => {
      mockPost.mockResolvedValue({ clearedKeys: 0 } as ClearCacheResponse)

      await clearCacheByPattern('project:123:*')

      const callArgs = mockPost.mock.calls[0]
      expect(callArgs[2]).toEqual({ params: { pattern: 'project:123:*' } })
    })
  })

  describe('checkCacheHealth', () => {
    it('should check cache health status', async () => {
      const mockResponse: CacheHealthResponse = {
        status: 'healthy',
        enabled: true,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await checkCacheHealth()

      expect(mockGet).toHaveBeenCalledWith('/cache/health')
      expect(result).toEqual(mockResponse)
    })

    it('should handle unhealthy status (Task 3.4)', async () => {
      const mockResponse: CacheHealthResponse = {
        status: 'unhealthy',
        enabled: false,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await checkCacheHealth()

      expect(result.status).toBe('unhealthy')
      expect(result.enabled).toBe(false)
    })
  })
})
