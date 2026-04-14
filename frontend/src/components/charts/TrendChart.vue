<template>
  <div class="trend-chart" :class="{ 'is-loading': loading }">
    <!-- 标题栏 -->
    <div v-if="title || showToolbar" class="trend-chart__header">
      <h3 v-if="title" class="trend-chart__title">{{ title }}</h3>

      <!-- 工具栏 -->
      <div v-if="showToolbar" class="trend-chart__toolbar">
        <!-- 时间维度选择器 -->
        <div class="trend-chart__time-selector">
          <button
            v-for="dim in timeDimensions"
            :key="dim.value"
            class="time-dimension-tab"
            :class="{ 'is-active': currentTimeDimension === dim.value }"
            @click="handleTimeDimensionChange(dim.value)"
          >
            {{ dim.label }}
          </button>
        </div>

        <!-- 刷新按钮 -->
        <button
          v-if="showRefresh"
          class="trend-chart__refresh"
          :disabled="loading"
          @click="handleRefresh"
        >
          <el-icon><Refresh /></el-icon>
        </button>

        <!-- 下载按钮 -->
        <button
          v-if="showDownload"
          class="trend-chart__download"
          @click="handleDownload"
        >
          <el-icon><Download /></el-icon>
        </button>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="trend-chart__container" :style="containerStyle">
      <div v-if="isEmptyData" class="trend-chart__empty">
        <el-empty description="暂无数据" />
      </div>
      <BaseChart
        v-else
        ref="baseChartRef"
        :option="chartOption"
        :width="width"
        :height="chartHeight"
        :loading="loading"
        :auto-resize="autoResize"
        :theme="theme"
        @click="handleChartClick"
      />
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="trend-chart__loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Refresh, Download } from '@element-plus/icons-vue'
import BaseChart from './BaseChart.vue'
import type { EChartsOption, LineSeriesOption } from 'echarts'

// 时间维度类型
export type TimeDimension = 'day' | 'week' | 'month' | 'year'

// 图表类型
export type ChartType = 'line' | 'area'

// 缩放类型
export type ZoomType = 'slider' | 'inside' | 'both' | 'none'

// 图例位置
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right'

// 数据系列接口
export interface TrendChartSeries {
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

// 数据接口
export interface TrendChartData {
  dates: string[]
  series: TrendChartSeries[]
}

// 组件属性
export interface TrendChartProps {
  // 基础配置
  title?: string
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  data: TrendChartData

  // 图表配置
  chartType?: ChartType
  smooth?: boolean
  showArea?: boolean
  areaOpacity?: number
  showPoints?: boolean
  lineWidth?: number

  // 时间维度配置
  defaultTimeDimension?: TimeDimension
  showToolbar?: boolean

  // 图例配置
  showLegend?: boolean
  legendPosition?: LegendPosition

  // 提示框配置
  showTooltip?: boolean
  tooltipTrigger?: 'axis' | 'item'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string

  // 坐标轴配置
  xAxisName?: string
  yAxisName?: string
  xAxisRotate?: number
  yAxisFormatter?: (value: number) => string

  // 网格配置
  showGrid?: boolean
  gridConfig?: object

  // 数据缩放配置
  enableZoom?: boolean
  zoomType?: ZoomType

  // 工具栏配置
  showRefresh?: boolean
  showDownload?: boolean
}

const props = withDefaults(defineProps<TrendChartProps>(), {
  width: '100%',
  height: '350px',
  loading: false,
  autoResize: true,
  theme: 'dark',
  chartType: 'line',
  smooth: true,
  showArea: false,
  areaOpacity: 0.3,
  showPoints: true,
  lineWidth: 2,
  defaultTimeDimension: 'day',
  showToolbar: true,
  showLegend: true,
  legendPosition: 'top',
  showTooltip: true,
  tooltipTrigger: 'axis',
  showGrid: true,
  enableZoom: true,
  zoomType: 'both',
  showRefresh: true,
  showDownload: false,
})

const emit = defineEmits<{
  'time-dimension-change': [dimension: TimeDimension]
  'chart-click': [params: object]
  'refresh': []
  'download': []
}>()

const baseChartRef = ref<InstanceType<typeof BaseChart>>()

// 当前时间维度
const currentTimeDimension = ref<TimeDimension>(props.defaultTimeDimension)

// 时间维度选项
const timeDimensions = [
  { label: '日', value: 'day' as TimeDimension },
  { label: '周', value: 'week' as TimeDimension },
  { label: '月', value: 'month' as TimeDimension },
  { label: '年', value: 'year' as TimeDimension },
]

// 容器样式
const containerStyle = computed(() => ({
  width: props.width,
}))

// 图表高度
const chartHeight = computed(() => {
  // 如果有标题或工具栏，减少图表高度
  const hasHeader = props.title || props.showToolbar
  const headerHeight = hasHeader ? 50 : 0
  const heightValue = parseInt(props.height)
  return `${heightValue - headerHeight}px`
})

// 是否为空数据
const isEmptyData = computed(() => {
  return !props.data.dates?.length || !props.data.series?.length ||
    props.data.series.every(s => !s.data?.length)
})

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
]

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

