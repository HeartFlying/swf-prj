import { Page, expect } from '@playwright/test'

/**
 * 测试辅助函数
 *
 * 常用 data-testid 参考：
 * - sidebar - 侧边栏容器
 * - sidebar-toggle - 侧边栏折叠按钮
 * - nav-{path} - 导航项 (如 nav-dashboard, nav-admin-users)
 * - logout-btn - 登出按钮
 * - app-header - 顶部栏
 * - menu-toggle - 菜单切换按钮
 * - theme-toggle - 主题切换按钮
 * - fullscreen-toggle - 全屏切换按钮
 * - notification-btn - 通知按钮
 * - data-table - 数据表格容器
 * - empty-state - 空状态
 * - pagination - 分页器
 * - {rowTestId} - 表格行 (由 row-test-id prop 指定，如 user-row)
 */

// 默认基础 URL，用于确保 localStorage 操作时页面已导航
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

/**
 * 安全地清除浏览器存储
 * 确保页面已导航到有效 URL 后再清除 localStorage/sessionStorage
 */
export async function clearBrowserStorage(page: Page, navigateTo: string = '/login') {
  // 确保页面已导航到有效 URL（localStorage 只在 http/https 协议可用）
  const currentUrl = page.url()
  if (!currentUrl.startsWith('http')) {
    await page.goto(navigateTo)
  }

  // 清除 cookies
  await page.context().clearCookies()

  // 清除 localStorage 和 sessionStorage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * 安全地获取 localStorage 项
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  // 确保页面已导航
  const currentUrl = page.url()
  if (!currentUrl.startsWith('http')) {
    await page.goto('/login')
  }
  return page.evaluate((k) => localStorage.getItem(k), key)
}

/**
 * 安全地设置 localStorage 项
 */
export async function setLocalStorageItem(page: Page, key: string, value: string) {
  // 确保页面已导航
  const currentUrl = page.url()
  if (!currentUrl.startsWith('http')) {
    await page.goto('/login')
  }
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: key, v: value }
  )
}

/**
 * 登录用户
 */
export async function login(page: Page, username: string = 'admin', password: string = 'password123') {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码').fill(password)
  await page.getByRole('button', { name: '登 录' }).click()
}

/**
 * 等待加载完成
 */
export async function waitForLoading(page: Page) {
  // 等待加载动画消失
  await page.waitForSelector('.el-loading-mask', { state: 'hidden', timeout: 10000 })
}

/**
 * 获取表格行数
 */
export async function getTableRowCount(page: Page, tableSelector: string) {
  const rows = await page.locator(`${tableSelector} .el-table__row`).count()
  return rows
}

/**
 * 清除表单输入
 */
export async function clearInput(page: Page, placeholder: string) {
  const input = page.getByPlaceholder(placeholder)
  await input.clear()
}

/**
 * 选择下拉菜单选项
 */
export async function selectDropdownOption(page: Page, selectLabel: string, optionText: string) {
  // 点击选择器
  await page.locator('.el-select').filter({ hasText: selectLabel }).click()

  // 选择选项
  await page.getByText(optionText).click()
}

/**
 * 验证 toast 消息
 */
export async function expectToast(page: Page, message: string) {
  await expect(page.locator('.el-message').filter({ hasText: message })).toBeVisible({
    timeout: 5000,
  })
}

/**
 * 截图并保存
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `./e2e/screenshots/${name}.png`, fullPage: true })
}

/**
 * 等待数据行或空状态可见
 * 用于表格数据加载的场景
 */
export async function waitForDataOrEmpty(page: Page, rowTestId: string, emptyTestId: string = 'empty-state') {
  const rowLocator = page.getByTestId(rowTestId).first()
  const emptyLocator = page.getByTestId(emptyTestId)
  await expect(rowLocator.or(emptyLocator)).toBeVisible({ timeout: 10000 })
}

/**
 * 检查表格是否有数据
 */
export async function hasTableData(page: Page, rowTestId: string): Promise<boolean> {
  const count = await page.getByTestId(rowTestId).count()
  return count > 0
}
