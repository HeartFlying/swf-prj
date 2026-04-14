/**
 * Settings API Tests
 * 系统设置相关API单元测试
 *
 * @description 测试settings.ts中所有API函数的正确性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock request模块 - 在工厂函数内定义mock
vi.mock('@/utils/request', () => {
  const mockGet = vi.fn()
  const mockPut = vi.fn()
  return {
    http: {
      get: mockGet,
      put: mockPut,
    },
    mockGet,
    mockPut,
  }
})

import { getSettings, updateSettings } from '@/api/settings'
import type { SystemSettings } from '@/types/api'

const { mockGet, mockPut } = await import('@/utils/request')

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSettings', () => {
    it('should fetch system settings', async () => {
      const mockResponse: SystemSettings = {
        syncEnabled: true,
        autoSyncInterval: 60,
        retentionDays: 90,
        maxProjectsPerUser: 10,
        allowedModels: ['gpt-4', 'gpt-3.5-turbo'],
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getSettings()

      expect(mockGet).toHaveBeenCalledWith('/settings')
      expect(result).toEqual(mockResponse)
    })

    it('should handle settings with all fields', async () => {
      const mockResponse: SystemSettings = {
        syncEnabled: false,
        autoSyncInterval: 30,
        retentionDays: 30,
        maxProjectsPerUser: 5,
        allowedModels: ['claude-3-opus', 'claude-3-sonnet'],
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getSettings()

      expect(result.syncEnabled).toBe(false)
      expect(result.autoSyncInterval).toBe(30)
      expect(result.retentionDays).toBe(30)
      expect(result.maxProjectsPerUser).toBe(5)
      expect(result.allowedModels).toEqual(['claude-3-opus', 'claude-3-sonnet'])
    })
  })

  describe('updateSettings', () => {
    it('should update system settings', async () => {
      const settingsToUpdate: SystemSettings = {
        syncEnabled: true,
        autoSyncInterval: 60,
        retentionDays: 90,
        maxProjectsPerUser: 10,
        allowedModels: ['gpt-4', 'gpt-3.5-turbo'],
      }
      const mockResponse: SystemSettings = {
        ...settingsToUpdate,
      }
      mockPut.mockResolvedValue(mockResponse)

      const result = await updateSettings(settingsToUpdate)

      expect(mockPut).toHaveBeenCalledWith('/settings', settingsToUpdate)
      expect(result).toEqual(mockResponse)
    })

    it('should update partial settings', async () => {
      const partialSettings: SystemSettings = {
        syncEnabled: false,
        autoSyncInterval: 15,
        retentionDays: 7,
        maxProjectsPerUser: 3,
        allowedModels: ['gpt-4'],
      }
      mockPut.mockResolvedValue(partialSettings)

      const result = await updateSettings(partialSettings)

      expect(mockPut).toHaveBeenCalledWith('/settings', partialSettings)
      expect(result.syncEnabled).toBe(false)
      expect(result.autoSyncInterval).toBe(15)
    })

    it('should pass settings object as request body', async () => {
      const settings: SystemSettings = {
        syncEnabled: true,
        autoSyncInterval: 1440,
        retentionDays: 365,
        maxProjectsPerUser: 100,
        allowedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus'],
      }
      mockPut.mockResolvedValue(settings)

      await updateSettings(settings)

      const callArgs = mockPut.mock.calls[0]
      expect(callArgs[0]).toBe('/settings')
      expect(callArgs[1]).toEqual(settings)
    })
  })
})
