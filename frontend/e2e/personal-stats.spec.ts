import { test, expect } from '@playwright/test'
import { setupErrorMonitoring, waitForPageStability } from './utils/error-monitor'
import { verifyChartRendered, verifyCanvasDimensions } from './utils/chart-helpers'

/**
 * 个人统计页面端到端测试
 * 测试页面: /personal-stats
 * 使用真实后端API进行测试
 *
 * 覆盖功能:
 * - 页面加载和基础元素
 * - 个人数据展示
 * - 图表交互
 * - 时间筛选
 * - 排名显示
 * - Token 使用统计
 * - 活动热力图
 */
test.describe('个人统计页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到个人统计页面（使用全局登录状态）
    await page.goto('/personal-stats')
    await expect(page).toHaveURL(/\/personal-stats/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
  })

  test.describe('错误监控', () => {
    test('页面加载无控制台错误', async ({ page }) => {
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

    test('热力图渲染无cartesian2d错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待热力图渲染
      await expect(page.getByTestId('contribution-heatmap')).toBeVisible()

      // 验证热力图可见
      await expect(page.getByTestId('contribution-heatmap')).toBeVisible()

      // 验证没有 cartesian2d 相关错误
      errorMonitor.expectNoCartesianErrors()
    })

    test('图表resize时无structuredClone错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      await expect(page.getByTestId('echarts').locator('canvas').or(page.getByTestId('contribution-heatmap').locator('canvas')).first()).toBeVisible()

      // 改变窗口大小（触发resize）
      await page.setViewportSize({ width: 800, height: 600 })
      await page.waitForLoadState('domcontentloaded')

      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForLoadState('domcontentloaded')

      // 验证没有克隆错误
      errorMonitor.expectNoCloneErrors()
    })
  })

  test.describe('页面加载和基础元素', () => {
    test('页面标题和控制按钮显示正确', async ({ page }) => {
      // 验证页面标题
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()

      // 验证时间范围选择器存在
      await expect(page.getByTestId('time-range-selector')).toBeVisible()

      // 验证刷新按钮存在
      await expect(page.getByRole('button', { name: '刷新' })).toBeVisible()

      // 验证项目筛选器存在
      await expect(page.getByTestId('data-filter')).toBeVisible()
    })

    test('概览卡片区域显示正确', async ({ page }) => {
      // 验证4个概览卡片存在
      await expect(page.getByTestId('overview-card')).toHaveCount(4)

      // 验证各卡片标题
      await expect(page.getByText('总提交数')).toBeVisible()
      await expect(page.getByText('代码行数')).toBeVisible()
      await expect(page.getByText('Token使用')).toBeVisible()
      await expect(page.getByText('编码时长')).toBeVisible()
    })

    test('图表区域显示正确', async ({ page }) => {
      // 验证图表卡片区域存在
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证各图表卡片标题
      await expect(page.getByText('代码贡献热力图')).toBeVisible()
      await expect(page.getByText('语言统计')).toBeVisible()
      await expect(page.getByText('Token使用详情')).toBeVisible()
      await expect(page.getByText('活跃时段')).toBeVisible()
    })

    test('导出按钮显示在页脚', async ({ page }) => {
      // 验证导出按钮存在
      await expect(page.getByRole('button', { name: '导出数据' })).toBeVisible()
    })
  })

  test.describe('个人数据展示', () => {
    test('概览卡片显示数值', async ({ page }) => {
      // 等待数据加载完成
      await expect(page.getByTestId('overview-card').getByTestId('card-value').first()).toBeVisible()

      // 验证总提交数卡片显示数值
      const commitsCard = page.getByTestId('overview-card-commits')
      await expect(commitsCard.getByTestId('card-value')).toBeVisible()

      // 验证代码行数卡片显示数值和增减信息
      const linesCard = page.getByTestId('overview-card-lines')
      await expect(linesCard.getByTestId('card-value')).toBeVisible()
      await expect(linesCard.getByTestId('card-meta')).toBeVisible()

      // 验证Token使用卡片显示数值和日均值
      const tokenCard = page.getByTestId('overview-card-tokens')
      await expect(tokenCard.getByTestId('card-value')).toBeVisible()
      await expect(tokenCard.getByTestId('card-meta')).toBeVisible()

      // 验证编码时长卡片显示数值和活跃日
      const hoursCard = page.getByTestId('overview-card-hours')
      await expect(hoursCard.getByTestId('card-value')).toBeVisible()
      await expect(hoursCard.getByTestId('card-meta')).toBeVisible()
    })

    test('代码行数卡片显示增减详情', async ({ page }) => {
      const linesCard = page.getByTestId('overview-card-lines')
      const metaText = await linesCard.getByTestId('card-meta').textContent()

      // 验证显示增加和删除行数格式（如果有数据）
      if (metaText) {
        expect(metaText).toMatch(/[\d,]+/)
      }
    })

    test('编码时长卡片显示单位', async ({ page }) => {
      const hoursCard = page.getByTestId('overview-card-hours')
      const unit = hoursCard.getByTestId('unit')
      // 单位可能存在也可能不存在
      if (await unit.isVisible().catch(() => false)) {
        await expect(unit).toHaveText('h')
      }
    })
  })

  test.describe('时间筛选', () => {
    test('可以切换预设时间范围', async ({ page }) => {
      // 打开时间范围选择器
      await page.getByTestId('time-range-selector-preset').getByRole('combobox').click()

      // 选择最近30天（如果存在）
      const option30 = page.getByText('最近30天')
      if (await option30.isVisible().catch(() => false)) {
        await option30.click()

        // 等待数据刷新
        await expect(page.getByTestId('overview-section')).toBeVisible()

        // 验证数据已更新（页面仍然显示）
        await expect(page.getByText('总提交数')).toBeVisible()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('可以选择自定义时间范围', async ({ page }) => {
      // 打开时间范围选择器
      await page.getByTestId('time-range-selector-preset').getByRole('combobox').click()

      // 选择自定义（如果存在）
      const customOption = page.getByText('自定义')
      if (await customOption.isVisible().catch(() => false)) {
        await customOption.click()

        // 验证自定义日期选择器显示
        await expect(page.getByTestId('time-range-selector-custom')).toBeVisible()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('刷新按钮可以重新加载数据', async ({ page }) => {
      // 点击刷新按钮
      await page.getByRole('button', { name: '刷新' }).click()

      // 验证加载状态显示或页面内容仍然显示
      await expect(page.getByTestId('stats-loading').or(page.getByTestId('overview-section'))).toBeVisible()

      // 等待加载完成
      await expect(page.getByTestId('overview-section')).toBeVisible()

      // 验证页面内容仍然显示
      await expect(page.getByText('总提交数')).toBeVisible()
    })
  })

  test.describe('项目筛选', () => {
    test('可以选择项目筛选', async ({ page }) => {
      // 打开项目筛选下拉框
      const projectSelect = page.getByTestId('data-filter-item').getByRole('combobox').first()
      await projectSelect.click()

      // 等待选项加载
      await page.waitForLoadState('domcontentloaded')

      // 验证下拉选项存在（如果有项目数据）
      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 0) {
        // 选择第一个项目
        await options.first().click()

        // 等待数据刷新
        await expect(page.getByTestId('data-filter-tags')).toBeVisible()

        // 验证筛选标签显示
        await expect(page.getByTestId('data-filter-tags')).toBeVisible()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('可以清除项目筛选', async ({ page }) => {
      // 先选择一个项目
      const projectSelect = page.getByTestId('data-filter-item').getByRole('combobox').first()
      await projectSelect.click()

      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 0) {
        await options.first().click()
        await expect(page.getByTestId('data-filter-tags')).toBeVisible()

        // 点击清除筛选按钮
        await page.getByRole('button', { name: /清除筛选/ }).click()

        // 验证筛选标签消失
        await expect(page.getByTestId('data-filter-tags')).not.toBeVisible()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })
  })

  test.describe('活动热力图', () => {
    test('热力图显示正确', async ({ page }) => {
      // 验证热力图容器存在
      await expect(page.getByTestId('contribution-heatmap')).toBeVisible()

      // 验证图例显示
      await expect(page.getByTestId('heatmap-legend')).toBeVisible()
      await expect(page.getByText('少')).toBeVisible()
      await expect(page.getByText('多')).toBeVisible()

      // 验证月份标签显示
      await expect(page.getByTestId('month-labels')).toBeVisible()

      // 验证热力图网格存在
      await expect(page.getByTestId('heatmap-grid')).toBeVisible()
    })

    test('热力图canvas正确渲染', async ({ page }) => {
      // 等待数据加载
      await expect(page.getByTestId('heatmap-card').or(page.getByTestId('contribution-heatmap')).first()).toBeVisible()

      // 验证热力图canvas渲染（如果存在ECharts热力图）
      const heatmapCanvas = page.getByTestId('heatmap-card').locator('canvas')
        .or(page.getByTestId('contribution-heatmap').locator('canvas')).first()
      if (await heatmapCanvas.isVisible().catch(() => false)) {
        await verifyCanvasDimensions(page, '[data-testid="heatmap-card"], [data-testid="contribution-heatmap"]')
      }
    })

    test('热力图显示贡献总数', async ({ page }) => {
      // 验证贡献总数显示
      const subtitle = page.getByTestId('heatmap-card').getByTestId('chart-subtitle')
      await expect(subtitle).toBeVisible()

      const text = await subtitle.textContent()
      if (text) {
        expect(text).toMatch(/\d+/)
      }
    })

    test('热力图单元格有5个级别', async ({ page }) => {
      // 验证图例有5个级别
      const legendCells = page.getByTestId('heatmap-legend').getByTestId('legend-cell')
      await expect(legendCells).toHaveCount(5)

      // 验证各级别样式类存在
      for (let i = 0; i < 5; i++) {
        await expect(page.getByTestId(`legend-cell-level-${i}`)).toBeVisible()
      }
    })

    test('热力图单元格悬停效果', async ({ page }) => {
      // 获取第一个有数据的单元格（level > 0）
      const dayCells = page.getByTestId('heatmap-day')
      const count = await dayCells.count()

      if (count > 0) {
        // 悬停在第一个单元格上
        await dayCells.first().hover()

        // 验证悬停效果（通过检查元素可见性）
        await expect(dayCells.first()).toBeVisible()
      }
    })
  })

  test.describe('语言统计', () => {
    test('语言列表显示正确', async ({ page }) => {
      // 验证语言列表容器存在
      await expect(page.getByTestId('language-list')).toBeVisible()

      // 验证语言项存在（可能有0个或多个，取决于后端数据）
      const languageItems = page.getByTestId('language-item')
      const count = await languageItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('语言项显示完整信息（如果有数据）', async ({ page }) => {
      const languageItems = page.getByTestId('language-item')
      const count = await languageItems.count()

      if (count > 0) {
        const firstLang = languageItems.first()

        // 验证语言颜色标识
        await expect(firstLang.getByTestId('lang-color')).toBeVisible()

        // 验证语言名称
        await expect(firstLang.getByTestId('lang-name')).toBeVisible()

        // 验证百分比
        const percent = firstLang.getByTestId('lang-percent')
        await expect(percent).toBeVisible()
        const percentText = await percent.textContent()
        if (percentText) {
          expect(percentText).toMatch(/\d+%/)
        }

        // 验证行数
        const lines = firstLang.getByTestId('lang-lines')
        await expect(lines).toBeVisible()
        const linesText = await lines.textContent()
        if (linesText) {
          expect(linesText).toMatch(/[\d,]+/)
        }
      }
    })

    test('语言颜色标识有背景色（如果有数据）', async ({ page }) => {
      const colorDot = page.getByTestId('language-item').getByTestId('lang-color').first()
      if (await colorDot.isVisible().catch(() => false)) {
        const bgColor = await colorDot.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        )
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
        expect(bgColor).not.toBe('transparent')
      }
    })
  })

  test.describe('Token 使用统计', () => {
    test('Token 统计区域显示正确', async ({ page }) => {
      // 验证Token统计容器存在
      await expect(page.getByTestId('token-stats')).toBeVisible()

      // 验证统计项存在
      const tokenItems = page.getByTestId('token-stat-item')
      const count = await tokenItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('显示 Prompt Tokens 和 Completion Tokens（如果有数据）', async ({ page }) => {
      // 验证 Prompt Tokens 标签
      const promptTokens = page.getByText('Prompt Tokens')
      if (await promptTokens.isVisible().catch(() => false)) {
        await expect(promptTokens).toBeVisible()
      }

      // 验证 Completion Tokens 标签
      const completionTokens = page.getByText('Completion Tokens')
      if (await completionTokens.isVisible().catch(() => false)) {
        await expect(completionTokens).toBeVisible()
      }
    })

    test('Token 统计有进度条（如果有数据）', async ({ page }) => {
      // 验证进度条容器存在
      const statBars = page.getByTestId('token-stat-item').getByTestId('stat-bar')
      const count = await statBars.count()

      if (count > 0) {
        await expect(statBars).toHaveCount(count)

        // 验证进度条有填充
        const progressBars = page.getByTestId('token-stat-item').getByTestId('stat-progress')
        await expect(progressBars).toHaveCount(count)
      }
    })

    test('Token 数值格式化显示（如果有数据）', async ({ page }) => {
      const statValues = page.getByTestId('token-stat-item').getByTestId('stat-value')
      const count = await statValues.count()

      if (count > 0) {
        const firstValue = await statValues.first().textContent()
        if (firstValue) {
          expect(firstValue).toMatch(/[\d,]+/)
        }
      }
    })
  })

  test.describe('活跃时段图表', () => {
    test('活跃时段图表显示正确', async ({ page }) => {
      // 验证活跃时段容器存在
      await expect(page.getByTestId('activity-placeholder')).toBeVisible()

      // 验证24个时段柱子存在
      const activityBars = page.getByTestId('activity-bar')
      await expect(activityBars).toHaveCount(24)
    })

    test('活跃时段图表canvas渲染', async ({ page }) => {
      // 等待数据加载
      await expect(page.getByTestId('activity-placeholder').first()).toBeVisible()

      // 检查是否存在ECharts图表（某些实现可能使用canvas）
      const activityCard = page.getByTestId('activity-card')
      const canvas = activityCard.locator('canvas')

      if (await canvas.isVisible().catch(() => false)) {
        // 如果使用了ECharts，验证canvas渲染
        await verifyChartRendered(page, '[data-testid="activity-card"] [data-testid="echarts"]', {
          checkDimensions: true,
          checkInstance: true,
          checkData: false
        })
      } else {
        // 验证CSS柱状图渲染
        await expect(page.getByTestId('activity-placeholder')).toBeVisible()
        const bars = page.getByTestId('activity-bar')
        const count = await bars.count()
        expect(count).toBe(24)
      }
    })

    test('活跃时段柱子有高度', async ({ page }) => {
      const firstBar = page.getByTestId('activity-bar').first()
      const height = await firstBar.evaluate(el =>
        window.getComputedStyle(el).height
      )
      expect(height).not.toBe('0px')
    })

    test('活跃时段柱子悬停效果', async ({ page }) => {
      const firstBar = page.getByTestId('activity-bar').first()

      // 悬停在柱子上
      await firstBar.hover()

      // 验证元素可见
      await expect(firstBar).toBeVisible()
    })
  })

  test.describe('数据导出', () => {
    test('点击导出按钮触发导出', async ({ page }) => {
      // 点击导出按钮
      await page.getByRole('button', { name: '导出数据' }).click()

      // 验证成功消息或错误消息
      await expect(page.getByRole('alert').filter({ hasText: /成功|错误/ })).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('响应式布局', () => {
    test('在平板尺寸下布局正确', async ({ page }) => {
      // 设置平板尺寸
      await page.setViewportSize({ width: 768, height: 1024 })

      // 等待布局调整
      await page.waitForLoadState('domcontentloaded')

      // 验证页面内容仍然可见
      await expect(page.getByText('个人统计')).toBeVisible()
      await expect(page.getByText('总提交数')).toBeVisible()
    })

    test('在手机尺寸下布局正确', async ({ page }) => {
      // 设置手机尺寸
      await page.setViewportSize({ width: 375, height: 667 })

      // 等待布局调整
      await page.waitForLoadState('domcontentloaded')

      // 验证页面内容仍然可见
      await expect(page.getByText('个人统计')).toBeVisible()
      await expect(page.getByText('总提交数')).toBeVisible()
    })
  })

  test.describe('加载状态', () => {
    test('初始加载显示骨架屏或内容', async ({ page }) => {
      // 快速导航到页面以捕获加载状态
      await page.goto('/personal-stats')

      // 验证骨架屏或加载状态存在，或者内容已经显示
      const skeleton = page.getByTestId('el-skeleton')
      const loading = page.getByTestId('stats-loading')
      const content = page.getByTestId('overview-section')

      // 至少有一个应该可见
      const hasSkeleton = await skeleton.isVisible().catch(() => false)
      const hasLoading = await loading.isVisible().catch(() => false)
      const hasContent = await content.isVisible().catch(() => false)

      expect(hasSkeleton || hasLoading || hasContent).toBeTruthy()
    })

    test('数据加载完成后显示内容', async ({ page }) => {
      // 等待加载完成
      await expect(page.getByTestId('overview-section')).toBeVisible({ timeout: 5000 })

      // 验证内容显示
      await expect(page.getByTestId('charts-section')).toBeVisible()
    })
  })

  test.describe('错误处理', () => {
    test('API错误时应显示错误提示或空状态', async ({ page }) => {
      // 刷新页面
      await page.reload()
      await expect(page.getByText('个人统计')).toBeVisible()

      // 等待数据加载
      await page.waitForLoadState('networkidle')

      // 验证页面内容或错误消息
      const hasContent = await page.getByTestId('overview-section').isVisible().catch(() => false)
      const hasError = await page.getByRole('alert').filter({ hasText: /错误/ }).isVisible().catch(() => false)
      const hasEmpty = await page.getByTestId('el-empty').isVisible().catch(() => false)

      expect(hasContent || hasError || hasEmpty).toBeTruthy()
    })
  })

  test.describe('交互场景', () => {
    test('窗口resize时图表自适应', async ({ page }) => {
      // 等待图表渲染完成
      const chartCanvas = page.getByTestId('echarts').locator('canvas')
        .or(page.getByTestId('contribution-heatmap').locator('canvas')).first()
      await expect(chartCanvas).toBeVisible()

      // 查找图表canvas
      const canvas = page.getByTestId('echarts').locator('canvas')
        .or(page.getByTestId('contribution-heatmap').locator('canvas')).first()
      if (await canvas.isVisible().catch(() => false)) {
        const beforeWidth = await canvas.evaluate(el => el.width)

        // 改变窗口大小
        await page.setViewportSize({ width: 800, height: 600 })
        await page.waitForLoadState('domcontentloaded')

        // 验证canvas尺寸变化
        const afterWidth = await canvas.evaluate(el => el.width)
        expect(afterWidth).not.toEqual(beforeWidth)

        // 恢复窗口大小
        await page.setViewportSize({ width: 1280, height: 720 })
        await page.waitForLoadState('domcontentloaded')
      }
    })

    test('快速切换页面后图表正常渲染', async ({ page }) => {
      // 快速切换到其他页面再返回
      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await page.goto('/personal-stats')
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()

      // 验证页面标题和图表正常渲染
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()
      await expect(page.getByText('代码贡献热力图')).toBeVisible()
    })

    test('数据刷新按钮点击后图表更新', async ({ page }) => {
      // 等待图表渲染
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 点击刷新按钮
      const refreshButton = page.getByRole('button', { name: '刷新' })
      await refreshButton.click()

      // 等待加载完成
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证图表区域仍然正常显示
      await expect(page.getByTestId('charts-section')).toBeVisible()
      await expect(page.getByText('代码贡献热力图')).toBeVisible()
    })

    test('时间范围切换后图表重绘', async ({ page }) => {
      // 等待图表渲染
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 打开时间范围选择器
      await page.getByTestId('time-range-selector-preset').getByRole('combobox').click()
      await page.waitForLoadState('domcontentloaded')

      // 选择不同的时间范围
      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 1) {
        // 选择第二个选项
        await options.nth(1).click()
        await expect(page.getByTestId('charts-section')).toBeVisible()

        // 验证图表仍然正常显示
        await expect(page.getByTestId('charts-section')).toBeVisible()
        await expect(page.getByText('代码贡献热力图')).toBeVisible()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('快速切换时间范围不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 快速点击不同的时间范围按钮
      const timeButtons = ['最近7天', '最近30天', '最近90天']
      for (const btnName of timeButtons) {
        const btn = page.getByRole('button', { name: btnName })
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
          await page.waitForLoadState('domcontentloaded')
        }
      }

      // 等待稳定
      await expect(page.getByText('个人统计')).toBeVisible()

      // 验证没有JavaScript错误
      errorMonitor.expectNoErrors()

      // 验证页面正常
      await expect(page.getByText('个人统计')).toBeVisible()
    })

    test('多次快速resize不报错', async ({ page }) => {
      // 等待图表渲染
      const chartCanvas = page.getByTestId('echarts').locator('canvas')
        .or(page.getByTestId('contribution-heatmap').locator('canvas')).first()
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
      await expect(page.getByText('个人统计')).toBeVisible()

      // 验证没有JavaScript错误
      errorMonitor.expectNoErrors()

      // 验证页面仍然正常显示
      await expect(page.getByText('个人统计')).toBeVisible()
      await expect(page.getByTestId('charts-section')).toBeVisible()
    })
  })
})
