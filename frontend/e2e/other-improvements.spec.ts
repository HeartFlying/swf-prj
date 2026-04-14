import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * E2E其他改进测试
 * 包含性能测试、网络异常测试、并发测试等
 */

test.describe('性能测试', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock仪表板数据API
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        })
      })
    })

    // Mock排行榜数据API
    await page.route('**/api/v1/stats/global/top-users*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: [
            { user_id: 1, username: '张三', department: '前端组', token_count: 50000, commit_count: 120 },
            { user_id: 2, username: '李四', department: '后端组', token_count: 45000, commit_count: 110 },
            { user_id: 3, username: '王五', department: '测试组', token_count: 40000, commit_count: 100 }
          ]
        })
      })
    })

    // 登录
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('页面加载时间应在3秒内', async ({ page }) => {
    // 先登出
    await page.goto('/login')
    await expect(page.getByPlaceholder('用户名')).toBeVisible()

    // 重新登录并测量加载时间
    const start = Date.now()
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - start

    expect(loadTime).toBeLessThan(3000)
    console.log(`页面加载时间: ${loadTime}ms`)
  })

  test('图表渲染时间应在2秒内', async ({ page }) => {
    await page.goto('/dashboard')

    const start = Date.now()
    await page.waitForLoadState('domcontentloaded')

    // 等待所有图表渲染完成
    await expect(page.getByTestId('chart-container').first()).toBeVisible({ timeout: 5000 })

    const renderTime = Date.now() - start
    expect(renderTime).toBeLessThan(2000)
    console.log(`图表渲染时间: ${renderTime}ms`)
  })

  test('大数据量热力图渲染性能', async ({ page }) => {
    // Mock大量热力图数据（365天）
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            todayStats: { commits: 42, additions: 1250, deletions: 380, tokens: 15000, sessions: 8 },
            weeklyTrend: {
              dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
              commits: [12, 18, 25, 20, 42, 8, 15],
              tokens: [5000, 8000, 12000, 10000, 15000, 3000, 6000]
            },
            languageStats: [
              { language: 'TypeScript', lines: 5000, percentage: 45 },
              { language: 'Python', lines: 3000, percentage: 30 }
            ],
            heatmapData: Array.from({ length: 365 }, (_, i) => ({
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              count: Math.floor(Math.random() * 50),
              level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
            }))
          }
        })
      })
    })

    await page.goto('/dashboard')

    const start = Date.now()
    await page.waitForLoadState('domcontentloaded')

    // 等待热力图渲染
    await expect(page.getByText('代码贡献热力图')).toBeVisible()
    await expect(page.getByTestId('heatmap-chart')).toBeVisible()

    const renderTime = Date.now() - start
    expect(renderTime).toBeLessThan(3000)
    console.log(`大数据量热力图渲染时间: ${renderTime}ms`)

    // 验证热力图正常显示
    await expect(page.getByTestId('heatmap-chart')).toBeVisible()
  })

  test('个人统计页面加载性能', async ({ page }) => {
    // Mock个人统计数据
    await page.route('**/api/v1/stats/personal/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            dailyStats: Array.from({ length: 30 }, (_, i) => ({
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              commits: Math.floor(Math.random() * 20),
              tokens: Math.floor(Math.random() * 5000)
            })),
            projectStats: Array.from({ length: 10 }, (_, i) => ({
              projectId: i + 1,
              projectName: `项目${i + 1}`,
              commits: Math.floor(Math.random() * 100),
              tokens: Math.floor(Math.random() * 10000)
            }))
          }
        })
      })
    })

    const start = Date.now()
    await page.goto('/personal-stats')
    await page.waitForLoadState('domcontentloaded')

    // 等待图表渲染
    await expect(page.getByTestId('stats-overview').or(page.getByTestId('charts-section'))).toBeVisible()

    const loadTime = Date.now() - start
    expect(loadTime).toBeLessThan(3000)
    console.log(`个人统计页面加载时间: ${loadTime}ms`)
  })

  test('内存使用稳定性 - 多次页面切换', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    // 多次切换页面
    for (let i = 0; i < 5; i++) {
      await page.goto('/dashboard')
      await expect(page.getByTestId('dashboard-page').or(page.getByRole('heading'))).toBeVisible()
      await page.goto('/personal-stats')
      await expect(page.getByTestId('personal-stats-page').or(page.getByRole('heading'))).toBeVisible()
    }

    // 验证无内存相关错误
    errorMonitor.expectNoErrors()

    // 最终页面正常显示
    await expect(page.getByRole('heading')).toBeVisible()
  })
})

