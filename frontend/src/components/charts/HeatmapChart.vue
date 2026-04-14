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
import type { EChartsOption, HeatmapSeriesOption } from 'echarts'

export interface HeatmapDataItem {
  x: string | number
  y: string | number
  value: number
  itemStyle?: object
}

export type HeatmapColorScheme = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'custom'

export interface HeatmapChartProps {
  // 基础配置
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  data: HeatmapDataItem[]
  xAxisData?: string[]
  yAxisData?: string[]

  // 图表配置
  title?: string
  subtitle?: string
  showTooltip?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string
  showGrid?: boolean
  gridConfig?: Record<string, unknown>

  // 热力图配置
  colorScheme?: HeatmapColorScheme
  customColors?: string[]
  minValue?: number
  maxValue?: number
  calculable?: boolean
  showVisualMap?: boolean
  visualMapPosition?: 'left' | 'right' | 'top' | 'bottom'

  // 坐标轴配置
  xAxisName?: string
  yAxisName?: string
  xAxisRotate?: number
  yAxisRotate?: number

  // 单元格样式
  cellBorderRadius?: number
  cellBorderWidth?: number
  cellBorderColor?: string

  // 标签配置
  showLabel?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (params: any) => string
}

const props = withDefaults(defineProps<HeatmapChartProps>(), {
  width: '100%',
  height: '300px',
  loading: false,
  autoResize: true,
  theme: 'dark',
  showTooltip: true,
  showGrid: true,
  colorScheme: 'blue',
  calculable: false,
  showVisualMap: true,
  visualMapPosition: 'right',
  cellBorderRadius: 2,
  cellBorderWidth: 1,
  cellBorderColor: 'transparent',
  showLabel: false,
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

// 预设配色方案
const colorSchemes: Record<HeatmapColorScheme, string[]> = {
  blue: [
    '#0a1929',
    'rgba(0, 212, 255, 0.2)',
    'rgba(0, 212, 255, 0.4)',
    'rgba(0, 212, 255, 0.6)',
    'rgba(0, 212, 255, 0.9)',
  ],
  green: [
    '#0a1f0a',
    'rgba(0, 255, 136, 0.2)',
    'rgba(0, 255, 136, 0.4)',
    'rgba(0, 255, 136, 0.6)',
    'rgba(0, 255, 136, 0.9)',
  ],
  red: [
    '#1f0a0a',
    'rgba(255, 0, 110, 0.2)',
    'rgba(255, 0, 110, 0.4)',
    'rgba(255, 0, 110, 0.6)',
    'rgba(255, 0, 110, 0.9)',
  ],
  purple: [
    '#1a0a1f',
    'rgba(157, 78, 221, 0.2)',
    'rgba(157, 78, 221, 0.4)',
    'rgba(157, 78, 221, 0.6)',
    'rgba(157, 78, 221, 0.9)',
  ],
  orange: [
    '#1f120a',
    'rgba(255, 149, 0, 0.2)',
    'rgba(255, 149, 0, 0.4)',
    'rgba(255, 149, 0, 0.6)',
    'rgba(255, 149, 0, 0.9)',
  ],
  custom: [],
}

// 获取颜色
const getColors = computed(() => {
  if (props.colorScheme === 'custom' && props.customColors) {
    return props.customColors
  }
  return colorSchemes[props.colorScheme] || colorSchemes.blue
})

// 计算数据范围
const dataRange = computed(() => {
  if (props.minValue !== undefined && props.maxValue !== undefined) {
    return { min: props.minValue, max: props.maxValue }
  }
  const values = props.data.map(d => d.value)
  const min = props.minValue !== undefined ? props.minValue : Math.min(...values, 0)
  const max = props.maxValue !== undefined ? props.maxValue : Math.max(...values)
  return { min, max }
})

// 处理数据
const processedData = computed(() => {
  return props.data.map(item => {
    const xIndex = props.xAxisData?.indexOf(String(item.x)) ?? item.x
    const yIndex = props.yAxisData?.indexOf(String(item.y)) ?? item.y
    return {
      value: [xIndex, yIndex, item.value],
      itemStyle: item.itemStyle,
    }
  })
})

// VisualMap 位置配置
const getVisualMapPosition = () => {
  const positions: Record<string, object> = {
    left: { left: 0, top: 'center', orient: 'vertical' },
    right: { right: 0, top: 'center', orient: 'vertical' },
    top: { top: 0, left: 'center', orient: 'horizontal' },
    bottom: { bottom: 0, left: 'center', orient: 'horizontal' },
  }
  return positions[props.visualMapPosition] || positions.right
}

// 合并配置
const mergedOption = computed<EChartsOption>(() => {
  const xData = props.xAxisData || [...new Set(props.data.map(d => String(d.x)))]
  const yData = props.yAxisData || [...new Set(props.data.map(d => String(d.y)))]

  const seriesConfig: HeatmapSeriesOption = {
    name: props.title || '热力图',
    type: 'heatmap' as const,
    data: processedData.value,
    label: {
      show: props.showLabel,
      formatter: props.labelFormatter || '{c}',
    },
    itemStyle: {
      borderRadius: props.cellBorderRadius,
      borderWidth: props.cellBorderWidth,
      borderColor: props.cellBorderColor,
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
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
          position: 'top',
          formatter:
            props.tooltipFormatter ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((params: any) => {
              const value = params.value as [number, number, number]
              const x = props.xAxisData?.[value[0]] || value[0]
              const y = props.yAxisData?.[value[1]] || value[1]
              return `${x} / ${y}: ${value[2]}`
            }),
        }
      : undefined,
    grid: props.showGrid
      ? {
          left: '10%',
          right: props.showVisualMap ? '15%' : '10%',
          top: props.title ? '15%' : '10%',
          bottom: '10%',
          containLabel: true,
          ...props.gridConfig,
        }
      : undefined,
    xAxis: {
      type: 'category' as const,
      data: xData,
      name: props.xAxisName,
      axisLabel: {
        rotate: props.xAxisRotate,
      },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category' as const,
      data: yData,
      name: props.yAxisName,
      axisLabel: {
        rotate: props.yAxisRotate,
      },
      splitArea: { show: true },
    },
    visualMap: props.showVisualMap
      ? {
          min: dataRange.value.min,
          max: dataRange.value.max,
          calculable: props.calculable,
          inRange: {
            color: getColors.value,
          },
          textStyle: { color: 'rgba(255, 255, 255, 0.8)' },
          ...getVisualMapPosition(),
        }
      : undefined,
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
})
</script>
