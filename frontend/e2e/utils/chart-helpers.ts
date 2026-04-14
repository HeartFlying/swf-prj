import { Page, expect, Locator } from '@playwright/test'

/**
 * 图表渲染验证辅助函数
 * 用于E2E测试中验证ECharts图表的渲染质量
 */

/**
 * 验证canvas元素存在且可见
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 * @returns canvas定位器
 */
export async function verifyCanvasExists(page: Page, selector: string): Promise<Locator> {
  const container = page.locator(selector)
  await expect(container).toBeVisible()

  const canvas = container.locator('canvas')
  await expect(canvas).toBeVisible()

  return canvas
}

/**
 * 验证canvas尺寸非零
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 */
export async function verifyCanvasDimensions(page: Page, selector: string): Promise<void> {
  const canvas = await verifyCanvasExists(page, selector)

  const width = await canvas.evaluate(el => (el as HTMLCanvasElement).width)
  const height = await canvas.evaluate(el => (el as HTMLCanvasElement).height)

  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)
}

/**
 * 验证ECharts实例存在
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 */
export async function verifyEchartsInstance(page: Page, selector: string): Promise<void> {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel)
    return el && (el as any).__echartsInstance__ !== undefined
  }, selector, { timeout: 10000 })
}

/**
 * 验证图表数据点渲染
 * 检查图表是否有数据系列
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 */
export async function verifyChartDataRendered(page: Page, selector: string): Promise<void> {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel)
    const instance = el && (el as any).__echartsInstance__
    if (!instance) return false

    const option = instance.getOption()
    if (!option || !option.series) return false

    const series = Array.isArray(option.series) ? option.series : [option.series]
    return series.some((s: any) => s.data && s.data.length > 0)
  }, selector, { timeout: 10000 })
}

/**
 * 综合验证图表渲染质量
 * 包含canvas存在、尺寸非零、ECharts实例存在、数据渲染
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 * @param options - 验证选项
 */
export async function verifyChartRendered(
  page: Page,
  selector: string,
  options: {
    checkDimensions?: boolean
    checkInstance?: boolean
    checkData?: boolean
    timeout?: number
  } = {}
): Promise<void> {
  const {
    checkDimensions = true,
    checkInstance = true,
    checkData = true,
    timeout = 10000
  } = options

  // 等待图表容器可见
  const container = page.locator(selector)
  await expect(container).toBeVisible({ timeout })

  // 等待canvas渲染完成
  const canvas = container.locator('canvas')
  await expect(canvas).toBeVisible({ timeout })

  // 验证canvas尺寸
  if (checkDimensions) {
    const width = await canvas.evaluate(el => (el as HTMLCanvasElement).width)
    const height = await canvas.evaluate(el => (el as HTMLCanvasElement).height)

    expect(width, `Chart canvas width should be > 0 for ${selector}`).toBeGreaterThan(0)
    expect(height, `Chart canvas height should be > 0 for ${selector}`).toBeGreaterThan(0)
  }

  // 验证ECharts实例
  if (checkInstance) {
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel)
      return el && (el as any).__echartsInstance__ !== undefined
    }, selector, { timeout })
  }

  // 验证数据渲染
  if (checkData) {
    const hasData = await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      const instance = el && (el as any).__echartsInstance__
      if (!instance) return false

      const option = instance.getOption()
      if (!option || !option.series) return false

      const series = Array.isArray(option.series) ? option.series : [option.series]
      return series.some((s: any) => s.data && s.data.length > 0)
    }, selector)

    expect(hasData, `Chart should have data rendered for ${selector}`).toBe(true)
  }
}

/**
 * 等待图表动画完成
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 * @param timeout - 超时时间
 */
export async function waitForChartAnimation(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel)
    const instance = el && (el as any).__echartsInstance__
    if (!instance) return false

    // 检查是否还在动画中
    return !instance.isAnimationFinished || instance.isAnimationFinished()
  }, selector, { timeout }).catch(() => {
    // 如果方法不存在或超时，继续执行
    console.log(`Chart animation check timeout for ${selector}`)
  })
}

/**
 * 获取图表数据
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 * @returns 图表数据
 */
export async function getChartData(page: Page, selector: string): Promise<any> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    const instance = el && (el as any).__echartsInstance__
    if (!instance) return null

    const option = instance.getOption()
    return {
      series: option.series,
      xAxis: option.xAxis,
      yAxis: option.yAxis,
      legend: option.legend
    }
  }, selector)
}

/**
 * 验证图表响应式调整大小
 * @param page - Playwright页面对象
 * @param selector - 图表容器选择器
 */
export async function verifyChartResponsive(page: Page, selector: string): Promise<void> {
  const container = page.locator(selector)

  // 获取初始尺寸
  const initialBox = await container.boundingBox()
  expect(initialBox).not.toBeNull()

  // 改变视口大小并等待页面稳定
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForLoadState('domcontentloaded')

  // 验证图表仍然可见且canvas尺寸有效
  await verifyCanvasDimensions(page, selector)

  // 恢复视口并等待页面稳定
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 验证多个图表渲染
 * @param page - Playwright页面对象
 * @param selectors - 图表容器选择器数组
 */
export async function verifyMultipleCharts(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    await verifyChartRendered(page, selector)
  }
}
