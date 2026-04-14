import { Page } from '@playwright/test'

/**
 * 统计数据 API Mock Fixtures
 * 提供统一的统计数据 API Mock 响应
 */

/**
 * 个人统计数据响应
 */
export const personalStatsResponse = {
  code: 200,
  message: 'success',
  data: {
    totalCommits: 256,
    totalLines: 12500,
    totalTokens: 150000,
    codingHours: 120,
    linesAdded: 8500,
    linesDeleted: 4000,
    dailyAverage: 5000,
    activeDays: 20
  }
}

/**
 * 项目统计数据响应
 */
export const projectStatsResponse = {
  code: 200,
  message: 'success',
  data: {
    totalCommits: 1024,
    contributors: 8,
    totalLines: 50000,
    pullRequests: 45,
    codeTrend: {
      dates: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
      additions: [100, 150, 200, 180, 220],
      deletions: [50, 80, 60, 90, 70]
    },
    languageDistribution: [
      { language: 'TypeScript', percentage: 45, lines: 22500 },
      { language: 'Python', percentage: 30, lines: 15000 },
      { language: 'Vue', percentage: 15, lines: 7500 },
      { language: 'CSS', percentage: 10, lines: 5000 }
    ]
  }
}

/**
 * 趋势数据响应
 */
export const trendsResponse = {
  code: 200,
  message: 'success',
  data: {
    commitTrend: {
      dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      values: [12, 18, 25, 20, 42, 8, 15]
    },
    tokenTrend: {
      dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      values: [5000, 8000, 12000, 10000, 15000, 3000, 6000]
    },
    weeklyComparison: {
      currentWeek: 120,
      lastWeek: 98,
      growthRate: 22.4
    }
  }
}

/**
 * 热力图数据响应
 */
export const heatmapDataResponse = {
  code: 200,
  message: 'success',
  data: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 20),
    level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
  }))
}

/**
 * 语言统计数据响应
 */
export const languageStatsResponse = {
  code: 200,
  message: 'success',
  data: [
    { language: 'TypeScript', lines: 5000, percentage: 45, color: '#3178c6' },
    { language: 'Python', lines: 3000, percentage: 30, color: '#3776ab' },
    { language: 'Vue', lines: 2000, percentage: 18, color: '#4fc08d' },
    { language: 'CSS', lines: 500, percentage: 7, color: '#563d7c' }
  ]
}

/**
 * Token 使用统计响应
 */
export const tokenStatsResponse = {
  code: 200,
  message: 'success',
  data: {
    promptTokens: 100000,
    completionTokens: 50000,
    totalTokens: 150000,
    byModel: [
      { model: 'gpt-4', tokens: 80000 },
      { model: 'gpt-3.5', tokens: 50000 },
      { model: 'claude', tokens: 20000 }
    ]
  }
}

/**
 * 设置个人统计数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 personalStatsResponse
 */
export async function mockPersonalStatsApi(
  page: Page,
  response: object = personalStatsResponse
): Promise<void> {
  await page.route('**/api/v1/stats/personal*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置项目统计数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 projectStatsResponse
 */
export async function mockProjectStatsApi(
  page: Page,
  response: object = projectStatsResponse
): Promise<void> {
  await page.route('**/api/v1/stats/project*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置趋势数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 trendsResponse
 */
export async function mockTrendsApi(
  page: Page,
  response: object = trendsResponse
): Promise<void> {
  await page.route('**/api/v1/stats/trends*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置热力图数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 heatmapDataResponse
 */
export async function mockHeatmapDataApi(
  page: Page,
  response: object = heatmapDataResponse
): Promise<void> {
  await page.route('**/api/v1/stats/heatmap*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置语言统计数据 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 languageStatsResponse
 */
export async function mockLanguageStatsApi(
  page: Page,
  response: object = languageStatsResponse
): Promise<void> {
  await page.route('**/api/v1/stats/languages*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置 Token 统计 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 tokenStatsResponse
 */
export async function mockTokenStatsApi(
  page: Page,
  response: object = tokenStatsResponse
): Promise<void> {
  await page.route('**/api/v1/stats/tokens*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}
