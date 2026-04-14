<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh, Loading, Calendar } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { useChartResize } from '@/composables/useChartResize'

// ==================== 类型定义 ====================

export interface ActivityDataItem {
  /** 日期，格式：YYYY-MM-DD */
  date: string
  /** 提交次数 */
  commits: number
  /** 代码量（行） */
  codeLines: number
  /** Token使用量 */
  tokens: number
}

export type TimeRange = '3months' | '6months' | '1year'
export type ColorTheme = 'green' | 'blue' | 'orange' | 'purple'

export interface ActivityHeatmapProps {
  /** 图表标题 */
  title?: string
  /** 活跃度数据 */
  data: ActivityDataItem[]
  /** 加载状态 */
  loading?: boolean
  /** 图表高度 */
  height?: string
  /** 时间范围 */
  timeRange?: TimeRange
  /** 颜色主题 */
  colorTheme?: ColorTheme
  /** 是否显示统计信息 */
  showStats?: boolean
}

// ==================== Props 和 Emits ====================

const props = withDefaults(defineProps<ActivityHeatmapProps>(), {
  title: '活跃度热力图',
  loading: false,
  height: '280px',
  timeRange: '6months',
  colorTheme: 'green',
  showStats: true,
})

const emit = defineEmits<{
  /** 时间范围切换事件 */
  (e: 'time-range-change', range: TimeRange): void
  /** 颜色主题切换事件 */
  (e: 'theme-change', theme: ColorTheme): void
  /** 日期点击事件 */
  (e: 'date-click', date: string, data: ActivityDataItem): void
  /** 刷新事件 */
  (e: 'refresh'): void
}>()

// ==================== Refs ====================

const chartRef = ref<HTMLElement>()
const heatmapContainer = ref<HTMLElement>()
const chartInstance = ref<ECharts | null>(null)
const currentTimeRange = ref<TimeRange>(props.timeRange)
const currentColorTheme = ref<ColorTheme>(props.colorTheme)

// 使用组合式函数获取安全的 resize 处理函数
const { handleResize } = useChartResize(chartInstance, { componentName: 'ActivityHeatmap' })

// ==================== 常量定义 ====================

const timeRangeOptions = [
  { label: '最近3个月', value: '3months' as TimeRange },
  { label: '最近6个月', value: '6months' as TimeRange },
  { label: '最近1年', value: '1year' as TimeRange },
]

const colorThemeOptions: Array<{ label: string; value: ColorTheme; colors: string[] }> = [
  { label: '翠绿', value: 'green', colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] },
  { label: '海蓝', value: 'blue', colors: ['#ebedf0', '#a8d5ff', '#58a6ff', '#0969da', '#0544a1'] },
  { label: '橙黄', value: 'orange', colors: ['#ebedf0', '#ffd4a3', '#ff9f43', '#e86e17', '#a0440e'] },
  { label: '紫罗兰', value: 'purple', colors: ['#ebedf0', '#d4a5ff', '#a855f7', '#7c3aed', '#5b21b6'] },
]

// ==================== 计算属性 ====================

const isEmpty = computed(() => !props.data || props.data.length === 0)

const chartStyle = computed(() => ({
  height: props.height,
}))

/** 当前主题颜色 */
const currentColors = computed((): string[] => {
  const theme = colorThemeOptions.find(t => t.value === currentColorTheme.value)
  return theme?.colors ?? ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
})

/** 过滤后的数据（根据时间范围） */
const filteredData = computed(() => {
  if (!props.data || props.data.length === 0) return []

  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(endDate)

  switch (currentTimeRange.value) {
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3)
      break
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6)
      break
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
  }

  return props.data.filter(item => {
    const itemDate = new Date(item.date)
    return itemDate >= startDate && itemDate <= endDate
  })
})

/** 处理后的热力图数据 [日期, 活跃度值] */
const heatmapData = computed(() => {
  return filteredData.value.map(item => {
    // 活跃度值 = 提交次数 + 代码量/100 + Token使用量/1000
    const activityValue = item.commits + item.codeLines / 100 + item.tokens / 1000
    return [item.date, Math.round(activityValue * 10) / 10]
  })
})

/** 数据最大值 */
const maxValue = computed(() => {
  if (heatmapData.value.length === 0) return 10
  const max = Math.max(...heatmapData.value.map(d => d[1] as number))
  return Math.max(max, 10)
})

/** 总提交数 */
const totalCommits = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + (item.commits || 0), 0)
})

/** 总代码量 */
const totalCodeLines = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + (item.codeLines || 0), 0)
})

/** 总Token使用量 */
const totalTokens = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + (item.tokens || 0), 0)
})

/** 活跃天数 */
const activeDays = computed(() => {
  return filteredData.value.filter(item =>
    item.commits > 0 || item.codeLines > 0 || item.tokens > 0
  ).length
})

/** 平均活跃度 */
const averageActivity = computed(() => {
  if (filteredData.value.length === 0) return 0
  const total = heatmapData.value.reduce((sum, d) => sum + (d[1] as number), 0)
  return Math.round((total / filteredData.value.length) * 10) / 10
})

