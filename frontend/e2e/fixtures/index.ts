/**
 * Fixtures 统一导出文件
 * 集中导出所有 mock fixtures，方便测试文件使用
 *
 * @example
 * ```typescript
 * import { mockLoginApi, mockAllDashboardApis } from '../fixtures'
 * ```
 */

// 登录相关 mock
export {
  loginSuccessResponse,
  userLoginSuccessResponse,
  loginFailureResponse,
  mockLoginApi,
  mockLoginFailureApi,
  mockLoginNetworkErrorApi,
  mockLoginWithDelayApi
} from './login-mock'

// 仪表板相关 mock
export {
  personalDashboardResponse,
  topUsersResponse,
  userProjectsResponse,
  mockPersonalDashboardApi,
  mockTopUsersApi,
  mockUserProjectsApi,
  mockAllDashboardApis
} from './dashboard-mock'

// 统计数据相关 mock
export {
  personalStatsResponse,
  projectStatsResponse,
  trendsResponse,
  heatmapDataResponse,
  languageStatsResponse,
  tokenStatsResponse,
  mockPersonalStatsApi,
  mockProjectStatsApi,
  mockTrendsApi,
  mockHeatmapDataApi,
  mockLanguageStatsApi,
  mockTokenStatsApi
} from './stats-mock'
