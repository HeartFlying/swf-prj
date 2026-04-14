<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import LineChart from '@/components/charts/LineChart.vue'
import type { EChartsOption } from 'echarts'

export interface TokenUsageData {
  dates: string[]
  promptTokens: number[]
  completionTokens: number[]
}

export interface TokenUsageChartProps {
  /** 图表标题 */
  title?: string
  /** Token使用数据 */
  data: TokenUsageData
  /** 加载状态 */
  loading?: boolean
  /** 图表高度 */
  height?: string
  /** 时间范围 */
  timeRange?: 'day' | 'week' | 'month'
  /** 图表类型 */
  chartType?: 'line' | 'area'
}

const props = withDefaults(defineProps<TokenUsageChartProps>(), {
  title: 'Token使用统计',
  loading: false,
  height: '300px',
  timeRange: 'day',
  chartType: 'area',
})

const emit = defineEmits<{
  (e: 'time-range-change', value: 'day' | 'week' | 'month'): void
  (e: 'refresh'): void
}>()

// 当前选中的时间范围
const currentTimeRange = ref<'day' | 'week' | 'month'>(props.timeRange)

// 监听props变化
watch(
  () => props.timeRange,
  (newVal) => {
    currentTimeRange.value = newVal
  }
)

// 时间范围选项
const timeRangeOptions = [
  { label: '日', value: 'day' as const },
  { label: '周', value: 'week' as const },
  { label: '月', value: 'month' as const },
]

// 处理时间范围切换
const handleTimeRangeChange = (range: 'day' | 'week' | 'month') => {
  currentTimeRange.value = range
  emit('time-range-change', range)
}

// 处理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 格式化数字
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('zh-CN').format(num)
}

// 计算统计数据
const statistics = computed(() => {
  const promptTotal = props.data.promptTokens?.reduce((sum, val) => sum + (val || 0), 0) || 0
  const completionTotal = props.data.completionTokens?.reduce((sum, val) => sum + (val || 0), 0) || 0
  const total = promptTotal + completionTotal

  return {
    total,
    promptTotal,
    completionTotal,
  }
})

// 检查数据是否为空
const isEmptyData = computed(() => {
  return !props.data.dates?.length ||
    (!props.data.promptTokens?.length && !props.data.completionTokens?.length)
})

// 图表数据
const chartData = computed(() => {
  if (isEmptyData.value) {
    return {
      xAxis: [],
      series: [],
    }
  }

  const promptData = props.data.promptTokens || []
  const completionData = props.data.completionTokens || []

  return {
    xAxis: props.data.dates,
    series: [
      {
        name: 'Prompt Tokens',
        type: 'line',
        data: promptData,
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: '#00d4ff' },
        areaStyle: props.chartType === 'area' ? {} : undefined,
      },
      {
        name: 'Completion Tokens',
        type: 'line',
        data: completionData,
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: '#00ff88' },
        areaStyle: props.chartType === 'area' ? {} : undefined,
      },
    ],
  }
})

// 图表配置
const chartOption = computed<Partial<EChartsOption>>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#6a7985',
      },
    },
    formatter: (params: any) => {
      if (!Array.isArray(params) || params.length === 0) return ''

      let html = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`
      params.forEach((param: any) => {
        const color = param.color || param.itemStyle?.color || '#999'
        html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
          <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
          <span>${param.seriesName}: ${formatNumber(param.value)}</span>
        </div>`
      })
      return html
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '15%',
    containLabel: true,
  },
  legend: {
    show: true,
    top: 0,
    textStyle: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
  },
}))

// 图表引用
const lineChartRef = ref<InstanceType<typeof LineChart>>()

// 处理resize
const handleResize = () => {
  lineChartRef.value?.resize()
}

// 监听数据变化，自动更新图表
watch(
  () => props.data,
  () => {
    nextTick(() => {
      lineChartRef.value?.updateChart()
    })
  },
  { deep: true }
)

// ResizeObserver
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  // 设置ResizeObserver
  if (window.ResizeObserver) {
    const chartContainer = document.querySelector('.token-usage-chart__body')
    if (chartContainer) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(chartContainer)
    }
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// 暴露方法给父组件
defineExpose({
  handleResize,
  chartInstance: computed(() => lineChartRef.value?.chartInstance),
})
</script>