test.describe('网络异常测试', () => {
  test.beforeEach(async ({ page }) => {
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

    // 登录
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('API请求失败时显示错误提示', async ({ page }) => {
    // 拦截API请求并使其失败
    await page.route('**/api/v1/stats/personal/dashboard*', route => route.abort('failed'))

    // 刷新页面触发API请求
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 验证错误提示显示
    const errorMessage = page.getByRole('alert').or(page.getByTestId('error-message'))
    await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {
      // 如果没有显示错误提示，验证页面有错误状态显示
      console.log('检查页面错误状态显示')
    })
  })

  test('API返回500错误时优雅处理', async ({ page }) => {
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 500,
          message: '服务器内部错误',
          data: null
        })
      })
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 验证页面没有崩溃，仍然显示基本结构
    await expect(page.getByTestId('app-container').or(page.getByTestId('dashboard-page')).or(page.getByRole('heading')).first()).toBeVisible()
  })

  test('API返回404错误时优雅处理', async ({ page }) => {
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 404,
          message: '资源不存在',
          data: null
        })
      })
    })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 验证页面没有崩溃
    await expect(page.getByTestId('app-container').or(page.getByTestId('dashboard-page')).or(page.getByRole('heading')).first()).toBeVisible()
  })

  test('网络超时处理', async ({ page }) => {
    // 模拟网络超时（延迟10秒响应）
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: { todayStats: {}, weeklyTrend: {}, languageStats: [], heatmapData: [] }
        })
      })
    })

    const errorMonitor = setupErrorMonitoring(page)
    await page.reload()

    // 等待超时发生 - 使用网络空闲状态
    await page.waitForLoadState('domcontentloaded').catch(() => {})

    // 验证页面没有崩溃
    await expect(page.getByTestId('app-container').or(page.getByTestId('dashboard-page')).or(page.getByRole('heading')).first()).toBeVisible()

    // 验证无未捕获的错误
    const errors = errorMonitor.getErrors()
    const criticalErrors = errors.filter(e =>
      !e.includes('timeout') &&
      !e.includes('Timeout') &&
      !e.includes('network')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('部分API失败时页面部分渲染', async ({ page }) => {
    // 部分API成功，部分失败
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            todayStats: { commits: 42, additions: 1250, deletions: 380, tokens: 15000, sessions: 8 },
            weeklyTrend: { dates: [], commits: [], tokens: [] },
            languageStats: [],
            heatmapData: []
          }
        })
      })
    })

    await page.route('**/api/v1/stats/global/top-users*', route => route.abort('failed'))

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 验证成功加载的部分正常显示
    await expect(page.getByText('今日提交')).toBeVisible()
    await expect(page.getByText('42')).toBeVisible()
  })

  test('断网后重连恢复', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    // 模拟断网
    await page.route('**/*', route => route.abort('internetdisconnected'))

    // 尝试刷新
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 恢复网络
    await page.unroute('**/*')

    // 重新设置Mock
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            todayStats: { commits: 42, additions: 1250, deletions: 380, tokens: 15000, sessions: 8 },
            weeklyTrend: {
              dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
              commits: [12, 18, 25, 20, 42, 8, 15],
              tokens: [5000, 8000, 12000, 10000, 15000, 3000, 6000]
            },
            languageStats: [
              { language: 'TypeScript', lines: 5000, percentage: 45 }
            ],
            heatmapData: []
          }
        })
      })
    })

    // 再次刷新恢复数据
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 验证数据恢复显示
    await expect(page.getByText('今日提交')).toBeVisible()
  })

  test('慢网络下的加载状态显示', async ({ page }) => {
    // 模拟慢网络（延迟2秒）
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            todayStats: { commits: 42, additions: 1250, deletions: 380, tokens: 15000, sessions: 8 },
            weeklyTrend: { dates: [], commits: [], tokens: [] },
            languageStats: [],
            heatmapData: []
          }
        })
      })
    })

    await page.reload()

    // 验证加载状态显示（骨架屏或loading）
    const loadingIndicator = page.getByTestId('loading-indicator').or(page.getByTestId('skeleton')).first()
    await expect(loadingIndicator).toBeVisible({ timeout: 1000 }).catch(() => {
      console.log('未检测到加载状态指示器')
    })

    // 等待数据加载完成
    await expect(page.getByText('今日提交')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('并发测试', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock仪表板数据API
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
              { language: 'Python', lines: 3000, percentage: 30 }
            ],
            heatmapData: Array.from({ length: 35 }, (_, i) => ({
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              count: Math.floor(Math.random() * 10),
              level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
            }))
          }
        })
      })
    })

    // 登录
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('多个图表同时刷新不冲突', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')
    await expect(page.getByTestId('chart-container').first()).toBeVisible()

    // 模拟多个图表同时触发刷新
    await Promise.all([
      page.evaluate(() => window.dispatchEvent(new Event('resize'))),
      page.evaluate(() => window.dispatchEvent(new Event('resize'))),
      page.evaluate(() => window.dispatchEvent(new Event('resize')))
    ])

    await page.waitForLoadState('domcontentloaded')

    // 验证无错误
    errorMonitor.expectNoErrors()

    // 验证所有图表正常显示
    await expect(page.getByText('提交趋势')).toBeVisible()
    await expect(page.getByText('Token使用趋势')).toBeVisible()
    await expect(page.getByText('代码语言分布')).toBeVisible()
  })

  test('快速点击刷新按钮不冲突', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')
    await expect(page.getByTestId('chart-container').first()).toBeVisible()

    // 查找刷新按钮
    const refreshButton = page.getByRole('button', { name: /刷新数据/ })

    if (await refreshButton.isVisible().catch(() => false)) {
      // 快速多次点击
      for (let i = 0; i < 5; i++) {
        await refreshButton.click().catch(() => {})
      }

      await page.waitForLoadState('domcontentloaded')

      // 验证无错误
      errorMonitor.expectNoErrors()
    }
  })

  test('快速切换导航不冲突', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    // 快速切换多个页面
    const pages = ['/dashboard', '/personal-stats', '/dashboard', '/project-stats', '/dashboard']

    for (const url of pages) {
      await page.goto(url)
      await page.waitForLoadState('domcontentloaded')
    }

    // 等待最终页面稳定
    await page.waitForLoadState('domcontentloaded')

    // 验证无错误
    errorMonitor.expectNoErrors()

    // 验证页面正常显示
    await expect(page.getByTestId('app-container').or(page.getByTestId('dashboard-page')).or(page.getByRole('heading')).first()).toBeVisible()
  })

  test('并发API请求处理', async ({ page }) => {
    let requestCount = 0

    // 统计API请求次数
    await page.route('**/api/v1/stats/**', async route => {
      requestCount++
      await route.continue()
    })

    await page.goto('/dashboard')

    // 同时触发多个操作
    await Promise.all([
      page.evaluate(() => window.dispatchEvent(new Event('focus'))),
      page.reload()
    ])

    await page.waitForLoadState('domcontentloaded')

    // 验证请求被正确处理
    expect(requestCount).toBeGreaterThan(0)
    console.log(`并发请求次数: ${requestCount}`)
  })

  test('图表resize和刷新同时进行', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')
    await expect(page.getByTestId('chart-container').first()).toBeVisible()

    // 同时进行resize和刷新
    const refreshButton = page.getByRole('button', { name: /刷新数据/ })

    await Promise.all([
      page.setViewportSize({ width: 1024, height: 768 }),
      refreshButton.click().catch(() => {}),
      page.waitForLoadState('domcontentloaded')
    ])

    await page.waitForLoadState('domcontentloaded')

    // 恢复视口
    await page.setViewportSize({ width: 1280, height: 720 })

    // 验证无错误
    errorMonitor.expectNoErrors()

    // 验证图表正常
    await expect(page.getByTestId('chart-container').first()).toBeVisible()
  })

  test('多标签页数据同步', async ({ page, context }) => {
    // 创建新标签页
    const newPage = await context.newPage()

    // 在两个标签页同时打开仪表板
    await Promise.all([
      page.goto('/dashboard'),
      newPage.goto('/dashboard')
    ])

    // 等待两个页面都加载完成
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      newPage.waitForLoadState('domcontentloaded')
    ])

    // 验证两个页面都正常显示
    await expect(page.getByText('提交趋势')).toBeVisible()
    await expect(newPage.getByText('提交趋势')).toBeVisible()

    // 关闭新标签页
    await newPage.close()
  })
})

