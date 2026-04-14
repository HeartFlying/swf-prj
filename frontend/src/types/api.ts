// API类型定义

// 通用响应
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 角色
export interface Role {
  id: number
  name: string
  description?: string
  permissions: string[]
}

// 用户
export interface User {
  id: number
  username: string
  email: string
  department: string
  isActive: boolean
  roleId?: number
  role?: Role
  avatar?: string
  createdAt?: string
  updatedAt?: string
}

// 创建用户请求
export interface UserCreate {
  username: string
  email: string
  department: string
  password: string
  roleId?: number
}

// 更新用户请求
export interface UserUpdate {
  email?: string
  department?: string
  isActive?: boolean
  roleId?: number
}

// 更新当前用户资料请求
export interface UserProfileUpdate {
  email?: string
  department?: string
  avatar?: string
}

// 项目
export interface Project {
  id: number
  name: string
  code: string
  description?: string
  stage: string
  status: 'active' | 'archived' | 'deleted'
  startDate?: string
  endDate?: string
  managerId?: number
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
}

// 项目成员
export interface ProjectMember {
  id: number
  projectId: number
  userId: number
  role: 'owner' | 'maintainer' | 'developer' | 'member'
  joinedAt: string
  username?: string
  email?: string
  user?: User
}

// 代码统计
export interface CodeStats {
  id: number
  userId: number
  projectId?: number
  date: string
  additions: number
  deletions: number
  commits: number
  filesChanged: number
  languages: Record<string, number>
}

// Token使用统计
export interface TokenUsage {
  id: number
  userId: number
  date: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  model: string
  requestCount: number
}

// 会话统计
export interface SessionStats {
  id: number
  userId: number
  date: string
  sessionCount: number
  totalDuration: number // 分钟
  avgDuration: number
  activeHours: number[]
}

// 个人仪表盘数据
export interface PersonalDashboard {
  todayStats: {
    commits: number
    additions: number
    deletions: number
    tokens: number
    sessions: number
  }
  weeklyTrend: {
    dates: string[]
    commits: number[]
    tokens: number[]
  }
  languageStats: {
    language: string
    lines: number
    percentage: number
  }[]
  heatmapData: {
    date: string
    count: number
    level: 0 | 1 | 2 | 3 | 4
  }[]
  ranking: {
    commits: number
    totalUsers: number
  }
}

// 项目仪表盘数据
export interface ProjectDashboard {
  project_id: number
  project_name: string
  total_stats: {
    commits: number
    contributors: number
    lines_of_code: number
    pull_requests: number
  }
  member_stats: {
    user_id: number
    username: string
    commits: number
    additions: number
    deletions: number
    tokens: number
  }[]
  language_distribution: {
    language: string
    percentage: number
  }[]
  commit_trend: {
    dates: string[]
    commits: number[]
  }
}

// 同步任务
export interface SyncTask {
  id: number
  userId?: number
  taskType: string
  sourceType: string
  projectId?: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  recordsProcessed?: number
  recordsFailed?: number
  errorMessage?: string
  message?: string
  startedAt?: string
  completedAt?: string
  nextRunTime?: string
  createdAt: string
}

// 同步任务创建请求
export interface SyncTaskCreate {
  sourceType: string
  projectIds?: number[]
  startDate?: string
  endDate?: string
}

// GitLab同步请求
export interface SyncGitLabRequest {
  projectId?: number
  syncType: 'full_sync' | 'incremental_sync'
  startDate?: string
  endDate?: string
}

// Trae同步请求
export interface SyncTraeRequest {
  userId?: number
  syncType: 'full_sync' | 'incremental_sync'
  startDate?: string
  endDate?: string
}

// 禅道同步请求
export interface SyncZendaoRequest {
  projectId?: number
  syncType: 'full_sync' | 'incremental_sync'
  startDate?: string
  endDate?: string
}

// 同步日志 - 与后端 SyncLogResponse 对齐 (snake_case)
export interface SyncLog {
  id: number
  task_id: number
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  details?: Record<string, unknown> | null
  created_at: string
}

// 同步日志列表响应 - 与后端 SyncLogListResponse 对齐
export interface SyncLogListResponse {
  items: SyncLog[]
  total: number
  page: number
  pageSize: number
}

// 系统设置
export interface SystemSettings {
  syncEnabled: boolean
  autoSyncInterval: number // 分钟
  retentionDays: number
  maxProjectsPerUser: number
  allowedModels: string[]
}

