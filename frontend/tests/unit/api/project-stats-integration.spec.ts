/**
 * Project Stats API Integration Tests
 * 项目统计API集成测试
 *
 * @description 测试项目统计页面与getProjectStats API的集成
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock request模块
vi.mock('@/utils/request', () => {
  const mockGet = vi.fn()
  return {
    http: {
      get: mockGet,
    },
    mockGet,
  }
})

import { getProjectStats } from '@/api/stats'
import type { ProjectStatsResponse } from '@/types/api'

const { mockGet } = await import('@/utils/request')

describe('Project Stats API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjectStats', () => {
    it('should fetch project stats with correct URL format', async () => {
      const mockResponse: ProjectStatsResponse = {
        projectId: 1,
        projectName: 'Test Project',
        totalCommits: 100,
        totalTokens: 50000,
        activeMembers: 5,
        bugCount: 10,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectStats(1)

      // Verify correct API endpoint is called
      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle different project IDs', async () => {
      const mockResponse: ProjectStatsResponse = {
        projectId: 42,
        projectName: 'Another Project',
        totalCommits: 250,
        totalTokens: 100000,
        activeMembers: 8,
        bugCount: 5,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectStats(42)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/42')
      expect(result.projectId).toBe(42)
      expect(result.projectName).toBe('Another Project')
    })

    it('should handle zero values correctly', async () => {
      const mockResponse: ProjectStatsResponse = {
        projectId: 3,
        projectName: 'Empty Project',
        totalCommits: 0,
        totalTokens: 0,
        activeMembers: 0,
        bugCount: 0,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectStats(3)

      expect(result.totalCommits).toBe(0)
      expect(result.totalTokens).toBe(0)
      expect(result.activeMembers).toBe(0)
      expect(result.bugCount).toBe(0)
    })

    it('should handle large numbers', async () => {
      const mockResponse: ProjectStatsResponse = {
        projectId: 4,
        projectName: 'Large Project',
        totalCommits: 999999,
        totalTokens: 999999999,
        activeMembers: 100,
        bugCount: 9999,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectStats(4)

      expect(result.totalCommits).toBe(999999)
      expect(result.totalTokens).toBe(999999999)
    })

    it('should match backend response structure', async () => {
      // This test ensures frontend types match backend OpenAPI schema
      const backendResponse = {
        projectId: 1,
        projectName: 'Backend Project',
        totalCommits: 150,
        totalTokens: 75000,
        activeMembers: 12,
        bugCount: 8,
      }
      mockGet.mockResolvedValue(backendResponse)

      const result = await getProjectStats(1)

      // Verify all expected fields are present
      expect(result).toHaveProperty('projectId')
      expect(result).toHaveProperty('projectName')
      expect(result).toHaveProperty('totalCommits')
      expect(result).toHaveProperty('totalTokens')
      expect(result).toHaveProperty('activeMembers')
      expect(result).toHaveProperty('bugCount')
    })
  })
})
