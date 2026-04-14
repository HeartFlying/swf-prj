/**
 * 缓存管理相关API
 */
import { http } from '@/utils/request'
import type {
  CacheStats,
  ClearCacheResponse,
  CacheHealthResponse,
} from '@/types/api'

/**
 * 获取缓存统计
 * @returns 缓存统计信息
 */
export const getCacheStats = (): Promise<CacheStats> => {
  return http.get<CacheStats>('cache/stats')
}

/**
 * 清空所有缓存
 * 参数转换: camelCase -> snake_case
 *   cacheType -> cache_type (后端使用 snake_case)
 *   userId    -> user_id    (后端使用 snake_case)
 *   projectId -> project_id (后端使用 snake_case)
 * @param params 清除参数 (前端使用 camelCase)
 * @returns 清空结果
 */
export const clearAllCache = (params?: {
  cacheType?: 'all' | 'stats' | 'user' | 'project' | 'dashboard' | 'trend'
  userId?: number
  projectId?: number
}): Promise<ClearCacheResponse> => {
  // 将前端 camelCase 参数转换为后端 snake_case 参数
  const convertedParams: Record<string, unknown> = {}
  if (params?.cacheType !== undefined) convertedParams.cache_type = params.cacheType  // camelCase -> snake_case
  if (params?.userId !== undefined) convertedParams.user_id = params.userId            // camelCase -> snake_case
  if (params?.projectId !== undefined) convertedParams.project_id = params.projectId    // camelCase -> snake_case

  return http.post<ClearCacheResponse>('cache/clear', null, { params: convertedParams })
}

/**
 * 按模式清空缓存
 * @param pattern 缓存键模式（如 "user:*"）
 * @returns 清空结果
 */
export const clearCacheByPattern = (pattern: string): Promise<ClearCacheResponse> => {
  return http.post<ClearCacheResponse>('cache/clear-pattern', null, {
    params: { pattern }
  })
}

/**
 * 缓存健康检查
 * @returns 健康检查结果
 */
export const checkCacheHealth = (): Promise<CacheHealthResponse> => {
  return http.get<CacheHealthResponse>('cache/health')
}
