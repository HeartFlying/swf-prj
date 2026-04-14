<template>
  <div ref="heatmapContainer" class="activity-heatmap" :class="[themeClass, { 'is-loading': loading }]">
    <!-- 头部 -->
    <div class="activity-heatmap__header">
      <h3 class="activity-heatmap__title">{{ title }}</h3>
      <div class="activity-heatmap__controls">
        <!-- 年份选择器 -->
        <div class="activity-heatmap__year-selector">
          <button
            class="year-nav-button prev"
            :disabled="currentYear <= minYear"
            @click="handlePrevYear"
          >
            <el-icon><Arrow-Left /></el-icon>
          </button>
          <span class="current-year">{{ currentYear }}</span>
          <button
            class="year-nav-button next"
            :disabled="currentYear >= maxYear"
            @click="handleNextYear"
          >
            <el-icon><Arrow-Right /></el-icon>
          </button>
        </div>
        <!-- 刷新按钮 -->
        <button class="activity-heatmap__refresh" :disabled="loading" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
        </button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="activity-heatmap__body">
      <!-- 空数据提示 -->
      <div v-if="isEmpty" class="activity-heatmap__empty">
        <el-icon :size="48"><Calendar /></el-icon>
        <p>暂无活跃度数据</p>
      </div>

      <!-- 图表容器 -->
      <div v-else ref="chartRef" class="activity-heatmap__chart" :style="chartStyle" />

      <!-- 加载遮罩 -->
      <div v-if="loading" class="chart-loading-overlay">
        <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="!isEmpty" class="activity-heatmap__legend">
      <span class="legend-label legend-label-low">低</span>
      <div class="legend-gradient" />
      <span class="legend-label legend-label-high">高</span>
    </div>

    <!-- 统计信息 -->
    <div v-if="showStats && !isEmpty" class="activity-heatmap__stats">
      <div class="stat-item">
        <span class="stat-label">总提交数</span>
        <span class="stat-value">{{ formattedTotalCommits }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">活跃天数</span>
        <span class="stat-value">{{ activeDays }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">日均活跃度</span>
        <span class="stat-value">{{ formattedAverageActivity }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { ArrowLeft, ArrowRight, Refresh, Loading, Calendar } from '@element-plus/icons-vue'
import { useChartResize } from '@/composables/useChartResize'

// ==================== 类型定义 ====================

export interface ActivityData {
  /** 日期，格式：YYYY-MM-DD */
  date: string
  /** 活跃度计数 */
  count: number
  /** 活跃度等级：0-4 */
  level: 0 | 1 | 2 | 3 | 4
}

export interface ActivityHeatmapProps {
  /** 图表标题 */
  title?: string
  /** 活跃度数据 */
  data: ActivityData[]
  /** 可选年份列表 */
  years?: number[]
  /** 当前选中年份 */
  year?: number
  /** 是否显示加载状态 */
  loading?: boolean
  /** 图表高度 */
  height?: string
  /** 是否显示统计信息 */
  showStats?: boolean
  /** 主题 */
  theme?: 'dark' | 'light'
  /** 自定义颜色 */
  colors?: string[]
  /** 最小值 */
  minValue?: number
  /** 最大值 */
  maxValue?: number
}

// ==================== Props 和 Emits ====================

const props = withDefaults(defineProps<ActivityHeatmapProps>(), {
  title: '活跃度热力图',
  years: () => [2022, 2023, 2024, 2025],
  year: () => new Date().getFullYear(),
  loading: false,
  height: '200px',
  showStats: true,
  theme: 'dark',
  colors: () => ['#0e4429', '#006d32', '#26a641', '#39d353'],
  minValue: 0,
  maxValue: undefined,
})

const emit = defineEmits<{
  /** 年份切换事件 */
  (e: 'year-change', year: number): void
  /** 日期点击事件 */
  (e: 'date-click', date: string, count: number): void
  /** 刷新事件 */
  (e: 'refresh'): void
}>()

// ==================== Refs ====================

const chartRef = ref<HTMLElement>()
const heatmapContainer = ref<HTMLElement>()
const chartInstance = ref<ECharts | null>(null)
const currentYear = ref(props.year)

// 使用组合式函数获取安全的 resize 处理函数
const { handleResize } = useChartResize(chartInstance, { componentName: 'ActivityHeatmap' })

// ==================== 计算属性 ====================

const themeClass = computed(() => `theme-${props.theme}`)

const isEmpty = computed(() => !props.data || props.data.length === 0)

const chartStyle = computed(() => ({
  height: props.height,
}))

const minYear = computed(() => Math.min(...props.years))
const maxYear = computed(() => Math.max(...props.years))

/** 处理后的数据，用于 ECharts */
const processedData = computed(() => {
  return props.data.map(item => {
    // 确保日期格式正确
    const date = item.date
    // 确保计数非负
    const count = Math.max(0, item.count)
    return [date, count]
  })
})

/** 总提交数 */
const totalCommits = computed(() => {
  return props.data.reduce((sum, item) => sum + Math.max(0, item.count), 0)
})

/** 格式化后的总提交数 */
const formattedTotalCommits = computed(() => {
  return new Intl.NumberFormat('zh-CN').format(totalCommits.value)
})

/** 活跃天数（有提交的天数） */
const activeDays = computed(() => {
  return props.data.filter(item => item.count > 0).length
})

/** 平均活跃度 */
const averageActivity = computed(() => {
  if (props.data.length === 0) return 0
  return totalCommits.value / props.data.length
})

/** 格式化后的平均活跃度 */
const formattedAverageActivity = computed(() => {
  return averageActivity.value.toFixed(1)
})

/** 数据最大值 */
const dataMaxValue = computed(() => {
  if (props.maxValue !== undefined) return props.maxValue
  if (props.data.length === 0) return 100
  return Math.max(...props.data.map(item => item.count), 1)
})

// ==================== ECharts 配置 ====================

const getCalendarOption = (): EChartsOption => {
  const isDark = props.theme === 'dark'
  const textColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'
  const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  return {
    top: 30,
    left: 30,
    right: 30,
    bottom: 10,
    cellSize: ['auto', 16],
    range: String(currentYear.value),
    itemStyle: {
      color: isDark ? '#161b22' : '#ebedf0',
      borderWidth: 2,
      borderColor: isDark ? '#0d1117' : '#ffffff',
      borderRadius: 2,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: splitLineColor,
        width: 2,
      },
    },
    yearLabel: {
      show: false,
    },
    dayLabel: {
      show: true,
      color: textColor,
      firstDay: 1,
      nameMap: ['日', '一', '二', '三', '四', '五', '六'],
    },
    monthLabel: {
      show: true,
      color: textColor,
      nameMap: 'cn',
    },
  }
}

const chartOption = computed(() => {
  const isDark = props.theme === 'dark'
  const tooltipBg = isDark ? 'rgba(13, 33, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)'
  const tooltipBorder = isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'
  const tooltipText = isDark ? '#ffffff' : '#333333'

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: {
        color: tooltipText,
      },
      extraCssText: 'backdrop-filter: blur(10px); border-radius: 4px;',
      formatter: (params: any) => {
        const [date, count] = params.data || []
        const dateObj = new Date(date)
        const dateStr = dateObj.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })
        return `
          <div style="padding: 4px 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${dateStr}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${params.color};"></span>
              <span>活跃度: <strong>${count}</strong></span>
            </div>
          </div>
        `
      },
    },
    visualMap: {
      show: false,
      min: props.minValue,
      max: dataMaxValue.value,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: [isDark ? '#161b22' : '#ebedf0', ...props.colors],
      },
    },
    calendar: getCalendarOption(),
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: processedData.value,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }
})

