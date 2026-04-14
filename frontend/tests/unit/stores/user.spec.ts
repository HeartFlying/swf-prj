/**
 * User Store Tests
 * 用户状态管理单元测试
 *
 * @description 测试user.ts中所有API函数的正确性，特别是API路径与后端OpenAPI的一致性
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { http } from '@/utils/request'

// Mock http module
vi.mock('@/utils/request', () => ({
  http: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

describe('useUserStore', () => {
  let store: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUserStore()
    vi.clearAllMocks()
  })

  describe('State', () => {
    it('should have correct initial state', () => {
      expect(store.user).toBeNull()
      expect(store.projects).toEqual([])
      expect(store.personalDashboard).toBeNull()
      expect(store.projectDashboards.size).toBe(0)
      expect(store.loading).toBe(false)
      expect(store.statsLoading).toBe(false)
    })
  })

  describe('Getters', () => {
    it('currentUser should return user value', () => {
      expect(store.currentUser).toBeNull()

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true,
        isAdmin: false,
        createdAt: '2024-01-01T00:00:00Z',
      }
      store.user = mockUser

      expect(store.currentUser).toEqual(mockUser)
    })

    it('userProjects should return projects array', () => {
      expect(store.userProjects).toEqual([])

      const mockProjects = [
        { id: 1, name: 'Project 1', description: 'Test project' },
      ]
      store.projects = mockProjects as any

      expect(store.userProjects).toEqual(mockProjects)
    })

    it('hasProjects should return false when no projects', () => {
      expect(store.hasProjects).toBe(false)
    })

    it('hasProjects should return true when has projects', () => {
      store.projects = [{ id: 1, name: 'Project 1' }] as any
      expect(store.hasProjects).toBe(true)
    })
  })

  describe('Actions', () => {
    describe('fetchUserProfile', () => {
      it('should fetch user profile', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          fullName: 'Test User',
          isActive: true,
          isAdmin: false,
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(http.get).mockResolvedValueOnce(mockUser)

        await store.fetchUserProfile()

        expect(http.get).toHaveBeenCalledWith('/users/me')
        expect(store.user).toEqual(mockUser)
        expect(store.loading).toBe(false)
      })

      it('should set loading to false after error', async () => {
        vi.mocked(http.get).mockRejectedValueOnce(new Error('Network error'))

        await expect(store.fetchUserProfile()).rejects.toThrow('Network error')
        expect(store.loading).toBe(false)
      })
    })

    describe('updateUserProfile', () => {
      it('should update user profile', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'newemail@example.com',
          fullName: 'Updated Name',
          isActive: true,
          isAdmin: false,
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(http.patch).mockResolvedValueOnce(mockUser)

        const updateData = { email: 'newemail@example.com', fullName: 'Updated Name' }
        await store.updateUserProfile(updateData)

        expect(http.patch).toHaveBeenCalledWith('/users/me', updateData)
        expect(store.user).toEqual(mockUser)
      })
    })

    describe('fetchUserProjects', () => {
      it('should fetch user projects', async () => {
        const mockProjects = [
          { id: 1, name: 'Project 1', description: 'Test project 1' },
          { id: 2, name: 'Project 2', description: 'Test project 2' },
        ]

        vi.mocked(http.get).mockResolvedValueOnce(mockProjects)

        await store.fetchUserProjects()

        expect(http.get).toHaveBeenCalledWith('/users/me/projects')
        expect(store.projects).toEqual(mockProjects)
        expect(store.loading).toBe(false)
      })
    })

    describe('fetchPersonalDashboard', () => {
      it('should fetch personal dashboard without date range', async () => {
        const mockData = {
          todayStats: { commits: 5, additions: 100, deletions: 50, tokens: 1000, sessions: 3 },
          weeklyTrend: { dates: [], commits: [], tokens: [] },
          languageStats: [],
          heatmapData: [],
          ranking: { commits: 0, totalUsers: 0 },
        }

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        await store.fetchPersonalDashboard()

        expect(http.get).toHaveBeenCalledWith('/stats/personal/dashboard', { params: {} })
        expect(store.personalDashboard).toEqual(mockData)
        expect(store.statsLoading).toBe(false)
      })

      it('should fetch personal dashboard with date range', async () => {
        const mockData = {
          todayStats: { commits: 5, additions: 100, deletions: 50, tokens: 1000, sessions: 3 },
          weeklyTrend: { dates: [], commits: [], tokens: [] },
          languageStats: [],
          heatmapData: [],
          ranking: { commits: 0, totalUsers: 0 },
        }

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        const dateRange = { start: '2024-01-01', end: '2024-01-31' }
        await store.fetchPersonalDashboard(dateRange)

        expect(http.get).toHaveBeenCalledWith('/stats/personal/dashboard', {
          params: { startDate: '2024-01-01', endDate: '2024-01-31' },
        })
      })
    })

    describe('fetchProjectDashboard', () => {
      it('should fetch project dashboard', async () => {
        const mockData = {
          projectId: 1,
          projectName: 'Test Project',
          totalStats: { commits: 100, contributors: 5, linesOfCode: 5000, pullRequests: 20 },
          memberStats: [],
          languageDistribution: [],
          commitTrend: { dates: [], commits: [] },
        }

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        await store.fetchProjectDashboard(1)

        expect(http.get).toHaveBeenCalledWith('/stats/projects/1/dashboard')
        expect(store.projectDashboards.get(1)).toEqual(mockData)
        expect(store.statsLoading).toBe(false)
      })
    })

    describe('fetchCodeStats', () => {
      it('should fetch code stats with correct API path /stats/personal/code', async () => {
        const mockData = [
          {
            id: 1,
            userId: 1,
            projectId: 1,
            date: '2024-01-01',
            additions: 100,
            deletions: 50,
            commits: 5,
            filesChanged: 3,
            languages: { TypeScript: 100 },
          },
        ]

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        const params = { startDate: '2024-01-01', endDate: '2024-01-31', projectId: 1 }
        const result = await store.fetchCodeStats(params)

        // 关键测试：验证API路径必须是 /stats/personal/code，而不是 /stats/code
        expect(http.get).toHaveBeenCalledWith('/stats/personal/code', { params })
        expect(result).toEqual(mockData)
      })

      it('should fetch code stats without params', async () => {
        const mockData: any[] = []

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        const result = await store.fetchCodeStats()

        // 关键测试：验证API路径必须是 /stats/personal/code
        expect(http.get).toHaveBeenCalledWith('/stats/personal/code', { params: undefined })
        expect(result).toEqual(mockData)
      })
    })

    describe('fetchTokenUsage', () => {
      it('should fetch token usage with correct API path /stats/personal/tokens', async () => {
        const mockData = [
          {
            id: 1,
            userId: 1,
            date: '2024-01-01',
            promptTokens: 100,
            completionTokens: 200,
            totalTokens: 300,
            model: 'gpt-4',
            requestCount: 10,
          },
        ]

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        const params = { startDate: '2024-01-01', endDate: '2024-01-31', model: 'gpt-4' }
        const result = await store.fetchTokenUsage(params)

        expect(http.get).toHaveBeenCalledWith('/stats/personal/tokens', { params })
        expect(result).toEqual(mockData)
      })

      it('should fetch token usage without params', async () => {
        const mockData: any[] = []

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        const result = await store.fetchTokenUsage()

        expect(http.get).toHaveBeenCalledWith('/stats/personal/tokens', { params: undefined })
        expect(result).toEqual(mockData)
      })
    })

    describe('changePassword', () => {
      it('should change password', async () => {
        vi.mocked(http.post).mockResolvedValueOnce({})

        const passwordData = { oldPassword: 'oldpass', newPassword: 'newpass' }
        await store.changePassword(passwordData)

        expect(http.post).toHaveBeenCalledWith('/users/me/change-password', passwordData)
      })
    })
  })
})
