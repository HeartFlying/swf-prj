<template>
  <div
    ref="chartContainer"
    class="ranking-chart"
    :class="{ 'is-loading': loading }"
    :style="containerStyle"
  >
    <div v-if="title" class="ranking-chart__header">
      <h3 class="ranking-chart__title">{{ title }}</h3>
      <slot name="extra" />
    </div>
    <div ref="chartRef" class="ranking-chart__container" :style="chartContainerStyle" />
    <div v-if="isEmpty" class="ranking-chart__empty">
      <slot name="empty">
        <div class="empty-content">
          <span class="empty-text">暂无数据</span>
        </div>
      </slot>
    </div>
    <div v-if="loading" class="ranking-chart__loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, toRaw } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption, BarSeriesOption } from 'echarts'
import { useChartResize } from '@/composables/useChartResize'

export interface RankingChartDataItem {
  name: string
  value: number
  color?: string
  itemStyle?: object
}

export type RankingDirection = 'horizontal' | 'vertical'
export type SortOrder = 'ascending' | 'descending'

export interface RankingChartProps {
  // 基础配置
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  data: RankingChartDataItem[]

  // 标题配置
  title?: string

  // 布局配置
  direction?: RankingDirection

  // 排序配置
  autoSort?: boolean
  sortOrder?: SortOrder

  // 高亮配置
  highlightTop?: number
  highlightColors?: string[]
  barColor?: string

  // 动画配置
  animation?: boolean
  animationDuration?: number
  animationEasing?: string
  dynamicSort?: boolean

  // 标签配置
  showLabel?: boolean
  labelFormatter?: (params: any) => string

  // 条形样式
  barWidth?: string | number
  barGap?: string
  barBorderRadius?: number | number[]
  showBackground?: boolean
  useGradient?: boolean

  // 坐标轴配置
  showAxisLine?: boolean

  // 提示框配置
  showTooltip?: boolean
  tooltipFormatter?: (params: any) => string

  // 极值标记
  showExtremeLabels?: boolean
  showAverage?: boolean

  // 数据限制
  maxItems?: number

  // 排名显示
  showRank?: boolean
}

const props = withDefaults(defineProps<RankingChartProps>(), {
  width: '100%',
  height: '300px',
  loading: false,
  autoResize: true,
  theme: 'dark',
  direction: 'horizontal',
  autoSort: true,
  sortOrder: 'descending',
  highlightTop: 3,
  highlightColors: () => ['#ffd700', '#c0c0c0', '#cd7f32'],
  barColor: '#5470c6',
  animation: true,
  animationDuration: 1000,
  animationEasing: 'cubicOut',
  dynamicSort: false,
  showLabel: true,
  barWidth: '60%',
  barGap: '20%',
  barBorderRadius: 4,
  showBackground: false,
  useGradient: false,
  showAxisLine: false,
  showTooltip: true,
  showExtremeLabels: false,
  showAverage: false,
  maxItems: undefined,
  showRank: false,
})

// ECharts 事件参数类型
interface EChartsEventParams {
  componentType: string
  seriesType?: string
  seriesIndex?: number
  seriesName?: string
  name: string
  dataIndex: number
  data?: unknown
  value: unknown
  color?: string
}

const emit = defineEmits<{
  'chart-click': [params: EChartsEventParams]
  'sort-change': [order: SortOrder]
  resize: [width: number, height: number]
}>()

const chartRef = ref<HTMLElement>()
const chartContainer = ref<HTMLElement>()
const chartInstance = ref<ECharts | null>(null)
const resizeObserver = ref<ResizeObserver | null>(null)

// 使用组合式函数获取安全的 resize 处理函数
const { handleResize } = useChartResize(chartInstance, { componentName: 'RankingChart' })

// 容器样式
const containerStyle = computed(() => ({
  width: props.width,
  height: props.height,
}))

// 图表容器样式
const chartContainerStyle = computed(() => ({
  height: props.title ? 'calc(100% - 40px)' : '100%',
}))

// 图表高度
const chartHeight = computed(() => props.height)

// 是否为空数据
const isEmpty = computed(() => !props.data || props.data.length === 0)