// ==================== 方法 ====================

const initChart = () => {
  if (!chartRef.value || isEmpty.value) return

  chartInstance.value = echarts.init(chartRef.value, undefined, {
    renderer: 'canvas',
  })

  chartInstance.value.setOption(chartOption.value)

  // 绑定点击事件
  chartInstance.value.on('click', handleChartClick)

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

const updateChart = () => {
  if (chartInstance.value && !isEmpty.value) {
    chartInstance.value.setOption(chartOption.value, true)
  }
}

// 调整大小处理函数现在由 useChartResize 组合式函数提供

const handleChartClick = (params: any) => {
  const [date, count] = params.data || []
  if (date) {
    emit('date-click', date, count)
  }
}

const handlePrevYear = () => {
  if (currentYear.value > minYear.value) {
    const newYear = currentYear.value - 1
    currentYear.value = newYear
    emit('year-change', newYear)
  }
}

const handleNextYear = () => {
  if (currentYear.value < maxYear.value) {
    const newYear = currentYear.value + 1
    currentYear.value = newYear
    emit('year-change', newYear)
  }
}

const handleRefresh = () => {
  emit('refresh')
}

// ==================== 生命周期 ====================

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance.value?.off('click', handleChartClick)
  chartInstance.value?.dispose()
})