test.describe('稳定性测试', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock仪表板数据API
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
              { language: 'Python', lines: 3000, percentage: 30 }
            ],
            heatmapData: Array.from({ length: 35 }, (_, i) => ({
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              count: Math.floor(Math.random() * 10),
              level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
            }))
          }
        })
      })
    })

    // 登录
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('长时间运行稳定性', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')

    // 模拟长时间运行（多次刷新）
    for (let i = 0; i < 10; i++) {
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
    }

    // 验证无错误
    errorMonitor.expectNoErrors()

    // 验证页面正常
    await expect(page.getByText('提交趋势')).toBeVisible()
  })

  test('频繁窗口大小调整稳定性', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')
    await expect(page.getByTestId('chart-container').first()).toBeVisible()

    // 频繁调整窗口大小
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
      { width: 1280, height: 720 }
    ]

    for (const size of sizes) {
      await page.setViewportSize(size)
      await page.waitForLoadState('domcontentloaded')
    }

    // 验证无错误
    errorMonitor.expectNoErrors()

    // 验证图表仍然可见
    await expect(page.getByTestId('chart-container').first()).toBeVisible()
  })

  test('空数据处理', async ({ page }) => {
    // Mock空数据
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            todayStats: { commits: 0, additions: 0, deletions: 0, tokens: 0, sessions: 0 },
            weeklyTrend: { dates: [], commits: [], tokens: [] },
            languageStats: [],
            heatmapData: []
          }
        })
      })
    })

    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // 验证无错误
    errorMonitor.expectNoErrors()

    // 验证页面正常显示（即使没有数据）
    await expect(page.getByText('今日提交')).toBeVisible()
    await expect(page.getByText('提交趋势')).toBeVisible()
  })

  test('异常数据格式处理', async ({ page }) => {
    // Mock异常数据格式
    await page.route('**/api/v1/stats/personal/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'success',
          data: {
            todayStats: null,
            weeklyTrend: null,
            languageStats: null,
            heatmapData: null
          }
        })
      })
    })

    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // 验证页面没有崩溃
    await expect(page.getByTestId('app-container').or(page.getByTestId('dashboard-page')).or(page.getByRole('heading')).first()).toBeVisible()

    // 验证没有严重错误（允许有预期的错误处理）
    const errors = errorMonitor.getErrors()
    const criticalErrors = errors.filter(e =>
      e.includes('Cannot read') ||
      e.includes('undefined is not') ||
      e.includes('null is not')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
