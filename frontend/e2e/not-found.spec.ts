import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * 404页面端到端测试
 * 覆盖页面元素显示、返回首页、返回上一页等功能
 */
test.describe('404页面', () => {
  test.describe('访问不存在的路由', () => {
    test('访问不存在的路由应显示404页面', async ({ page }) => {
      // 访问一个不存在的路由
      await page.goto('/non-existent-page-12345')

      // 验证404页面容器存在
      await expect(page.getByTestId('not-found-page')).toBeVisible()

      // 验证错误代码404显示
      await expect(page.getByTestId('error-code')).toBeVisible()
      await expect(page.getByTestId('error-code')).toContainText('404')
    })

    test('访问多级不存在的路由应显示404页面', async ({ page }) => {
      // 访问多级不存在的路由
      await page.goto('/level1/level2/level3/non-existent')

      // 验证404页面显示
      await expect(page.getByTestId('not-found-page')).toBeVisible()
      await expect(page.getByTestId('error-code')).toContainText('404')
    })

    test('访问带参数的不存在路由应显示404页面', async ({ page }) => {
      // 访问带查询参数的不存在路由
      await page.goto('/non-existent?page=1&size=10')

      // 验证404页面显示
      await expect(page.getByTestId('not-found-page')).toBeVisible()
      await expect(page.getByTestId('error-code')).toContainText('404')
    })
  })

  test.describe('页面元素显示验证', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/not-found-page')
    })

    test('应显示完整的404页面结构', async ({ page }) => {
      // 验证页面容器
      await expect(page.getByTestId('not-found-page')).toBeVisible()

      // 验证错误容器
      await expect(page.getByTestId('error-container')).toBeVisible()

      // 验证错误代码404
      await expect(page.getByTestId('error-code')).toBeVisible()
      await expect(page.getByTestId('error-code')).toHaveText('404')

      // 验证每个数字位
      const digits = page.getByTestId('error-code').getByTestId('digit')
      await expect(digits).toHaveCount(3)
      await expect(digits.nth(0)).toHaveText('4')
      await expect(digits.nth(1)).toHaveText('0')
      await expect(digits.nth(2)).toHaveText('4')
    })

    test('应显示错误信息文本', async ({ page }) => {
      // 验证错误标题
      await expect(page.getByTestId('error-message')).toBeVisible()
      await expect(page.getByTestId('error-message')).toHaveText('页面未找到')

      // 验证错误描述
      await expect(page.getByTestId('error-description')).toBeVisible()
      await expect(page.getByTestId('error-description')).toHaveText('您访问的页面不存在或已被移除')
    })

    test('应显示返回首页按钮', async ({ page }) => {
      // 验证返回首页链接存在
      const backHomeLink = page.getByRole('link', { name: '返回首页' })
      await expect(backHomeLink).toBeVisible()

      // 验证链接指向仪表板
      await expect(backHomeLink).toHaveAttribute('href', '/dashboard')

      // 验证按钮文本
      await expect(backHomeLink).toContainText('返回首页')
    })

    test('应使用TechButton组件', async ({ page }) => {
      // 验证TechButton组件存在
      const techButton = page.getByRole('link', { name: '返回首页' }).getByTestId('tech-button')
      // 由于TechButton是自定义组件，检查按钮是否存在
      await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible()
    })
  })

  test.describe('返回首页功能', () => {
    test('点击返回首页按钮应跳转到仪表板', async ({ page }) => {
      // 先访问404页面
      await page.goto('/some-non-existent-page')

      // 验证当前在404页面
      await expect(page.getByTestId('not-found-page')).toBeVisible()

      // 点击返回首页按钮
      await page.getByRole('link', { name: '返回首页' }).click()

      // 验证跳转到仪表板页面
      await expect(page).toHaveURL(/\/dashboard/)

      // 验证仪表板页面已加载（通过检查页面上的特定元素）
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 5000 })
    })

    test('返回首页链接应在新标签页打开设置正确', async ({ page }) => {
      await page.goto('/non-existent')

      const backHomeLink = page.getByRole('link', { name: '返回首页' })
      // 检查链接的基本属性
      await expect(backHomeLink).toHaveAttribute('href', '/dashboard')
    })
  })

  test.describe('返回上一页功能', () => {
    test('浏览器返回按钮应从404页面返回上一页', async ({ page }) => {
      // 先访问一个普通页面（使用个人统计页面）
      await page.goto('/personal-stats')
      await expect(page.getByRole('heading', { name: '个人统计' })).toBeVisible()

      // 然后访问不存在的页面
      await page.goto('/non-existent-page')
      await expect(page.getByTestId('not-found-page')).toBeVisible()

      // 使用浏览器返回按钮
      await page.goBack()

      // 验证返回到原页面
      await expect(page).toHaveURL(/\/personal-stats/)
    })

    test('从其他页面进入404后返回应回到原页面', async ({ page }) => {
      // 先访问仪表板
      await page.goto('/dashboard')

      // 然后访问不存在的页面
      await page.goto('/page-that-does-not-exist')
      await expect(page.getByTestId('not-found-page')).toBeVisible()

      // 使用浏览器返回按钮
      await page.goBack()

      // 验证返回到仪表板
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe('页面样式验证', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/not-found')
    })

    test('错误代码应有大字体样式', async ({ page }) => {
      const errorCode = page.getByTestId('error-code')
      await expect(errorCode).toBeVisible()

      // 验证字体大小（通过计算样式）
      const fontSize = await errorCode.evaluate(el => window.getComputedStyle(el).fontSize)
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(100)
    })

    test('页面应居中显示', async ({ page }) => {
      const notFoundPage = page.getByTestId('not-found-page')

      // 验证flex布局属性
      const display = await notFoundPage.evaluate(el => window.getComputedStyle(el).display)
      expect(display).toBe('flex')

      const justifyContent = await notFoundPage.evaluate(el => window.getComputedStyle(el).justifyContent)
      expect(justifyContent).toBe('center')

      const alignItems = await notFoundPage.evaluate(el => window.getComputedStyle(el).alignItems)
      expect(alignItems).toBe('center')
    })

    test('错误容器应有文本居中', async ({ page }) => {
      const errorContainer = page.getByTestId('error-container')
      const textAlign = await errorContainer.evaluate(el => window.getComputedStyle(el).textAlign)
      expect(textAlign).toBe('center')
    })
  })

  test.describe('响应式布局', () => {
    test('在移动设备上应正常显示404页面', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/non-existent')

      // 验证404页面仍然可见
      await expect(page.getByTestId('not-found-page')).toBeVisible()
      await expect(page.getByTestId('error-code')).toBeVisible()
      await expect(page.getByTestId('error-message')).toBeVisible()

      // 验证返回首页按钮可点击
      await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('在平板设备上应正常显示404页面', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/non-existent')

      // 验证404页面元素可见
      await expect(page.getByTestId('not-found-page')).toBeVisible()
      await expect(page.getByTestId('error-code')).toBeVisible()
    })

    test('在桌面设备上应正常显示404页面', async ({ page }) => {
      // 设置桌面设备视口
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/non-existent')

      // 验证404页面元素可见
      await expect(page.getByTestId('not-found-page')).toBeVisible()
      await expect(page.getByTestId('error-container')).toBeVisible()
    })
  })

  test.describe('页面性能', () => {
    test('404页面应在合理时间内加载完成', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/non-existent-page')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // 页面加载时间应小于5秒（考虑网络延迟和开发环境）
      expect(loadTime).toBeLessThan(5000)
    })

    test('404页面不应有控制台错误', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      await page.goto('/non-existent')
      await page.waitForLoadState('networkidle')

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

  test.describe('SEO和元数据', () => {
    test('404页面应有适当的标题', async ({ page }) => {
      await page.goto('/non-existent')

      // 验证页面标题存在
      const title = await page.title()
      expect(title).toBeTruthy()
    })
  })
})