// 处理数据（排序、限制数量）
const processedData = computed(() => {
  if (!props.data || props.data.length === 0) return []

  let data = [...props.data]

  // 排序
  if (props.autoSort) {
    data.sort((a, b) => {
      return props.sortOrder === 'ascending' ? a.value - b.value : b.value - a.value
    })
  }

  // 限制数量
  if (props.maxItems && props.maxItems > 0 && data.length > props.maxItems) {
    data = data.slice(0, props.maxItems)
  }

  return data
})

// 生成渐变色
const createGradient = (color: string) => {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: [
      { offset: 0, color },
      { offset: 1, color: color.replace(')', ', 0.6)').replace('rgb', 'rgba') },
    ],
  }
}

// 获取条形颜色
const getBarColor = (index: number) => {
  if (props.highlightTop > 0 && index < props.highlightTop) {
    return props.highlightColors[index % props.highlightColors.length]
  }
  if (props.useGradient) {
    return createGradient(props.barColor)
  }
  return props.barColor
}

// 构建系列数据
const buildSeriesData = () => {
  return processedData.value.map((item, index) => {
    const color = getBarColor(index)
    const dataItem: any = {
      name: item.name,
      value: item.value,
    }

    // 为所有项添加 itemStyle，确保颜色正确应用
    dataItem.itemStyle = {
      color,
      ...item.itemStyle,
    }

    return dataItem
  })
}

// 标签位置
const labelPosition = computed(() => {
  return props.direction === 'horizontal' ? 'right' : 'top'
})

// 坐标轴配置
const getAxisConfig = () => {
  const categoryData = processedData.value.map((item, index) => {
    if (props.showRank) {
      return `${index + 1}. ${item.name}`
    }
    return item.name
  })

  const commonAxisConfig = {
    axisLine: { show: props.showAxisLine },
    axisTick: { show: false },
    splitLine: { show: false },
  }

  if (props.direction === 'horizontal') {
    return {
      xAxis: {
        type: 'value' as const,
        ...commonAxisConfig,
        axisLabel: { show: false },
      },
      yAxis: {
        type: 'category' as const,
        data: categoryData,
        ...commonAxisConfig,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.8)',
          formatter: props.showRank
            ? (value: string) => value
            : undefined,
        },
        inverse: true, // 让排名高的在上方
      },
    }
  } else {
    return {
      xAxis: {
        type: 'category' as const,
        data: categoryData,
        ...commonAxisConfig,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.8)',
          rotate: 30,
        },
      },
      yAxis: {
        type: 'value' as const,
        ...commonAxisConfig,
        axisLabel: { show: false },
      },
    }
  }
}

// 图表配置
const chartOption = computed<EChartsOption>(() => {
  if (isEmpty.value) {
    return {}
  }

  const axisConfig = getAxisConfig()
  const seriesData = buildSeriesData()

  const seriesConfig: BarSeriesOption = {
    type: 'bar' as const,
    data: seriesData,
    barWidth: props.barWidth,
    barGap: props.barGap,
    showBackground: props.showBackground,
    backgroundStyle: props.showBackground
      ? {
          color: 'rgba(255, 255, 255, 0.05)',
          borderRadius: props.barBorderRadius,
        }
      : undefined,
    label: {
      show: props.showLabel,
      position: labelPosition.value,
      formatter: props.labelFormatter || '{c}',
      color: 'rgba(255, 255, 255, 0.8)',
    },
    itemStyle: {
      borderRadius: props.barBorderRadius,
    },
    emphasis: {
      focus: 'series',
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
    animation: props.animation,
    animationDuration: props.animationDuration,
    animationEasing: props.animationEasing as any,
  }

  // 动态排序动画配置
  if (props.dynamicSort) {
    seriesConfig.universalTransition = {
      enabled: true,
    }
  }

  // 极值标记
  if (props.showExtremeLabels) {
    seriesConfig.markPoint = {
      data: [
        { type: 'max', name: '最大值' },
        { type: 'min', name: '最小值' },
      ],
    }
  }

  // 平均值标记
  if (props.showAverage) {
    seriesConfig.markLine = {
      data: [{ type: 'average', name: '平均值' }],
    }
  }

  const option: EChartsOption = {
    animation: props.animation,
    animationDuration: props.animationDuration,
    animationEasing: props.animationEasing as any,
    tooltip: props.showTooltip
      ? {
          trigger: 'axis' as const,
          axisPointer: { type: 'shadow' },
          formatter: props.tooltipFormatter,
        }
      : undefined,
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    ...axisConfig,
    series: [seriesConfig],
  }

  // 动态排序动画配置
  if (props.dynamicSort) {
    option.animationDurationUpdate = 500
    option.animationEasingUpdate = 'linear'
  }

  return option
})

// 主题配置
const chartThemes = {
  dark: {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'JetBrains Mono, Consolas, monospace',
    },
    tooltip: {
      backgroundColor: 'rgba(13, 33, 55, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#ffffff' },
      extraCssText: 'backdrop-filter: blur(10px);',
    },
  },
  light: {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'JetBrains Mono, Consolas, monospace',
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#cccccc',
      textStyle: { color: '#333333' },
      extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);',
    },
  },
}

