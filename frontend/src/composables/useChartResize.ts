/**
 * useChartResize Composable
 * 图表大小调整组合式函数
 *
 * @description 提供安全的图表 resize 功能，防止在图表未初始化时调用
 * @example
 * const { handleResize } = useChartResize(chartInstance)
 */
import { ref, type Ref } from 'vue'
import type { ECharts, EChartsType } from 'echarts'

export interface UseChartResizeOptions {
  /** 组件名称，用于错误日志 */
  componentName?: string
  /** 是否启用防抖 */
  debounce?: boolean
  /** 防抖延迟时间（毫秒） */
  debounceMs?: number
}

/**
 * 需要笛卡尔坐标系的系列类型
 */
const CARTESIAN_SERIES_TYPES = [
  'bar',
  'line',
  'scatter',
  'effectScatter',
  'candlestick',
  'boxplot',
] as const

/**
 * 系列配置接口
 */
interface SeriesOption {
  type?: string
}

/**
 * 检查是否为有效的系列配置
 * @param value - 待检查的值
 * @returns 是否为系列配置
 */
const isSeriesOption = (value: unknown): value is SeriesOption => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  )
}

/**
 * 检查系列类型是否需要笛卡尔坐标系
 * @param type - 系列类型
 * @returns 是否需要笛卡尔坐标系
 */
const isCartesianSeriesType = (type: string | undefined): boolean => {
  return type !== undefined && CARTESIAN_SERIES_TYPES.includes(type as typeof CARTESIAN_SERIES_TYPES[number])
}

/**
 * 创建安全的图表 resize 处理函数
 * @param chartInstance - ECharts 实例引用
 * @param options - 配置选项
 * @returns resize 处理函数
 */
export const useChartResize = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstance: Ref<any>,
  options: UseChartResizeOptions = {}
) => {
  const { componentName = 'Chart', debounce = false, debounceMs = 100 } = options

  const resizeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  const performResize = () => {
    if (!chartInstance.value || chartInstance.value.isDisposed()) {
      return
    }

    // 检查图表是否已正确初始化（有配置项）
    const currentOption = chartInstance.value.getOption()
    const series = currentOption?.series
    if (!currentOption || !series || (Array.isArray(series) && series.length === 0)) {
      // 图表尚未配置，跳过 resize
      return
    }

    // 检查是否需要笛卡尔坐标系但未配置
    // ECharts getOption() 返回的 series 可能是一个数组或单个对象
    const seriesArray = Array.isArray(series) ? series : [series]
    const hasCartesianSeries = seriesArray.some((s: unknown) =>
      isSeriesOption(s) && isCartesianSeriesType((s as SeriesOption).type)
    )

    if (hasCartesianSeries) {
      const grid = currentOption?.grid
      const xAxis = currentOption?.xAxis
      const yAxis = currentOption?.yAxis

      // 如果缺少必要的笛卡尔坐标系配置，跳过 resize
      // 这避免了 ECharts 报错: "cartesian2d cannot be found"
      // 注意：ECharts getOption() 返回的 grid/xAxis/yAxis 可能是数组格式
      // 空数组 [] 是 truthy 值，所以需要检查数组长度
      const isValidComponent = (value: unknown): boolean => {
        if (!value) return false
        if (Array.isArray(value)) return value.length > 0
        return true
      }

      if (!isValidComponent(grid) || !isValidComponent(xAxis) || !isValidComponent(yAxis)) {
        console.warn(`[${componentName}] Cartesian coordinate system incomplete, skipping resize`)
        return
      }
    }

    try {
      chartInstance.value.resize()
    } catch (error) {
      // 忽略 ECharts 内部错误（如 cartesian2d 不存在）
      console.warn(`[${componentName}] Chart resize error:`, error)
    }
  }

  const handleResize = () => {
    if (debounce) {
      if (resizeTimer.value) {
        clearTimeout(resizeTimer.value)
      }
      resizeTimer.value = setTimeout(() => {
        performResize()
        resizeTimer.value = null
      }, debounceMs)
    } else {
      performResize()
    }
  }

  const cancelResize = () => {
    if (resizeTimer.value) {
      clearTimeout(resizeTimer.value)
      resizeTimer.value = null
    }
  }

  return {
    handleResize,
    cancelResize,
  }
}
