import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/utils/request'
import type { PersonalDashboard, ProjectDashboard, CodeStats, TokenUsage, HeatmapDataPoint } from '@/types/api'

// 排行榜用户
interface RankingUser {
  id: number
  name: string
  score: number
  department?: string
}

// 热力图数据
// @deprecated Use HeatmapDataPoint from @/.types/api instead
interface HeatmapDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export const useStatsStore = defineStore('stats', () => {
  // State
  const personalDashboard = ref<PersonalDashboard | null>(null)
  const projectDashboards = ref<Map<number, ProjectDashboard>>(new Map())
  const globalRanking = ref<RankingUser[]>([])
  const heatmapData = ref<HeatmapDataPoint[]>([])
  const loading = ref(false)
  const statsLoading = ref(false)

  // Getters
  const todayStats = computed(() => {
    return (
      personalDashboard.value?.todayStats || {
        commits: 0,
        additions: 0,
        deletions: 0,
        tokens: 0,
        sessions: 0,
      }
    )
  })

  const weeklyTrend = computed(() => {
    return (
      personalDashboard.value?.weeklyTrend || {
        dates: [],
        commits: [],
        tokens: [],
      }
    )
  })

  const languageStats = computed(() => {
    return personalDashboard.value?.languageStats || []
  })

  // Actions
  const fetchPersonalDashboard = async (dateRange?: {
    start: string
    end: string
  }): Promise<void> => {
    statsLoading.value = true
    try {
      const params = dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : {}
      const response = await http.get<PersonalDashboard>('stats/personal/dashboard', { params })
      personalDashboard.value = response

      // 同时更新热力图数据
      if (response.heatmapData) {
        heatmapData.value = response.heatmapData
      }
    } finally {
      statsLoading.value = false
    }
  }

  const fetchProjectDashboard = async (projectId: number): Promise<void> => {
    statsLoading.value = true
    try {
      const response = await http.get<ProjectDashboard>(`stats/projects/${projectId}/dashboard`)
      projectDashboards.value.set(projectId, response)
    } finally {
      statsLoading.value = false
    }
  }

  const fetchGlobalRanking = async (limit: number = 20): Promise<void> => {
    loading.value = true
    try {
      // 使用全局统计API获取TOP用户
      const response = await http.get<
        Array<{
          user_id: number
          username: string
          department?: string
          token_count: number
          commit_count: number
        }>
      >('stats/global/top-users', { params: { limit } })

      // 转换为排行榜格式
      globalRanking.value = response.map(user => ({
        id: user.user_id,
        name: user.username,
        department: user.department,
        score: user.token_count ?? 0,
      }))
    } finally {
      loading.value = false
    }
  }

  const fetchHeatmapData = async (_params?: {
    startDate?: string
    endDate?: string
    userId?: number
  }): Promise<void> => {
    loading.value = true
    try {
      // 如果个人仪表盘已有热力图数据，直接使用
      if (personalDashboard.value?.heatmapData?.length) {
        heatmapData.value = personalDashboard.value.heatmapData
        return
      }
      // 否则尝试从个人仪表盘获取热力图数据
      await fetchPersonalDashboard()
      // 如果还是没有数据，使用空数组
      if (!heatmapData.value.length) {
        heatmapData.value = []
      }
    } finally {
      loading.value = false
    }
  }

  const fetchCodeStats = async (params?: {
    startDate?: string
    endDate?: string
    projectId?: number
  }): Promise<CodeStats[]> => {
    return http.get<CodeStats[]>('stats/personal/code', { params })
  }

  const fetchTokenUsage = async (params?: {
    startDate?: string
    endDate?: string
    model?: string
  }): Promise<TokenUsage[]> => {
    return http.get<TokenUsage[]>('stats/personal/tokens', { params })
  }

  const clearStats = () => {
    personalDashboard.value = null
    projectDashboards.value.clear()
    globalRanking.value = []
    heatmapData.value = []
  }

  return {
    // State
    personalDashboard,
    projectDashboards,
    globalRanking,
    heatmapData,
    loading,
    statsLoading,
    // Getters
    todayStats,
    weeklyTrend,
    languageStats,
    // Actions
    fetchPersonalDashboard,
    fetchProjectDashboard,
    fetchGlobalRanking,
    fetchHeatmapData,
    fetchCodeStats,
    fetchTokenUsage,
    clearStats,
  }
})
