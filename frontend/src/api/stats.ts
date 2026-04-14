/**
 * 统计相关API
 */
import { http } from '@/utils/request'
import type {
  PersonalDashboard,
  ProjectDashboard,
  TokenTrendResponse,
  ActivityTrendResponse,
  TopUserResponse,
  ProjectStatsResponse,
  CodeRankResponse,
  BugTrendResponse,
  AIAdoptionResponse,
  PersonalCodeStatsResponse,
  PersonalTokenStatsResponse,
  PersonalBugRateResponse,
  CommitRankResponse,
  TopUsersResponse,
  CodeTrendResponse,
  GlobalHeatmapResponse,
  ActivityHourData,
} from '@/types/api'

/**
 * 获取个人仪表盘数据
 * @param params 查询参数
 * @returns 个人仪表盘数据
 */
export const getPersonalDashboard = (params?: {
  startDate?: string
  endDate?: string
}): Promise<PersonalDashboard> => {
  return http.get<PersonalDashboard>('stats/personal/dashboard', { params })
}

/**
 * 获取个人代码统计
 * @param params 查询参数
 * @returns 个人代码统计
 */
export const getPersonalCodeStats = (params?: {
  userId?: number
  startDate?: string
  endDate?: string
}): Promise<PersonalCodeStatsResponse> => {
  return http.get<PersonalCodeStatsResponse>('stats/personal/code', { params })
}

/**
 * 获取个人Token统计
 * @param params 查询参数
 * @returns 个人Token统计
 */
export const getPersonalTokenStats = (params?: {
  userId?: number
  startDate?: string
  endDate?: string
}): Promise<PersonalTokenStatsResponse> => {
  return http.get<PersonalTokenStatsResponse>('stats/personal/tokens', { params })
}

/**
 * 获取个人Bug率统计
 * @param params 查询参数
 * @returns 个人Bug率统计
 */
export const getPersonalBugRate = (params?: {
  userId?: number
  projectId?: number
  startDate?: string
  endDate?: string
}): Promise<PersonalBugRateResponse> => {
  return http.get<PersonalBugRateResponse>('stats/personal/bugs', { params })
}

/**
 * 获取项目仪表盘数据
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns 项目仪表盘数据
 */
export const getProjectDashboard = (
  projectId: number,
  params?: { startDate?: string; endDate?: string }
): Promise<ProjectDashboard> => {
  return http.get<ProjectDashboard>(`/stats/projects/${projectId}/dashboard`, { params })
}

/**
 * 获取项目代码排行
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns 代码排行
 */
export const getProjectCodeRank = (
  projectId: number,
  params?: { startDate?: string; endDate?: string }
): Promise<CodeRankResponse[]> => {
  return http.get<CodeRankResponse[]>(`/stats/projects/${projectId}/code-rank`, { params })
}

/**
 * 获取项目Bug趋势
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns Bug趋势
 */
export const getProjectBugTrend = (
  projectId: number,
  params?: { startDate?: string; endDate?: string }
): Promise<BugTrendResponse> => {
  return http.get<BugTrendResponse>(`/stats/projects/${projectId}/bug-trend`, { params })
}

/**
 * 获取项目代码趋势
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns 代码趋势（包含每日新增、删除和累计代码行数）
 */
export const getProjectCodeTrend = (
  projectId: number,
  params?: { startDate?: string; endDate?: string }
): Promise<CodeTrendResponse> => {
  return http.get<CodeTrendResponse>(`/stats/projects/${projectId}/code-trend`, { params })
}

/**
 * 获取项目AI采纳率
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns AI采纳率
 */
export const getProjectAIAdoption = (
  projectId: number,
  params?: { days?: number }
): Promise<AIAdoptionResponse[]> => {
  return http.get<AIAdoptionResponse[]>(`/stats/projects/${projectId}/ai-adoption`, {
    params: { days: params?.days || 30 }
  })
}

/**
 * 获取全局Token趋势
 * @param params 查询参数
 * @returns Token趋势
 */
export const getGlobalTokenTrend = (params?: {
  startDate?: string
  endDate?: string
}): Promise<TokenTrendResponse> => {
  return http.get<TokenTrendResponse>('stats/global/token-trend', { params })
}

/**
 * 获取活动趋势
 * @param params 查询参数
 * @returns 活动趋势
 */
export const getActivityTrend = (params?: {
  days?: number
}): Promise<ActivityTrendResponse> => {
  return http.get<ActivityTrendResponse>('stats/global/activity-trend', {
    params: { days: params?.days || 30 }
  })
}

/**
 * 获取用户排行（V1 - 返回数组）
 * @param params 查询参数
 * @returns 用户排行
 */
export const getTopUsers = (params?: {
  type?: 'tokens' | 'commits'
  limit?: number
}): Promise<TopUserResponse[]> => {
  return http.get<TopUserResponse[]>('stats/global/top-users', { params })
}