// 注册主题
const registeredThemes = new Set<string>()
const registerThemes = () => {
  ;(['dark', 'light'] as const).forEach((themeKey) => {
    const themeName = `tech-${themeKey}`
    if (!registeredThemes.has(themeName)) {
      echarts.registerTheme(themeName, chartThemes[themeKey])
      registeredThemes.add(themeName)
    }
  })
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value || isEmpty.value) return

  registerThemes()

  const themeName = typeof props.theme === 'string' ? props.theme : 'tech-dark'

  chartInstance.value = echarts.init(chartRef.value, themeName, {
    renderer: 'canvas',
  })

  // 设置配置
  updateChart()

  // 绑定事件
  bindEvents()

  // 设置ResizeObserver
  if (props.autoResize && window.ResizeObserver) {
    resizeObserver.value = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        handleResize()
        emit('resize', width, height)
      }
    })
    resizeObserver.value.observe(chartContainer.value!)
  }
}

// 更新图表配置
const updateChart = () => {
  if (!chartInstance.value || isEmpty.value) return

  // 使用 toRaw 去除响应式包装
  const rawOption = toRaw(chartOption.value)
  chartInstance.value.setOption(rawOption, true)
}

// 绑定事件
const bindEvents = () => {
  if (!chartInstance.value) return

  chartInstance.value.on('click', (params: unknown) => {
    emit('chart-click', params as EChartsEventParams)
  })
}

// 调整大小处理函数现在由 useChartResize 组合式函数提供

// 处理图表点击
const handleChartClick = (data: EChartsEventParams) => {
  emit('chart-click', data)
}

// 监听配置变化
watch(() => props.data, updateChart, { deep: true })
watch(() => props.sortOrder, (newVal) => {
  emit('sort-change', newVal)
  updateChart()
})
watch(() => props.theme, () => {
  disposeChart()
  initChart()
})

// 销毁图表
const disposeChart = () => {
  resizeObserver.value?.disconnect()
  resizeObserver.value = null
  chartInstance.value?.dispose()
  chartInstance.value = null
}

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  disposeChart()
})

// 暴露方法
defineExpose({
  chartInstance,
  chartOption,
  chartHeight,
  handleResize,
  handleChartClick,
})
</script>

<style scoped lang="scss">
.ranking-chart {
  position: relative;
  width: 100%;
  background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
  border: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.2));
  border-radius: var(--tech-radius-lg, 8px);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.2));
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff);
    font-family: var(--tech-font-chinese, 'PingFang SC', 'Microsoft YaHei', sans-serif);
  }

  &__container {
    width: 100%;
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 25, 41, 0.5);

    .empty-content {
      text-align: center;
      color: rgba(255, 255, 255, 0.4);
    }

    .empty-text {
      font-size: 14px;
    }
  }

  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(10, 25, 41, 0.8);
    backdrop-filter: blur(4px);
    color: var(--tech-cyan, #00d4ff);
    font-size: 14px;

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid rgba(0, 212, 255, 0.2);
      border-top-color: var(--tech-cyan, #00d4ff);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  &.is-loading {
    pointer-events: none;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
