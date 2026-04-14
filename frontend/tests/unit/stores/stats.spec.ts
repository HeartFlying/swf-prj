import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatsStore } from '@/stores/stats'
import { http } from '@/utils/request'

// Mock http module
vi.mock('@/utils/request', () => ({
  http: {
    get: vi.fn(),
  },
}))

describe('useStatsStore', () => {
  let store: ReturnType<typeof useStatsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useStatsStore()
    vi.clearAllMocks()
  })

  describe('State', () => {
    it('should have correct initial state', () => {
      expect(store.personalDashboard).toBeNull()
      expect(store.projectDashboards.size).toBe(0)
      expect(store.globalRanking).toEqual([])
      expect(store.heatmapData).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.statsLoading).toBe(false)
    })
  })

  describe('Getters', () => {
    it('todayStats should return default values when personalDashboard is null', () => {
      const stats = store.todayStats
      expect(stats).toEqual({
        commits: 0,
        additions: 0,
        deletions: 0,
        tokens: 0,
        sessions: 0,
      })
    })

    it('todayStats should return values from personalDashboard', () => {
      store.personalDashboard = {
        todayStats: {
          commits: 10,
          additions: 100,
          deletions: 50,
          tokens: 1000,
          sessions: 5,
        },
        weeklyTrend: { dates: [], commits: [], tokens: [] },
        languageStats: [],
        heatmapData: [],
        ranking: { commits: 0, totalUsers: 0 },
      }

      expect(store.todayStats).toEqual({
        commits: 10,
        additions: 100,
        deletions: 50,
        tokens: 1000,
        sessions: 5,
      })
    })

    it('weeklyTrend should return default values when personalDashboard is null', () => {
      expect(store.weeklyTrend).toEqual({
        dates: [],
        commits: [],
        tokens: [],
      })
    })

    it('weeklyTrend should return values from personalDashboard', () => {
      store.personalDashboard = {
        todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
        weeklyTrend: {
          dates: ['2024-01-01', '2024-01-02'],
          commits: [5, 10],
          tokens: [100, 200],
        },
        languageStats: [],
        heatmapData: [],
        ranking: { commits: 0, totalUsers: 0 },
      }

      expect(store.weeklyTrend).toEqual({
        dates: ['2024-01-01', '2024-01-02'],
        commits: [5, 10],
        tokens: [100, 200],
      })
    })

    it('languageStats should return empty array when personalDashboard is null', () => {
      expect(store.languageStats).toEqual([])
    })

    it('languageStats should return values from personalDashboard', () => {
      store.personalDashboard = {
        todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
        weeklyTrend: { dates: [], commits: [], tokens: [] },
        languageStats: [
          { language: 'TypeScript', lines: 1000, percentage: 60 },
          { language: 'Python', lines: 500, percentage: 30 },
        ],
        heatmapData: [],
        ranking: { commits: 0, totalUsers: 0 },
      }

      expect(store.languageStats).toHaveLength(2)
      expect(store.languageStats[0].language).toBe('TypeScript')
    })
  })

  describe('Actions', () => {
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

      it('should update heatmapData when response contains heatmapData', async () => {
        const mockData = {
          todayStats: { commits: 5, additions: 100, deletions: 50, tokens: 1000, sessions: 3 },
          weeklyTrend: { dates: [], commits: [], tokens: [] },
          languageStats: [],
          heatmapData: [{ date: '2024-01-01', count: 5, level: 2 }],
          ranking: { commits: 0, totalUsers: 0 },
        }

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        await store.fetchPersonalDashboard()

        expect(store.heatmapData).toEqual([{ date: '2024-01-01', count: 5, level: 2 }])
      })

      it('should set statsLoading to false after error', async () => {
        vi.mocked(http.get).mockRejectedValueOnce(new Error('Network error'))

        await expect(store.fetchPersonalDashboard()).rejects.toThrow('Network error')
        expect(store.statsLoading).toBe(false)
      })
    })

    describe('fetchProjectDashboard', () => {
      it('should fetch project dashboard and store in map', async () => {
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
      })
    })

    describe('fetchGlobalRanking', () => {
      it('should fetch global ranking with default limit', async () => {
        const mockData = [
          { user_id: 1, username: 'user1', department: 'Dev', token_count: 1000, commit_count: 50 },
          { user_id: 2, username: 'user2', department: 'QA', token_count: 800, commit_count: 30 },
        ]

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        await store.fetchGlobalRanking()

        expect(http.get).toHaveBeenCalledWith('/stats/global/top-users', { params: { limit: 20 } })
        expect(store.globalRanking).toHaveLength(2)
        expect(store.globalRanking[0]).toEqual({
          id: 1,
          name: 'user1',
          department: 'Dev',
          score: 1000,
        })
      })

      it('should fetch global ranking with custom limit', async () => {
        const mockData: Array<{
          user_id: number
          username: string
          department?: string
          token_count: number
          commit_count: number
        }> = []

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        await store.fetchGlobalRanking(10)

        expect(http.get).toHaveBeenCalledWith('/stats/global/top-users', { params: { limit: 10 } })
      })
    })

    describe('fetchHeatmapData', () => {
      it('should use existing data if heatmapData exists', async () => {
        store.personalDashboard = {
          todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
          weeklyTrend: { dates: [], commits: [], tokens: [] },
          languageStats: [],
          heatmapData: [{ date: '2024-01-01', count: 5, level: 2 }],
          ranking: { commits: 0, totalUsers: 0 },
        }

        await store.fetchHeatmapData()

        expect(http.get).not.toHaveBeenCalled()
        expect(store.heatmapData).toEqual([{ date: '2024-01-01', count: 5, level: 2 }])
      })

      it('should fetch data if no heatmapData exists', async () => {
        const mockData = {
          todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
          weeklyTrend: { dates: [], commits: [], tokens: [] },
          languageStats: [],
          heatmapData: [{ date: '2024-01-01', count: 3, level: 1 }],
          ranking: { commits: 0, totalUsers: 0 },
        }

        vi.mocked(http.get).mockResolvedValueOnce(mockData)

        await store.fetchHeatmapData()

        expect(http.get).toHaveBeenCalledWith('/stats/personal/dashboard', { params: {} })
        expect(store.heatmapData).toEqual([{ date: '2024-01-01', count: 3, level: 1 }])
      })
    })

    describe('fetchCodeStats', () => {
      it('should fetch code stats with params', async () => {
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

        expect(http.get).toHaveBeenCalledWith('/stats/personal/code', { params })
        expect(result).toEqual(mockData)
      })
    })

    describe('fetchTokenUsage', () => {
      it('should fetch token usage with params', async () => {
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
    })

    describe('clearStats', () => {
      it('should clear all stats data', () => {
        store.personalDashboard = {
          todayStats: { commits: 5, additions: 100, deletions: 50, tokens: 1000, sessions: 3 },
          weeklyTrend: { dates: [], commits: [], tokens: [] },
          languageStats: [],
          heatmapData: [],
          ranking: { commits: 0, totalUsers: 0 },
        }
        store.projectDashboards.set(1, {
          projectId: 1,
          projectName: 'Test',
          totalStats: { commits: 0, contributors: 0, linesOfCode: 0, pullRequests: 0 },
          memberStats: [],
          languageDistribution: [],
          commitTrend: { dates: [], commits: [] },
        })
        store.globalRanking = [{ id: 1, name: 'user1', score: 100 }]
        store.heatmapData = [{ date: '2024-01-01', count: 5, level: 2 }]

        store.clearStats()

        expect(store.personalDashboard).toBeNull()
        expect(store.projectDashboards.size).toBe(0)
        expect(store.globalRanking).toEqual([])
        expect(store.heatmapData).toEqual([])
      })
    })
  })
})
