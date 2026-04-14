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
import type { EChartsOption, LineSeriesOption } from 'echarts'

export interface LineChartSeries {
  name: string
  data: number[]
  color?: string
  smooth?: boolean
  areaStyle?: boolean | object
  lineStyle?: object
  itemStyle?: object
  symbol?: string
  symbolSize?: number
  showSymbol?: boolean
  label?: object
  emphasis?: object
}

export interface LineChartProps {
  // 基础配置
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  xAxisData: string[]
  series: LineChartSeries[]

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

  // 折线图配置
  smooth?: boolean
  showArea?: boolean
  areaOpacity?: number
  showPoints?: boolean
  lineWidth?: number
}

const props = withDefaults(defineProps<LineChartProps>(), {
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
  smooth: false,
  showArea: false,
  areaOpacity: 0.3,
  showPoints: true,
  lineWidth: 2,
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

// 生成渐变色
const createGradient = (color: string, opacity: number) => {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: color.replace(')', `, ${opacity})`).replace('rgb', 'rgba') },
      { offset: 1, color: color.replace(')', ', 0)').replace('rgb', 'rgba') },
    ],
  }
}

// 默认颜色
const defaultColors = ['#00d4ff', '#00ff88', '#ff006e', '#ff9500', '#9d4edd', '#00b4d8']

// 合并配置
const mergedOption = computed<EChartsOption>(() => {
  const seriesConfig: LineSeriesOption[] = props.series.map((s, index) => {
    const color = s.color || defaultColors[index % defaultColors.length]
    const isSmooth = s.smooth !== undefined ? s.smooth : props.smooth
    const showArea = s.areaStyle !== undefined ? !!s.areaStyle : props.showArea

    return {
      name: s.name,
      type: 'line' as const,
      data: s.data,
      smooth: isSmooth,
      symbol: (s.symbol || (props.showPoints ? 'circle' : 'none')) as string,
      symbolSize: s.symbolSize || 8,
      showSymbol: s.showSymbol !== undefined ? s.showSymbol : props.showPoints,
      lineStyle: {
        width: props.lineWidth,
        color,
        ...s.lineStyle,
      },
      itemStyle: {
        color,
        ...s.itemStyle,
      },
      areaStyle: showArea
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            color: createGradient(color as string, props.areaOpacity) as any,
            ...(typeof s.areaStyle === 'object' ? s.areaStyle : {}),
          }
        : undefined,
      label: s.label,
      emphasis: {
        focus: 'series',
        ...s.emphasis,
      },
    }
  })

  const legendConfig: any = {
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
          axisPointer: { type: 'cross' },
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
    xAxis: {
      type: 'category' as const,
      data: props.xAxisData,
      name: props.xAxisName,
      boundaryGap: false,
      axisLabel: {
        rotate: props.xAxisRotate,
      },
    },
    yAxis: {
      type: 'value' as const,
      name: props.yAxisName,
      axisLabel: {
        formatter: props.yAxisFormatter,
      },
    },
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
