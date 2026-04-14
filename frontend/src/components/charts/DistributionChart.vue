<template>
  <div
    ref="chartContainer"
    class="distribution-chart"
    :class="{ 'is-loading': loading }"
    :style="containerStyle"
  >
    <div v-if="title" class="distribution-chart__header">
      <h3 class="distribution-chart__title">{{ title }}</h3>
      <slot name="extra" />
    </div>
    <div ref="chartRef" class="distribution-chart__container" :style="chartContainerStyle" />
    <div v-if="isEmpty" class="distribution-chart__empty">
      <slot name="empty">
        <div class="empty-content">
          <span class="empty-text">暂无数据</span>
        </div>
      </slot>
    </div>
    <div v-if="loading" class="distribution-chart__loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, toRaw } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption, PieSeriesOption, LegendComponentOption } from 'echarts'
import { useChartResize } from '@/composables/useChartResize'

export interface DistributionChartDataItem {
  name: string
  value: number
  color?: string
  itemStyle?: object
  label?: object
  emphasis?: object
}

export type DistributionChartType = 'pie' | 'donut' | 'rose'

export interface DistributionChartProps {
  // 基础配置
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  data: DistributionChartDataItem[]

  // 图表类型
  type?: DistributionChartType

  // 标题配置
  title?: string

  // 图例配置
  showLegend?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'

  // 提示框配置
  showTooltip?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string

  // 标签配置
  showLabel?: boolean
  labelPosition?: 'inside' | 'outside' | 'center'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (params: any) => string
  showLabelLine?: boolean

  // 环形图中心文本
  centerText?: string
  centerSubtext?: string

  // 饼图配置
  radius?: string | string[]
  center?: string[]
  startAngle?: number
  minAngle?: number

  // 样式配置
  borderRadius?: number
  borderColor?: string
  borderWidth?: number

  // 选中配置
  selectedMode?: 'single' | 'multiple' | boolean
  selectedOffset?: number

  // 数据排序
  sortData?: boolean
}

