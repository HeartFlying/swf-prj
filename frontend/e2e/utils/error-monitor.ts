import { Page, TestType, PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions } from '@playwright/test'

/**
 * 错误修复建议映射
 * 用于指导 AI 自动修复常见错误
 */
export const errorFixSuggestions: Record<string, { cause: string; fix: string }> = {
  'cartesian2d': {
    cause: 'ECharts 图表配置中使用了 cartesian2d 坐标系但未正确配置',
    fix: '检查图表配置，确保在 series 中设置 coordinateSystem: "cartesian2d" 或在 grid 中正确配置直角坐标系'
  },
  'structuredClone': {
    cause: '尝试克隆包含函数、DOM 节点或其他不可序列化对象的数据',
    fix: '避免在图表配置或响应式数据中使用函数；使用 JSON.parse(JSON.stringify()) 替代 structuredClone'
  },
  'DataCloneError': {
    cause: 'postMessage 或 Worker 传递了不可克隆的数据',
    fix: '确保传递的数据是可序列化的，移除函数、DOM 引用和循环引用'
  },
  'Vue reactivity': {
    cause: 'Vue 响应式系统操作了只读对象或不合法的响应式操作',
    fix: '检查是否直接修改了 props 或 readonly 对象；使用 toRaw() 获取原始对象后再操作'
  },
  'ECharts': {
    cause: 'ECharts 配置错误或数据格式不正确',
    fix: '检查 series.data 格式是否正确；确保 xAxis/yAxis 配置与数据匹配'
  },
  'ResizeObserver': {
    cause: 'ResizeObserver 循环调用或元素已销毁',
    fix: '在组件卸载时取消 ResizeObserver 观察；使用 requestAnimationFrame 节流'
  },
  'TypeError: Cannot read': {
    cause: '访问了 undefined 或 null 对象的属性',
    fix: '添加可选链操作符 ?. 或提前检查对象是否存在'
  },
  'NetworkError': {
    cause: '网络请求失败或服务器未响应',
    fix: '检查网络连接；确保后端服务正常运行；添加请求重试逻辑'
  }
}

/**
 * 获取错误修复建议
 * @param errorMessage 错误消息
 * @returns 修复建议对象，如果没有匹配返回 null
 */
export function getErrorFixSuggestion(errorMessage: string): { cause: string; fix: string } | null {
  for (const [key, suggestion] of Object.entries(errorFixSuggestions)) {
    if (errorMessage.includes(key)) {
      return suggestion
    }
  }
  return null
}

/**
 * 错误监控工具
 * 用于捕获页面控制台错误和页面错误
 */

export interface ErrorMonitor {
  /** 获取所有捕获的错误 */
  getErrors: () => string[]
  /** 获取所有警告 */
  getWarnings: () => string[]
  /** 检查是否有 cartesian2d 相关错误 */
  hasCartesianError: () => boolean
  /** 检查是否有 structuredClone 相关错误 */
  hasCloneError: () => boolean
  /** 检查是否有 DataCloneError 错误 */
  hasDataCloneError: () => boolean
  /** 检查是否有 Vue 响应式警告 */
  hasVueReactivityWarning: () => boolean
  /** 检查是否有 ECharts 相关错误 */
  hasEChartsError: () => boolean
  /** 检查是否有特定类型的错误 */
  hasErrorContaining: (substring: string) => boolean
  /** 断言没有错误 */
  expectNoErrors: () => void
  /** 断言没有特定类型的错误 */
  expectNoCartesianErrors: () => void
  /** 断言没有克隆错误 */
  expectNoCloneErrors: () => void
  /** 断言没有 ECharts 错误 */
  expectNoEChartsErrors: () => void
  /** 清除错误记录 */
  clear: () => void
  /** 获取第一个错误的修复建议 */
  getFirstErrorSuggestion: () => { error: string; cause: string; fix: string } | null
}

/**
 * 设置错误监控
 * @param page - Playwright Page 对象
 * @returns ErrorMonitor 对象
 *
 * @example
 * ```typescript
 * test('页面无错误', async ({ page }) => {
 *   const errorMonitor = setupErrorMonitoring(page)
 *   await page.goto('/dashboard')
 *   errorMonitor.expectNoErrors()
 * })
 * ```
 */
