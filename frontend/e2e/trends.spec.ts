import { test, expect } from '@playwright/test'
import { setupErrorMonitoring, waitForPageStability } from './utils/error-monitor'
import { verifyChartRendered } from './utils/chart-helpers'

/**
 * 趋势分析页面端到端测试
 * 测试页面: /trends
 * 注意: /trends 路由当前指向 dashboard 组件
 *
 * 覆盖功能:
 * - 页面加载和基础元素
 * - 趋势图表显示
 * - 时间范围筛选
 * - 数据刷新功能
 * - 图表渲染
 * - 响应式布局
 * - 性能测试
 */
test.describe('趋势分析页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到趋势分析页面（使用全局登录状态）
    await page.goto('/trends')
    await expect(page).toHaveURL(/\/trends/, { timeout: 10000 })
    // 等待页面内容加载而不是 networkidle
    await expect(page.getByTestId('dashboard-page').or(page.getByTestId('page-header')).or(page.getByTestId('charts-grid'))).toBeVisible({ timeout: 10000 })
  })

  test.describe('错误监控', () => {
    test('页面加载无控制台错误', async ({ page }) => {
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
  })

  test.describe('页面加载和基础元素', () => {
    test('应显示页面标题和控制按钮', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 验证页面标题（当前/trends指向dashboard，显示"仪表盘"）
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

      // 验证刷新按钮存在
      await expect(page.getByRole('button', { name: /刷新数据/ })).toBeVisible()

      // 验证导出按钮存在
      await expect(page.getByRole('button', { name: /导出数据/ })).toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('应显示趋势图表区域', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 验证图表区域存在
      await expect(page.getByTestId('charts-grid')).toBeVisible()

      // 验证图表标题
      await expect(page.getByText('提交趋势')).toBeVisible()
      await expect(page.getByText('Token使用趋势')).toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('应显示统计数据卡片', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 验证统计数据卡片
      await expect(page.getByText('今日提交', { exact: true })).toBeVisible()
      await expect(page.getByText('新增代码', { exact: true })).toBeVisible()
      await expect(page.getByText('删除代码', { exact: true })).toBeVisible()
      await expect(page.getByText('Token使用', { exact: true })).toBeVisible()

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('时间范围筛选', () => {
    test('可以打开日期选择器', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 点击日期选择器
      await page.getByPlaceholder('开始日期').click()

      // 验证日期选择器弹出
      await expect(page.getByRole('dialog')).toBeVisible()

      // 关闭日期选择器
      await page.keyboard.press('Escape')

      errorMonitor.expectNoErrors()
    })

    test('可以选择日期范围', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

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

      // 等待日期选择器关闭
      await expect(page.getByRole('dialog')).toBeHidden()

      // 验证页面仍然正常显示
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('数据刷新功能', () => {
    test('可以刷新数据', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 找到刷新按钮
      const refreshBtn = page.getByRole('button', { name: /刷新数据/ })
      await expect(refreshBtn).toBeVisible()

      // 点击刷新
      await refreshBtn.click()

      // 等待网络请求完成
      await page.waitForLoadState('networkidle')

      // 验证页面仍然正常显示
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('图表渲染', () => {
    test('提交趋势图表正确渲染', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表容器可见
      const chartContainer = page.getByTestId('echarts').first()
      await expect(chartContainer).toBeVisible()

      // 验证图表渲染
      await verifyChartRendered(page, '[data-testid="commit-trend-chart"]', {
        checkDimensions: true,
        checkInstance: true,
        checkData: false
      })

      errorMonitor.expectNoErrors()
    })

    test('Token使用趋势图表正确渲染', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表容器可见
      const chartContainer = page.getByTestId('echarts').nth(1)
      await expect(chartContainer).toBeVisible()

      // 验证图表渲染
      await verifyChartRendered(page, '[data-testid="token-trend-chart"]', {
        checkDimensions: true,
        checkInstance: true,
        checkData: false
      })

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('响应式布局', () => {
    test('在平板尺寸下布局正确', async ({ page }) => {
      // 设置平板尺寸
      await page.setViewportSize({ width: 768, height: 1024 })

      // 等待布局调整后验证页面内容仍然可见
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()
      await expect(page.getByTestId('charts-grid')).toBeVisible()

      // 恢复窗口大小
      await page.setViewportSize({ width: 1280, height: 720 })
    })

    test('在手机尺寸下布局正确', async ({ page }) => {
      // 设置手机尺寸
      await page.setViewportSize({ width: 375, height: 667 })

      // 等待布局调整后验证页面内容仍然可见
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

      // 恢复窗口大小
      await page.setViewportSize({ width: 1280, height: 720 })
    })
  })

  test.describe('性能测试', () => {
    test('页面应在合理时间内加载完成', async ({ page }) => {
      // 注意：此测试不检查所有错误，因为字体加载错误不影响功能
      const startTime = Date.now()
      await page.goto('/trends')
      await expect(page.getByTestId('dashboard-page').or(page.getByTestId('page-header')).or(page.getByTestId('charts-grid'))).toBeVisible({ timeout: 10000 })
      const loadTime = Date.now() - startTime

      // 页面加载时间应小于5秒
      expect(loadTime).toBeLessThan(5000)

      // 验证关键页面元素存在
      await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()
    })
  })
})
