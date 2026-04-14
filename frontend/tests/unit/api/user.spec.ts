/**
 * User API Tests
 * 用户相关API单元测试
 *
 * @description 测试user.ts中所有API函数的正确性和与后端OpenAPI的一致性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock request模块 - 在工厂函数内定义mock
vi.mock('@/utils/request', () => {
  const mockGet = vi.fn()
  const mockPost = vi.fn()
  const mockPut = vi.fn()
  const mockPatch = vi.fn()
  const mockDelete = vi.fn()
  return {
    http: {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      patch: mockPatch,
      delete: mockDelete,
    },
    mockGet,
    mockPost,
    mockPut,
    mockPatch,
    mockDelete,
  }
})

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserProjects,
  updateCurrentUser,
  changePassword,
} from '@/api/user'
import type { User, PaginatedResponse, Project } from '@/types/api'

const { mockGet, mockPost, mockPut, mockPatch, mockDelete } = await import('@/utils/request')

describe('User API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getUsers', () => {
    it('should fetch users with default params', async () => {
      const mockResponse: PaginatedResponse<User> = {
        items: [
          { id: 1, username: 'user1', email: 'user1@test.com', department: 'Dev', isActive: true },
          { id: 2, username: 'user2', email: 'user2@test.com', department: 'QA', isActive: true },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getUsers()

      expect(mockGet).toHaveBeenCalledWith('/users', { params: undefined })
      expect(result).toEqual(mockResponse)
      expect(result.items).toHaveLength(2)
    })

    it('should fetch users with pagination params', async () => {
      const mockResponse: PaginatedResponse<User> = {
        items: [{ id: 1, username: 'user1', email: 'user1@test.com', department: 'Dev', isActive: true }],
        total: 1,
        page: 1,
        pageSize: 10,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getUsers({ page: 1, pageSize: 10, keyword: 'test' })

      expect(mockGet).toHaveBeenCalledWith('/users', { params: { page: 1, pageSize: 10, keyword: 'test' } })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getUserById', () => {
    it('should fetch user by id', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        department: 'Dev',
        isActive: true,
      }
      mockGet.mockResolvedValue(mockUser)

      const result = await getUserById(1)

      expect(mockGet).toHaveBeenCalledWith('/users/1')
      expect(result).toEqual(mockUser)
    })
  })

  describe('createUser', () => {
    it('should create user with correct data', async () => {
      const newUser: Partial<User> = {
        username: 'newuser',
        email: 'new@test.com',
        department: 'Dev',
      }
      const mockResponse: User = {
        id: 3,
        ...newUser,
        isActive: true,
      } as User
      mockPost.mockResolvedValue(mockResponse)

      const result = await createUser(newUser)

      expect(mockPost).toHaveBeenCalledWith('/users', newUser)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateUser', () => {
    it('should update user with correct data', async () => {
      const updateData: Partial<User> = {
        email: 'updated@test.com',
        department: 'QA',
      }
      const mockResponse: User = {
        id: 1,
        username: 'testuser',
        ...updateData,
        isActive: true,
      } as User
      mockPut.mockResolvedValue(mockResponse)

      const result = await updateUser(1, updateData)

      expect(mockPut).toHaveBeenCalledWith('/users/1', updateData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      mockDelete.mockResolvedValue(undefined)

      await deleteUser(1)

      expect(mockDelete).toHaveBeenCalledWith('/users/1')
    })
  })

  describe('getUserProjects', () => {
    it('should fetch current user projects', async () => {
      const mockProjects: Project[] = [
        { id: 1, name: 'Project 1', code: 'P1', stage: 'development', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 2, name: 'Project 2', code: 'P2', stage: 'testing', status: 'active', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
      ]
      mockGet.mockResolvedValue(mockProjects)

      const result = await getUserProjects()

      expect(mockGet).toHaveBeenCalledWith('/users/me/projects')
      expect(result).toEqual(mockProjects)
      expect(result).toHaveLength(2)
    })
  })

  describe('updateCurrentUser', () => {
    it('should update current user profile', async () => {
      const updateData: Partial<User> = {
        email: 'newemail@test.com',
        department: 'New Dept',
      }
      const mockResponse: User = {
        id: 1,
        username: 'testuser',
        ...updateData,
        isActive: true,
      } as User
      mockPatch.mockResolvedValue(mockResponse)

      const result = await updateCurrentUser(updateData)

      expect(mockPatch).toHaveBeenCalledWith('/users/me', updateData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('changePassword', () => {
    it('should call change password API with snake_case fields (API alignment)', async () => {
      mockPost.mockResolvedValue(undefined)

      await changePassword({
        old_password: 'oldpass123',
        new_password: 'newpass123',
      })

      expect(mockPost).toHaveBeenCalledWith('/users/me/change-password', {
        old_password: 'oldpass123',
        new_password: 'newpass123',
      })
    })

    it('should use snake_case field names as per backend OpenAPI spec', async () => {
      // 验证API对齐：后端使用old_password/new_password蛇形命名
      mockPost.mockResolvedValue(undefined)

      const passwordData = {
        old_password: 'current',
        new_password: 'newsecret',
      }

      await changePassword(passwordData)

      const callArgs = mockPost.mock.calls[0]
      expect(callArgs[1]).toHaveProperty('old_password')
      expect(callArgs[1]).toHaveProperty('new_password')
      expect(callArgs[1]).not.toHaveProperty('oldPassword')
      expect(callArgs[1]).not.toHaveProperty('newPassword')
    })
  })
})