export function setupErrorMonitoring(page: Page): ErrorMonitor {
  const errors: string[] = []
  const warnings: string[] = []

  // 监听控制台消息
  page.on('console', msg => {
    const text = msg.text()
    const type = msg.type()

    if (type === 'error') {
      errors.push(text)
      console.log(`[Console Error] ${text}`)
    } else if (type === 'warning') {
      warnings.push(text)
      console.log(`[Console Warning] ${text}`)
    }
  })

  // 监听页面错误
  page.on('pageerror', err => {
    const message = err.message
    errors.push(message)
    console.log(`[Page Error] ${message}`)
  })

  // 监听请求失败
  page.on('requestfailed', request => {
    const failure = request.failure()
    if (failure) {
      const errorText = `Request failed: ${request.url()} - ${failure.errorText}`
      errors.push(errorText)
      console.log(`[Request Error] ${errorText}`)
    }
  })

  return {
    getErrors: () => [...errors],
    getWarnings: () => [...warnings],

    hasCartesianError: () =>
      errors.some(e =>
        e.includes('cartesian2d') ||
        e.includes('Cartesian2D') ||
        e.includes('cartesian')
      ),

    hasCloneError: () =>
      errors.some(e =>
        e.includes('structuredClone') ||
        e.includes('StructuredClone')
      ),

    hasDataCloneError: () =>
      errors.some(e =>
        e.includes('DataCloneError') ||
        e.includes('could not be cloned')
      ),

    hasVueReactivityWarning: () =>
      warnings.some(w =>
        w.includes('Vue') ||
        w.includes('reactivity') ||
        w.includes('Set operation on key') ||
        w.includes('target is readonly') ||
        w.includes('toRaw')
      ) || errors.some(e =>
        e.includes('Vue') ||
        e.includes('reactivity')
      ),

    hasEChartsError: () =>
      errors.some(e =>
        e.includes('echarts') ||
        e.includes('ECharts') ||
        e.includes('series') ||
        e.includes('coordinateSystem') ||
        e.includes('component')
      ),

    hasErrorContaining: (substring: string) =>
      errors.some(e => e.includes(substring)),

    expectNoErrors: () => {
      if (errors.length > 0) {
        throw new Error(
          `Expected no errors, but got ${errors.length} error(s):\n` +
          errors.map(e => `  - ${e}`).join('\n')
        )
      }
    },

    expectNoCartesianErrors: () => {
      const cartesianErrors = errors.filter(e =>
        e.includes('cartesian2d') ||
        e.includes('Cartesian2D') ||
        e.includes('cartesian')
      )
      if (cartesianErrors.length > 0) {
        throw new Error(
          `Expected no cartesian2d errors, but got ${cartesianErrors.length} error(s):\n` +
          cartesianErrors.map(e => `  - ${e}`).join('\n')
        )
      }
    },

    expectNoCloneErrors: () => {
      const cloneErrors = errors.filter(e =>
        e.includes('structuredClone') ||
        e.includes('StructuredClone') ||
        e.includes('DataCloneError') ||
        e.includes('could not be cloned')
      )
      if (cloneErrors.length > 0) {
        throw new Error(
          `Expected no clone errors, but got ${cloneErrors.length} error(s):\n` +
          cloneErrors.map(e => `  - ${e}`).join('\n')
        )
      }
    },

    expectNoEChartsErrors: () => {
      const echartsErrors = errors.filter(e =>
        e.includes('echarts') ||
        e.includes('ECharts') ||
        e.includes('series') ||
        e.includes('coordinateSystem') ||
        e.includes('component')
      )
      if (echartsErrors.length > 0) {
        throw new Error(
          `Expected no ECharts errors, but got ${echartsErrors.length} error(s):\n` +
          echartsErrors.map(e => `  - ${e}`).join('\n')
        )
      }
    },

    clear: () => {
      errors.length = 0
      warnings.length = 0
    },

    getFirstErrorSuggestion: () => {
      if (errors.length === 0) return null
      const firstError = errors[0]
      const suggestion = getErrorFixSuggestion(firstError)
      if (suggestion) {
        return {
          error: firstError,
          cause: suggestion.cause,
          fix: suggestion.fix
        }
      }
      return {
        error: firstError,
        cause: '未知错误类型',
        fix: '请检查控制台输出获取详细信息'
      }
    }
  }
}

