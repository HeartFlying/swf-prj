<template>
  <div class="comparison-chart" :class="{ 'is-loading': loading }">
    <!-- 标题栏 -->
    <div v-if="title || showToolbar || showRefresh || showDownload" class="comparison-chart__header">
      <h3 v-if="title" class="comparison-chart__title">{{ title }}</h3>

      <!-- 工具栏 -->
      <div v-if="showToolbar || showRefresh || showDownload" class="comparison-chart__toolbar">
        <!-- 刷新按钮 -->
        <button
          v-if="showRefresh"
          class="comparison-chart__refresh"
          :disabled="loading"
          @click="handleRefresh"
        >
          <el-icon><Refresh /></el-icon>
        </button>

        <!-- 下载按钮 -->
        <button
          v-if="showDownload"
          class="comparison-chart__download"
          @click="handleDownload"
        >
          <el-icon><Download /></el-icon>
        </button>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="comparison-chart__container" :style="containerStyle">
      <div v-if="isEmptyData" class="comparison-chart__empty">
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
    <div v-if="loading" class="comparison-chart__loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Refresh, Download } from '@element-plus/icons-vue'
import BaseChart from './BaseChart.vue'
import type { EChartsOption, BarSeriesOption } from 'echarts'

// 图例位置
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right'

// 数据标签位置
export type LabelPosition = 'top' | 'inside' | 'insideTop' | 'insideBottom'

// 数据系列接口
export interface ComparisonChartSeries {
  name: string
  data: number[]
  color?: string
  itemStyle?: object
  emphasis?: object
}

// 数据接口
export interface ComparisonChartData {
  categories: string[]
  series: ComparisonChartSeries[]
}

// 组件属性
export interface ComparisonChartProps {
  // 基础配置
  title?: string
  width?: string
  height?: string
  loading?: boolean
  autoResize?: boolean
  theme?: string | object

  // 数据配置
  data: ComparisonChartData

  // 图表配置
  barWidth?: number | string
  barGap?: string
  barCategoryGap?: string
  borderRadius?: number | number[]

  // 分组/堆叠配置
  stackMode?: boolean
  stackName?: string

  // 数据标签配置
  showLabel?: boolean
  labelPosition?: LabelPosition
  labelFormatter?: (params: any) => string

  // 图例配置
  showLegend?: boolean
  legendPosition?: LegendPosition

  // 提示框配置
  showTooltip?: boolean
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

  // 工具栏配置
  showToolbar?: boolean
  showRefresh?: boolean
  showDownload?: boolean
}

const props = withDefaults(defineProps<ComparisonChartProps>(), {
  width: '100%',
  height: '300px',
  loading: false,
  autoResize: true,
  theme: 'dark',
  barWidth: undefined,
  barGap: undefined,
  barCategoryGap: undefined,
  borderRadius: undefined,
  stackMode: false,
  stackName: 'total',
  showLabel: false,
  labelPosition: 'top',
  showLegend: true,
  legendPosition: 'top',
  showTooltip: true,
  showGrid: true,
  enableZoom: true,
  showToolbar: false,
  showRefresh: false,
  showDownload: false,
})

const emit = defineEmits<{
  'chart-click': [params: object]
  'refresh': []
  'download': []
}>()

const baseChartRef = ref<InstanceType<typeof BaseChart>>()

// 容器样式
const containerStyle = computed(() => ({
  width: props.width,
}))

// 图表高度
const chartHeight = computed(() => {
  return props.height
})

// 是否为空数据
const isEmptyData = computed(() => {
  return (
    !props.data ||
    !props.data.categories?.length ||
    !props.data.series?.length ||
    props.data.series.every((s) => !s.data?.length)
  )
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

// 数据缩放配置
const getDataZoomConfig = (): object[] | undefined => {
  // 只有数据量大于10时才启用数据缩放
  if (!props.enableZoom || props.data.categories.length <= 10) {
    return undefined
  }

  return [
    {
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
    },
    {
      type: 'inside',
      xAxisIndex: [0],
      start: 0,
      end: 100,
    },
  ]
}

// 图表配置
const chartOption = computed<EChartsOption>(() => {
  const seriesConfig: BarSeriesOption[] = props.data.series.map((s, index) => {
    const color = s.color || defaultColors[index % defaultColors.length]

    return {
      name: s.name,
      type: 'bar' as const,
      data: s.data,
      stack: props.stackMode ? props.stackName : undefined,
      barWidth: props.barWidth,
      barGap: props.barGap,
      barCategoryGap: props.barCategoryGap,
      itemStyle: {
        color,
        borderRadius: props.borderRadius,
        ...s.itemStyle,
      },
      label: {
        show: props.showLabel,
        position: props.labelPosition,
        formatter: props.labelFormatter,
      },
      emphasis: {
        focus: 'series',
        ...s.emphasis,
      },
    }
  })

  return {
    tooltip: props.showTooltip
      ? {
          trigger: 'axis' as const,
          axisPointer: { type: 'shadow' as const },
          formatter: props.tooltipFormatter,
        }
      : undefined,
    legend: getLegendConfig(),
    grid: props.showGrid
      ? {
          left: '3%',
          right: '4%',
          bottom: props.enableZoom && props.data.categories.length > 10 ? '15%' : '3%',
          top: props.showLegend ? '12%' : '8%',
          containLabel: true,
          ...props.gridConfig,
        }
      : undefined,
    xAxis: {
      type: 'category' as const,
      data: props.data.categories,
      name: props.xAxisName,
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
.comparison-chart {
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