// ==================== Watchers ====================

watch(() => props.data, updateChart, { deep: true })
watch(() => props.year, (newYear) => {
  currentYear.value = newYear
  updateChart()
})
watch(() => props.theme, updateChart)

// ==================== 暴露方法 ====================

defineExpose({
  chartInstance,
  handleResize,
  currentYear,
  processedData,
  totalCommits,
  activeDays,
  averageActivity,
})
</script>

<style scoped lang="scss">
.activity-heatmap {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;

  // 暗色主题
  &.theme-dark {
    background: var(--tech-bg-card, #0d1117);
    border: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.2));

    .activity-heatmap__header {
      border-bottom-color: var(--tech-border-secondary, rgba(0, 212, 255, 0.2));
    }

    .activity-heatmap__title {
      color: var(--tech-text-primary, #ffffff);
    }

    .current-year {
      color: var(--tech-text-primary, #ffffff);
    }

    .activity-heatmap__stats {
      background: rgba(0, 0, 0, 0.2);
      border-top-color: var(--tech-border-secondary, rgba(0, 212, 255, 0.2));
    }

    .stat-label {
      color: var(--tech-text-secondary, rgba(255, 255, 255, 0.6));
    }

    .stat-value {
      color: var(--tech-cyan, #00d4ff);
    }

    .activity-heatmap__empty {
      color: var(--tech-text-secondary, rgba(255, 255, 255, 0.6));
    }
  }

  // 亮色主题
  &.theme-light {
    background: #ffffff;
    border: 1px solid #e5e7eb;

    .activity-heatmap__header {
      border-bottom-color: #e5e7eb;
    }

    .activity-heatmap__title {
      color: #1f2937;
    }

    .current-year {
      color: #1f2937;
    }

    .activity-heatmap__stats {
      background: #f9fafb;
      border-top-color: #e5e7eb;
    }

    .stat-label {
      color: #6b7280;
    }

    .stat-value {
      color: #059669;
    }

    .activity-heatmap__empty {
      color: #6b7280;
    }
  }

  // 加载状态
  &.is-loading {
    .activity-heatmap__body {
      opacity: 0.7;
    }
  }
}

.activity-heatmap__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid;
}

.activity-heatmap__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--tech-font-chinese, 'PingFang SC', 'Microsoft YaHei', sans-serif);
}

.activity-heatmap__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-heatmap__year-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 4px;
}

.year-nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(0, 212, 255, 0.2);
    color: var(--tech-cyan, #00d4ff);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.current-year {
  min-width: 60px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--tech-font-mono, 'JetBrains Mono', Consolas, monospace);
}

.activity-heatmap__refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 212, 255, 0.1);
  color: var(--tech-cyan, #00d4ff);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(0, 212, 255, 0.2);
    transform: rotate(180deg);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.activity-heatmap__body {
  position: relative;
  padding: 16px 20px;
  transition: opacity 0.3s ease;
}

.activity-heatmap__chart {
  width: 100%;
}

.activity-heatmap__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 20px;
  text-align: center;

  p {
    margin: 0;
    font-size: 14px;
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
  backdrop-filter: blur(4px);
  color: var(--tech-cyan, #00d4ff);
  font-size: 14px;
  z-index: 10;

  .loading-icon {
    animation: spin 1s linear infinite;
  }
}

.activity-heatmap__legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 12px;
}

.legend-label {
  font-size: 12px;
  opacity: 0.7;
}

.legend-gradient {
  width: 100px;
  height: 10px;
  border-radius: 2px;
  background: linear-gradient(to right, #161b22, #0e4429, #006d32, #26a641, #39d353);
}

.activity-heatmap__stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 20px;
  border-top: 1px solid;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  font-family: var(--tech-font-mono, 'JetBrains Mono', Consolas, monospace);
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
