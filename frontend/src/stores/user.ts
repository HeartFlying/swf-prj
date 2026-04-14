import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/utils/request'
import type {
  User,
  Project,
  PersonalDashboard,
  ProjectDashboard,
  CodeStats,
  TokenUsage,
} from '@/types/api'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null)
  const projects = ref<Project[]>([])
  const personalDashboard = ref<PersonalDashboard | null>(null)
  const projectDashboards = ref<Map<number, ProjectDashboard>>(new Map())
  const loading = ref(false)
  const statsLoading = ref(false)

  // Getters
  const currentUser = computed(() => user.value)
  const userProjects = computed(() => projects.value)
  const hasProjects = computed(() => projects.value.length > 0)

  // Actions
  const fetchUserProfile = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await http.get<User>('users/me')
      user.value = response
    } finally {
      loading.value = false
    }
  }

  const updateUserProfile = async (data: Partial<User>): Promise<void> => {
    const response = await http.patch<User>('users/me', data)
    user.value = response
  }

  const fetchUserProjects = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await http.get<Project[]>('users/me/projects')
      projects.value = response
    } finally {
      loading.value = false
    }
  }

  const fetchPersonalDashboard = async (dateRange?: {
    start: string
    end: string
  }): Promise<void> => {
    statsLoading.value = true
    try {
      const params = dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : {}
      const response = await http.get<PersonalDashboard>('stats/personal/dashboard', { params })
      personalDashboard.value = response
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

  const changePassword = async (data: {
    oldPassword: string
    newPassword: string
  }): Promise<void> => {
    await http.post('users/me/change-password', data)
  }

  return {
    // State
    user,
    projects,
    personalDashboard,
    projectDashboards,
    loading,
    statsLoading,
    // Getters
    currentUser,
    userProjects,
    hasProjects,
    // Actions
    fetchUserProfile,
    updateUserProfile,
    fetchUserProjects,
    fetchPersonalDashboard,
    fetchProjectDashboard,
    fetchCodeStats,
    fetchTokenUsage,
    changePassword,
  }
})
