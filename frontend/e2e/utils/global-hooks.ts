/**
 * 全局错误监控钩子示例
 *
 * 本文件展示了如何在 Playwright 测试中集成全局错误监控
 * 提供三种使用方式，可根据项目需求选择
 */

import { test as baseTest, expect } from '@playwright/test'
import {
  setupGlobalErrorMonitoring,
  createMonitoredTest,
  setupErrorMonitoring,
  getErrorMonitor,
} from './error-monitor'

// =============================================================================
// 方式一：使用 setupGlobalErrorMonitoring 在现有 test 对象上启用全局错误监控
// =============================================================================

/**
 * 扩展现有的 test 对象，添加全局错误监控
 *
 * 在你的测试文件中使用：
 * ```typescript
 * import { test, expect } from '../utils/global-hooks'
 *
 * // 启用全局错误监控
 * setupGlobalErrorMonitoring(test)
 *
 * test.describe('测试套件', () => {
 *   test('测试用例', async ({ page }) => {
 *     // 测试代码
 *   })
 * })
 * ```
 */
const test = baseTest.extend({
  // 可以在这里添加自定义 fixture
})

// 注意：不在模块级别调用 setupGlobalErrorMonitoring
// 需要在测试文件中显式调用

export { test, expect, setupGlobalErrorMonitoring }

// =============================================================================
// 方式二：使用 createMonitoredTest 创建新的带监控的 test 对象
// =============================================================================

/**
 * 创建全新的带错误监控的 test 对象
 *
 * 在你的测试文件中使用：
 * ```typescript
 * import { createMonitoredTest } from '../utils/global-hooks'
 * import { test as baseTest } from '@playwright/test'
 *
 * const test = createMonitoredTest(baseTest)
 * ```
 */
// 注意：不在模块级别创建 monitoredTest，需要在测试文件中显式调用
export { createMonitoredTest }

// =============================================================================
// 方式三：在特定测试文件中手动启用全局错误监控
// =============================================================================

/**
 * 示例：在特定测试文件中手动启用全局错误监控
 *
 * ```typescript
 * import { test as baseTest, expect } from '@playwright/test'
 * import { setupGlobalErrorMonitoring } from '../utils/error-monitor'
 *
 * const test = baseTest.extend({})
 *
 * // 只为这个 test 对象启用全局错误监控
 * setupGlobalErrorMonitoring(test)
 *
 * test.describe('某个功能', () => {
 *   test('应该无错误地工作', async ({ page }) => {
 *     await page.goto('/some-page')
 *     // 错误监控已自动启用
 *   })
 * })
 * ```
 */

// =============================================================================
// 高级用法：在测试中获取当前错误监控器
// =============================================================================

/**
 * 在测试中访问当前错误监控器
 * 适用于需要在测试过程中检查特定错误类型的场景
 *
 * ```typescript
 * import { test, expect, getCurrentErrorMonitor } from '../utils/global-hooks'
 *
 * test('检查特定错误', async ({ page }) => {
 *   await page.goto('/page-with-echarts')
 *
 *   // 获取当前测试的错误监控器
 *   const monitor = getCurrentErrorMonitor(test.info().title)
 *
 *   // 检查特定类型的错误
 *   if (monitor?.hasEChartsError()) {
 *     console.log('检测到 ECharts 错误')
 *   }
 *
 *   // 测试结束时会自动断言无错误
 * })
 * ```
 */
export { getErrorMonitor as getCurrentErrorMonitor }

// =============================================================================
// 使用示例
// =============================================================================

/**
 * 完整使用示例
 *
 * 文件：e2e/example.spec.ts
 *
 * ```typescript
 * import { test, expect } from './utils/global-hooks'
 *
 * test.describe('示例测试套件', () => {
 *   test.beforeEach(async ({ page }) => {
 *     await page.goto('/dashboard')
 *   })
 *
 *   // 此测试会自动启用错误监控
 *   test('页面应该无错误加载', async ({ page }) => {
 *     await expect(page.locator('h1')).toHaveText('Dashboard')
 *     // 测试结束时会自动检查是否有控制台错误
 *   })
 *
 *   // 此测试也会自动启用错误监控
 *   test('用户操作应该无错误', async ({ page }) => {
 *     await page.click('#submit-btn')
 *     await expect(page.locator('.success-message')).toBeVisible()
 *     // 测试结束时会自动检查是否有控制台错误
 *   })
 * })
 * ```
 */

// =============================================================================
// 向后兼容：手动错误监控方式（仍然可用）
// =============================================================================

/**
 * 如果你需要在某些测试中手动控制错误监控，仍然可以使用原来的方式：
 *
 * ```typescript
 * import { test, expect } from '@playwright/test'
 * import { setupErrorMonitoring } from './utils/error-monitor'
 *
 * test('手动错误监控', async ({ page }) => {
 *   const errorMonitor = setupErrorMonitoring(page)
 *
 *   await page.goto('/some-page')
 *
 *   // 在特定点检查错误
 *   errorMonitor.expectNoErrors()
 *
 *   await page.click('#btn')
 *
 *   // 再次检查错误
 *   errorMonitor.expectNoEChartsErrors()
 * })
 * ```
 */

export { setupErrorMonitoring }