const props = withDefaults(defineProps<DistributionChartProps>(), {
  width: '100%',
  height: '300px',
  loading: false,
  autoResize: true,
  theme: 'dark',
  type: 'pie',
  showLegend: true,
  legendPosition: 'right',
  showTooltip: true,
  radius: undefined,
  center: () => ['50%', '50%'],
  startAngle: 90,
  minAngle: 0,
  showLabel: true,
  labelPosition: 'outside',
  showLabelLine: true,
  borderRadius: 0,
  borderColor: 'transparent',
  borderWidth: 0,
  selectedMode: false,
  selectedOffset: 10,
  sortData: false,
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
  'legend-change': [params: { name: string; selected: boolean }]
  resize: [width: number, height: number]
}>()

const chartRef = ref<HTMLElement>()
const chartContainer = ref<HTMLElement>()
const chartInstance = ref<ECharts | null>(null)
const resizeObserver = ref<ResizeObserver | null>(null)

// 使用组合式函数获取安全的 resize 处理函数
const { handleResize } = useChartResize(chartInstance, { componentName: 'DistributionChart' })

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

// 默认颜色
const defaultColors = [
  '#00d4ff',
  '#00ff88',
  '#ff006e',
  '#ff9500',
  '#9d4edd',
  '#00b4d8',
  '#90e0ef',
  '#ff99c8',
  '#f4d03f',
  '#e74c3c',
  '#3498db',
  '#2ecc71',
]

// 计算半径
const computedRadius = computed(() => {
  if (props.radius) return props.radius

  switch (props.type) {
    case 'donut':
      return ['40%', '70%']
    case 'pie':
    default:
      return '70%'
  }
})

// 计算玫瑰图类型
const computedRoseType = computed(() => {
  if (props.type === 'rose') return 'area'
  return undefined
})

// 处理数据（排序等）
const processedData = computed(() => {
  let data = [...props.data]
  if (props.sortData) {
    data = data.sort((a, b) => b.value - a.value)
  }
  return data
})

// 合并配置
const chartOption = computed<EChartsOption>(() => {
  if (isEmpty.value) {
    return {}
  }

  // 图例位置配置映射
  const legendPositionMap: Record<string, Partial<LegendComponentOption>> = {
    top: { top: 0, left: 'center' },
    bottom: { bottom: 0, left: 'center' },
    left: { left: 0, top: 'center', orient: 'vertical' as const },
    right: { right: 0, top: 'center', orient: 'vertical' as const },
  }

  const legendConfig: LegendComponentOption = {
    show: props.showLegend,
    textStyle: { color: 'rgba(255, 255, 255, 0.8)' },
    ...legendPositionMap[props.legendPosition],
  }

  const seriesData = processedData.value.map((item, index) => ({
    name: item.name,
    value: item.value,
    itemStyle: {
      color: item.color || defaultColors[index % defaultColors.length],
      ...item.itemStyle,
    },
    label: item.label,
    emphasis: {
      focus: 'self' as const,
      ...item.emphasis,
    },
  }))

  const seriesConfig: PieSeriesOption = {
    type: 'pie' as const,
    radius: computedRadius.value,
    center: props.center,
    startAngle: props.startAngle,
    minAngle: props.minAngle,
    roseType: computedRoseType.value as 'area' | undefined,
    itemStyle: {
      borderRadius: props.borderRadius,
      borderColor: props.borderColor,
      borderWidth: props.borderWidth,
    },
    label: {
      show: props.showLabel,
      position: props.labelPosition,
      formatter: props.labelFormatter || '{b}: {d}%',
      color: props.labelPosition === 'inside' ? '#fff' : 'rgba(255, 255, 255, 0.8)',
    },
    labelLine: {
      show: props.showLabelLine,
      length: 15,
      length2: 10,
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 14,
        fontWeight: 'bold',
      },
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
    selectedMode: props.selectedMode,
    selectedOffset: props.selectedOffset,
    data: seriesData,
  }

  const option: EChartsOption = {
    tooltip: props.showTooltip
      ? {
          trigger: 'item' as const,
          formatter: props.tooltipFormatter || '{b}: {c} ({d}%)',
        }
      : undefined,
    legend: legendConfig,
    series: [seriesConfig],
  }

  // 添加环形图中心文本
  if (props.type === 'donut' && (props.centerText || props.centerSubtext)) {
    option.graphic = [
      {
        type: 'text',
        left: 'center',
        top: props.centerSubtext ? '45%' : '50%',
        style: {
          text: props.centerText || '',
          fill: '#fff',
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: props.centerSubtext || '',
          fill: 'rgba(255, 255, 255, 0.6)',
          fontSize: 12,
        },
      },
    ]
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
    legend: { textStyle: { color: 'rgba(255, 255, 255, 0.8)' } },
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
    legend: { textStyle: { color: '#333333' } },
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

  const rawOption = toRaw(chartOption.value)
  const mergedOption: EChartsOption = {
    color: defaultColors,
    ...rawOption,
  }

  chartInstance.value.setOption(mergedOption, true)
}

// 绑定事件
const bindEvents = () => {
  if (!chartInstance.value) return

  chartInstance.value.on('click', (params: unknown) => {
    emit('chart-click', params as EChartsEventParams)
  })

  chartInstance.value.on('legendselectchanged', (params: unknown) => {
    const eventParams = params as { name: string; selected: boolean }
    emit('legend-change', eventParams)
  })
}

// 调整大小处理函数现在由 useChartResize 组合式函数提供

// 处理图表点击
const handleChartClick = (data: EChartsEventParams) => {
  emit('chart-click', data)
}

// 处理图例变化
const handleLegendChange = (data: { name: string; selected: boolean }) => {
  emit('legend-change', data)
}

// 监听配置变化
watch(() => props.data, updateChart, { deep: true })
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
  handleLegendChange,
})
</script>

<style scoped lang="scss">
.distribution-chart {
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
