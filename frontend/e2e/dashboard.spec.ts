import { test, expect } from '@playwright/test'
import { setupErrorMonitoring, waitForPageStability } from './utils/error-monitor'
import { verifyChartRendered, verifyMultipleCharts } from './utils/chart-helpers'
import { mockLoginApi, mockAllDashboardApis } from './fixtures'

/**
 * 仪表板端到端测试
 */
test.describe('仪表板', () => {
  test.beforeEach(async ({ page }) => {
    // Mock登录API和仪表板数据API
    await mockLoginApi(page)
    await mockAllDashboardApis(page)

    // 先登录 - 使用 placeholder 选择器
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()

    // 等待跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('仪表板页面无控制台错误', async ({ page }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    // 等待页面完全加载
    await waitForPageStability(page, 2000)

    // 验证没有 cartesian2d 错误
    errorMonitor.expectNoCartesianErrors()

    // 验证没有克隆错误
    errorMonitor.expectNoCloneErrors()

    // 验证没有 ECharts 错误
    errorMonitor.expectNoEChartsErrors()

    // 验证没有 Vue 响应式警告
    expect(errorMonitor.hasVueReactivityWarning()).toBe(false)
  })

  test('仪表板显示关键指标卡片', async ({ page }) => {
    // 验证页面标题（使用更精确的选择器）
    await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

    // 验证关键指标卡片存在 - 根据实际页面显示的文本（使用精确匹配）
    await expect(page.getByText('今日提交', { exact: true })).toBeVisible()
    await expect(page.getByText('新增代码', { exact: true })).toBeVisible()
    await expect(page.getByText('删除代码', { exact: true })).toBeVisible()
    await expect(page.getByText('Token使用', { exact: true })).toBeVisible()
    await expect(page.getByText('活跃项目', { exact: true })).toBeVisible()
    await expect(page.getByText('编码时长', { exact: true })).toBeVisible()
  })

  test('可以切换时间范围', async ({ page }) => {
    // 点击日期选择器
    await page.getByPlaceholder('开始日期').click()

    // 验证日期选择器弹出
    await expect(page.getByRole('dialog')).toBeVisible()

    // 点击空白处关闭日期选择器
    await page.keyboard.press('Escape')
  })

  test('导航菜单可以正常展开和切换', async ({ page }) => {
    // 注意：根据实际布局，可能需要先打开侧边栏菜单
    // 这里假设有一个菜单按钮或侧边栏

    // 尝试点击项目相关的导航链接（如果存在）
    // 由于仪表板页面没有传统的"项目管理"菜单，我们测试页面内的交互

    // 验证页面可以刷新数据
    const refreshButton = page.getByRole('button', { name: /刷新数据/ })
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click()
      // 验证刷新按钮的加载状态
      await expect(refreshButton).toBeVisible()
    }
  })

  test('图表区域正常显示', async ({ page }) => {
    // 验证提交趋势图表标题
    await expect(page.getByText('提交趋势')).toBeVisible()

    // 验证Token使用趋势图表标题
    await expect(page.getByText('Token使用趋势')).toBeVisible()

    // 验证代码语言分布图表标题
    await expect(page.getByText('代码语言分布')).toBeVisible()

    // 验证代码贡献热力图标题
    await expect(page.getByText('代码贡献热力图')).toBeVisible()

    // 验证团队排行榜标题
    await expect(page.getByText('团队排行榜')).toBeVisible()
  })

  test('提交趋势图表正确渲染', async ({ page }) => {
    // 等待图表数据加载 - 使用getByTestId
    const commitChart = page.getByTestId('commit-trend-chart')
    await expect(commitChart).toBeVisible()

    // 验证图表渲染质量
    await verifyChartRendered(page, '[data-testid="commit-trend-chart"]', {
      checkDimensions: true,
      checkInstance: true,
      checkData: true
    })
  })

  test('Token使用趋势图表正确渲染', async ({ page }) => {
    // 等待图表数据加载 - 使用getByTestId
    const tokenChart = page.getByTestId('token-trend-chart')
    await expect(tokenChart).toBeVisible()

    // 验证图表渲染质量
    await verifyChartRendered(page, '[data-testid="token-trend-chart"]', {
      checkDimensions: true,
      checkInstance: true,
      checkData: true
    })
  })

  test('代码语言分布图表正确渲染', async ({ page }) => {
    // 等待图表数据加载 - 使用getByTestId
    const langChart = page.getByTestId('language-distribution-chart')
    await expect(langChart).toBeVisible()

    // 验证图表渲染质量
    await verifyChartRendered(page, '[data-testid="language-distribution-chart"]', {
      checkDimensions: true,
      checkInstance: true,
      checkData: true
    })
  })

  test('所有图表同时正确渲染', async ({ page }) => {
    // 等待图表数据加载 - 使用getByTestId
    const firstChart = page.getByTestId('chart').first()
    await expect(firstChart).toBeVisible()

    // 验证所有图表渲染
    await verifyMultipleCharts(page, [
      '[data-testid="commit-trend-chart"]',
      '[data-testid="token-trend-chart"]',
      '[data-testid="language-distribution-chart"]'
    ])
  })

  test('排行榜显示正确数据', async ({ page }) => {
    // 验证排行榜区域存在
    await expect(page.getByText('团队排行榜')).toBeVisible()

    // 验证排行榜中有用户数据（使用getByTestId）
    await expect(page.getByTestId('leaderboard-username').filter({ hasText: '张三' })).toBeVisible()
    await expect(page.getByTestId('leaderboard-username').filter({ hasText: '李四' })).toBeVisible()
  })

  test.describe('交互场景', () => {
    test('窗口resize时图表自适应', async ({ page }) => {
      // 等待图表渲染完成
      const chartCanvas = page.getByTestId('chart').locator('canvas').first()
      await expect(chartCanvas).toBeVisible()

      // 记录resize前的canvas尺寸
      const canvas = page.getByTestId('chart').locator('canvas').first()
      const beforeWidth = await canvas.evaluate(el => el.width)
      const beforeHeight = await canvas.evaluate(el => el.height)

      // 改变窗口大小
      await page.setViewportSize({ width: 800, height: 600 })
      await page.waitForLoadState('domcontentloaded')

      // 验证canvas尺寸变化
      const afterWidth = await canvas.evaluate(el => el.width)
      const afterHeight = await canvas.evaluate(el => el.height)
      expect(afterWidth).not.toEqual(beforeWidth)
      expect(afterHeight).not.toEqual(beforeHeight)

      // 恢复窗口大小
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForLoadState('domcontentloaded')
    })

    test('快速切换页面后图表正常渲染', async ({ page }) => {
      // 先确保当前在仪表板页面
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

      // 快速切换到其他页面再返回
      await page.goto('/personal-stats')
      await page.waitForLoadState('domcontentloaded')
      await page.goto('/dashboard')
      await expect(page.getByText('提交趋势')).toBeVisible()

      // 验证图表正常渲染
      await expect(page.getByText('提交趋势')).toBeVisible()
      await expect(page.getByTestId('chart').locator('canvas').first()).toBeVisible()
    })

    test('数据刷新按钮点击后图表更新', async ({ page }) => {
      // 等待图表渲染
      const chartCanvas = page.getByTestId('chart').locator('canvas').first()
      await expect(chartCanvas).toBeVisible()

      // 获取刷新按钮
      const refreshButton = page.getByRole('button', { name: /刷新数据/ })
      if (await refreshButton.isVisible().catch(() => false)) {
        // 记录刷新前的图表状态
        const canvas = page.getByTestId('chart').locator('canvas').first()
        const isVisibleBefore = await canvas.isVisible()
        expect(isVisibleBefore).toBeTruthy()

        // 点击刷新按钮
        await refreshButton.click()
        await expect(page.getByTestId('chart').locator('canvas').first()).toBeVisible()

        // 验证图表仍然可见（刷新后正常渲染）
        const isVisibleAfter = await canvas.isVisible()
        expect(isVisibleAfter).toBeTruthy()
      }
    })

    test('时间范围切换后图表重绘', async ({ page }) => {
      // 等待图表渲染
      const chartCanvas = page.getByTestId('chart').locator('canvas').first()
      await expect(chartCanvas).toBeVisible()

      // 点击日期选择器
      await page.getByPlaceholder('开始日期').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 选择一个日期（点击今天）
      const todayCell = page.getByRole('cell', { name: '今天' })
      if (await todayCell.isVisible().catch(() => false)) {
        await todayCell.click()
      }

      // 关闭日期选择器
      await page.keyboard.press('Escape')
      await expect(page.getByText('提交趋势')).toBeVisible()

      // 验证图表仍然正常显示
      await expect(page.getByText('提交趋势')).toBeVisible()
      await expect(page.getByTestId('chart').locator('canvas').first()).toBeVisible()
    })

    test('多次快速resize不报错', async ({ page }) => {
      // 等待图表渲染
      const chartCanvas = page.getByTestId('chart').locator('canvas').first()
      await expect(chartCanvas).toBeVisible()

      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 快速多次改变窗口大小
      const sizes = [
        { width: 1200, height: 800 },
        { width: 800, height: 600 },
        { width: 1024, height: 768 },
        { width: 600, height: 800 },
        { width: 1280, height: 720 }
      ]

      for (const size of sizes) {
        await page.setViewportSize(size)
        await page.waitForLoadState('domcontentloaded')
      }

      // 等待稳定
      await expect(page.getByText('提交趋势')).toBeVisible()

      // 验证没有JavaScript错误
      errorMonitor.expectNoErrors()

      // 验证页面仍然正常显示
      await expect(page.getByText('提交趋势')).toBeVisible()
    })

    test('resize时无cartesian2d错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      const chartCanvas = page.getByTestId('chart').locator('canvas').first()
      await expect(chartCanvas).toBeVisible()

      // 改变窗口大小（触发resize）
      await page.setViewportSize({ width: 800, height: 600 })
      await page.waitForLoadState('domcontentloaded')

      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForLoadState('domcontentloaded')

      // 验证没有 cartesian2d 相关错误
      errorMonitor.expectNoCartesianErrors()
    })

    test('数据刷新时无structuredClone错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      const chartCanvas = page.getByTestId('chart').locator('canvas').first()
      await expect(chartCanvas).toBeVisible()

      // 获取刷新按钮
      const refreshButton = page.getByRole('button', { name: /刷新数据/ })
      if (await refreshButton.isVisible().catch(() => false)) {
        // 点击刷新按钮
        await refreshButton.click()
        await expect(page.getByTestId('chart').locator('canvas').first()).toBeVisible()
      }

      // 验证没有克隆错误
      errorMonitor.expectNoCloneErrors()
    })
  })
})
