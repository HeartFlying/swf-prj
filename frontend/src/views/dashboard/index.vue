<!--
  Dashboard Page Component
  仪表盘页面组件

  @description 用户仪表盘页面，展示今日统计数据、提交趋势、Token使用趋势、语言分布和团队排行榜
  @author DevMetrics Team

  @example
  <DashboardPage />
-->
<template>
  <div class="dashboard-page" data-testid="dashboard-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">仪表盘</h1>
        <p class="page-subtitle">
          欢迎回来，{{ userStore.user?.username || '开发者' }}！这是您今日的数据概览。
        </p>
      </div>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="default"
          @change="handleDateChange"
        />
        <el-dropdown @command="handleExport">
          <tech-button
            variant="secondary"
            :icon="Download"
            :loading="exportLoading"
          >
            导出数据
          </tech-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="xlsx">导出为 Excel (.xlsx)</el-dropdown-item>
              <el-dropdown-item command="csv">导出为 CSV (.csv)</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <tech-button
          variant="primary"
          :icon="Refresh"
          :loading="statsStore.statsLoading"
          @click="refreshData"
        >
          刷新数据
        </tech-button>
      </div>
    </div>

    <!-- 数据卡片 -->
    <div class="stats-grid">
      <data-panel
        v-for="(stat, index) in todayStats"
        :key="index"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :icon-color="stat.iconColor"
        :icon-bg-color="stat.iconBgColor"
        :value-color="stat.valueColor"
        :trend="stat.trend"
        :prefix="stat.prefix"
        :suffix="stat.suffix"
        :clickable="true"
        @click="handleCardClick(stat)"
      />
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 提交趋势 -->
      <tech-card title="提交趋势" :icon="TrendCharts" class="chart-card" data-testid="chart-container">
        <tech-chart :option="commitTrendOption" height="30vh" :loading="statsStore.statsLoading" data-testid="commit-trend-chart" />
      </tech-card>

      <!-- Token使用趋势 -->
      <tech-card title="Token使用趋势" :icon="Coin" class="chart-card" data-testid="chart-container">
        <tech-chart :option="tokenTrendOption" height="30vh" :loading="statsStore.statsLoading" data-testid="token-trend-chart" />
      </tech-card>
    </div>

    <!-- 底部区域 -->
    <div class="bottom-grid">
      <!-- 语言分布 -->
      <tech-card title="代码语言分布" :icon="PieChart" class="bottom-card" data-testid="chart-container">
        <tech-chart :option="languageOption" height="25vh" :loading="statsStore.statsLoading" data-testid="language-distribution-chart" />
      </tech-card>

      <!-- 代码热力图 -->
      <tech-card title="代码贡献热力图" :icon="Calendar" class="bottom-card" data-testid="chart-container">
        <div class="heatmap-container" data-testid="heatmap-chart">
          <div v-for="(week, wIndex) in heatmapData" :key="wIndex" class="heatmap-week">
            <div
              v-for="(day, dIndex) in week"
              :key="dIndex"
              class="heatmap-day"
              :class="`level-${day.level}`"
              :title="`${day.date}: ${day.count} 次提交`"
            />
          </div>
          <div class="heatmap-legend">
            <span>少</span>
            <div class="legend-box level-0" />
            <div class="legend-box level-1" />
            <div class="legend-box level-2" />
            <div class="legend-box level-3" />
            <div class="legend-box level-4" />
            <span>多</span>
          </div>
        </div>
      </tech-card>

      <!-- 排行榜 -->
      <tech-card title="团队排行榜" :icon="Trophy" class="bottom-card">
        <div class="ranking-list">
          <div
            v-for="(user, index) in rankingList"
            :key="user.id"
            class="ranking-item"
            :class="{ 'top-three': index < 3 }"
          >
            <div class="rank-number">{{ index + 1 }}</div>
            <div class="user-info">
              <div class="user-avatar">{{ user.name.slice(0, 2) }}</div>
              <span class="user-name" data-testid="leaderboard-username">{{ user.name }}</span>
            </div>
            <div class="user-score">{{ (user.score ?? 0).toLocaleString() }}</div>
          </div>
        </div>
      </tech-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Dashboard Page Logic
 * 仪表盘页面逻辑
 *
 * @description 处理仪表盘数据展示、图表配置和数据刷新逻辑
 */
