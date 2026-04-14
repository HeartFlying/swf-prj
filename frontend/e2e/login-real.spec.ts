import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * 真实后端登录E2E测试
 * 这些测试使用真实的后端API，不Mock任何请求
 * 需要先启动后端服务和数据库
 *
 * 前置条件:
 * 1. 后端服务运行在 http://localhost:8000
 * 2. 数据库已初始化并包含测试用户 (admin/password123)
 * 3. 前端服务运行在 http://localhost:5173
 */
test.describe('真实后端登录测试', () => {
  // 不使用全局登录状态，每个测试独立进行登录
  test.use({ storageState: { cookies: [], origins: [] } })

  // 辅助函数：执行登录
  async function performLogin(page, username: string, password: string) {
    // 等待输入框可见且可交互
    const usernameInput = page.locator('input[placeholder="用户名"]')
    const passwordInput = page.locator('input[placeholder="密码"]')

    await usernameInput.waitFor({ state: 'visible', timeout: 10000 })
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 })

    // 清空输入框（以防有旧值）
    await usernameInput.clear()
    await passwordInput.clear()

    // 填写表单
    await usernameInput.fill(username)
    await passwordInput.fill(password)

    // 等待表单验证完成 - 使用按钮启用状态作为判断条件
    const loginBtn = page.locator('button.login-btn[type="submit"]')
    await expect(loginBtn).toBeEnabled({ timeout: 5000 })
    await loginBtn.click()
  }

  // 辅助函数：访问登录页面并等待加载
  async function gotoLogin(page, context) {
    // 先清除 cookies
    await context.clearCookies()
    // 访问 about:blank 以确保清除存储
    await page.goto('about:blank')
    // 访问登录页面
    await page.goto('/login')
    // 清除存储
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    // 等待页面加载完成
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')
    // 等待输入框可见且可交互
    const usernameInput = page.locator('input[placeholder="用户名"]')
    await usernameInput.waitFor({ state: 'visible', timeout: 15000 })
  }

  test('使用真实后端 - 正确凭据登录成功', async ({ page, context }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await gotoLogin(page, context)

    // 使用真实后端数据进行登录
    // 凭据来自 backend/init_db.py 和 backend/app/db/seeds.py
    await performLogin(page, 'admin', 'password123')

    // 验证成功跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // 验证用户信息已加载
    await expect(page.locator('.user-info, .username, [data-testid="user-menu"]')).toBeVisible({ timeout: 10000 })

    // 验证localStorage中有token
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()
    expect(token).toMatch(/^eyJ/) // JWT token以eyJ开头

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('使用真实后端 - 错误密码登录失败', async ({ page, context }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await gotoLogin(page, context)

    // 使用错误密码
    await performLogin(page, 'admin', 'wrongpassword')

    // 等待响应完成
    await page.waitForLoadState('networkidle')

    // 验证仍在登录页面
    await expect(page).toHaveURL(/\/login/)

    // 验证没有token
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeNull()

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('使用真实后端 - 不存在的用户登录失败', async ({ page, context }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await gotoLogin(page, context)

    await performLogin(page, 'nonexistentuser', 'password123')

    // 等待响应完成
    await page.waitForLoadState('networkidle')

    // 验证仍在登录页面
    await expect(page).toHaveURL(/\/login/)

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('使用真实后端 - 其他测试用户可登录', async ({ page, context }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    // 测试其他用户 (来自 init_db.py)
    const testUsers = [
      { username: 'testuser', password: 'testpass123' },
    ]

    for (const user of testUsers) {
      await gotoLogin(page, context)

      await performLogin(page, user.username, user.password)

      // 验证登录成功
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

      // 验证token存在
      const token = await page.evaluate(() => localStorage.getItem('token'))
      expect(token).toBeTruthy()
    }

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('登录后访问受保护页面', async ({ page, context }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await gotoLogin(page, context)

    // 先登录
    await performLogin(page, 'admin', 'password123')

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // 访问其他受保护页面
    await page.goto('/personal-stats')
    await expect(page).toHaveURL(/\/personal-stats/)

    await page.goto('/admin/projects')
    await expect(page).toHaveURL(/\/admin\/projects/)

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('登录状态持久化', async ({ page, context }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await gotoLogin(page, context)

    // 登录
    await performLogin(page, 'admin', 'password123')

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // 保存状态
    const storageState = await context.storageState()

    // 创建新页面使用保存的状态
    const newContext = await context.browser().newContext({ storageState })
    const newPage = await newContext.newPage()

    // 为新页面设置错误监控
    const newPageErrorMonitor = setupErrorMonitoring(newPage)

    await newPage.goto('/dashboard')

    // 验证无需重新登录即可访问
    await expect(newPage).toHaveURL(/\/dashboard/)
    await expect(newPage.locator('.user-info, .username, [data-testid="user-menu"]')).toBeVisible({ timeout: 5000 })

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
    newPageErrorMonitor.expectNoErrors()

    await newContext.close()
  })
})

/**
 * 使用全局登录状态的测试
 * 这些测试依赖 global-setup.ts 中保存的登录状态
 */
test.describe('已登录状态测试', () => {
  // 使用全局登录状态
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('已登录用户直接访问仪表板', async ({ page }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    // 直接访问仪表板，应该无需登录
    await page.goto('/dashboard')

    // 验证成功访问
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('.dashboard-container, .dashboard-content, h1')).toBeVisible({ timeout: 5000 })

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('已登录用户可访问个人统计', async ({ page }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/personal-stats')

    await expect(page).toHaveURL(/\/personal-stats/)
    // 使用更具体的选择器
    await expect(page.locator('.personal-stats-page').first()).toBeVisible({ timeout: 5000 })

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })

  test('已登录用户可访问项目列表', async ({ page }) => {
    // 设置错误监控
    const errorMonitor = setupErrorMonitoring(page)

    await page.goto('/admin/projects')

    await expect(page).toHaveURL(/\/admin\/projects/)
    // 等待页面加载完成，验证页面中有项目管理相关内容
    await expect(page.locator('body')).toContainText('项目管理', { timeout: 5000 })

    // 验证没有控制台错误
    errorMonitor.expectNoErrors()
  })
})