// 数据缩放配置
const getDataZoomConfig = (): object[] | undefined => {
  if (!props.enableZoom || props.zoomType === 'none') {
    return undefined
  }

  const configs: object[] = []

  if (props.zoomType === 'slider' || props.zoomType === 'both') {
    configs.push({
      type: 'slider',
      show: true,
      xAxisIndex: [0],
      start: 0,
      end: 100,
      height: 20,
      bottom: 10,
      borderColor: 'rgba(0, 212, 255, 0.2)',
      fillerColor: 'rgba(0, 212, 255, 0.2)',
      handleStyle: {
        color: '#00d4ff',
      },
      textStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
      },
    })
  }

  if (props.zoomType === 'inside' || props.zoomType === 'both') {
    configs.push({
      type: 'inside',
      xAxisIndex: [0],
      start: 0,
      end: 100,
    })
  }

  return configs
}

// 图例配置
const getLegendConfig = () => {
  const config: any = {
    show: props.showLegend,
    textStyle: { color: 'rgba(255, 255, 255, 0.8)' },
  }

  switch (props.legendPosition) {
    case 'top':
      config.top = 0
      break
    case 'bottom':
      config.bottom = 0
      break
    case 'left':
      config.left = 0
      config.orient = 'vertical'
      break
    case 'right':
      config.right = 0
      config.orient = 'vertical'
      break
  }

  return config
}

// 图表配置
const chartOption = computed<EChartsOption>(() => {
  const isArea = props.chartType === 'area' || props.showArea

  const seriesConfig: LineSeriesOption[] = props.data.series.map((s, index) => {
    const color = s.color || defaultColors[index % defaultColors.length]
    const isSmooth = s.smooth !== undefined ? s.smooth : props.smooth
    const showArea = s.areaStyle !== undefined ? !!s.areaStyle : isArea

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

  return {
    tooltip: props.showTooltip
      ? {
          trigger: props.tooltipTrigger,
          axisPointer: { type: 'cross' },
          formatter: props.tooltipFormatter,
        }
      : undefined,
    legend: getLegendConfig(),
    grid: props.showGrid
      ? {
          left: '3%',
          right: '4%',
          bottom: props.enableZoom && props.zoomType !== 'none' ? '15%' : '3%',
          top: props.showLegend ? '12%' : '8%',
          containLabel: true,
          ...props.gridConfig,
        }
      : undefined,
    xAxis: {
      type: 'category' as const,
      data: props.data.dates,
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
    dataZoom: getDataZoomConfig(),
    series: seriesConfig,
  }
})

// 处理时间维度切换
const handleTimeDimensionChange = (dimension: TimeDimension) => {
  currentTimeDimension.value = dimension
  emit('time-dimension-change', dimension)
}

// 处理图表点击
const handleChartClick = (params: object) => {
  emit('chart-click', params)
}

// 处理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 处理下载
const handleDownload = () => {
  emit('download')
}

// 处理调整大小
const handleResize = () => {
  baseChartRef.value?.resize()
}

// 监听默认时间维度变化
watch(() => props.defaultTimeDimension, (newVal) => {
  currentTimeDimension.value = newVal
})

// 暴露方法
defineExpose({
  chartInstance: computed(() => baseChartRef.value?.chartInstance),
  resize: handleResize,
  updateChart: () => baseChartRef.value?.updateChart(),
  getOption: () => baseChartRef.value?.getOption(),
  clear: () => baseChartRef.value?.clear(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatchAction: (payload: any) => baseChartRef.value?.dispatchAction(payload),
})
</script>

<style scoped lang="scss">
.trend-chart {
  position: relative;
  width: 100%;
  background: var(--tech-card-bg, rgba(13, 33, 55, 0.8));
  border: 1px solid var(--tech-border, rgba(0, 212, 255, 0.2));
  border-radius: 8px;
  padding: 16px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--tech-text-primary, #ffffff);
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__time-selector {
    display: flex;
    gap: 4px;
    background: var(--tech-input-bg, rgba(0, 212, 255, 0.1));
    border-radius: 4px;
    padding: 2px;
  }

  .time-dimension-tab {
    padding: 4px 12px;
    font-size: 12px;
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.6));
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      color: var(--tech-text-primary, #ffffff);
    }

    &.is-active {
      color: var(--tech-cyan, #00d4ff);
      background: var(--tech-active-bg, rgba(0, 212, 255, 0.2));
    }
  }

  &__refresh,
  &__download {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.6));
    background: transparent;
    border: 1px solid var(--tech-border, rgba(0, 212, 255, 0.2));
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      color: var(--tech-cyan, #00d4ff);
      border-color: var(--tech-cyan, #00d4ff);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__container {
    position: relative;
    min-height: 200px;
  }

  &__chart {
    width: 100%;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
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
    border-radius: 8px;

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