/**
 * 等待页面稳定（无网络请求和动画）
 * @param page - Playwright Page 对象
 * @param timeout - 额外等待时间（毫秒）
 */
export async function waitForPageStability(page: Page, timeout = 1000): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(timeout)
}

// 全局错误监控存储 - 用于在 test.beforeEach 中存储每个测试的错误监控器
declare global {
  // eslint-disable-next-line no-var
  var __errorMonitors: Map<string, ErrorMonitor>
}

// 初始化全局存储
if (typeof globalThis.__errorMonitors === 'undefined') {
  globalThis.__errorMonitors = new Map()
}

/**
 * 获取当前测试的错误监控器
 * @param testId 测试ID（通常是 test.title）
 * @returns ErrorMonitor 对象或 undefined
 */
export function getErrorMonitor(testId: string): ErrorMonitor | undefined {
  return globalThis.__errorMonitors.get(testId)
}

/**
 * 存储当前测试的错误监控器
 * @param testId 测试ID（通常是 test.title）
 * @param monitor ErrorMonitor 对象
 */
export function setErrorMonitor(testId: string, monitor: ErrorMonitor): void {
  globalThis.__errorMonitors.set(testId, monitor)
}

/**
 * 清除指定测试的错误监控器
 * @param testId 测试ID（通常是 test.title）
 */
export function clearErrorMonitor(testId: string): void {
  globalThis.__errorMonitors.delete(testId)
}

/**
 * 设置全局错误监控
 * 在 test.beforeEach 中调用，自动为每个测试启用错误监控
 *
 * @example
 * ```typescript
 * import { test as baseTest, expect } from '@playwright/test'
 * import { setupGlobalErrorMonitoring } from './utils/error-monitor'
 *
 * const test = baseTest.extend({
 *   // 你的扩展
 * })
 *
 * setupGlobalErrorMonitoring(test)
 *
 * test('页面无错误', async ({ page }) => {
 *   await page.goto('/dashboard')
 *   // 错误监控已自动启用
 *   // 测试结束时会自动断言无错误
 * })
 * ```
 */
export function setupGlobalErrorMonitoring<
  T extends TestType<PlaywrightTestArgs & PlaywrightTestOptions, PlaywrightWorkerArgs & PlaywrightWorkerOptions>
>(test: T): void {
  // 在每个测试开始前设置错误监控
  test.beforeEach(async ({ page }, testInfo) => {
    const monitor = setupErrorMonitoring(page)
    setErrorMonitor(testInfo.title, monitor)
  })

  // 在每个测试结束后断言无错误并清理
  test.afterEach(async ({}, testInfo) => {
    const monitor = getErrorMonitor(testInfo.title)
    if (monitor) {
      try {
        monitor.expectNoErrors()
      } finally {
        clearErrorMonitor(testInfo.title)
      }
    }
  })
}

/**
 * 创建带有自动错误监控的 test 对象
 * 使用此函数创建的 test 对象会自动启用错误监控
 *
 * @param baseTest 基础 test 对象（从 @playwright/test 导入）
 * @returns 带有自动错误监控的 test 对象
 *
 * @example
 * ```typescript
 * import { test as baseTest, expect } from '@playwright/test'
 * import { createMonitoredTest } from './utils/error-monitor'
 *
 * const test = createMonitoredTest(baseTest)
 *
 * test('页面无错误', async ({ page }) => {
 *   await page.goto('/dashboard')
 *   // 错误监控已自动启用
 * })
 * ```
 */
export function createMonitoredTest(
  baseTest: TestType<PlaywrightTestArgs & PlaywrightTestOptions, PlaywrightWorkerArgs & PlaywrightWorkerOptions>
): TestType<PlaywrightTestArgs & PlaywrightTestOptions, PlaywrightWorkerArgs & PlaywrightWorkerOptions> {
  const monitoredTest = baseTest.extend({
    // 可以在这里添加自定义 fixture
  })

  setupGlobalErrorMonitoring(monitoredTest)

  return monitoredTest
}
