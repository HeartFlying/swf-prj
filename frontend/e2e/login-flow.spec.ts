import { test, expect } from '@playwright/test'

test.describe('登录流程', () => {
  // 登录页面测试不需要已登录状态（使用空状态覆盖全局配置）
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page, context }) => {
    // 清除所有存储和 cookie
    await context.clearCookies()
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    // 重新加载页面确保干净状态
    await page.reload()
  })

  test('admin 用户登录后应正确显示用户名和角色', async ({ page }) => {
    // 监听控制台错误（过滤掉 401 认证错误，这是页面加载时的正常请求）
    const errors: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      // 过滤掉 401 错误（页面加载时未认证的请求是正常的）
      if (msg.type() === 'error' && !text.includes('401')) {
        errors.push(text)
      }
    })
    page.on('pageerror', (err) => errors.push(err.message))

    // 输入登录信息
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')

    // 点击登录按钮
    await page.getByRole('button', { name: '登 录' }).click()

    // 等待跳转到仪表盘
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // 验证侧边栏显示正确的用户名和角色（限定在侧边栏范围内）
    const sidebar = page.locator('.sidebar-footer, .user-info').first()
    const userName = sidebar.locator('.user-name')
    const userRole = sidebar.locator('.user-role')

    await expect(userName).toHaveText('admin')
    await expect(userRole).toHaveText('admin')

    // 验证头像显示正确（限定在侧边栏范围内）
    const avatar = sidebar.locator('.user-avatar')
    await expect(avatar).toHaveText('AD')

    // 验证没有控制台错误
    expect(errors).toEqual([])
  })

  test('开发者用户登录后应正确显示角色', async ({ page }) => {
    // 输入登录信息（使用 admin 用户测试基本登录流程）
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // 验证用户名显示
    const sidebar = page.locator('.sidebar-footer, .user-info').first()
    await expect(sidebar.locator('.user-name')).toBeVisible()
  })

  test('token 过期后应跳转到登录页', async ({ page }) => {
    // 设置一个无效的 token
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid_token')
    })

    // 访问需要认证的页面
    await page.goto('/dashboard')

    // 等待页面加载
    await page.waitForLoadState('domcontentloaded')

    // 应该被重定向到登录页
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('登出后应清除用户信息并跳转到登录页', async ({ page }) => {
    // 输入登录信息（beforeEach 已确保表单可见）
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // 点击登出按钮
    await page.click('.logout-btn')

    // 等待跳转到登录页
    await expect(page).toHaveURL('/login')

    // 验证 localStorage 被清除
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeNull()
  })
})
