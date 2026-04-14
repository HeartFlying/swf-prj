/**
 * Project API Tests
 * 项目相关API单元测试
 *
 * @description 测试project.ts中所有API函数的正确性和与后端OpenAPI的一致性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock request模块 - 在工厂函数内定义mock
vi.mock('@/utils/request', () => {
  const mockGet = vi.fn()
  const mockPost = vi.fn()
  const mockPut = vi.fn()
  const mockDelete = vi.fn()
  return {
    http: {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    },
    mockGet,
    mockPost,
    mockPut,
    mockDelete,
  }
})

import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '@/api/project'
import type { Project, ProjectMember, PaginatedResponse } from '@/types/api'

const { mockGet, mockPost, mockPut, mockDelete } = await import('@/utils/request')

describe('Project API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjects', () => {
    it('should fetch projects with default params', async () => {
      const mockResponse: PaginatedResponse<Project> = {
        items: [
          { id: 1, name: 'Project 1', code: 'P1', stage: 'development', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          { id: 2, name: 'Project 2', code: 'P2', stage: 'testing', status: 'active', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjects()

      expect(mockGet).toHaveBeenCalledWith('/projects', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should fetch projects with all params including stage (API alignment)', async () => {
      const mockResponse: PaginatedResponse<Project> = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjects({
        page: 1,
        pageSize: 10,
        keyword: 'test',
        status: 'active',
        stage: 'development',
      })

      expect(mockGet).toHaveBeenCalledWith('/projects', {
        params: {
          page: 1,
          pageSize: 10,
          keyword: 'test',
          status: 'active',
          stage: 'development',
        },
      })
    })

    it('should support stage parameter for filtering (Task 4.3)', async () => {
      // 验证API对齐：支持stage参数筛选项目
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })

      await getProjects({ stage: 'production' })

      const callArgs = mockGet.mock.calls[0][1]
      expect(callArgs.params).toHaveProperty('stage', 'production')
    })
  })

  describe('getProjectById', () => {
    it('should fetch project by id', async () => {
      const mockProject: Project = {
        id: 1,
        name: 'Test Project',
        code: 'TP1',
        stage: 'development',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }
      mockGet.mockResolvedValue(mockProject)

      const result = await getProjectById(1)

      expect(mockGet).toHaveBeenCalledWith('/projects/1')
      expect(result).toEqual(mockProject)
    })
  })

  describe('createProject', () => {
    it('should create project with correct data', async () => {
      const newProject: Partial<Project> = {
        name: 'New Project',
        code: 'NP1',
        stage: 'planning',
        status: 'active',
      }
      const mockResponse: Project = {
        id: 1,
        ...newProject,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      } as Project
      mockPost.mockResolvedValue(mockResponse)

      const result = await createProject(newProject)

      expect(mockPost).toHaveBeenCalledWith('/projects', newProject)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateProject', () => {
    it('should update project with correct data', async () => {
      const updateData: Partial<Project> = {
        name: 'Updated Project',
        stage: 'testing',
      }
      const mockResponse: Project = {
        id: 1,
        name: 'Updated Project',
        code: 'P1',
        stage: 'testing',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      }
      mockPut.mockResolvedValue(mockResponse)

      const result = await updateProject(1, updateData)

      expect(mockPut).toHaveBeenCalledWith('/projects/1', updateData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteProject', () => {
    it('should delete project by id', async () => {
      mockDelete.mockResolvedValue(undefined)

      await deleteProject(1)

      expect(mockDelete).toHaveBeenCalledWith('/projects/1')
    })
  })

  describe('getProjectMembers', () => {
    it('should fetch project members with pagination (Task 2.1)', async () => {
      const mockResponse: PaginatedResponse<ProjectMember> = {
        items: [
          {
            id: 1,
            projectId: 1,
            userId: 1,
            role: 'owner',
            joinedAt: '2024-01-01',
            username: 'user1',
            email: 'user1@test.com',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectMembers(1, { page: 1, pageSize: 10, simple: true })

      expect(mockGet).toHaveBeenCalledWith('/projects/1/members', {
        params: { page: 1, pageSize: 10, simple: true },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should support pagination params', async () => {
      mockGet.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })

      await getProjectMembers(1, { page: 2, pageSize: 50 })

      expect(mockGet).toHaveBeenCalledWith('/projects/1/members', {
        params: { page: 2, pageSize: 50 },
      })
    })
  })

  describe('addProjectMember', () => {
    it('should add member with snake_case fields (Task 1.2)', async () => {
      const mockResponse: ProjectMember = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: 'developer',
        joinedAt: '2024-01-01',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await addProjectMember(1, {
        user_id: 2,
        role: 'developer',
      })

      expect(mockPost).toHaveBeenCalledWith('/projects/1/members', {
        user_id: 2,
        role: 'developer',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should use snake_case for user_id field (API alignment)', async () => {
      // 验证API对齐：后端使用user_id蛇形命名
      mockPost.mockResolvedValue({} as ProjectMember)

      await addProjectMember(1, { user_id: 5, role: 'member' })

      const callArgs = mockPost.mock.calls[0]
      expect(callArgs[1]).toHaveProperty('user_id', 5)
      expect(callArgs[1]).not.toHaveProperty('userId')
    })
  })

  describe('removeProjectMember', () => {
    it('should remove member from project', async () => {
      mockDelete.mockResolvedValue(undefined)

      await removeProjectMember(1, 2)

      expect(mockDelete).toHaveBeenCalledWith('/projects/1/members/2')
    })
  })
})