/** 获取日期对应的详细数据 */
const getDateData = (date: string): ActivityDataItem | undefined => {
  return filteredData.value.find(item => item.date === date)
}

// ==================== ECharts 配置 ====================

const getCalendarRange = (): [string, string] => {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  const startDate = new Date(now)

  switch (currentTimeRange.value) {
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3)
      break
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6)
      break
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
  }

  return [startDate.toISOString().split('T')[0], endDate] as [string, string]
}

const getCalendarOption = (): any => {
  const [rangeStart, rangeEnd] = getCalendarRange()

  return {
    top: 40,
    left: 40,
    right: 20,
    bottom: 20,
    cellSize: ['auto', 18],
    range: [rangeStart, rangeEnd],
    itemStyle: {
      color: '#ebedf0',
      borderWidth: 2,
      borderColor: '#ffffff',
      borderRadius: 3,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: 'rgba(0, 0, 0, 0.05)',
        width: 2,
      },
    },
    yearLabel: {
      show: false,
    },
    dayLabel: {
      show: true,
      color: 'rgba(0, 0, 0, 0.6)',
      firstDay: 1,
      nameMap: ['日', '一', '二', '三', '四', '五', '六'],
    },
    monthLabel: {
      show: true,
      color: 'rgba(0, 0, 0, 0.6)',
      nameMap: 'cn',
    },
  }
}

const chartOption = computed((): EChartsOption => {
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#333333',
      },
      extraCssText: 'backdrop-filter: blur(10px); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
      formatter: (params: any) => {
        const [date, value] = params.data || []
        const dateData = getDateData(date)

        if (!dateData) {
          const dateObj = new Date(date)
          const dateStr = dateObj.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })
          return `
            <div style="padding: 8px 12px;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${dateStr}</div>
              <div style="color: #666; font-size: 12px;">无活动记录</div>
            </div>
          `
        }

        const dateObj = new Date(date)
        const dateStr = dateObj.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })

        return `
          <div style="padding: 8px 12px; min-width: 180px;">
            <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 8px;">${dateStr}</div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666;">提交次数</span>
                <span style="font-weight: 600; color: #0969da;">${dateData.commits} 次</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666;">代码量</span>
                <span style="font-weight: 600; color: #1a7f37;">${dateData.codeLines.toLocaleString()} 行</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666;">Token使用</span>
                <span style="font-weight: 600; color: #7c3aed;">${dateData.tokens.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px solid #eee;">
                <span style="color: #666;">活跃度</span>
                <span style="font-weight: 600; color: #333;">${value}</span>
              </div>
            </div>
          </div>
        `
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: maxValue.value,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: currentColors.value,
      },
    },
    calendar: getCalendarOption(),
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: heatmapData.value,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 1,
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
  const [date] = params.data || []
  if (date) {
    const dateData = getDateData(date)
    if (dateData) {
      emit('date-click', date, dateData)
    }
  }
}

const handleTimeRangeChange = (range: TimeRange) => {
  currentTimeRange.value = range
  emit('time-range-change', range)
  nextTick(() => {
    updateChart()
  })
}

