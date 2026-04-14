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
import type { EChartsOption, BarSeriesOption, LegendComponentOption } from 'echarts'

export interface BarChartSeries {
  name: string
  data: number[]
  color?: string | object
  stack?: string
  barWidth?: string | number
  itemStyle?: object
  label?: object
  emphasis?: object
}

export interface BarChartProps {
  // 基础配置
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  xAxisData: string[]
  series: BarChartSeries[]

  // 图表配置
  title?: string
  subtitle?: string
  showLegend?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  showTooltip?: boolean
  tooltipTrigger?: 'axis' | 'item'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string
  showGrid?: boolean
  gridConfig?: object

  // 坐标轴配置
  xAxisName?: string
  yAxisName?: string
  xAxisRotate?: number
  yAxisFormatter?: (value: number) => string

  // 柱状图配置
  horizontal?: boolean
  stacked?: boolean
  barWidth?: string | number
  barGap?: string
  barBorderRadius?: number | number[]
  showBackground?: boolean
  backgroundStyle?: object
  showLabel?: boolean
  labelPosition?: 'top' | 'inside' | 'bottom' | 'insideTop' | 'insideBottom'
}

const props = withDefaults(defineProps<BarChartProps>(), {
  width: '100%',
  height: '300px',
  loading: false,
  autoResize: true,
  theme: 'dark',
  showLegend: true,
  legendPosition: 'top',
  showTooltip: true,
  tooltipTrigger: 'axis',
  showGrid: true,
  horizontal: false,
  stacked: false,
  barWidth: '60%',
  barGap: '30%',
  barBorderRadius: 4,
  showBackground: false,
  showLabel: false,
  labelPosition: 'top',
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
const defaultColors = ['#00d4ff', '#00ff88', '#ff006e', '#ff9500', '#9d4edd', '#00b4d8']

// 生成渐变色
const createGradient = (color: string) => {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color },
      { offset: 1, color: color.replace(')', ', 0.1)').replace('rgb', 'rgba') },
    ],
  }
}

// 合并配置
const mergedOption = computed<EChartsOption>(() => {
  const seriesConfig: BarSeriesOption[] = props.series.map((s, index) => {
    const color = s.color || defaultColors[index % defaultColors.length]
    const isGradient = typeof color === 'string' && !color.startsWith('#')

    return {
      name: s.name,
      type: 'bar' as const,
      data: s.data,
      stack: props.stacked ? 'total' : s.stack,
      barWidth: s.barWidth || props.barWidth,
      barGap: props.barGap,
      showBackground: props.showBackground,
      backgroundStyle: props.backgroundStyle,
      label: props.showLabel
        ? {
            show: true,
            position: props.labelPosition,
            color: '#fff',
            ...s.label,
          }
        : undefined,
      itemStyle: {
        borderRadius: props.barBorderRadius,
        color: isGradient ? createGradient(color as string) : color,
        ...s.itemStyle,
      },
      emphasis: {
        focus: 'series',
        ...s.emphasis,
      },
    }
  })

  const legendConfig: LegendComponentOption = {
    show: props.showLegend,
    textStyle: { color: 'rgba(255, 255, 255, 0.8)' },
  }

  switch (props.legendPosition) {
    case 'top':
      legendConfig.top = 0
      break
    case 'bottom':
      legendConfig.bottom = 0
      break
    case 'left':
      legendConfig.left = 0
      legendConfig.orient = 'vertical'
      break
    case 'right':
      legendConfig.right = 0
      legendConfig.orient = 'vertical'
      break
  }

  const xAxis = props.horizontal
    ? {
        type: 'value' as const,
        name: props.yAxisName,
        axisLabel: {
          formatter: props.yAxisFormatter,
        },
      }
    : {
        type: 'category' as const,
        data: props.xAxisData,
        name: props.xAxisName,
        axisLabel: {
          rotate: props.xAxisRotate,
        },
      }

  const yAxis = props.horizontal
    ? {
        type: 'category' as const,
        data: props.xAxisData,
        name: props.xAxisName,
        axisLabel: {
          rotate: props.xAxisRotate,
        },
      }
    : {
        type: 'value' as const,
        name: props.yAxisName,
        axisLabel: {
          formatter: props.yAxisFormatter,
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
          trigger: props.tooltipTrigger,
          axisPointer: { type: 'shadow' },
          formatter: props.tooltipFormatter,
        }
      : undefined,
    legend: legendConfig,
    grid: props.showGrid
      ? {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: props.title ? '15%' : '10%',
          containLabel: true,
          ...props.gridConfig,
        }
      : undefined,
    xAxis,
    yAxis,
    series: seriesConfig,
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