import { ref, computed, onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Refresh,
  TrendCharts,
  Coin,
  PieChart,
  Calendar,
  Trophy,
  DocumentChecked,
  EditPen,
  Delete,
  Grid,
  Timer,
  Download,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useStatsStore } from '@/stores/stats'
import TechCard from '@/components/tech/TechCard.vue'
import TechButton from '@/components/tech/TechButton.vue'
import TechChart from '@/components/tech/TechChart.vue'
import DataPanel from '@/components/tech/DataPanel.vue'
import { exportDashboardStats, type ExportFormat } from '@/utils/export'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { ElMessage } from 'element-plus'

const _router = useRouter()
const userStore = useUserStore()
const statsStore = useStatsStore()

/** 日期范围选择值 */
const dateRange = ref<[Date, Date] | null>(null)

/** 导出加载状态 */
const exportLoading = ref(false)

/**
 * 统计数据项接口
 * @interface StatItem
 */
interface StatItem {
  /** 统计项标签 */
  label: string
  /** 统计值 */
  value: number
  /** 图标组件 */
  icon: Component
  /** 图标颜色 */
  iconColor: string
  /** 图标背景色 */
  iconBgColor: string
  /** 数值颜色 */
  valueColor: string
  /** 趋势值（百分比） */
  trend?: number
  /** 数值前缀 */
  prefix?: string
  /** 数值后缀 */
  suffix?: string
}

/**
 * 今日统计数据
 * @returns {StatItem[]} 统计数据数组
 */
const todayStats = computed((): StatItem[] => [
  {
    label: '今日提交',
    value: statsStore.todayStats.commits || 0,
    icon: DocumentChecked,
    iconColor: '#00d4ff',
    iconBgColor: 'rgba(0, 212, 255, 0.1)',
    valueColor: '#00d4ff',
    trend: 12.5,
  },
  {
    label: '新增代码',
    value: statsStore.todayStats.additions || 0,
    icon: EditPen,
    iconColor: '#00ff88',
    iconBgColor: 'rgba(0, 255, 136, 0.1)',
    valueColor: '#00ff88',
    suffix: '行',
    trend: 8.3,
  },
  {
    label: '删除代码',
    value: statsStore.todayStats.deletions || 0,
    icon: Delete,
    iconColor: '#ff006e',
    iconBgColor: 'rgba(255, 0, 110, 0.1)',
    valueColor: '#ff006e',
    suffix: '行',
    trend: -5.2,
  },
  {
    label: 'Token使用',
    value: statsStore.todayStats.tokens || 0,
    icon: Coin,
    iconColor: '#ff9500',
    iconBgColor: 'rgba(255, 149, 0, 0.1)',
    valueColor: '#ff9500',
    trend: 23.1,
  },
  {
    label: '活跃项目',
    value: userStore.userProjects?.length || 0,
    icon: Grid,
    iconColor: '#9d4edd',
    iconBgColor: 'rgba(157, 78, 221, 0.1)',
    valueColor: '#9d4edd',
    suffix: '个',
  },
  {
    label: '编码时长',
    value: statsStore.todayStats.sessions || 0,
    icon: Timer,
    iconColor: '#00b4d8',
    iconBgColor: 'rgba(0, 180, 216, 0.1)',
    valueColor: '#00b4d8',
    suffix: '小时',
    trend: 15.4,
  },
])

/**
 * 提交趋势图配置
 * @returns {EChartsOption} ECharts配置对象
 */
