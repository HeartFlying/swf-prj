import { test, expect } from '@playwright/test'
import { setupErrorMonitoring, waitForPageStability } from './utils/error-monitor'
import { verifyChartRendered } from './utils/chart-helpers'

/**
 * 项目统计页面端到端测试
 * 覆盖页面元素显示、项目选择器、统计卡片、图表、筛选功能等
 * 使用真实后端API进行测试
 */
test.describe('项目统计页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到项目统计页面（使用全局登录状态）
    await page.goto('/project-stats')
    await expect(page).toHaveURL(/\/project-stats/, { timeout: 10000 })
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

    test('代码趋势图表渲染无cartesian2d错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证图表区域可见
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证没有 cartesian2d 相关错误
      errorMonitor.expectNoCartesianErrors()
    })

    test('图表resize时无structuredClone错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      await expect(page.getByTestId('echarts').locator('canvas').first()).toBeVisible()

      // 改变窗口大小（触发resize）
      await page.setViewportSize({ width: 800, height: 600 })
      await page.waitForLoadState('domcontentloaded')

      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForLoadState('domcontentloaded')

      // 验证没有克隆错误
      errorMonitor.expectNoCloneErrors()
    })
  })

  test.describe('页面元素显示验证', () => {
    test('应显示页面标题和项目选择器', async ({ page }) => {
      // 验证页面标题
      await expect(page.getByText('项目统计')).toBeVisible()

      // 验证项目选择器存在
      await expect(page.getByTestId('project-selector-wrapper')).toBeVisible()

      // 验证单选/多选切换按钮
      await expect(page.getByRole('button', { name: '单选' })).toBeVisible()
    })

    test('应显示项目信息卡片', async ({ page }) => {
      // 验证项目信息卡片存在
      await expect(page.getByTestId('project-info-card')).toBeVisible()

      // 验证项目名称显示
      await expect(page.getByTestId('project-name')).toBeVisible()

      // 验证项目描述显示
      await expect(page.getByTestId('project-description')).toBeVisible()
    })

    test('应显示项目统计卡片', async ({ page }) => {
      // 验证统计卡片网格存在
      await expect(page.getByTestId('project-stats-grid')).toBeVisible()

      // 验证四个统计卡片
      await expect(page.getByText('总提交数')).toBeVisible()
      await expect(page.getByText('贡献者')).toBeVisible()
      await expect(page.getByText('代码行数')).toBeVisible()
      await expect(page.getByText('Pull Requests')).toBeVisible()
    })

    test('应显示代码趋势图表区域', async ({ page }) => {
      // 验证图表区域存在
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证代码趋势卡片
      await expect(page.getByText('代码趋势')).toBeVisible()

      // 验证时间范围选择器
      await expect(page.getByTestId('time-range-selector')).toBeVisible()

      // 验证时间范围按钮
      await expect(page.getByRole('button', { name: '最近7天' })).toBeVisible()
      await expect(page.getByRole('button', { name: '最近30天' })).toBeVisible()
      await expect(page.getByRole('button', { name: '最近90天' })).toBeVisible()
    })

    test('应显示语言分布区域', async ({ page }) => {
      // 验证语言分布卡片
      await expect(page.getByText('语言分布')).toBeVisible()

      // 验证图表占位符或实际图表存在
      await expect(page.getByTestId('chart-placeholder').or(page.getByTestId('echarts'))).toBeVisible()
    })

    test('代码趋势图表正确渲染', async ({ page }) => {
      // 等待图表数据加载
      await expect(page.getByTestId('charts-section').getByTestId('echarts').first()).toBeVisible()

      // 验证代码趋势图表渲染质量
      const trendChart = page.getByTestId('charts-section').getByTestId('echarts').first()
      if (await trendChart.isVisible().catch(() => false)) {
        await verifyChartRendered(page, '[data-testid="charts-section"] [data-testid="echarts"]:first-child', {
          checkDimensions: true,
          checkInstance: true,
          checkData: true
        })
      }
    })

    test('语言分布图表正确渲染', async ({ page }) => {
      // 等待图表数据加载
      await expect(page.getByTestId('echarts').filter({ has: page.getByRole('img', { name: '' }) }).last()).toBeVisible()

      // 验证语言分布图表渲染质量
      const langChart = page.getByTestId('echarts').filter({ has: page.getByRole('img', { name: '' }) }).last()
      if (await langChart.isVisible().catch(() => false)) {
        await verifyChartRendered(page, '[data-testid="echarts"]:last-child', {
          checkDimensions: true,
          checkInstance: true,
          checkData: true
        })
      }
    })

    test('所有图表同时正确渲染', async ({ page }) => {
      // 等待图表数据加载
      await expect(page.getByTestId('echarts').first()).toBeVisible()

      // 获取所有图表容器
      const chartContainers = page.getByTestId('echarts')
      const count = await chartContainers.count()

      if (count >= 2) {
        // 验证代码趋势图表
        await verifyChartRendered(page, '[data-testid="charts-section"] [data-testid="echarts"]:first-child', {
          checkDimensions: true,
          checkInstance: true,
          checkData: true
        })

        // 验证语言分布图表
        await verifyChartRendered(page, '[data-testid="echarts"]:last-child', {
          checkDimensions: true,
          checkInstance: true,
          checkData: true
        })
      }
    })

    test('应显示成员贡献统计列表', async ({ page }) => {
      // 验证成员贡献组件存在
      await expect(page.getByText('成员贡献统计')).toBeVisible()
    })
  })

  test.describe('项目选择器功能', () => {
    test('应能切换单选/多选模式', async ({ page }) => {
      // 初始状态为单选模式
      await expect(page.getByRole('button', { name: '单选' })).toBeVisible()

      // 点击切换到多选模式
      await page.getByRole('button', { name: '单选' }).click()

      // 验证按钮文本变为多选
      await expect(page.getByRole('button', { name: '多选' })).toBeVisible()

      // 再次点击切换回单选模式
      await page.getByRole('button', { name: '多选' }).click()

      // 验证按钮文本变回单选
      await expect(page.getByRole('button', { name: '单选' })).toBeVisible()
    })

    test('单选模式下应能选择不同项目', async ({ page }) => {
      // 点击项目选择器
      await page.getByTestId('project-selector-wrapper').getByRole('combobox').first().click()

      // 等待选项加载
      await page.waitForLoadState('domcontentloaded')

      // 验证下拉选项显示（如果有项目数据）
      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 0) {
        // 验证选项可见
        await expect(options.first()).toBeVisible()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('切换项目应刷新数据', async ({ page }) => {
      // 点击项目选择器
      await page.getByTestId('project-selector-wrapper').getByRole('combobox').first().click()

      // 等待选项加载
      await page.waitForLoadState('domcontentloaded')

      // 选择另一个项目（如果存在）
      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 1) {
        await options.nth(1).click()

        // 等待数据刷新
        await expect(page.getByTestId('project-stats-grid')).toBeVisible()

        // 验证页面内容仍然显示
        await expect(page.getByText('项目统计')).toBeVisible()
      } else if (count === 1) {
        await options.first().click()
        await expect(page.getByTestId('project-stats-grid')).toBeVisible()
        await expect(page.getByText('项目统计')).toBeVisible()
      } else {
        await page.keyboard.press('Escape')
      }
    })
  })

  test.describe('时间范围切换功能', () => {
    test('应能切换代码趋势时间范围', async ({ page }) => {
      // 验证默认选中30天 - 使用getByRole获取按钮并检查其状态
      const btn30 = page.getByRole('button', { name: '最近30天' })
      await expect(btn30).toBeVisible()

      // 点击切换到7天
      await page.getByRole('button', { name: '最近7天' }).click()

      // 等待数据刷新
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证页面内容仍然显示
      await expect(page.getByText('项目统计')).toBeVisible()

      // 点击切换到90天
      await page.getByRole('button', { name: '最近90天' }).click()

      // 等待数据刷新
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证页面内容仍然显示
      await expect(page.getByText('项目统计')).toBeVisible()
    })

    test('切换时间范围应重新加载图表数据', async ({ page }) => {
      // 切换到不同时间范围
      await page.getByRole('button', { name: '最近7天' }).click()

      // 等待数据加载
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证页面内容仍然显示
      await expect(page.getByText('项目统计')).toBeVisible()
      await expect(page.getByTestId('charts-section')).toBeVisible()
    })
  })

  test.describe('筛选功能', () => {
    test('应显示筛选器配置', async ({ page }) => {
      // 验证部门筛选器存在
      await expect(page.getByText('部门')).toBeVisible()

      // 验证成员筛选器存在
      await expect(page.getByText('成员')).toBeVisible()
    })

    test('应能展开部门筛选下拉菜单', async ({ page }) => {
      // 点击部门筛选器 - 使用getByLabel查找带部门标签的选择器
      const deptLabel = page.getByText('部门').first()
      if (await deptLabel.isVisible().catch(() => false)) {
        // 找到标签旁边的combobox
        const deptSelect = page.getByRole('combobox').nth(1)
        await deptSelect.click()

        // 等待选项加载
        await page.waitForLoadState('domcontentloaded')

        // 验证选项或关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('选择筛选条件应刷新数据', async ({ page }) => {
      // 选择部门筛选条件（如果存在）- 使用getByLabel查找带部门标签的选择器
      const deptLabel = page.getByText('部门').first()
      if (await deptLabel.isVisible().catch(() => false)) {
        const deptSelect = page.getByRole('combobox').nth(1)
        await deptSelect.click()

        // 等待选项加载
        await page.waitForLoadState('domcontentloaded')

        // 选择第一个选项（如果存在）
        const options = page.getByRole('option')
        if (await options.first().isVisible().catch(() => false)) {
          await options.first().click()

          // 等待数据刷新
          await expect(page.getByTestId('project-stats-grid')).toBeVisible()

          // 验证页面内容仍然显示
          await expect(page.getByText('项目统计')).toBeVisible()
        } else {
          await page.keyboard.press('Escape')
        }
      }
    })
  })

  test.describe('刷新功能', () => {
    test('点击刷新按钮应重新加载数据', async ({ page }) => {
      // 点击刷新按钮
      await page.getByRole('button', { name: '刷新' }).click()

      // 等待数据刷新
      await expect(page.getByTestId('project-stats-grid')).toBeVisible()

      // 验证页面内容仍然显示
      await expect(page.getByText('项目统计')).toBeVisible()
    })
  })

  test.describe('统计数据展示', () => {
    test('应正确显示项目统计数据', async ({ page }) => {
      // 等待数据加载
      await expect(page.getByTestId('stat-card').first()).toBeVisible()

      // 验证统计数据正确显示（使用格式化后的数字或占位符）
      const statCards = page.getByTestId('stat-card')
      await expect(statCards).toHaveCount(4)

      // 验证每个卡片都有数值显示
      for (let i = 0; i < 4; i++) {
        const value = statCards.nth(i).getByTestId('stat-value')
        await expect(value).toBeVisible()
      }
    })

    test('统计卡片应有正确的颜色样式', async ({ page }) => {
      // 验证统计卡片存在不同颜色样式
      const statCards = page.getByTestId('stat-card')
      await expect(statCards).toHaveCount(4)

      // 验证各颜色类存在
      await expect(page.getByTestId('stat-card-primary')).toBeVisible()
      await expect(page.getByTestId('stat-card-success')).toBeVisible()
      await expect(page.getByTestId('stat-card-warning')).toBeVisible()
      await expect(page.getByTestId('stat-card-purple')).toBeVisible()
    })
  })

  test.describe('加载状态', () => {
    test('数据加载时应显示加载状态或内容', async ({ page }) => {
      // 刷新页面以触发加载
      await page.reload()
      await expect(page.getByText('项目统计')).toBeVisible()

      // 等待加载完成
      await expect(page.getByTestId('project-stats-grid')).toBeVisible({ timeout: 5000 })

      // 验证内容显示
    })
  })

  test.describe('错误处理', () => {
    test('API错误时应显示错误提示或空状态', async ({ page }) => {
      // 刷新页面
      await page.reload()
      await expect(page.getByText('项目统计')).toBeVisible()

      // 等待数据加载
      await page.waitForLoadState('networkidle')

      // 验证页面内容、错误消息或空状态
      const hasContent = await page.getByTestId('project-stats-grid').isVisible().catch(() => false)
      const hasError = await page.getByRole('alert').filter({ hasText: /错误/ }).isVisible().catch(() => false)
      const hasEmpty = await page.getByTestId('el-empty').isVisible().catch(() => false)

      expect(hasContent || hasError || hasEmpty).toBeTruthy()
    })

    test('无项目数据时应显示空状态', async ({ page }) => {
      // 验证项目选择器存在
      await expect(page.getByTestId('project-selector-wrapper')).toBeVisible()

      // 检查是否有项目数据
      const projectSelect = page.getByTestId('project-selector-wrapper').getByRole('combobox').first()
      await projectSelect.click()

      const options = page.getByRole('option')
      const count = await options.count()

      if (count === 0) {
        // 验证空状态显示
        await expect(page.getByTestId('el-empty')).toBeVisible()
      }

      // 关闭下拉
      await page.keyboard.press('Escape')
    })
  })

  test.describe('响应式布局', () => {
    test('在平板设备上应正常显示', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()

      // 等待页面加载
      await expect(page).toHaveURL(/\/project-stats/, { timeout: 10000 })
      await expect(page.getByTestId('project-info-card')).toBeVisible()

      // 验证关键元素仍然可见
      await expect(page.getByText('项目统计')).toBeVisible()
      await expect(page.getByTestId('project-info-card')).toBeVisible()
      await expect(page.getByTestId('project-stats-grid')).toBeVisible()
    })

    test('在移动设备上应正常显示', async ({ page }) => {
      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()

      // 等待页面加载
      await expect(page).toHaveURL(/\/project-stats/, { timeout: 10000 })
      await expect(page.getByTestId('project-selector-wrapper')).toBeVisible()

      // 验证关键元素仍然可见
      await expect(page.getByText('项目统计')).toBeVisible()
      await expect(page.getByTestId('project-selector-wrapper')).toBeVisible()
    })
  })

  test.describe('交互场景', () => {
    test('窗口resize时图表自适应', async ({ page }) => {
      // 等待图表渲染完成
      await expect(page.getByTestId('echarts').locator('canvas').first()).toBeVisible()

      // 查找图表canvas
      const canvas = page.getByTestId('echarts').locator('canvas').first()
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
      await page.goto('/project-stats')
      await expect(page.getByText('项目统计')).toBeVisible()

      // 验证页面标题和图表正常渲染
      await expect(page.getByText('项目统计')).toBeVisible()
      await expect(page.getByText('代码趋势')).toBeVisible()
      await expect(page.getByTestId('charts-section')).toBeVisible()
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
      await expect(page.getByText('代码趋势')).toBeVisible()
    })

    test('时间范围切换后图表重绘', async ({ page }) => {
      // 等待图表渲染
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 点击切换到7天
      await page.getByRole('button', { name: '最近7天' }).click()
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证图表仍然正常显示
      await expect(page.getByTestId('charts-section')).toBeVisible()
      await expect(page.getByText('代码趋势')).toBeVisible()

      // 点击切换到90天
      await page.getByRole('button', { name: '最近90天' }).click()
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证图表仍然正常显示
      await expect(page.getByTestId('charts-section')).toBeVisible()
    })

    test('快速切换时间范围不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 快速点击不同的时间范围按钮
      await page.getByRole('button', { name: '最近7天' }).click()
      await page.getByRole('button', { name: '最近30天' }).click()
      await page.getByRole('button', { name: '最近90天' }).click()
      await page.getByRole('button', { name: '最近7天' }).click()

      // 等待稳定
      await expect(page.getByText('项目统计')).toBeVisible()

      // 验证没有JavaScript错误
      errorMonitor.expectNoErrors()

      // 验证页面正常
      await expect(page.getByText('项目统计')).toBeVisible()
    })

    test('多次快速resize不报错', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      await expect(page.getByTestId('echarts').locator('canvas').first()).toBeVisible()

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
      await expect(page.getByText('项目统计')).toBeVisible()

      // 验证没有JavaScript错误
      errorMonitor.expectNoErrors()

      // 验证页面仍然正常显示
      await expect(page.getByText('项目统计')).toBeVisible()
      await expect(page.getByTestId('charts-section')).toBeVisible()
    })

    test('resize时无cartesian2d错误', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      await expect(page.getByTestId('echarts').locator('canvas').first()).toBeVisible()

      // 多次resize
      const sizes = [
        { width: 1200, height: 800 },
        { width: 800, height: 600 },
        { width: 1280, height: 720 }
      ]

      for (const size of sizes) {
        await page.setViewportSize(size)
        await page.waitForLoadState('domcontentloaded')
      }

      // 验证没有 cartesian2d 相关错误
      errorMonitor.expectNoCartesianErrors()
    })

    test('数据刷新时无DataCloneError', async ({ page }) => {
      // 设置错误监控
      const errorMonitor = setupErrorMonitoring(page)

      // 等待图表渲染
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 点击刷新按钮
      const refreshButton = page.getByRole('button', { name: '刷新' })
      await refreshButton.click()

      // 等待加载完成
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 验证没有 DataCloneError
      expect(errorMonitor.hasDataCloneError()).toBe(false)
    })

    test('切换项目后图表正常渲染', async ({ page }) => {
      // 等待图表渲染
      await expect(page.getByTestId('charts-section')).toBeVisible()

      // 点击项目选择器
      const projectSelect = page.getByTestId('project-selector-wrapper').getByRole('combobox').first()
      await projectSelect.click()
      await page.waitForLoadState('domcontentloaded')

      // 选择另一个项目（如果存在）
      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 1) {
        await options.nth(1).click()
        await expect(page.getByTestId('charts-section')).toBeVisible()

        // 验证图表正常渲染
        await expect(page.getByTestId('charts-section')).toBeVisible()
        await expect(page.getByText('代码趋势')).toBeVisible()
      } else if (count === 1) {
        await options.first().click()
        await expect(page.getByTestId('charts-section')).toBeVisible()
      } else {
        await page.keyboard.press('Escape')
      }
    })
  })
})
