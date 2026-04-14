/**
 * Sync API Tests
 * 同步任务相关API单元测试
 *
 * @description 测试sync.ts中所有API函数的正确性和与后端OpenAPI的一致性
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
  getSyncTasks,
  getSyncTaskById,
  createSyncTask,
  triggerSync,
  getSyncLogs,
  getSyncStatus,
  syncGitLab,
  syncTrae,
  syncZendao,
  cancelSyncTask,
  getAllSyncLogs,
} from '@/api/sync'
import type { SyncTask, SyncLog, PaginatedResponse, SyncTaskCreate } from '@/types/api'

const { mockGet, mockPost } = await import('@/utils/request')

describe('Sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSyncTasks', () => {
    it('should fetch sync tasks with default params', async () => {
      const mockResponse: PaginatedResponse<SyncTask> = {
        items: [
          {
            id: 1,
            taskType: 'full_sync',
            sourceType: 'gitlab',
            status: 'completed',
            created_at: '2024-01-01',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getSyncTasks()

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should support all query params', async () => {
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 })

      await getSyncTasks({
        page: 1,
        pageSize: 10,
        status: 'running',
        sourceType: 'gitlab',
      })

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks', {
        params: {
          page: 1,
          pageSize: 10,
          status: 'running',
          sourceType: 'gitlab',
        },
      })
    })
  })

  describe('getSyncTaskById', () => {
    it('should fetch sync task by id with number type (Task 2.7)', async () => {
      const mockResponse: SyncTask = {
        id: 1,
        taskType: 'full_sync',
        sourceType: 'gitlab',
        status: 'completed',
        created_at: '2024-01-01',
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getSyncTaskById(1)

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks/1')
      expect(result).toEqual(mockResponse)
    })

    it('should use number type for taskId (API alignment)', async () => {
      mockGet.mockResolvedValue({} as SyncTask)

      // 验证taskId是number类型
      const taskId = 123
      await getSyncTaskById(taskId)

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks/123')
    })
  })

  describe('createSyncTask', () => {
    it('should create sync task', async () => {
      const taskData: SyncTaskCreate = {
        sourceType: 'gitlab',
        projectIds: [1, 2],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }
      const mockResponse: SyncTask = {
        id: 1,
        taskType: 'full_sync',
        sourceType: 'gitlab',
        status: 'pending',
        created_at: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await createSyncTask(taskData)

      expect(mockPost).toHaveBeenCalledWith('/sync/tasks', taskData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('triggerSync', () => {
    it('should trigger sync task', async () => {
      const mockResponse: SyncTask = {
        id: 1,
        taskType: 'full_sync',
        sourceType: 'gitlab',
        status: 'running',
        startedAt: '2024-01-01',
        created_at: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await triggerSync(1)

      expect(mockPost).toHaveBeenCalledWith('/sync/tasks/1/trigger')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getSyncLogs', () => {
    it('should fetch sync logs with level filter (Task 2.6)', async () => {
      const mockResponse: PaginatedResponse<SyncLog> = {
        items: [
          {
            id: 1,
            task_id: 1,
            level: 'info',
            message: 'Sync started',
            created_at: '2024-01-01',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getSyncLogs(1, { page: 1, pageSize: 10, level: 'error' })

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks/1/logs', {
        params: { page: 1, pageSize: 10, level: 'error' },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should support pagination params', async () => {
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })

      await getSyncLogs(1, { page: 2, pageSize: 50 })

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks/1/logs', {
        params: { page: 2, pageSize: 50 },
      })
    })

    it('should use number type for taskId in logs (Task 2.7)', async () => {
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })

      await getSyncLogs(123)

      expect(mockGet).toHaveBeenCalledWith('/sync/tasks/123/logs', { params: undefined })
    })
  })

  describe('getSyncStatus', () => {
    it('should fetch sync status', async () => {
      const mockResponse = {
        isRunning: true,
        lastSyncAt: '2024-01-01',
        pendingTasks: 2,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getSyncStatus()

      expect(mockGet).toHaveBeenCalledWith('/sync/status')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('syncGitLab', () => {
    it('should trigger GitLab sync', async () => {
      const mockResponse: SyncTask = {
        id: 1,
        taskType: 'code_sync',
        sourceType: 'gitlab',
        status: 'running',
        created_at: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await syncGitLab({
        projectId: 1,
        syncType: 'full_sync',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(mockPost).toHaveBeenCalledWith('/sync/gitlab', {
        projectId: 1,
        syncType: 'full_sync',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should support incremental sync', async () => {
      mockPost.mockResolvedValue({} as SyncTask)

      await syncGitLab({ syncType: 'incremental_sync' })

      expect(mockPost).toHaveBeenCalledWith('/sync/gitlab', {
        syncType: 'incremental_sync',
      })
    })
  })

  describe('syncTrae', () => {
    it('should trigger Trae sync', async () => {
      const mockResponse: SyncTask = {
        id: 2,
        taskType: 'token_sync',
        sourceType: 'trae',
        status: 'running',
        created_at: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await syncTrae({
        userId: 1,
        syncType: 'full_sync',
      })

      expect(mockPost).toHaveBeenCalledWith('/sync/trae', {
        userId: 1,
        syncType: 'full_sync',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('syncZendao', () => {
    it('should trigger Zendao sync', async () => {
      const mockResponse: SyncTask = {
        id: 3,
        taskType: 'bug_sync',
        sourceType: 'zendao',
        status: 'running',
        created_at: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await syncZendao({
        projectId: 1,
        syncType: 'full_sync',
      })

      expect(mockPost).toHaveBeenCalledWith('/sync/zendao', {
        projectId: 1,
        syncType: 'full_sync',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('cancelSyncTask', () => {
    it('should cancel sync task', async () => {
      const mockResponse: SyncTask = {
        id: 1,
        taskType: 'full_sync',
        sourceType: 'gitlab',
        status: 'cancelled',
        created_at: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await cancelSyncTask(1)

      expect(mockPost).toHaveBeenCalledWith('/sync/tasks/1/cancel')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getAllSyncLogs', () => {
    it('should fetch all sync logs (Task 4.1 - new API)', async () => {
      const mockResponse: PaginatedResponse<SyncLog> = {
        items: [
          {
            id: 1,
            task_id: 1,
            level: 'info',
            message: 'Task started',
            created_at: '2024-01-01',
          },
          {
            id: 2,
            task_id: 2,
            level: 'error',
            message: 'Task failed',
            created_at: '2024-01-02',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getAllSyncLogs()

      expect(mockGet).toHaveBeenCalledWith('/sync/logs', { params: undefined })
      expect(result).toEqual(mockResponse)
      expect(result.items).toHaveLength(2)
    })

    it('should support all filter params', async () => {
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 })

      await getAllSyncLogs({
        page: 1,
        pageSize: 10,
        task_id: 123,
        level: 'error',
      })

      expect(mockGet).toHaveBeenCalledWith('/sync/logs', {
        params: {
          page: 1,
          pageSize: 10,
          task_id: 123,
          level: 'error',
        },
      })
    })

    it('should use number type for taskId filter (Task 2.7)', async () => {
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })

      await getAllSyncLogs({ task_id: 456 })

      const callArgs = mockGet.mock.calls[0]
      expect(callArgs[1].params.task_id).toBe(456)
      expect(typeof callArgs[1].params.task_id).toBe('number')
    })
  })
})
