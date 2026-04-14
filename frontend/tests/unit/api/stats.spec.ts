/**
 * Stats API Tests
 * 统计相关API单元测试
 *
 * @description 测试stats.ts中所有API函数的正确性和与后端OpenAPI的一致性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock request模块 - 在工厂函数内定义mock
vi.mock('@/utils/request', () => {
  const mockGet = vi.fn()
  return {
    http: {
      get: mockGet,
    },
    mockGet,
  }
})

import {
  getPersonalDashboard,
  getPersonalCodeStats,
  getPersonalTokenStats,
  getPersonalBugRate,
  getProjectDashboard,
  getProjectCodeRank,
  getProjectBugTrend,
  getProjectCodeTrend,
  getProjectAIAdoption,
  getGlobalTokenTrend,
  getActivityTrend,
  getTopUsers,
  getTopUsersV2,
  getProjectCommitRank,
  getGlobalSummary,
  getPersonalHeatmap,
  getHeatmapData,
  getProjectStats,
} from '@/api/stats'
import type {
  PersonalDashboard,
  ProjectDashboard,
  TokenTrendResponse,
  ActivityTrendResponse,
  TopUserResponse,
  TopUsersResponse,
  CodeRankResponse,
  BugTrendResponse,
  AIAdoptionResponse,
  PersonalCodeStatsResponse,
  PersonalTokenStatsResponse,
  PersonalBugRateResponse,
  CommitRankResponse,
  GlobalHeatmapResponse,
  ProjectStatsResponse,
  CodeTrendResponse,
} from '@/types/api'

const { mockGet } = await import('@/utils/request')

describe('Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPersonalDashboard', () => {
    it('should fetch personal dashboard data', async () => {
      const mockResponse: PersonalDashboard = {
        todayStats: { commits: 10, additions: 100, deletions: 50, tokens: 1000, sessions: 5 },
        weeklyTrend: { dates: ['2024-01-01'], commits: [10], tokens: [1000] },
        languageStats: [{ language: 'TypeScript', lines: 1000, percentage: 50 }],
        heatmapData: [{ date: '2024-01-01', count: 10, level: 2 }],
        ranking: { commits: 5, totalUsers: 100 },
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getPersonalDashboard()

      expect(mockGet).toHaveBeenCalledWith('/stats/personal/dashboard', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should support date range params', async () => {
      mockGet.mockResolvedValue({} as PersonalDashboard)

      await getPersonalDashboard({ startDate: '2024-01-01', endDate: '2024-01-31' })

      expect(mockGet).toHaveBeenCalledWith('/stats/personal/dashboard', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
    })
  })

  describe('getPersonalCodeStats', () => {
    it('should fetch personal code statistics', async () => {
      const mockResponse: PersonalCodeStatsResponse = {
        totalCommits: 100,
        totalPrs: 20,
        linesAdded: 5000,
        linesDeleted: 1000,
        avgCommitsPerDay: 5,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getPersonalCodeStats()

      expect(mockGet).toHaveBeenCalledWith('/stats/personal/code', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getPersonalTokenStats', () => {
    it('should fetch personal token statistics', async () => {
      const mockResponse: PersonalTokenStatsResponse = {
        totalTokens: 100000,
        promptTokens: 60000,
        completionTokens: 40000,
        avgTokensPerDay: 5000,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getPersonalTokenStats()

      expect(mockGet).toHaveBeenCalledWith('/stats/personal/tokens', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getPersonalBugRate', () => {
    it('should fetch personal bug rate statistics', async () => {
      const mockResponse: PersonalBugRateResponse = {
        totalBugs: 10,
        criticalBugs: 2,
        bugRate: 0.05,
        resolvedBugs: 8,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getPersonalBugRate()

      expect(mockGet).toHaveBeenCalledWith('/stats/personal/bugs', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getProjectDashboard', () => {
    it('should fetch project dashboard with snake_case fields (Task 1.6)', async () => {
      const mockResponse: ProjectDashboard = {
        project_id: 1,
        project_name: 'Test Project',
        total_stats: {
          commits: 100,
          contributors: 5,
          lines_of_code: 10000,
          pull_requests: 20,
        },
        member_stats: [],
        language_distribution: [],
        commit_trend: { dates: [], commits: [] },
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectDashboard(1)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/dashboard', { params: undefined })
      expect(result).toEqual(mockResponse)
      expect(result.project_id).toBe(1)
      expect(result.total_stats.commits).toBe(100)
    })

    it('should support date range params', async () => {
      mockGet.mockResolvedValue({} as ProjectDashboard)

      await getProjectDashboard(1, { startDate: '2024-01-01', endDate: '2024-01-31' })

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/dashboard', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
    })
  })

  describe('getProjectCodeRank', () => {
    it('should fetch project code rank', async () => {
      const mockResponse: CodeRankResponse[] = [
        { userId: 1, username: 'user1', linesAdded: 1000, linesDeleted: 100, totalLines: 900 },
      ]
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectCodeRank(1)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/code-rank', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getProjectBugTrend', () => {
    it('should fetch project bug trend', async () => {
      const mockResponse: BugTrendResponse = {
        dates: ['2024-01-01'],
        created: [5],
        resolved: [3],
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectBugTrend(1)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/bug-trend', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getProjectCodeTrend', () => {
    it('should fetch project code trend', async () => {
      const mockResponse: CodeTrendResponse = {
        dates: ['2024-01-01'],
        total_lines: [10000],
        additions: [500],
        deletions: [100],
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectCodeTrend(1)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/code-trend', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getProjectAIAdoption', () => {
    it('should fetch AI adoption with default days=30 (Task 2.2)', async () => {
      const mockResponse: AIAdoptionResponse[] = [
        { date: '2024-01-01', adoptionRate: 0.8, aiSuggestions: 100, acceptedSuggestions: 80 },
      ]
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectAIAdoption(1)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/ai-adoption', {
        params: { days: 30 },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should support custom days parameter', async () => {
      mockGet.mockResolvedValue([] as AIAdoptionResponse[])

      await getProjectAIAdoption(1, { days: 7 })

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/ai-adoption', {
        params: { days: 7 },
      })
    })
  })

  describe('getGlobalTokenTrend', () => {
    it('should fetch global token trend', async () => {
      const mockResponse: TokenTrendResponse = {
        dates: ['2024-01-01'],
        values: [10000],
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getGlobalTokenTrend()

      expect(mockGet).toHaveBeenCalledWith('/stats/global/token-trend', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getActivityTrend', () => {
    it('should fetch activity trend with default days=30 (Task 2.3)', async () => {
      const mockResponse: ActivityTrendResponse = {
        dates: ['2024-01-01'],
        activeUsers: [50],
        totalCommits: [100],
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getActivityTrend()

      expect(mockGet).toHaveBeenCalledWith('/stats/global/activity-trend', {
        params: { days: 30 },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should support custom days parameter', async () => {
      mockGet.mockResolvedValue({} as ActivityTrendResponse)

      await getActivityTrend({ days: 14 })

      expect(mockGet).toHaveBeenCalledWith('/stats/global/activity-trend', {
        params: { days: 14 },
      })
    })
  })

  describe('getTopUsers', () => {
    it('should fetch top users (V1 - array response)', async () => {
      const mockResponse: TopUserResponse[] = [
        { userId: 1, username: 'user1', department: 'Dev', tokenCount: 10000, commitCount: 50 },
      ]
      mockGet.mockResolvedValue(mockResponse)

      const result = await getTopUsers()

      expect(mockGet).toHaveBeenCalledWith('/stats/global/top-users', { params: undefined })
      expect(result).toEqual(mockResponse)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should support type and limit params', async () => {
      mockGet.mockResolvedValue([] as TopUserResponse[])

      await getTopUsers({ type: 'commits', limit: 10 })

      expect(mockGet).toHaveBeenCalledWith('/stats/global/top-users', {
        params: { type: 'commits', limit: 10 },
      })
    })
  })

  describe('getTopUsersV2', () => {
    it('should fetch top users V2 (structured response)', async () => {
      const mockResponse: TopUsersResponse = {
        users: [{ userId: 1, username: 'user1', department: 'Dev', tokenCount: 10000, commitCount: 50 }],
        totalCount: 1,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getTopUsersV2()

      expect(mockGet).toHaveBeenCalledWith('/stats/global/top-users-v2', { params: undefined })
      expect(result).toEqual(mockResponse)
      expect(result.users).toBeDefined()
      expect(result.totalCount).toBeDefined()
    })

    it('should support days parameter', async () => {
      mockGet.mockResolvedValue({ users: [], totalCount: 0 } as TopUsersResponse)

      await getTopUsersV2({ type: 'tokens', limit: 5, days: 7 })

      expect(mockGet).toHaveBeenCalledWith('/stats/global/top-users-v2', {
        params: { type: 'tokens', limit: 5, days: 7 },
      })
    })
  })

  describe('getProjectCommitRank', () => {
    it('should fetch project commit rank', async () => {
      const mockResponse: CommitRankResponse[] = [
        { userId: 1, username: 'user1', commitCount: 100, avgCommitsPerDay: 5 },
      ]
      mockGet.mockResolvedValue(mockResponse)

      const result = await getProjectCommitRank(1)

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1/commit-rank', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getGlobalSummary', () => {
    it('should fetch global summary', async () => {
      const mockResponse = {
        totalUsers: 100,
        totalProjects: 20,
        totalCommits: 5000,
        totalTokens: 1000000,
        totalBugs: 50,
        activeUsersToday: 30,
        periodDays: 30,
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getGlobalSummary()

      expect(mockGet).toHaveBeenCalledWith('/stats/global/summary', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getPersonalHeatmap', () => {
    it('should fetch personal heatmap with snake_case params (Task 2.4)', async () => {
      const mockResponse = [{ date: '2024-01-01', count: 10, level: 2 as const }]
      mockGet.mockResolvedValue(mockResponse)

      const result = await getPersonalHeatmap({
        userId: 1,
        days: 30,
        metricType: 'commits',
      })

      expect(mockGet).toHaveBeenCalledWith('/stats/personal/heatmap', {
        params: {
          user_id: 1,
          days: 30,
          metric_type: 'commits',
        },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should convert camelCase params to snake_case (API alignment)', async () => {
      mockGet.mockResolvedValue([])

      await getPersonalHeatmap({ userId: 5, metricType: 'tokens' })

      const callArgs = mockGet.mock.calls[0]
      const params = callArgs[1].params

      expect(params).toHaveProperty('user_id', 5)
      expect(params).toHaveProperty('metric_type', 'tokens')
      expect(params).not.toHaveProperty('userId')
      expect(params).not.toHaveProperty('metricType')
    })

    it('should only include defined params', async () => {
      mockGet.mockResolvedValue([])

      await getPersonalHeatmap({ days: 7 })

      const callArgs = mockGet.mock.calls[0]
      const params = callArgs[1].params

      expect(params).toHaveProperty('days', 7)
      expect(params).not.toHaveProperty('user_id')
      expect(params).not.toHaveProperty('metric_type')
    })
  })

  describe('getHeatmapData', () => {
    it('should fetch global heatmap data (Task 1.5)', async () => {
      const mockResponse: GlobalHeatmapResponse = {
        userId: 1,
        data: [{ date: '2024-01-01', count: 10, level: 2 }],
        totalDays: 30,
        startDate: '2024-01-01',
        endDate: '2024-01-30',
      }
      mockGet.mockResolvedValue(mockResponse)

      const result = await getHeatmapData()

      expect(mockGet).toHaveBeenCalledWith('/stats/global/heatmap', { params: {} })
      expect(result).toEqual(mockResponse)
    })

    it('should support date range and userId params', async () => {
      mockGet.mockResolvedValue({} as GlobalHeatmapResponse)

      await getHeatmapData({ userId: 1, startDate: '2024-01-01', endDate: '2024-01-31' })

      expect(mockGet).toHaveBeenCalledWith('/stats/global/heatmap', {
        params: { user_id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
      })
    })
  })

  describe('getProjectStats', () => {
    it('should fetch project stats (Task 4.2 - new API)', async () => {
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

      expect(mockGet).toHaveBeenCalledWith('/stats/projects/1')
      expect(result).toEqual(mockResponse)
    })
  })
})
