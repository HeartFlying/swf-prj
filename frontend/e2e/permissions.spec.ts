import { test, expect, Page } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'
import { clearBrowserStorage, getLocalStorageItem } from './utils/test-helpers'

const testUsers = {
  admin: { username: 'admin', password: 'password123' },
  developer: { username: 'developer', password: 'dev123456' },
  tester: { username: 'tester', password: 'test123456' },
  pm: { username: 'pm', password: 'pm123456' }
} as const

const pages = {
  dashboard: { path: '/dashboard', name: '仪表盘' },
  personalStats: { path: '/personal-stats', name: '个人统计' },
  projectStats: { path: '/project-stats', name: '项目统计' },
  userManagement: { path: '/admin/users', name: '用户管理' },
  systemSettings: { path: '/admin/settings', name: '系统设置' }
} as const

async function loginAs(page: Page, username: string, password: string) {
  // 先导航再清除存储（确保 localStorage 可用）
  await page.goto('/login')
  await clearBrowserStorage(page)
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码').fill(password)
  await page.getByRole('button', { name: '登 录' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

async function cleanupTestState(page: Page) {
  await clearBrowserStorage(page)
}

async function verifyPageAccessible(page: Page, pagePath: string, pageName: string) {
  await page.goto(pagePath)
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(new RegExp(pagePath.replace(/\//g, '\\/')))
  await expect(page.getByRole('heading', { name: pageName })).toBeVisible()
}

async function verifyPageNoPermission(page: Page, pagePath: string) {
  await page.goto(pagePath)
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/dashboard/)
  expect(page.url()).not.toContain(pagePath)
}

async function verifyApiReturns403(page: Page, apiPath: string) {
  const token = await getLocalStorageItem(page, 'token') || ''
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
  const res = await page.request.get(baseUrl + apiPath, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  expect(res.status()).toBe(403)
}

test.describe('Admin 角色', () => {
  test.use({ storageState: undefined })
  test.beforeEach(async ({ page }) => { await loginAs(page, testUsers.admin.username, testUsers.admin.password) })
  test.afterEach(async ({ page }) => { await cleanupTestState(page) })

  test('admin 可以访问仪表盘', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.dashboard.path, pages.dashboard.name)
    errorMonitor.expectNoErrors()
  })

  test('admin 可以访问个人统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.personalStats.path, pages.personalStats.name)
    errorMonitor.expectNoErrors()
  })

  test('admin 可以访问项目统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.projectStats.path, pages.projectStats.name)
    errorMonitor.expectNoErrors()
  })

  test('admin 可以访问用户管理', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.userManagement.path, pages.userManagement.name)
    errorMonitor.expectNoErrors()
  })

  test('admin 可以访问系统设置', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.systemSettings.path, pages.systemSettings.name)
    errorMonitor.expectNoErrors()
  })
})

test.describe('Developer 角色', () => {
  test.use({ storageState: undefined })
  test.beforeEach(async ({ page }) => { await loginAs(page, testUsers.developer.username, testUsers.developer.password) })
  test.afterEach(async ({ page }) => { await cleanupTestState(page) })

  test('developer 可以访问仪表盘', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.dashboard.path, pages.dashboard.name)
    errorMonitor.expectNoErrors()
  })

  test('developer 可以访问个人统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.personalStats.path, pages.personalStats.name)
    errorMonitor.expectNoErrors()
  })

  test('developer 可以访问项目统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.projectStats.path, pages.projectStats.name)
    errorMonitor.expectNoErrors()
  })

  test('developer 无法访问用户管理', async ({ page }) => { await verifyPageNoPermission(page, pages.userManagement.path) })

  test('developer 无法访问系统设置', async ({ page }) => { await verifyPageNoPermission(page, pages.systemSettings.path) })

  test('developer 访问用户管理 API 返回 403', async ({ page }) => { await verifyApiReturns403(page, '/api/v1/admin/users') })

  test('developer 访问系统设置 API 返回 403', async ({ page }) => { await verifyApiReturns403(page, '/api/v1/admin/settings') })
})

test.describe('Tester 角色', () => {
  test.use({ storageState: undefined })
  test.beforeEach(async ({ page }) => { await loginAs(page, testUsers.tester.username, testUsers.tester.password) })
  test.afterEach(async ({ page }) => { await cleanupTestState(page) })

  test('tester 可以访问仪表盘', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.dashboard.path, pages.dashboard.name)
    errorMonitor.expectNoErrors()
  })

  test('tester 可以访问个人统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.personalStats.path, pages.personalStats.name)
    errorMonitor.expectNoErrors()
  })

  test('tester 可以访问项目统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.projectStats.path, pages.projectStats.name)
    errorMonitor.expectNoErrors()
  })

  test('tester 无法访问用户管理', async ({ page }) => { await verifyPageNoPermission(page, pages.userManagement.path) })

  test('tester 无法访问系统设置', async ({ page }) => { await verifyPageNoPermission(page, pages.systemSettings.path) })

  test('tester 访问用户管理 API 返回 403', async ({ page }) => { await verifyApiReturns403(page, '/api/v1/admin/users') })

  test('tester 访问系统设置 API 返回 403', async ({ page }) => { await verifyApiReturns403(page, '/api/v1/admin/settings') })
})

test.describe('PM 角色', () => {
  test.use({ storageState: undefined })
  test.beforeEach(async ({ page }) => { await loginAs(page, testUsers.pm.username, testUsers.pm.password) })
  test.afterEach(async ({ page }) => { await cleanupTestState(page) })

  test('pm 可以访问仪表盘', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.dashboard.path, pages.dashboard.name)
    errorMonitor.expectNoErrors()
  })

  test('pm 可以访问个人统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.personalStats.path, pages.personalStats.name)
    errorMonitor.expectNoErrors()
  })

  test('pm 可以访问项目统计', async ({ page }) => {
    const errorMonitor = setupErrorMonitoring(page)
    await verifyPageAccessible(page, pages.projectStats.path, pages.projectStats.name)
    errorMonitor.expectNoErrors()
  })

  test('pm 无法访问用户管理', async ({ page }) => { await verifyPageNoPermission(page, pages.userManagement.path) })

  test('pm 无法访问系统设置', async ({ page }) => { await verifyPageNoPermission(page, pages.systemSettings.path) })

  test('pm 访问用户管理 API 返回 403', async ({ page }) => { await verifyApiReturns403(page, '/api/v1/admin/users') })

  test('pm 访问系统设置 API 返回 403', async ({ page }) => { await verifyApiReturns403(page, '/api/v1/admin/settings') })
})