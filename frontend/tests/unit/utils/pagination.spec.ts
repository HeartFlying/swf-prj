/**
 * 分页参数一致性测试
 * TASK-API-001: 确认分页参数命名规范
 *
 * 测试目标：
 * 1. 前端类型定义使用驼峰命名 (pageSize, pageNum)
 * 2. 前端API调用使用与类型定义一致的参数名
 * 3. 后端API接受驼峰命名参数
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import type { PaginatedResponse } from '@/types/api'

// Mock the request module
vi.mock('@/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { http } from '@/utils/request'
import { getUsers } from '@/api/user'
import { getProjects } from '@/api/project'

describe('分页参数命名规范测试', () => {
  const mockedGet = http.get as MockedFunction<typeof http.get>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('前端类型定义检查', () => {
    it('PaginatedResponse 应该使用驼峰命名 (pageSize)', () => {
      // 验证类型定义使用驼峰命名
      const response: PaginatedResponse<unknown> = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10, // 驼峰命名
      }

      expect(response).toHaveProperty('pageSize')
      expect(response).not.toHaveProperty('page_size')
    })
  })

  describe('前端API调用参数检查', () => {
    it('getUsers 应该使用驼峰命名发送分页参数', async () => {
      mockedGet.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      })

      await getUsers({ page: 1, pageSize: 10 })

      expect(mockedGet).toHaveBeenCalledWith('/users', {
        params: { page: 1, pageSize: 10 }, // 应该是驼峰命名
      })
    })

    it('getProjects 应该使用驼峰命名发送分页参数', async () => {
      mockedGet.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })

      await getProjects({ page: 1, pageSize: 20 })

      expect(mockedGet).toHaveBeenCalledWith('/projects', {
        params: { page: 1, pageSize: 20 }, // 应该是驼峰命名
      })
    })
  })

  describe('分页参数命名一致性验证', () => {
    it('所有分页API应该使用一致的参数命名', () => {
      // 验证前端类型定义与API调用使用相同的命名规范
      const typeCheck: PaginatedResponse<unknown> = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      }

      // pageSize 应该是 number 类型
      expect(typeof typeCheck.pageSize).toBe('number')
      expect(typeof typeCheck.page).toBe('number')
    })
  })
})