/**
 * 获取用户排行（V2 - 返回结构化对象）
 * @param params 查询参数
 * @returns 用户排行
 */
export const getTopUsersV2 = (params?: {
  type?: 'tokens' | 'commits'
  limit?: number
  days?: number
}): Promise<TopUsersResponse> => {
  return http.get<TopUsersResponse>('stats/global/top-users-v2', { params })
}

/**
 * 获取项目提交数排行
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns 提交数排行
 */
export const getProjectCommitRank = (
  projectId: number,
  params?: { startDate?: string; endDate?: string; limit?: number }
): Promise<CommitRankResponse[]> => {
  return http.get<CommitRankResponse[]>(`/stats/projects/${projectId}/commit-rank`, { params })
}

/**
 * 获取全局统计摘要
 * @param params 查询参数
 * @returns 全局统计摘要
 */
export const getGlobalSummary = (params?: {
  days?: number
}): Promise<{
  totalUsers: number
  totalProjects: number
  totalCommits: number
  totalTokens: number
  totalBugs: number
  activeUsersToday: number
  periodDays: number
}> => {
  return http.get<{
    totalUsers: number
    totalProjects: number
    totalCommits: number
    totalTokens: number
    totalBugs: number
    activeUsersToday: number
    periodDays: number
  }>('stats/global/summary', { params })
}

/**
 * 获取个人热力图数据
 * 参数转换: camelCase -> snake_case
 *   userId     -> user_id     (后端使用 snake_case)
 *   metricType -> metric_type (后端使用 snake_case)
 * @param params 查询参数 (前端使用 camelCase)
 * @returns 热力图数据
 */
export const getPersonalHeatmap = (params?: {
  userId?: number
  days?: number
  metricType?: string
}): Promise<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[]> => {
  // 将前端 camelCase 参数转换为后端 snake_case 参数
  const convertedParams: Record<string, unknown> = {}
  if (params?.userId !== undefined) convertedParams.user_id = params.userId      // camelCase -> snake_case
  if (params?.days !== undefined) convertedParams.days = params.days
  if (params?.metricType !== undefined) convertedParams.metric_type = params.metricType  // camelCase -> snake_case

  return http.get<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[]>('stats/personal/heatmap', {
    params: convertedParams
  })
}

/**
 * 获取全局热力图数据
 * 参数转换: camelCase -> snake_case
 *   userId    -> user_id    (后端使用 snake_case)
 *   startDate -> start_date (后端使用 snake_case)
 *   endDate   -> end_date   (后端使用 snake_case)
 * @param params 查询参数 (前端使用 camelCase)
 * @returns 热力图数据
 */
export const getHeatmapData = (params?: {
  userId?: number
  startDate?: string
  endDate?: string
}): Promise<GlobalHeatmapResponse> => {
  // 将前端 camelCase 参数转换为后端 snake_case 参数
  const convertedParams: Record<string, unknown> = {}
  if (params?.userId !== undefined) convertedParams.user_id = params.userId          // camelCase -> snake_case
  if (params?.startDate !== undefined) convertedParams.start_date = params.startDate  // camelCase -> snake_case
  if (params?.endDate !== undefined) convertedParams.end_date = params.endDate        // camelCase -> snake_case

  return http.get<GlobalHeatmapResponse>('stats/global/heatmap', {
    params: convertedParams
  })
}

/**
 * 获取项目统计概览
 * @param projectId 项目ID
 * @returns 项目统计概览
 */
export const getProjectStats = (projectId: number): Promise<ProjectStatsResponse> => {
  return http.get<ProjectStatsResponse>(`/stats/projects/${projectId}`)
}

/**
 * 获取个人活跃时段数据（按小时统计）
 * 参数转换: camelCase -> snake_case
 *   userId    -> user_id    (后端使用 snake_case)
 *   startDate -> start_date (后端使用 snake_case)
 *   endDate   -> end_date   (后端使用 snake_case)
 * @param params 查询参数 (前端使用 camelCase)
 * @returns 24小时活跃数据
 */
export const getPersonalActivityHours = (params?: {
  userId?: number
  startDate?: string
  endDate?: string
}): Promise<ActivityHourData[]> => {
  // 将前端 camelCase 参数转换为后端 snake_case 参数
  const convertedParams: Record<string, unknown> = {}
  if (params?.userId !== undefined) convertedParams.user_id = params.userId          // camelCase -> snake_case
  if (params?.startDate !== undefined) convertedParams.start_date = params.startDate  // camelCase -> snake_case
  if (params?.endDate !== undefined) convertedParams.end_date = params.endDate        // camelCase -> snake_case

  return http.get<ActivityHourData[]>('stats/personal/activity-hours', {
    params: convertedParams
  })
}