<template>
  <div class="token-usage-chart" :class="{ 'is-loading': loading }">
    <!-- 头部 -->
    <div class="token-usage-chart__header">
      <h3 class="token-usage-chart__title">{{ title }}</h3>

      <div class="token-usage-chart__controls">
        <!-- 时间范围切换 -->
        <div class="time-range-tabs">
          <button
            v-for="option in timeRangeOptions"
            :key="option.value"
            class="time-range-tab"
            :class="{ 'is-active': currentTimeRange === option.value }"
            @click="handleTimeRangeChange(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- 刷新按钮 -->
        <button
          class="token-usage-chart__refresh"
          :disabled="loading"
          @click="handleRefresh"
        >
          <ElIcon :size="16">
            <Refresh />
          </ElIcon>
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="token-usage-chart__stats">
      <div class="stat-item">
        <span class="stat-item__label">总计</span>
        <span class="stat-item__value">{{ formatNumber(statistics.total) }}</span>
      </div>
      <div class="stat-item stat-item--prompt">
        <span class="stat-item__dot" style="background: #00d4ff;"></span>
        <span class="stat-item__label">Prompt</span>
        <span class="stat-item__value">{{ formatNumber(statistics.promptTotal) }}</span>
      </div>
      <div class="stat-item stat-item--completion">
        <span class="stat-item__dot" style="background: #00ff88;"></span>
        <span class="stat-item__label">Completion</span>
        <span class="stat-item__value">{{ formatNumber(statistics.completionTotal) }}</span>
      </div>
    </div>

    <!-- 图表主体 -->
    <div class="token-usage-chart__body">
      <!-- 空数据提示 -->
      <div v-if="isEmptyData" class="token-usage-chart__empty">
        <ElEmpty description="暂无数据" />
      </div>

      <!-- 图表 -->
      <div
        v-else
        class="token-usage-chart__chart"
        :style="{ height }"
      >
        <LineChart
          ref="lineChartRef"
          :x-axis-data="chartData.xAxis"
          :series="chartData.series"
          :height="height"
          :show-legend="true"
          legend-position="top"
          :smooth="true"
          :show-area="chartType === 'area'"
          :area-opacity="0.3"
          :show-tooltip="true"
          tooltip-trigger="axis"
          theme="dark"
        />
      </div>

      <!-- 加载遮罩 -->
      <div v-if="loading" class="chart-loading-overlay">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 图例说明 -->
    <div class="token-usage-chart__legend">
      <div class="legend-item">
        <span class="legend-item__color" style="background: #00d4ff;"></span>
        <span class="legend-item__label">Prompt Tokens</span>
      </div>
      <div class="legend-item">
        <span class="legend-item__color" style="background: #00ff88;"></span>
        <span class="legend-item__label">Completion Tokens</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.token-usage-chart {
  position: relative;
  background: var(--tech-bg-card, rgba(13, 33, 55, 0.8)) !important;
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2)) !important;
  border-radius: 8px;
  padding: 16px;
  backdrop-filter: blur(10px);

  &.is-loading {
    .token-usage-chart__body {
      opacity: 0.7;
    }
  }

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
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff) !important;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .time-range-tabs {
    display: flex;
    background: rgba(0, 212, 255, 0.1);
    border-radius: 4px;
    padding: 2px;
  }

  .time-range-tab {
    padding: 4px 12px;
    font-size: 12px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.3s;

    &:hover {
      color: rgba(255, 255, 255, 0.9);
    }

    &.is-active {
      background: rgba(0, 212, 255, 0.3);
      color: #00d4ff;
    }
  }

  &__refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(0, 212, 255, 0.3);
    background: transparent;
    color: #00d4ff;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      background: rgba(0, 212, 255, 0.1);
      border-color: #00d4ff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__stats {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(0, 212, 255, 0.05);
    border-radius: 4px;
    flex-wrap: wrap;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;

      &__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      &__label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      &__value {
        font-size: 14px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff) !important;
        font-family: 'JetBrains Mono', monospace;
      }

      &--prompt .stat-item__value {
        color: #00d4ff;
      }

      &--completion .stat-item__value {
        color: #00ff88;
      }
    }
  }

  &__body {
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
    height: 300px;

    // 覆盖 Element Plus Empty 默认白色背景
    :deep(.el-empty) {
      background: transparent !important;

      .el-empty__description {
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
      }

      .el-empty__image {
        opacity: 0.6;
        filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.3));
      }
    }
  }

  .chart-loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(10, 25, 41, 0.8);
    backdrop-filter: blur(10px);
    color: var(--tech-cyan, #00d4ff) !important;
    font-size: 14px;
    border-radius: 4px;

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid rgba(0, 212, 255, 0.2);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  &__legend {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(0, 212, 255, 0.1);

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;

      &__color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      &__label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }
    }
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

@media (max-width: 768px) {
  .token-usage-chart {
    padding: 12px;

    &__header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__controls {
      width: 100%;
      justify-content: space-between;
    }

    &__stats {
      gap: 16px;
    }

    .time-range-tabs {
      flex: 1;
      justify-content: center;
    }
  }
}
</style>
