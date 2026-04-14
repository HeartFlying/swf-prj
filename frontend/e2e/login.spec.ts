import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * 登录页面端到端测试
 * 覆盖页面元素显示、表单验证、登录流程、记住密码等功能
 */
test.describe('登录页面', () => {
  // 登录页面测试不需要已登录状态
  test.use({ storageState: undefined })

  test.beforeEach(async ({ page, context }) => {
    // 每个测试前清除所有存储和 cookie，确保从干净状态开始
    await context.clearCookies()
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.reload()
  })

  test.describe('页面元素显示验证', () => {
    test.beforeEach(async ({ page }) => {
      setupErrorMonitoring(page)
    })

    test('应显示完整的登录页面结构', async ({ page }) => {
      // 验证粒子背景画布存在
      await expect(page.getByTestId('particle-canvas')).toBeVisible()

      // 验证扫描线组件存在
      await expect(page.locator('canvas')).toHaveCount(1)

      // 验证登录卡片容器
      await expect(page.getByTestId('login-card')).toBeVisible()

      // 验证Logo区域
      await expect(page.getByTestId('login-logo')).toBeVisible()
      await expect(page.getByTestId('logo-icon')).toBeVisible()
      await expect(page.getByTestId('logo-title')).toHaveText('DevMetrics')
      await expect(page.getByTestId('logo-subtitle')).toHaveText('开发者绩效统计平台')

      // 验证霓虹边框装饰元素
      await expect(page.getByTestId('neon-border-top')).toBeVisible()
      await expect(page.getByTestId('neon-border-right')).toBeVisible()
      await expect(page.getByTestId('neon-border-bottom')).toBeVisible()
      await expect(page.getByTestId('neon-border-left')).toBeVisible()

      // 验证装饰角落
      await expect(page.getByTestId('corner-top-left')).toBeVisible()
      await expect(page.getByTestId('corner-top-right')).toBeVisible()
      await expect(page.getByTestId('corner-bottom-left')).toBeVisible()
      await expect(page.getByTestId('corner-bottom-right')).toBeVisible()

      // 验证版本信息
      await expect(page.getByTestId('version-info')).toBeVisible()
      await expect(page.getByTestId('version-info')).toContainText('DevMetrics v1.0.0')
      await expect(page.getByTestId('version-info')).toContainText('系统状态:')
      await expect(page.getByTestId('status-online')).toHaveText('在线')
    })

    test('应显示完整的登录表单元素', async ({ page }) => {
      // 验证表单存在
      await expect(page.getByTestId('login-form')).toBeVisible()

      // 验证用户名输入框（使用 placeholder，因为 input 没有 aria-label）
      const usernameInput = page.getByPlaceholder('用户名')
      await expect(usernameInput).toBeVisible()

      // 验证用户名图标
      await expect(page.getByTestId('input-icon').first()).toBeVisible()

      // 验证密码输入框
      const passwordInput = page.getByPlaceholder('密码')
      await expect(passwordInput).toBeVisible()
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // 验证密码可见性切换按钮
      const togglePasswordBtn = page.getByRole('button', { name: '切换密码可见性' })
      await expect(togglePasswordBtn).toBeVisible()

      // 验证记住我复选框
      const rememberCheckbox = page.getByRole('checkbox', { name: '记住我' })
      await expect(rememberCheckbox).toBeVisible()
      await expect(rememberCheckbox).not.toBeChecked()
      await expect(page.getByText('记住我')).toContainText('记住我')

      // 验证忘记密码链接
      const forgotPasswordLink = page.getByRole('link', { name: '忘记密码？' })
      await expect(forgotPasswordLink).toBeVisible()
      await expect(forgotPasswordLink).toHaveText('忘记密码？')
      await expect(forgotPasswordLink).toHaveAttribute('href', '#')

      // 验证登录按钮
      const loginBtn = page.locator('button[type="submit"]')
      await expect(loginBtn).toBeVisible()
      await expect(loginBtn).toContainText('登')
      await expect(loginBtn).toBeDisabled() // 初始状态应为禁用（表单为空）
    })
  })

  test.describe('表单验证', () => {
    test('空值提交时登录按钮应禁用', async ({ page }) => {
      // 验证登录按钮在表单为空时禁用
      const loginBtn = page.locator('button[type="submit"]')
      await expect(loginBtn).toBeDisabled()

      // 验证仍在登录页面（提交按钮禁用，无法提交）
      await expect(page).toHaveURL(/\/login/)
    })

    test('用户名长度不足时登录按钮应禁用', async ({ page }) => {
      // 输入少于3个字符的用户名
      await page.getByPlaceholder('用户名').fill('ab')
      await page.getByPlaceholder('密码').fill('123456')

      // 验证登录按钮仍被禁用（因为用户名长度不足）
      const loginBtn = page.locator('button[type="submit"]')
      await expect(loginBtn).toBeDisabled()
    })

    test('密码长度不足时登录按钮应禁用', async ({ page }) => {
      // 输入有效用户名但密码少于6个字符
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('12345')

      // 验证登录按钮仍被禁用（因为密码长度不足）
      const loginBtn = page.locator('button[type="submit"]')
      await expect(loginBtn).toBeDisabled()
    })

    test('满足条件时登录按钮应启用', async ({ page }) => {
      const loginBtn = page.locator('button[type="submit"]')

      // 初始状态：禁用
      await expect(loginBtn).toBeDisabled()

      // 输入有效用户名（3字符以上）
      await page.getByPlaceholder('用户名').fill('adm')
      await expect(loginBtn).toBeDisabled() // 密码仍为空

      // 输入有效密码（6字符以上）
      await page.getByPlaceholder('密码').fill('123456')
      await expect(loginBtn).toBeEnabled() // 现在应该启用
    })

    test('输入框聚焦时应有视觉反馈', async ({ page }) => {
      const usernameInput = page.getByPlaceholder('用户名')
      const passwordInput = page.getByPlaceholder('密码')

      // 聚焦用户名输入框
      await usernameInput.focus()
      await expect(usernameInput.locator('..')).toHaveClass(/focused/)

      // 聚焦密码输入框
      await passwordInput.focus()
      await expect(passwordInput.locator('..')).toHaveClass(/focused/)
      await expect(usernameInput.locator('..')).not.toHaveClass(/focused/)
    })
  })

  test.describe('密码可见性切换', () => {
    test('点击切换按钮应显示/隐藏密码', async ({ page }) => {
      const passwordInput = page.getByPlaceholder('密码')
      const toggleBtn = page.getByRole('button', { name: '切换密码可见性' })

      // 初始状态为password类型
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // 输入密码
      await passwordInput.fill('testpassword')

      // 点击切换按钮显示密码
      await toggleBtn.click()
      await expect(passwordInput).toHaveAttribute('type', 'text')

      // 再次点击隐藏密码
      await toggleBtn.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  test.describe('记住密码功能', () => {
    test('记住我复选框应可正常切换', async ({ page }) => {
      const rememberCheckbox = page.getByRole('checkbox', { name: '记住我' })

      // 初始未选中
      await expect(rememberCheckbox).not.toBeChecked()

      // 点击选中
      await rememberCheckbox.click()
      await expect(rememberCheckbox).toBeChecked()

      // 再次点击取消选中
      await rememberCheckbox.click()
      await expect(rememberCheckbox).not.toBeChecked()
    })

    test('勾选记住我后登录应保存状态到本地存储', async ({ page }) => {
      // 模拟登录成功响应 - 使用后端实际返回格式
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
              user: { id: 1, username: 'testuser', email: 'test@example.com', isActive: true, role: { id: 1, name: 'user', permissions: [] } }
            }
          })
        })
      })

      // 勾选记住我并登录
      await page.getByRole('checkbox', { name: '记住我' }).check()
      await page.getByPlaceholder('用户名').fill('testuser')
      await page.getByPlaceholder('密码').fill('password123')
      await page.locator('button[type="submit"]').click()

      // 等待跳转到仪表板
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

      // 验证token已保存到localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'))
      expect(token).toBe('test-access-token')
    })
  })

  test.describe('登录流程', () => {
    test('登录成功应跳转到仪表板', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 模拟登录成功响应 - 使用后端实际返回格式
      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              tokenType: 'bearer',
              expiresIn: 3600,
              user: { id: 1, username: 'admin', email: 'admin@example.com', isActive: true, role: { id: 1, name: 'admin', permissions: ['*'] } }
            }
          })
        })
      })

      // 填写表单并提交
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('password123')
      await page.locator('button[type="submit"]').click()

      // 验证页面跳转（登录成功后立即跳转，不验证消息）
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
      errorMonitor.expectNoErrors()
    })

    test('登录失败应显示错误消息', async ({ page }) => {
      // 模拟登录失败响应 - 返回200但业务错误码
      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 401,
            message: '用户名或密码错误'
          })
        })
      })

      // 填写有效的凭据格式（但认证会失败）
      await page.getByPlaceholder('用户名').fill('wronguser')
      await page.getByPlaceholder('密码').fill('wrongpassword123')
      await page.locator('button[type="submit"]').click()

      // 验证仍在登录页面（登录失败不会跳转）
      await expect(page).toHaveURL(/\/login/)

      // 验证错误消息出现（等待ElMessage渲染）
      await expect(page.locator('.el-message--error').first()).toBeVisible({ timeout: 10000 })
    })

    test('网络错误应显示错误提示', async ({ page }) => {
      // 模拟网络错误
      await page.route('**/api/v1/auth/login', async route => {
        await route.abort('failed')
      })

      // 填写表单
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('password123')
      await page.locator('button[type="submit"]').click()

      // 验证错误消息（网络错误会显示错误消息，使用first()避免多个消息问题）
      await expect(page.locator('.el-message--error').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('加载状态验证', () => {
    test('登录过程中应显示加载状态', async ({ page }) => {
      // 创建一个延迟响应来观察加载状态
      await page.route('**/api/v1/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              tokenType: 'bearer',
              expiresIn: 3600,
              user: { id: 1, username: 'admin', email: 'admin@example.com', isActive: true, role: { id: 1, name: 'admin', permissions: ['*'] } }
            }
          })
        })
      })

      // 填写表单
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('password123')
      await page.locator('button[type="submit"]').click()

      // 验证加载状态
      const loginBtn = page.locator('button[type="submit"]')
      await expect(loginBtn).toHaveClass(/loading/)
      await expect(loginBtn).toBeDisabled()

      // 验证加载动画存在
      await expect(page.getByTestId('btn-loader')).toBeVisible()

      // 等待跳转完成
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    })

    test('加载状态下按钮应禁用且不可重复提交', async ({ page }) => {
      let requestCount = 0
      await page.route('**/api/v1/auth/login', async route => {
        requestCount++
        await new Promise(resolve => setTimeout(resolve, 500))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              tokenType: 'bearer',
              expiresIn: 3600,
              user: { id: 1, username: 'admin', email: 'admin@example.com', isActive: true, role: { id: 1, name: 'admin', permissions: ['*'] } }
            }
          })
        })
      })

      // 填写表单
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('password123')

      // 点击登录按钮
      const loginBtn = page.locator('button[type="submit"]')
      await loginBtn.click()

      // 验证按钮进入加载状态（禁用）
      await expect(loginBtn).toBeDisabled()
      await expect(loginBtn).toHaveClass(/loading/)

      // 等待跳转完成
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

      // 验证只发送了一次请求
      expect(requestCount).toBe(1)
    })
  })

  test.describe('键盘交互', () => {
    test('按Enter键在密码框应触发表单提交', async ({ page }) => {
      // 模拟登录成功
      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              tokenType: 'bearer',
              expiresIn: 3600,
              user: { id: 1, username: 'admin', email: 'admin@example.com', isActive: true, role: { id: 1, name: 'admin', permissions: ['*'] } }
            }
          })
        })
      })

      // 填写表单并在密码框按Enter
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('password123')
      await page.getByPlaceholder('密码').press('Enter')

      // 验证页面跳转（登录成功后立即跳转）
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    })

    test('按Enter键在用户名输入框应触发表单提交', async ({ page }) => {
      // 模拟登录成功
      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              tokenType: 'bearer',
              expiresIn: 3600,
              user: { id: 1, username: 'admin', email: 'admin@example.com', isActive: true, role: { id: 1, name: 'admin', permissions: ['*'] } }
            }
          })
        })
      })

      const usernameInput = page.getByPlaceholder('用户名')

      // 填写用户名和密码，然后在用户名框按Enter
      await usernameInput.fill('admin')
      await page.getByPlaceholder('密码').fill('password123')
      await usernameInput.press('Enter')

      // 验证页面跳转（实现中Enter键触发表单提交）
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    })
  })

  test.describe('响应式布局', () => {
    test('在移动设备上应正常显示', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()

      // 验证登录卡片仍然可见
      await expect(page.getByTestId('login-card')).toBeVisible()

      // 验证表单元素仍然可访问
      await expect(page.getByPlaceholder('用户名')).toBeVisible()
      await expect(page.getByPlaceholder('密码')).toBeVisible()
      await expect(page.getByRole('button', { name: '登 录' })).toBeVisible()
      errorMonitor.expectNoErrors()
    })

    test('在平板设备上应正常显示', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()

      // 验证登录卡片仍然可见
      await expect(page.getByTestId('login-card')).toBeVisible()
    })
  })

  test.describe('安全性', () => {
    test('登录失败后应保留密码字段以便修改', async ({ page }) => {
      // 模拟登录失败响应 - 返回200但业务错误码
      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 401,
            message: '用户名或密码错误'
          })
        })
      })

      // 填写表单并提交
      await page.getByPlaceholder('用户名').fill('testuser')
      await page.getByPlaceholder('密码').fill('testpass')
      await page.locator('button[type="submit"]').click()

      // 等待错误消息（等待ElMessage渲染）
      await expect(page.locator('.el-message--error').first()).toBeVisible({ timeout: 10000 })

      // 验证密码字段仍然保留（用户可能需要修改）
      const passwordValue = await page.getByPlaceholder('密码').inputValue()
      expect(passwordValue).toBe('testpass')
    })

    test('未认证用户访问受保护页面应重定向到登录页', async ({ page }) => {
      // 尝试直接访问仪表板
      await page.goto('/dashboard')

      // 验证被重定向到登录页
      await expect(page).toHaveURL(/\/login/)
    })
  })
})

/**
 * 登录页面性能测试
 */
test.describe('登录页面性能', () => {
  // 性能测试也不需要已登录状态
  test.use({ storageState: undefined })

  test('页面应在合理时间内加载完成', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    // 页面加载时间应小于5秒
    expect(loadTime).toBeLessThan(5000)
  })

  test('粒子动画不应导致明显的性能问题', async ({ page }) => {
    await page.goto('/login')

    // 执行一些交互操作，验证页面仍然响应
    const usernameInput = page.getByPlaceholder('用户名')
    await usernameInput.fill('performance_test_user')

    const inputValue = await usernameInput.inputValue()
    expect(inputValue).toBe('performance_test_user')
  })
})