const commitTrendOption = computed<EChartsOption>(() => {
  const trend = statsStore.weeklyTrend
  const hasData = trend?.dates?.length > 0 && trend?.commits?.length > 0

  const data = hasData ? trend : {
    dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    commits: [0, 0, 0, 0, 0, 0, 0],
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.1)' } },
    },
    series: [
      {
        name: '提交数',
        type: 'bar',
        data: data.commits,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00d4ff' },
            { offset: 1, color: 'rgba(0, 212, 255, 0.1)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: '#66e5ff',
          },
        },
      },
    ],
  }
})

/**
 * Token使用趋势图配置
 * @returns {EChartsOption} ECharts配置对象
 */
const tokenTrendOption = computed<EChartsOption>(() => {
  const trend = statsStore.weeklyTrend
  const hasData = trend?.dates?.length > 0 && trend?.tokens?.length > 0

  const data = hasData ? trend : {
    dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    tokens: [0, 0, 0, 0, 0, 0, 0],
  }

  return {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        formatter: (value: number) =>
          value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value),
      },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.1)' } },
    },
    series: [
      {
        name: 'Token使用量',
        type: 'line',
        smooth: true,
        data: data.tokens,
        lineStyle: {
          color: '#ff9500',
          width: 3,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 149, 0, 0.3)' },
            { offset: 1, color: 'rgba(255, 149, 0, 0)' },
          ]),
        },
        itemStyle: {
          color: '#ff9500',
        },
      },
    ],
  }
})

/**
 * 语言分布图配置
 * @returns {EChartsOption} ECharts配置对象
 */
const languageOption = computed<EChartsOption>(() => {
  const data =
    statsStore.languageStats.length > 0
      ? statsStore.languageStats
      : [{ language: '暂无数据', lines: 0, percentage: 100 }]

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: 'rgba(255, 255, 255, 0.8)' },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#0a1929',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#fff',
          },
        },
        data: data.map(item => ({
          name: item.language,
          value: item.percentage,
        })),
      },
    ],
  }
})

/**
 * 热力图数据 - 从API获取
 * @returns {Array} 格式化的热力图数据
 */
const heatmapData = computed(() => {
  // 将一维数组转换为二维（每周7天）
  const days = statsStore.heatmapData || []
  const weeks: (typeof days)[] = []
  let currentWeek: typeof days = []

  days.forEach((day, index) => {
    currentWeek.push(day)
    if (currentWeek.length === 7 || index === days.length - 1) {
      weeks.push([...currentWeek])
      currentWeek = []
    }
  })

  return weeks
})

/**
 * 排行榜数据 - 从API获取
 * @returns {Array} 排行榜数据
 */
const rankingList = computed(() => statsStore.globalRanking)

/**
 * 处理数据卡片点击
 * @param {StatItem} stat - 点击的统计项
 */
const handleCardClick = (stat: (typeof todayStats.value)[0]) => {
  console.log('Card clicked:', stat.label)
}

/**
 * 处理日期范围变化
 */
const handleDateChange = () => {
  refreshData()
}

/**
 * 刷新数据
 */
const refreshData = () => {
  statsStore.fetchPersonalDashboard()
  statsStore.fetchGlobalRanking()
}

/**
 * 组件挂载时获取数据
 */
onMounted(() => {
  statsStore.fetchPersonalDashboard()
  statsStore.fetchGlobalRanking()
  userStore.fetchUserProjects()
})

/**
 * 处理导出命令
 * @param {ExportFormat} format - 导出格式
 */
