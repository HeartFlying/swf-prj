/**
 * 全局错误监控使用示例
 *
 * 本文件展示了如何使用全局错误监控功能
 * 运行: npx playwright test example-global-monitor.spec.ts
 */

import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

test.describe('全局错误监控示例', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('登录页面应该无错误加载', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    // 验证页面标题
    await expect(page.locator('h2')).toContainText('登录')

    // 验证无错误
    errorMonitor.expectNoErrors()
  })

  test('表单元素应该无错误渲染', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)

    await expect(page.getByPlaceholder('用户名')).toBeVisible()
    await expect(page.getByPlaceholder('密码')).toBeVisible()
    await expect(page.getByRole('button', { name: '登 录' })).toBeVisible()

    // 验证无错误
    errorMonitor.expectNoErrors()
  })
})
