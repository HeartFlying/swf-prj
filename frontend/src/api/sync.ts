/**
 * 同步任务相关API
 */
import { http } from '@/utils/request'
import type {
  PaginatedResponse,
  SyncTask,
  SyncTaskCreate,
  SyncLog,
  SyncGitLabRequest,
  SyncTraeRequest,
  SyncZendaoRequest,
} from '@/types/api'

/**
 * 获取同步任务列表
 * @param params 查询参数
 * @returns 同步任务列表（分页）
 */
export const getSyncTasks = (params?: {
  page?: number
  pageSize?: number
  status?: string
  sourceType?: string
}): Promise<PaginatedResponse<SyncTask>> => {
  return http.get<PaginatedResponse<SyncTask>>('sync/tasks', { params })
}

/**
 * 获取同步任务详情
 * @param taskId 任务ID
 * @returns 同步任务详情
 */
export const getSyncTaskById = (taskId: number): Promise<SyncTask> => {
  return http.get<SyncTask>(`/sync/tasks/${taskId}`)
}

/**
 * 创建同步任务
 * @param data 同步任务创建数据
 * @returns 创建的同步任务
 */
export const createSyncTask = (data: SyncTaskCreate): Promise<SyncTask> => {
  return http.post<SyncTask>('sync/tasks', data)
}

/**
 * 触发同步任务
 * @param taskId 任务ID
 * @returns 触发后的同步任务
 */
export const triggerSync = (taskId: number): Promise<SyncTask> => {
  return http.post<SyncTask>(`/sync/tasks/${taskId}/trigger`)
}

/**
 * 获取同步日志
 * 后端返回: ApiResponse[SyncLogListResponse] -> HTTP拦截器解包后返回: PaginatedResponse[SyncLog]
 * @param taskId 任务ID
 * @param params 查询参数
 * @returns 同步日志列表（分页）
 */
export const getSyncLogs = (
  taskId: number,
  params?: { page?: number; pageSize?: number; level?: string }
): Promise<PaginatedResponse<SyncLog>> => {
  return http.get<PaginatedResponse<SyncLog>>(`/sync/tasks/${taskId}/logs`, { params })
}

/**
 * 获取同步状态
 * @returns 同步状态
 */
export const getSyncStatus = (): Promise<{
  isRunning: boolean
  lastSyncAt: string | null
  pendingTasks: number
}> => {
  return http.get<{ isRunning: boolean; lastSyncAt: string | null; pendingTasks: number }>('sync/status')
}

/**
 * 执行GitLab同步
 * @param data GitLab同步请求数据
 * @returns 同步任务
 */
export const syncGitLab = (data: SyncGitLabRequest): Promise<SyncTask> => {
  return http.post<SyncTask>('sync/gitlab', data)
}

/**
 * 执行Trae同步
 * @param data Trae同步请求数据
 * @returns 同步任务
 */
export const syncTrae = (data: SyncTraeRequest): Promise<SyncTask> => {
  return http.post<SyncTask>('sync/trae', data)
}

/**
 * 执行禅道同步
 * @param data 禅道同步请求数据
 * @returns 同步任务
 */
export const syncZendao = (data: SyncZendaoRequest): Promise<SyncTask> => {
  return http.post<SyncTask>('sync/zendao', data)
}

/**
 * 取消同步任务
 * @param taskId 任务ID
 * @returns 取消后的同步任务
 */
export const cancelSyncTask = (taskId: number): Promise<SyncTask> => {
  return http.post<SyncTask>(`/sync/tasks/${taskId}/cancel`)
}

/**
 * 获取全局同步日志
 * 后端返回: ApiResponse[SyncLogListResponse] -> HTTP拦截器解包后返回: PaginatedResponse[SyncLog]
 * @param params 查询参数
 * @returns 同步日志列表（分页）
 */
export const getAllSyncLogs = (params?: {
  page?: number
  pageSize?: number
  taskId?: number
  level?: string
}): Promise<PaginatedResponse<SyncLog>> => {
  return http.get<PaginatedResponse<SyncLog>>('sync/logs', { params })
}