const handleExport = async (format: ExportFormat) => {
  if (exportLoading.value) return

  exportLoading.value = true
  try {
    // 准备今日统计数据
    const todayStatsData = todayStats.value.map(stat => ({
      label: stat.label,
      value: stat.value,
      trend: stat.trend ?? 0,
    }))

    // 准备周趋势数据
    const weeklyData = statsStore.weeklyTrend
    const weeklyTrendData = weeklyData.dates.map((date, index) => ({
      date,
      commits: weeklyData.commits[index] || 0,
      tokens: weeklyData.tokens[index] || 0,
    }))

    // 准备语言统计数据
    const languageStatsData = statsStore.languageStats.map(item => ({
      language: item.language,
      lines: item.lines,
      percentage: item.percentage,
    }))

    // 准备排行榜数据
    const rankingListData = rankingList.value.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      department: user.department || '-',
      score: user.score,
    }))

    // 执行导出
    exportDashboardStats({
      todayStats: todayStatsData,
      weeklyTrend: weeklyTrendData,
      languageStats: languageStatsData,
      rankingList: rankingListData,
      format,
      dateRange: dateRange.value,
    })

    ElMessage.success(`统计数据已成功导出为 ${format.toUpperCase()} 格式`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  } finally {
    exportLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.dashboard-page {
  padding-bottom: 24px;

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    .header-content {
      .page-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--tech-text-primary);
        margin: 0 0 8px;
        font-family: var(--tech-font-chinese);

        // XS 断点: 减小字体
        @media (max-width: 575px) {
          font-size: 18px;
        }
      }

      .page-subtitle {
        font-size: 14px;
        color: var(--tech-text-muted);
        margin: 0;

        // XS 断点: 隐藏副标题
        @media (max-width: 575px) {
          display: none;
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;

      // XS/SM 断点: 垂直堆叠
      @media (max-width: 767px) {
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
      }
    }

    // XS/SM 断点: 垂直布局
    @media (max-width: 767px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 24px;

    // XS 断点: 1 列
    @media (max-width: 575px) {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    // SM 断点: 2 列
    @media (min-width: 576px) and (max-width: 767px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    // MD 断点: 2 列
    @media (min-width: 768px) and (max-width: 991px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;

    .chart-card {
      min-height: 400px;

      // XS/SM 断点: 减小最小高度
      @media (max-width: 767px) {
        min-height: 300px;
      }
    }

    // XS/SM 断点: 1 列
    @media (max-width: 767px) {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 20px;

    .bottom-card {
      min-height: 340px;

      // XS/SM 断点: 减小最小高度
      @media (max-width: 767px) {
        min-height: 280px;
      }
    }

    // XS/SM/MD 断点: 1 列堆叠
    @media (max-width: 991px) {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    // LG 断点: 保持 3 列但调整比例
    @media (min-width: 992px) and (max-width: 1399px) {
      grid-template-columns: 1fr 1.5fr 1fr;
    }
  }

  .heatmap-container {
    padding: 16px;

    .heatmap-week {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;

      .heatmap-day {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        transition: all 0.2s ease;

        &.level-0 {
          background: rgba(0, 212, 255, 0.05);
        }

        &.level-1 {
          background: rgba(0, 212, 255, 0.2);
        }

        &.level-2 {
          background: rgba(0, 212, 255, 0.4);
        }

        &.level-3 {
          background: rgba(0, 212, 255, 0.6);
        }

        &.level-4 {
          background: rgba(0, 212, 255, 0.9);
        }

        &:hover {
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
        }
      }
    }

    .heatmap-legend {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 12px;
      font-size: 12px;
      color: var(--tech-text-muted);

      .legend-box {
        width: 14px;
        height: 14px;
        border-radius: 2px;
      }
    }
  }

  .ranking-list {
    .ranking-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--tech-border-secondary);
      transition: all 0.3s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(0, 212, 255, 0.05);
      }

      &.top-three {
        .rank-number {
          color: var(--tech-cyan);
          font-weight: 700;
        }
      }

      .rank-number {
        width: 24px;
        font-size: 14px;
        color: var(--tech-text-muted);
        font-family: var(--tech-font-mono);
      }

      .user-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;

        .user-avatar {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--tech-cyan), var(--tech-purple));
          color: white;
          font-size: 12px;
          font-weight: 600;
          border-radius: 50%;
        }

        .user-name {
          font-size: 14px;
          color: var(--tech-text-primary);
        }
      }

      .user-score {
        font-size: 14px;
        font-weight: 600;
        color: var(--tech-cyan);
        font-family: var(--tech-font-mono);
      }
    }
  }
}
</style>
