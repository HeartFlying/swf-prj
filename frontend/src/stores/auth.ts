import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/utils/request'
import type { LoginRequest, LoginResponse, User } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(
    () => user.value?.role?.name === 'admin' || user.value?.role?.permissions?.includes('*')
  )

  // Actions
  const setTokens = (accessToken: string, newRefreshToken: string) => {
    token.value = accessToken
    refreshToken.value = newRefreshToken
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
  }

  const clearTokens = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  const login = async (credentials: LoginRequest): Promise<void> => {
    loading.value = true
    try {
      const response = await http.post<LoginResponse>('auth/login', credentials)
      setTokens(response.accessToken, response.refreshToken)
      user.value = response.user
    } catch (error) {
      // Re-throw error for component to handle
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      if (refreshToken.value) {
        await http.post('auth/logout', { refreshToken: refreshToken.value })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearTokens()
    }
  }

  const refreshAccessToken = async (): Promise<void> => {
    if (!refreshToken.value) {
      throw new Error('No refresh token')
    }

    // 请求发送时会被 snakecaseKeys 转换为 { refresh_token: string }
    // 后端返回: { access_token, token_type }
    // 响应返回时会被 camelcaseKeys 转换为 { accessToken, tokenType }
    const response = await http.post<{
      accessToken: string
      tokenType: string
    }>('auth/refresh', {
      refreshToken: refreshToken.value,
    })

    // 使用 camelCase 字段名访问（经过 camelcaseKeys 转换后）
    token.value = response.accessToken
    localStorage.setItem('token', response.accessToken)
  }

  const fetchCurrentUser = async (): Promise<void> => {
    const response = await http.get<User>('auth/me')
    user.value = response
  }

  return {
    // State
    token,
    refreshToken,
    user,
    loading,
    // Getters
    isAuthenticated,
    isAdmin,
    // Actions
    login,
    logout,
    refreshAccessToken,
    fetchCurrentUser,
    setTokens,
    clearTokens,
  }
})
