/**
 * HTTP Request Utility
 * HTTP请求工具
 *
 * @description 基于 Axios 封装的 HTTP 请求工具，支持拦截器、Token 刷新和错误处理
 *              自动转换 camelCase/snake_case 命名规范
 * @author DevMetrics Team
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

/**
 * 创建 axios 实例
 * @type {AxiosInstance}
 */
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求队列（用于防止重复请求）
 * @type {Map<string, AxiosRequestConfig>}
 */
const pendingRequests = new Map()

/**
 * 生成请求唯一标识
 * @param {AxiosRequestConfig} config - 请求配置
 * @returns {string} 请求唯一标识
 */
const getRequestKey = (config: AxiosRequestConfig): string => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params)}_${JSON.stringify(config.data)}`
}

/**
 * 添加请求到队列
 * @param {AxiosRequestConfig} config - 请求配置
 */
const addPendingRequest = (config: AxiosRequestConfig): void => {
  const key = getRequestKey(config)
  if (!pendingRequests.has(key)) {
    pendingRequests.set(key, config)
  }
}

/**
 * 从队列中移除请求
 * @param {AxiosRequestConfig} config - 请求配置
 */
const removePendingRequest = (config: AxiosRequestConfig): void => {
  const key = getRequestKey(config)
  if (pendingRequests.has(key)) {
    pendingRequests.delete(key)
  }
}

/**
 * 请求拦截器
 * 添加 Token、防止重复请求、转换 camelCase -> snake_case
 */
request.interceptors.request.use(
  config => {
    // 转换请求数据: camelCase -> snake_case
    if (config.data) {
      config.data = snakecaseKeys(config.data, { deep: true })
    }
    if (config.params) {
      config.params = snakecaseKeys(config.params, { deep: true })
    }

    // 添加token
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    // 防止重复请求
    removePendingRequest(config)
    addPendingRequest(config)

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 * 处理业务错误、HTTP 错误、转换 snake_case -> camelCase
 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    removePendingRequest(response.config)

    // DEBUG: Log raw response
    console.log('[DEBUG] Response interceptor - raw response:', {
      url: response.config.url,
      status: response.status,
      rawData: response.data,
    })

    // 转换响应数据: snake_case -> camelCase
    if (response.data) {
      response.data = camelcaseKeys(response.data, { deep: true })
    }

    // DEBUG: Log transformed response
    console.log('[DEBUG] Response interceptor - after camelcase transform:', {
      url: response.config.url,
      transformedData: response.data,
    })

    const { code, message, data } = response.data

    // DEBUG: Log extracted data
    console.log('[DEBUG] Response interceptor - extracted data:', {
      url: response.config.url,
      code,
      message,
      data,
    })

    // 业务错误处理 - 支持所有2xx成功状态码
    if (code < 200 || code >= 300) {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }

    return data
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig
    if (config) {
      removePendingRequest(config)
    }

    const { response } = error

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          // 登录请求返回401，直接显示错误，不尝试刷新
          if (config.url?.includes('auth/login')) {
            ElMessage.error((data as { message?: string })?.message || '用户名或密码错误')
            break
          }
          // Token过期，尝试刷新
          const authStore = useAuthStore()
          try {
            await authStore.refreshAccessToken()
            // 重试原请求 - 使用新的token
            if (config) {
              // 更新请求头中的Authorization
              if (authStore.token) {
                config.headers = config.headers || {}
                config.headers.Authorization = `Bearer ${authStore.token}`
              }
              return request(config)
            }
          } catch {
            // 刷新失败，登出
            authStore.logout()
            window.location.href = '/login'
          }
          break

        case 403:
          ElMessage.error('没有权限执行此操作')
          break

        case 404:
          ElMessage.error('请求的资源不存在')
          break

        case 500:
          ElMessage.error('服务器内部错误')
          break

        default:
          ElMessage.error((data as { message?: string })?.message || '网络错误')
      }
    } else {
      ElMessage.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)

/**
 * HTTP 请求方法封装
 * @namespace http
 */
export const http = {
  /**
   * GET 请求
   * @template T 响应数据类型
   * @param {string} url - 请求地址
   * @param {AxiosRequestConfig} [config] - 请求配置
   * @returns {Promise<T>} 响应数据
   */
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return request.get(url, config)
  },

  /**
   * POST 请求
   * @template T 响应数据类型
   * @param {string} url - 请求地址
   * @param {unknown} [data] - 请求体数据
   * @param {AxiosRequestConfig} [config] - 请求配置
   * @returns {Promise<T>} 响应数据
   */
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return request.post(url, data, config)
  },

  /**
   * PUT 请求
   * @template T 响应数据类型
   * @param {string} url - 请求地址
   * @param {unknown} [data] - 请求体数据
   * @param {AxiosRequestConfig} [config] - 请求配置
   * @returns {Promise<T>} 响应数据
   */
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return request.put(url, data, config)
  },

  /**
   * PATCH 请求
   * @template T 响应数据类型
   * @param {string} url - 请求地址
   * @param {unknown} [data] - 请求体数据
   * @param {AxiosRequestConfig} [config] - 请求配置
   * @returns {Promise<T>} 响应数据
   */
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return request.patch(url, data, config)
  },

  /**
   * DELETE 请求
   * @template T 响应数据类型
   * @param {string} url - 请求地址
   * @param {AxiosRequestConfig} [config] - 请求配置
   * @returns {Promise<T>} 响应数据
   */
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return request.delete(url, config)
  },
}

export default request
