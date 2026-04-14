<template>
  <BaseChart
    ref="baseChartRef"
    :option="mergedOption"
    :width="width"
    :height="height"
    :loading="loading"
    :auto-resize="autoResize"
    :theme="theme"
    v-bind="$attrs"
    @click="$emit('click', $event)"
    @dblclick="$emit('dblclick', $event)"
    @resize="$emit('resize', $event)"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseChart from './BaseChart.vue'
import type { EChartsOption, PieSeriesOption, LegendComponentOption } from 'echarts'

export interface PieChartDataItem {
  name: string
  value: number
  color?: string
  itemStyle?: object
  label?: object
  emphasis?: object
}

export type PieChartType = 'pie' | 'donut' | 'rose' | 'nightingale'

export interface PieChartProps {
  // 基础配置
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  data: PieChartDataItem[]

  // 图表类型
  type?: PieChartType

  // 图表配置
  title?: string
  subtitle?: string
  showLegend?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  showTooltip?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string

  // 饼图配置
  radius?: string | string[]
  center?: string[]
  startAngle?: number
  minAngle?: number
  roseType?: boolean | 'radius' | 'area'

  // 标签配置
  showLabel?: boolean
  labelPosition?: 'inside' | 'outside' | 'center'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (params: any) => string
  showLabelLine?: boolean

  // 样式配置
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  padAngle?: number

  // 选中配置
  selectedMode?: 'single' | 'multiple' | boolean
  selectedOffset?: number
}

const props = withDefaults(defineProps<PieChartProps>(), {
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
  roseType: false,
  showLabel: true,
  labelPosition: 'outside',
  showLabelLine: true,
  borderRadius: 0,
  borderColor: 'transparent',
  borderWidth: 0,
  padAngle: 0,
  selectedMode: false,
  selectedOffset: 10,
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
  click: [params: EChartsEventParams]
  dblclick: [params: EChartsEventParams]
  resize: [event: unknown]
}>()

const baseChartRef = ref<InstanceType<typeof BaseChart>>()

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
  if (props.roseType) return props.roseType
  if (props.type === 'rose' || props.type === 'nightingale') return 'area'
  return undefined
})

// 合并配置
const mergedOption = computed<EChartsOption>(() => {
  const legendConfig: LegendComponentOption = {
    show: props.showLegend,
    textStyle: { color: 'rgba(255, 255, 255, 0.8)' },
  }

  switch (props.legendPosition) {
    case 'top':
      legendConfig.top = 0
      legendConfig.left = 'center'
      break
    case 'bottom':
      legendConfig.bottom = 0
      legendConfig.left = 'center'
      break
    case 'left':
      legendConfig.left = 0
      legendConfig.top = 'center'
      legendConfig.orient = 'vertical'
      break
    case 'right':
      legendConfig.right = 0
      legendConfig.top = 'center'
      legendConfig.orient = 'vertical'
      break
  }

  const seriesData = props.data.map((item, index) => ({
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
    roseType: computedRoseType.value as 'area' | 'radius' | undefined,
    padAngle: props.padAngle,
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

  return {
    title: props.title
      ? {
          text: props.title,
          subtext: props.subtitle,
          textStyle: { fontSize: 16, fontWeight: 'normal' },
          left: 'center',
        }
      : undefined,
    tooltip: props.showTooltip
      ? {
          trigger: 'item' as const,
          formatter: props.tooltipFormatter || '{b}: {c} ({d}%)',
        }
      : undefined,
    legend: legendConfig,
    series: [seriesConfig],
  }
})

// 暴露方法
defineExpose({
  chartInstance: computed(() => baseChartRef.value?.chartInstance),
  resize: () => baseChartRef.value?.resize(),
  updateChart: () => baseChartRef.value?.updateChart(),
  getOption: () => baseChartRef.value?.getOption(),
  clear: () => baseChartRef.value?.clear(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatchAction: (payload: any) => baseChartRef.value?.dispatchAction(payload),
  // 选中/取消选中扇区
  select: (name: string) => {
    baseChartRef.value?.dispatchAction({ type: 'select', name })
  },
  unselect: (name: string) => {
    baseChartRef.value?.dispatchAction({ type: 'unselect', name })
  },
  toggleSelected: (name: string) => {
    baseChartRef.value?.dispatchAction({ type: 'toggleSelect', name })
  },
})
</script>