// 登录请求
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: User
}

// Token刷新请求
export interface RefreshTokenRequest {
  refreshToken: string
}

// 登出请求
export interface LogoutRequest {
  refreshToken?: string
}

// 登出响应
export interface LogoutResponse {
  message: string
}

// 刷新Token响应
export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

// Token趋势响应
export interface TokenTrendResponse {
  dates: string[]
  values: number[]
}

// 活动趋势响应
export interface ActivityTrendResponse {
  dates: string[]
  activeUsers: number[]
  totalCommits: number[]
}

// 用户排行响应
export interface TopUserResponse {
  userId: number
  username: string
  department?: string
  tokenCount: number
  commitCount: number
}

// 项目统计响应
export interface ProjectStatsResponse {
  projectId: number
  projectName: string
  totalCommits: number
  totalTokens: number
  activeMembers: number
  bugCount: number
}

// 代码排行响应
export interface CodeRankResponse {
  userId: number
  username: string
  linesAdded: number
  linesDeleted: number
  totalLines: number
}

// Bug趋势响应
export interface BugTrendResponse {
  dates: string[]
  created: number[]
  resolved: number[]
}

// AI采纳率响应
export interface AIAdoptionResponse {
  date: string
  adoptionRate: number
  aiSuggestions: number
  acceptedSuggestions: number
}

// 个人代码统计响应
export interface PersonalCodeStatsResponse {
  totalCommits: number
  totalPrs: number
  linesAdded: number
  linesDeleted: number
  avgCommitsPerDay: number
}

// 个人Token统计响应
export interface PersonalTokenStatsResponse {
  totalTokens: number
  promptTokens: number
  completionTokens: number
  avgTokensPerDay: number
}

// 个人Bug率响应
export interface PersonalBugRateResponse {
  totalBugs: number
  criticalBugs: number
  bugRate: number
  resolvedBugs: number
}

// 今日统计
export interface TodayStats {
  commits: number
  additions: number
  deletions: number
  tokens: number
  sessions: number
}

// 周趋势
export interface WeeklyTrend {
  dates: string[]
  commits: number[]
  tokens: number[]
}

// 语言统计
export interface LanguageStat {
  language: string
  lines: number
  percentage: number
}

// 热力图数据点
export interface HeatmapDataPoint {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

// 全局热力图响应
export interface GlobalHeatmapResponse {
  userId: number
  data: HeatmapDataPoint[]
  totalDays: number
  startDate: string
  endDate: string
}

// 排行信息
export interface RankingInfo {
  commits: number
  totalUsers: number
}

// 项目总体统计
export interface TotalStats {
  commits: number
  contributors: number
  linesOfCode: number
  pullRequests: number
}

// 成员统计
export interface MemberStat {
  userId: number
  username: string
  commits: number
  additions: number
  deletions: number
  tokens: number
}

// 语言分布
export interface LanguageDistribution {
  language: string
  percentage: number
}

// 提交趋势
export interface CommitTrend {
  dates: string[]
  commits: number[]
}

// 代码趋势响应
export interface CodeTrendResponse {
  dates: string[]
  total_lines: number[]
  additions: number[]
  deletions: number[]
}

// 提交排行响应
export interface CommitRankResponse {
  userId: number
  username: string
  commitCount: number
  avgCommitsPerDay: number
}

// 全局摘要响应
export interface GlobalSummaryResponse {
  totalUsers: number
  totalProjects: number
  totalCommits: number
  totalTokens: number
  totalBugs: number
  activeUsersToday: number
  periodDays: number
}

// 用户排行列表响应（V2）
export interface TopUsersResponse {
  users: TopUserResponse[]
  totalCount: number
}

// 缓存统计响应
export interface CacheStats {
  enabled: boolean
  keysCount: number      // 映射 keys_count
  statsKeys: number      // 映射 stats_keys
  dashboardKeys: number  // 映射 dashboard_keys
}

// 清空缓存响应
export interface ClearCacheResponse {
  clearedKeys: number   // 对应 cleared_keys
  cacheType?: string    // 对应 cache_type
}

// 缓存健康检查响应
export interface CacheHealthResponse {
  status: 'healthy' | 'unhealthy'
  enabled: boolean      // 后端实际返回
}

// 活跃时段数据点
export interface ActivityHourData {
  hour: number      // 0-23
  count: number     // 该时段的活动计数
}
