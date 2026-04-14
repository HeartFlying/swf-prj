import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * 边界数据测试
 * 测试各种边界条件下图表组件和页面的表现
 * 包括：空数据、null值、undefined字段、空对象、超长数据列表、特殊字符数据
 *
 * 运行测试:
 *   npm run test:e2e -- e2e/boundary-data.spec.ts
 *   npm run test:e2e -- e2e/boundary-data.spec.ts --ui
 *   npm run test:e2e -- e2e/boundary-data.spec.ts --debug
 */
test.describe('边界数据测试', () => {
  // 过滤掉401错误和资源加载错误，只关注JavaScript运行时错误
  const filterJsErrors = (errors: string[]): string[] => {
    return errors.filter(err => {
      // 排除401认证错误和资源加载错误
      if (err.includes('401') || err.includes('Unauthorized')) return false
      if (err.includes('Failed to load resource')) return false
      // 排除网络错误
      if (err.includes('net::ERR')) return false
      if (err.includes('NetworkError')) return false
      // 排除source map错误
      if (err.includes('Source map')) return false
      return true
    })
  }

  // 登录辅助函数
  const setupAuth = async (page: any) => {
    // Mock登录API
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            tokenType: 'bearer',
            expiresIn: 3600,
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              isActive: true,
              role: { id: 1, name: 'admin', permissions: ['*'] }
            }
          }
        })
      })
    })

    // Mock当前用户信息API
    await page.route('**/api/v1/users/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            isActive: true,
            role: { id: 1, name: 'admin', permissions: ['*'] }
          }
        })
      })
    })

    // 访问登录页面并登录
    await page.goto('/login', { timeout: 60000 })

    // 等待输入框可见并填写
    const usernameInput = page.getByPlaceholder('用户名')
    await usernameInput.waitFor({ state: 'visible', timeout: 15000 })
    await usernameInput.fill('admin')

    const passwordInput = page.getByPlaceholder('密码')
    await passwordInput.fill('password123')

    await page.getByRole('button', { name: '登 录' }).click()

    // 等待登录成功
    await page.waitForURL(/\/(dashboard|personal-stats)/, { timeout: 15000 })
  }

  test.afterEach(async ({ page }) => {
    // 清理所有路由拦截
    await page.unrouteAll()
  })

  /**
   * ====================
   * 个人统计页面边界测试
   * ====================
   */
  test.describe('个人统计页面 - 空数据测试', () => {
    test('空数组数据时图表不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock空数组数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: {
                commits: 0,
                additions: 0,
                deletions: 0,
                tokens: 0,
                sessions: 0
              },
              weeklyTrend: { dates: [], commits: [], tokens: [] },
              languageStats: [],
              heatmapData: [],
              ranking: { commits: 0, totalUsers: 0 }
            }
          })
        })
      })

      // 导航到个人统计页面
      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 验证没有JavaScript运行时错误（过滤掉401和资源加载错误）
      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)

      // 验证页面没有崩溃，基本元素仍然显示
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('null值数据时图表不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock null值数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: null,
              weeklyTrend: null,
              languageStats: null,
              heatmapData: null,
              ranking: null
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 验证没有JavaScript运行时错误
      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)

      // 验证页面没有崩溃
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('undefined字段数据时图表不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock缺少字段的数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              // 缺少 todayStats, weeklyTrend 等字段
              ranking: { commits: 0, totalUsers: 0 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 验证没有JavaScript运行时错误
      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)

      // 验证页面没有崩溃
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('空对象数据时图表不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock空对象数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {}
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 验证没有JavaScript运行时错误
      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)

      // 验证页面没有崩溃
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('超长数据列表时图表正常渲染', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // 生成超长数据
      const longDates = Array.from({ length: 365 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const longCommits = Array.from({ length: 365 }, () => Math.floor(Math.random() * 100))
      const longTokens = Array.from({ length: 365 }, () => Math.floor(Math.random() * 10000))

      const longLanguageStats = Array.from({ length: 50 }, (_, i) => ({
        language: `Language${i}`,
        lines: Math.floor(Math.random() * 100000),
        percentage: Math.random() * 100
      }))

      const longHeatmapData = Array.from({ length: 365 }, (_, i) => ({
        date: longDates[i],
        count: Math.floor(Math.random() * 50),
        level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
      }))

      // Mock超长数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: {
                commits: 100,
                additions: 1000,
                deletions: 500,
                tokens: 50000,
                sessions: 10
              },
              weeklyTrend: {
                dates: longDates,
                commits: longCommits,
                tokens: longTokens
              },
              languageStats: longLanguageStats,
              heatmapData: longHeatmapData,
              ranking: { commits: 50, totalUsers: 100 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 验证没有JavaScript运行时错误
      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)

      // 验证页面正常显示
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('特殊字符数据时图表不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock包含特殊字符的数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: {
                commits: 0,
                additions: 0,
                deletions: 0,
                tokens: 0,
                sessions: 0
              },
              weeklyTrend: {
                dates: ['2024-01-01', '2024-01-02'],
                commits: [1, 2],
                tokens: [100, 200]
              },
              languageStats: [
                { language: 'C++', lines: 1000, percentage: 25.5 },
                { language: 'C#', lines: 2000, percentage: 50.0 },
                { language: '<script>alert("xss")</script>', lines: 0, percentage: 0 },
                { language: 'JavaScript & TypeScript', lines: 500, percentage: 12.5 },
                { language: 'Java|Python|Go', lines: 500, percentage: 12.5 }
              ],
              heatmapData: [
                { date: '2024-01-01', count: 5, level: 2 },
                { date: '2024-01-02', count: 10, level: 3 }
              ],
              ranking: { commits: 0, totalUsers: 0 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 验证没有JavaScript运行时错误
      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)

      // 验证页面没有崩溃
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })
  })

  /**
   * ====================
   * 个人统计数据API边界测试
   * ====================
   */
  test.describe('个人统计数据API - 边界测试', () => {
    test('/api/v1/stats/personal/code 返回空数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/code**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              totalCommits: 0,
              totalPrs: 0,
              linesAdded: 0,
              linesDeleted: 0,
              avgCommitsPerDay: 0
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('/api/v1/stats/personal/tokens 返回null值', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/tokens**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              totalTokens: null,
              promptTokens: null,
              completionTokens: null,
              avgTokensPerDay: null
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('/api/v1/stats/personal/heatmap 返回空数组', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/heatmap**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: []
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('/api/v1/stats/personal/activity-hours 返回超长数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // 返回超长的24小时数据
      const longActivityHours = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Math.floor(Math.random() * 10000)
      }))

      await page.route('**/api/v1/stats/personal/activity-hours**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: longActivityHours
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })
  })

  /**
   * ====================
   * 项目统计页面边界测试
   * ====================
   */
  test.describe('项目统计页面 - 空数据测试', () => {
    test('项目统计数据为空对象时页面不崩溃', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock项目列表
      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      // Mock空项目统计数据
      await page.route('**/api/v1/stats/projects/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {}
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })

    test('项目仪表盘返回null值', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/dashboard**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              project_id: 1,
              project_name: null,
              total_stats: null,
              member_stats: null,
              language_distribution: null,
              commit_trend: null
            }
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })

    test('项目仪表盘返回空数组', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/dashboard**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              project_id: 1,
              project_name: 'Test Project',
              total_stats: {
                commits: 0,
                contributors: 0,
                lines_of_code: 0,
                pull_requests: 0
              },
              member_stats: [],
              language_distribution: [],
              commit_trend: {
                dates: [],
                commits: []
              }
            }
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })

    test('项目代码趋势返回超长数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      const longDates = Array.from({ length: 365 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/code-trend**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              dates: longDates,
              total_lines: Array.from({ length: 365 }, (_, i) => i * 100),
              additions: Array.from({ length: 365 }, () => Math.floor(Math.random() * 1000)),
              deletions: Array.from({ length: 365 }, () => Math.floor(Math.random() * 500))
            }
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })
  })

  /**
   * ====================
   * 项目统计API边界测试
   * ====================
   */
  test.describe('项目统计API - 边界测试', () => {
    test('/api/v1/stats/projects/:id/code-rank 返回空数组', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/code-rank**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: []
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })

    test('/api/v1/stats/projects/:id/bug-trend 返回null', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/bug-trend**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: null
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })

    test('/api/v1/stats/projects/:id/commit-rank 返回超长成员列表', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      const longMemberStats = Array.from({ length: 100 }, (_, i) => ({
        user_id: i + 1,
        username: `user${i + 1}`,
        commits: Math.floor(Math.random() * 1000),
        additions: Math.floor(Math.random() * 10000),
        deletions: Math.floor(Math.random() * 5000),
        tokens: Math.floor(Math.random() * 100000)
      }))

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/commit-rank**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: longMemberStats
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })
  })

  /**
   * ====================
   * 极端边界条件测试
   * ====================
   */
  test.describe('极端边界条件测试', () => {
    test('所有API同时返回空数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      // Mock所有相关API返回空数据
      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'success', data: {} })
        })
      })

      await page.route('**/api/v1/stats/personal/code**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'success', data: {} })
        })
      })

      await page.route('**/api/v1/stats/personal/tokens**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'success', data: {} })
        })
      })

      await page.route('**/api/v1/stats/personal/heatmap**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'success', data: [] })
        })
      })

      await page.route('**/api/v1/stats/personal/activity-hours**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'success', data: [] })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('API返回500错误时页面不崩溃', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 500, message: 'Internal Server Error', data: null })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      // 页面不应该崩溃
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('API返回超时后页面仍然可用', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/dashboard', route => {
        // 延迟响应模拟超时
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 200,
              message: 'success',
              data: {
                todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
                weeklyTrend: { dates: [], commits: [], tokens: [] },
                languageStats: [],
                heatmapData: [],
                ranking: { commits: 0, totalUsers: 0 }
              }
            })
          })
        }, 5000)
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('包含Unicode和Emoji的特殊字符数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
              weeklyTrend: { dates: [], commits: [], tokens: [] },
              languageStats: [
                { language: '中文编程语言', lines: 100, percentage: 25 },
                { language: '日本語', lines: 100, percentage: 25 },
                { language: 'Emoji', lines: 100, percentage: 25 },
                { language: 'Arabic', lines: 100, percentage: 25 }
              ],
              heatmapData: [],
              ranking: { commits: 0, totalUsers: 0 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('极大数值数据处理', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: {
                commits: 999999999,
                additions: 999999999,
                deletions: 999999999,
                tokens: 999999999999,
                sessions: 999999
              },
              weeklyTrend: {
                dates: ['2024-01-01'],
                commits: [999999999],
                tokens: [999999999999]
              },
              languageStats: [
                { language: 'JavaScript', lines: 999999999, percentage: 99.99 }
              ],
              heatmapData: [
                { date: '2024-01-01', count: 999999, level: 4 }
              ],
              ranking: { commits: 999999999, totalUsers: 999999 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })

    test('负数和异常数值处理', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: {
                commits: -1,
                additions: -100,
                deletions: -50,
                tokens: -1000,
                sessions: -1
              },
              weeklyTrend: {
                dates: ['2024-01-01'],
                commits: [-10],
                tokens: [-100]
              },
              languageStats: [
                { language: 'JavaScript', lines: -1000, percentage: -10 }
              ],
              heatmapData: [
                { date: '2024-01-01', count: -5, level: -1 }
              ],
              ranking: { commits: -1, totalUsers: -10 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
    })
  })

  /**
   * ====================
   * 图表组件边界测试
   * ====================
   */
  test.describe('图表组件边界测试', () => {
    test('热力图组件处理空数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/heatmap**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: []
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      // 验证热力图容器存在
      await expect(page.getByTestId('contribution-heatmap')).toBeVisible()
    })

    test('语言统计组件处理空数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/stats/personal/dashboard', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
              weeklyTrend: { dates: [], commits: [], tokens: [] },
              languageStats: [],
              heatmapData: [],
              ranking: { commits: 0, totalUsers: 0 }
            }
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      // 验证语言列表容器存在
      await expect(page.getByTestId('language-list')).toBeVisible()
    })

    test('代码趋势图表处理单条数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      await page.route('**/api/v1/projects**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: [
              { id: 1, name: 'Test Project', code: 'TEST', description: 'Test', stage: '开发', status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
            ]
          })
        })
      })

      await page.route('**/api/v1/stats/projects/*/code-trend**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              dates: ['2024-01-01'],
              total_lines: [1000],
              additions: [100],
              deletions: [50]
            }
          })
        })
      })

      await page.goto('/project-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      await expect(page.getByRole('heading', { name: '项目统计' })).toBeVisible()
    })

    test('活跃时段图表处理24小时全零数据', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 先登录
      await setupAuth(page)

      const zeroActivityHours = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: 0
      }))

      await page.route('**/api/v1/stats/personal/activity-hours**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: zeroActivityHours
          })
        })
      })

      await page.goto('/personal-stats')
      await page.waitForLoadState("networkidle")

      const jsErrors = filterJsErrors(errorMonitor.getErrors())
      expect(jsErrors).toHaveLength(0)
      // 验证活跃时段容器存在
      await expect(page.getByTestId('activity-placeholder')).toBeVisible()
    })
  })
})
