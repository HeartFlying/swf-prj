import { Page } from '@playwright/test'

/**
 * 仪表板 API Mock Fixtures
 * 提供统一的仪表板数据 API Mock 响应
 */

/**
 * 个人仪表板数据响应
 */
export const personalDashboardResponse = {
  code: 200,
  message: 'success',
  data: {
    todayStats: {
      commits: 42,
      additions: 1250,
      deletions: 380,
      tokens: 15000,
      sessions: 8
    },
    weeklyTrend: {
      dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      commits: [12, 18, 25, 20, 42, 8, 15],
      tokens: [5000, 8000, 12000, 10000, 15000, 3000, 6000]
    },
    languageStats: [
      { language: 'TypeScript', lines: 5000, percentage: 45 },
      { language: 'Python', lines: 3000, percentage: 30 },
      { language: 'Vue', lines: 2000, percentage: 18 },
      { language: 'CSS', lines: 500, percentage: 7 }
    ],
    heatmapData: Array.from({ length: 35 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 10),
      level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
    }))
  }
}

/**
 * 排行榜数据响应
 */
export const topUsersResponse = {
  code: 200,
  message: 'success',
  data: [
    { user_id: 1, username: '张三', department: '前端组', token_count: 50000, commit_count: 120 },
    { user_id: 2, username: '李四', department: '后端组', token_count: 45000, commit_count: 110 },
    { user_id: 3, username: '王五', department: '测试组', token_count: 40000, commit_count: 100 },
    { user_id: 4, username: '赵六', department: '前端组', token_count: 35000, commit_count: 90 },
    { user_id: 5, username: '孙七', department: '后端组', token_count: 30000, commit_count: 80 }
  ]
}

/**
 * 用户项目列表响应
 */
export const userProjectsResponse = {
  code: 200,
  message: 'success',
  data: [
    { id: 1, name: '项目A', description: '描述A', status: 'active' },
    { id: 2, name: '项目B', description: '描述B', status: 'active' },
    { id: 3, name: '项目C', description: '描述C', status: 'inactive' }
  ]
}

/**
 * 设置个人仪表板数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 personalDashboardResponse
 */
export async function mockPersonalDashboardApi(
  page: Page,
  response: object = personalDashboardResponse
): Promise<void> {
  await page.route('**/api/v1/stats/personal/dashboard*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置排行榜数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 topUsersResponse
 */
export async function mockTopUsersApi(
  page: Page,
  response: object = topUsersResponse
): Promise<void> {
  await page.route('**/api/v1/stats/global/top-users*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置用户项目列表 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 userProjectsResponse
 */
export async function mockUserProjectsApi(
  page: Page,
  response: object = userProjectsResponse
): Promise<void> {
  await page.route('**/api/v1/users/me/projects*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置所有仪表板相关 API Mock
 * @param page - Playwright Page 对象
 */
export async function mockAllDashboardApis(page: Page): Promise<void> {
  await Promise.all([
    mockPersonalDashboardApi(page),
    mockTopUsersApi(page),
    mockUserProjectsApi(page)
  ])
}