const handleThemeChange = (theme: ColorTheme) => {
  currentColorTheme.value = theme
  emit('theme-change', theme)
  nextTick(() => {
    updateChart()
  })
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

watch(() => props.data, () => {
  nextTick(() => {
    updateChart()
  })
}, { deep: true })

watch(() => props.timeRange, (newRange) => {
  currentTimeRange.value = newRange
  nextTick(() => {
    updateChart()
  })
})

watch(() => props.colorTheme, (newTheme) => {
  currentColorTheme.value = newTheme
  nextTick(() => {
    updateChart()
  })
})

// ==================== 暴露方法 ====================

defineExpose({
  chartInstance,
  handleResize,
  currentTimeRange,
  currentColorTheme,
  filteredData,
  heatmapData,
  totalCommits,
  totalCodeLines,
  totalTokens,
  activeDays,
  averageActivity,
})
</script>

<template>
  <div
    ref="heatmapContainer"
    class="activity-heatmap"
    :class="{ 'is-loading': loading }"
  >
    <!-- 头部 -->
    <div class="activity-heatmap__header">
      <h3 class="activity-heatmap__title">{{ title }}</h3>

      <div class="activity-heatmap__controls">
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

        <!-- 主题切换 -->
        <div class="theme-selector">
          <button
            v-for="theme in colorThemeOptions"
            :key="theme.value"
            class="theme-button"
            :class="{ 'is-active': currentColorTheme === theme.value }"
            :style="{ background: theme.colors[3] }"
            :title="theme.label"
            @click="handleThemeChange(theme.value)"
          />
        </div>

        <!-- 刷新按钮 -->
        <button
          class="activity-heatmap__refresh"
          :disabled="loading"
          @click="handleRefresh"
        >
          <el-icon :size="16">
            <Refresh />
          </el-icon>
        </button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="activity-heatmap__body">
      <!-- 空数据提示 -->
      <div v-if="isEmpty" class="activity-heatmap__empty">
        <el-icon :size="48">
          <Calendar />
        </el-icon>
        <p>暂无活跃度数据</p>
      </div>

      <!-- 图表容器 -->
      <div
        v-else
        ref="chartRef"
        class="activity-heatmap__chart"
        :style="chartStyle"
      />

      <!-- 加载遮罩 -->
      <div v-if="loading" class="chart-loading-overlay">
        <div class="loading-spinner" />
        <span>加载中...</span>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="!isEmpty" class="activity-heatmap__legend">
      <span class="legend-label legend-label-low">低</span>
      <div
        class="legend-gradient"
        :style="{ background: `linear-gradient(to right, ${currentColors.join(', ')})` }"
      />
      <span class="legend-label legend-label-high">高</span>
    </div>

    <!-- 统计信息 -->
    <div v-if="showStats && !isEmpty" class="activity-heatmap__stats">
      <div class="stat-item">
        <span class="stat-item__label">总提交</span>
        <span class="stat-item__value">{{ totalCommits.toLocaleString() }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__label">代码量</span>
        <span class="stat-item__value">{{ totalCodeLines.toLocaleString() }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__label">Token使用</span>
        <span class="stat-item__value">{{ totalTokens.toLocaleString() }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__label">活跃天数</span>
        <span class="stat-item__value">{{ activeDays }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__label">日均活跃</span>
        <span class="stat-item__value">{{ averageActivity }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.activity-heatmap {
  position: relative;
  background: var(--tech-bg-card, rgba(13, 33, 55, 0.8)) !important;
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2)) !important;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &.is-loading {
    .activity-heatmap__body {
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
    flex-wrap: wrap;
  }

  .time-range-tabs {
    display: flex;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
    border-radius: 6px;
    padding: 3px;
    gap: 2px;
  }

  .time-range-tab {
    padding: 5px 12px;
    font-size: 12px;
    border: none;
    background: transparent;
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.25s ease;
    font-weight: 500;

    &:hover {
      color: var(--tech-text-primary, #ffffff) !important;
      background: rgba(0, 212, 255, 0.1);
    }

    &.is-active {
      background: rgba(0, 212, 255, 0.3);
      color: var(--tech-cyan, #00d4ff) !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  }

  .theme-selector {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
    border-radius: 6px;
  }

  .theme-button {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }

    &.is-active {
      border-color: var(--tech-cyan, #00d4ff) !important;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
    }
  }

  &__refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.3)) !important;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
    color: var(--tech-cyan, #00d4ff) !important;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.25s ease;

    &:hover:not(:disabled) {
      border-color: var(--tech-cyan, #00d4ff) !important;
      color: var(--tech-cyan, #00d4ff) !important;
      background: rgba(0, 212, 255, 0.2) !important;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__body {
    position: relative;
    min-height: 200px;
    transition: opacity 0.3s ease;

    // 覆盖 Element Plus Skeleton 默认白色背景
    :deep(.el-skeleton) {
      background: transparent !important;

      .el-skeleton__item {
        background: linear-gradient(
          90deg,
          rgba(0, 212, 255, 0.1) 25%,
          rgba(0, 212, 255, 0.2) 37%,
          rgba(0, 212, 255, 0.1) 63%
        ) !important;
      }
    }

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

  &__chart {
    width: 100%;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 280px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
    gap: 12px;

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
    background: rgba(10, 25, 41, 0.85);
    backdrop-filter: blur(10px);
    color: var(--tech-cyan, #00d4ff) !important;
    font-size: 14px;
    border-radius: 8px;

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
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1)) !important;
  }

  .legend-label {
    font-size: 12px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
    font-weight: 500;

    &-low {
      opacity: 0.7;
    }

    &-high {
      opacity: 0.9;
    }
  }

  .legend-gradient {
    width: 120px;
    height: 10px;
    border-radius: 5px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &__stats {
    display: flex;
    justify-content: space-around;
    margin-top: 16px;
    padding: 16px;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.05)) !important;
    border-radius: 8px;
    flex-wrap: wrap;
    gap: 12px;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 80px;

      &__label {
        font-size: 12px;
        color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
        font-weight: 500;
      }

      &__value {
        font-size: 16px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff) !important;
        font-family: 'JetBrains Mono', Consolas, monospace;
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

// 响应式设计
@media (max-width: 768px) {
  .activity-heatmap {
    padding: 12px;

    &__header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__controls {
      width: 100%;
      justify-content: space-between;
    }

    .time-range-tabs {
      flex: 1;
    }

    .time-range-tab {
      flex: 1;
      text-align: center;
      padding: 6px 8px;
    }

    &__stats {
      gap: 16px;

      .stat-item {
        min-width: 60px;

        &__value {
          font-size: 14px;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .activity-heatmap {
    &__controls {
      flex-direction: column;
      align-items: stretch;
    }

    .time-range-tabs,
    .theme-selector {
      justify-content: center;
    }

    &__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;

      .stat-item {
        min-width: auto;
      }
    }
  }
}
</style>
