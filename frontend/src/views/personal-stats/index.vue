<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import StatsLayout from '@/components/stats/StatsLayout.vue'
import type { TimeRange, FilterValue, FilterConfig } from '@/components/stats/types'
import { getPersonalDashboard, getPersonalCodeStats, getPersonalTokenStats, getPersonalActivityHours } from '@/api/stats'
import { getProjects } from '@/api/project'

// 时间范围
const timeRange = ref<TimeRange>({
  preset: '30d',
  start: '',
  end: '',
})

// 筛选器配置
const filterConfigs = ref<FilterConfig[]>([
  {
    key: 'project',
    label: '项目',
    type: 'select',
    placeholder: '选择项目',
    clearable: true,
    options: [],
  },
])

// 加载项目列表到筛选器
const loadProjectsForFilter = async () => {
  try {
    const response = await getProjects({ pageSize: 100 })
    const projectFilter = filterConfigs.value.find(f => f.key === 'project')
    if (projectFilter) {
      projectFilter.options = response.items.map(p => ({
        label: p.name,
        value: p.id.toString(),
      }))
    }
  } catch (error) {
    console.error('加载项目列表失败', error)
  }
}

// 筛选值
const filterValue = ref<FilterValue>({
  project: undefined,
  language: undefined,
})

// 加载状态
const loading = ref(false)

// 概览数据
const overviewData = reactive({
  totalCommits: 0,
  commitGrowth: 0,
  totalLines: 0,
  additions: 0,
  deletions: 0,
  totalTokens: 0,
  avgTokensPerDay: '0',
  totalHours: 0,
  activeDays: 0,
})

// 语言统计
const languageStats = ref([
  { name: 'TypeScript', percent: 45, lines: 205560, color: '#3178c6' },
  { name: 'Python', percent: 25, lines: 114200, color: '#3776ab' },
  { name: 'Vue', percent: 15, lines: 68520, color: '#4fc08d' },
  { name: 'CSS/SCSS', percent: 10, lines: 45680, color: '#c6538c' },
  { name: '其他', percent: 5, lines: 22840, color: '#8b949e' },
])

// Token统计
const tokenStats = reactive({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
})

// 贡献热力图数据
const contributionData = ref<Array<Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }>>>([])
const heatmapTotal = ref(0)

const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// 活跃时段数据
const activityHours = ref<Array<{ hour: number; count: number }>>([])
const activityHoursLoading = ref(false)

// 加载活跃时段数据
const loadActivityHours = async () => {
  activityHoursLoading.value = true
  try {
    const data = await getPersonalActivityHours({
      startDate: timeRange.value.start || undefined,
      endDate: timeRange.value.end || undefined,
    })
    // 确保数据有24个小时，如果API返回的数据不完整则补充0
    const fullData = Array(24).fill(0).map((_, hour) => {
      const found = data.find(d => d.hour === hour)
      return { hour, count: found?.count || 0 }
    })
    activityHours.value = fullData
  } catch (error) {
    console.error('加载活跃时段数据失败', error)
    // 出错时显示空数据
    activityHours.value = Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }))
  } finally {
    activityHoursLoading.value = false
  }
}

// 计算活跃时段柱状图的最大值（用于归一化高度）
const maxActivityCount = computed(() => {
  if (activityHours.value.length === 0) return 1
  const max = Math.max(...activityHours.value.map(d => d.count))
  return max > 0 ? max : 1
})

// 加载个人统计数据
const loadPersonalStats = async () => {
  loading.value = true
  try {
    const [dashboard, codeStats, tokenStatsData] = await Promise.all([
      getPersonalDashboard({
        startDate: timeRange.value.start || undefined,
        endDate: timeRange.value.end || undefined,
      }),
      getPersonalCodeStats({
        startDate: timeRange.value.start || undefined,
        endDate: timeRange.value.end || undefined,
      }),
      getPersonalTokenStats({
        startDate: timeRange.value.start || undefined,
        endDate: timeRange.value.end || undefined,
      }),
    ])

    // 更新概览数据
    overviewData.totalCommits = codeStats.totalCommits || 0
    overviewData.totalLines = (codeStats.linesAdded || 0) + (codeStats.linesDeleted || 0)
    overviewData.additions = codeStats.linesAdded || 0
    overviewData.deletions = codeStats.linesDeleted || 0
    overviewData.totalTokens = tokenStatsData.totalTokens || 0
    overviewData.avgTokensPerDay = tokenStatsData.avgTokensPerDay?.toString() || '0'
    overviewData.activeDays = dashboard.heatmapData?.length || 0

    // 更新Token统计
    tokenStats.promptTokens = tokenStatsData.promptTokens || 0
    tokenStats.completionTokens = tokenStatsData.completionTokens || 0
    tokenStats.totalTokens = tokenStatsData.totalTokens || 0

    // 更新热力图数据
    if (dashboard.heatmapData) {
      // 转换热力图数据格式
      const weeks: Array<Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }>> = []
      let currentWeek: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = []
      let total = 0

      dashboard.heatmapData.forEach((day, index) => {
        total += day.count
        currentWeek.push({
          date: day.date,
          count: day.count,
          level: day.level,
        })

        if (currentWeek.length === 7) {
          weeks.push(currentWeek)
          currentWeek = []
        }
      })

      if (currentWeek.length > 0) {
        weeks.push(currentWeek)
      }

      contributionData.value = weeks
      heatmapTotal.value = total
    }
  } catch (error) {
    ElMessage.error('加载统计数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 事件处理
const handleTimeRangeChange = (range: TimeRange) => {
  timeRange.value = range
  refreshData()
}

const handleFilterChange = (value: FilterValue) => {
  filterValue.value = value
  refreshData()
}

const handleRefresh = () => {
  refreshData()
}

const refreshData = () => {
  loadPersonalStats()
  loadActivityHours()
}

const exportData = () => {
  console.log('Export data')
}

// 组件挂载时加载数据
onMounted(() => {
  loadProjectsForFilter()
  loadPersonalStats()
  loadActivityHours()
})
</script>

<template>
  <div class="personal-stats-page" data-testid="personal-stats-page">
    <StatsLayout
      title="个人统计"
      :loading="loading"
      :show-time-range="true"
      :show-filter="true"
      :show-refresh="true"
      :time-range="timeRange"
      :filter-value="filterValue"
      :filter-configs="filterConfigs"
      data-testid="stats-loading"
      @time-range-change="handleTimeRangeChange"
      @filter-change="handleFilterChange"
      @refresh="handleRefresh"
    >
      <!-- 概览卡片区域 -->
      <div class="overview-section" data-testid="overview-section">
        <div class="overview-card primary" data-testid="overview-card overview-card-commits">
          <div class="card-bg-icon">
            <ElIcon><DocumentChecked /></ElIcon>
          </div>
          <div class="card-content">
            <div class="card-label">总提交数</div>
            <div class="card-value" data-testid="card-value">{{ overviewData.totalCommits }}</div>
            <div class="card-trend up">
              <ElIcon><ArrowUp /></ElIcon>
              <span>+{{ overviewData.commitGrowth }}%</span>
            </div>
          </div>
        </div>

        <div class="overview-card success" data-testid="overview-card overview-card-lines">
          <div class="card-bg-icon">
            <ElIcon><EditPen /></ElIcon>
          </div>
          <div class="card-content">
            <div class="card-label">代码行数</div>
            <div class="card-value" data-testid="card-value">{{ overviewData.totalLines.toLocaleString() }}</div>
            <div class="card-meta" data-testid="card-meta">+{{ overviewData.additions.toLocaleString() }} / -{{ overviewData.deletions.toLocaleString() }}</div>
          </div>
        </div>

        <div class="overview-card warning" data-testid="overview-card overview-card-tokens">
          <div class="card-bg-icon">
            <ElIcon><Coin /></ElIcon>
          </div>
          <div class="card-content">
            <div class="card-label">Token使用</div>
            <div class="card-value" data-testid="card-value">{{ overviewData.totalTokens.toLocaleString() }}</div>
            <div class="card-meta" data-testid="card-meta">{{ overviewData.avgTokensPerDay }} / 天</div>
          </div>
        </div>

        <div class="overview-card purple" data-testid="overview-card overview-card-hours">
          <div class="card-bg-icon">
            <ElIcon><Timer /></ElIcon>
          </div>
          <div class="card-content">
            <div class="card-label">编码时长</div>
            <div class="card-value" data-testid="card-value">
              {{ overviewData.totalHours }}
              <span class="unit" data-testid="unit">h</span>
            </div>
            <div class="card-meta" data-testid="card-meta">{{ overviewData.activeDays }} 个活跃日</div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section" data-testid="charts-section">
        <!-- 贡献热力图 -->
        <div class="chart-card heatmap-card" data-testid="heatmap-card">
          <div class="chart-header">
            <h3 class="chart-title">代码贡献热力图</h3>
            <span class="chart-subtitle" data-testid="chart-subtitle">{{ heatmapTotal }} 次贡献在过去一年</span>
          </div>
          <div class="contribution-heatmap" data-testid="contribution-heatmap">
            <div class="heatmap-legend" data-testid="heatmap-legend">
              <span>少</span>
              <div
                v-for="i in 5"
                :key="i"
                class="legend-cell"
                :class="`level-${i - 1}`"
                :data-testid="`legend-cell legend-cell-level-${i - 1}`"
              />
              <span>多</span>
            </div>
            <div class="heatmap-grid" data-testid="heatmap-grid">
              <div class="month-labels" data-testid="month-labels">
                <span v-for="month in monthLabels" :key="month">{{ month }}</span>
              </div>
              <div class="weeks-container">
                <div v-for="(week, wIndex) in contributionData" :key="wIndex" class="heatmap-week">
                  <div
                    v-for="(day, dIndex) in week"
                    :key="dIndex"
                    class="heatmap-day"
                    :class="`level-${day.level}`"
                    data-testid="heatmap-day"
                    :title="day.date ? `${day.date}: ${day.count} 次贡献` : '无数据'"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 语言统计 -->
        <div class="chart-card language-card">
          <div class="chart-header">
            <h3 class="chart-title">语言统计</h3>
          </div>
          <div class="language-list" data-testid="language-list">
            <div
              v-for="lang in languageStats"
              :key="lang.name"
              class="language-item"
              data-testid="language-item"
            >
              <span class="lang-color" :style="{ background: lang.color }" data-testid="lang-color" />
              <span class="lang-name" data-testid="lang-name">{{ lang.name }}</span>
              <span class="lang-percent" data-testid="lang-percent">{{ lang.percent }}%</span>
              <span class="lang-lines" data-testid="lang-lines">{{ lang.lines.toLocaleString() }} 行</span>
            </div>
          </div>
        </div>

        <!-- Token使用详情 -->
        <div class="chart-card token-card">
          <div class="chart-header">
            <h3 class="chart-title">Token使用详情</h3>
          </div>
          <div class="token-stats" data-testid="token-stats">
            <div class="token-stat-item" data-testid="token-stat-item">
              <div class="stat-label">Prompt Tokens</div>
              <div class="stat-value" data-testid="stat-value">{{ tokenStats.promptTokens.toLocaleString() }}</div>
              <div class="stat-bar" data-testid="stat-bar">
                <div
                  class="stat-progress"
                  data-testid="stat-progress"
                  :style="{ width: `${(tokenStats.promptTokens / tokenStats.totalTokens) * 100}%` }"
                />
              </div>
            </div>
            <div class="token-stat-item" data-testid="token-stat-item">
              <div class="stat-label">Completion Tokens</div>
              <div class="stat-value" data-testid="stat-value">{{ tokenStats.completionTokens.toLocaleString() }}</div>
              <div class="stat-bar" data-testid="stat-bar">
                <div
                  class="stat-progress completion"
                  data-testid="stat-progress"
                  :style="{ width: `${(tokenStats.completionTokens / tokenStats.totalTokens) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 活跃时段 -->
        <div class="chart-card activity-card" data-testid="activity-card">
          <div class="chart-header">
            <h3 class="chart-title">活跃时段</h3>
          </div>
          <div class="activity-placeholder" data-testid="activity-placeholder">
            <div
              class="activity-bar"
              data-testid="activity-bar"
              v-for="data in activityHours"
              :key="data.hour"
              :style="{ height: `${(data.count / maxActivityCount) * 100}%` }"
              :title="`${data.hour}:00 - ${data.count} 次活动`"
            />
          </div>
        </div>
      </div>

      <!-- 导出按钮 -->
      <template #footer>
        <div class="page-footer">
          <ElButton type="primary" @click="exportData">
            <ElIcon><Download /></ElIcon>
            导出数据
          </ElButton>
        </div>
      </template>
    </StatsLayout>
  </div>
</template>

<style scoped lang="scss">
.personal-stats-page {
  .overview-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .overview-card {
    position: relative;
    padding: 20px;
    background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
    border-radius: var(--tech-border-radius, 8px);
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
    overflow: hidden;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--tech-glow-cyan, 0 0 20px rgba(0, 212, 255, 0.3));
      border-color: var(--tech-cyan, #00d4ff);
    }

    &.primary {
      border-color: rgba(0, 212, 255, 0.3);
      .card-bg-icon {
        color: rgba(0, 212, 255, 0.15);
      }
      .card-value {
        color: var(--tech-cyan, #00d4ff);
      }
    }

    &.success {
      border-color: rgba(0, 255, 136, 0.3);
      .card-bg-icon {
        color: rgba(0, 255, 136, 0.15);
      }
      .card-value {
        color: var(--tech-green, #00ff88);
      }
    }

    &.warning {
      border-color: rgba(255, 149, 0, 0.3);
      .card-bg-icon {
        color: rgba(255, 149, 0, 0.15);
      }
      .card-value {
        color: var(--tech-orange, #ff9500);
      }
    }

    &.purple {
      border-color: rgba(157, 78, 221, 0.3);
      .card-bg-icon {
        color: rgba(157, 78, 221, 0.15);
      }
      .card-value {
        color: var(--tech-purple, #9d4edd);
      }
    }

    .card-bg-icon {
      position: absolute;
      right: -10px;
      bottom: -10px;
      font-size: 80px;
      opacity: 0.5;
    }

    .card-content {
      position: relative;
      z-index: 1;

      .card-label {
        font-size: 14px;
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
        margin-bottom: 8px;
      }

      .card-value {
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 8px;

        .unit {
          font-size: 16px;
          margin-left: 4px;
          font-weight: 400;
        }
      }

      .card-trend {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;

        &.up {
          color: var(--tech-green, #00ff88);
        }

        &.down {
          color: var(--tech-red, #ff006e);
        }
      }

      .card-meta {
        font-size: 13px;
        color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
      }
    }
  }

  .charts-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;

    @media (max-width: 992px) {
      grid-template-columns: 1fr;
    }
  }

  .chart-card {
    background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
    border-radius: var(--tech-border-radius, 8px);
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
    padding: 16px;
    backdrop-filter: blur(10px);

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      .chart-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff);
      }

      .chart-subtitle {
        font-size: 13px;
        color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
      }
    }
  }

  .heatmap-card {
    grid-column: 1;
    grid-row: 1;

    @media (max-width: 992px) {
      grid-column: 1;
      grid-row: auto;
    }

    .contribution-heatmap {
      .heatmap-legend {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        font-size: 12px;
        color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
        margin-bottom: 12px;

        .legend-cell {
          width: 12px;
          height: 12px;
          border-radius: 2px;

          &.level-0 {
            background: #ebedf0;
          }
          &.level-1 {
            background: #9be9a8;
          }
          &.level-2 {
            background: #40c463;
          }
          &.level-3 {
            background: #30a14e;
          }
          &.level-4 {
            background: #216e39;
          }
        }
      }

      .heatmap-grid {
        .month-labels {
          display: flex;
          gap: 28px;
          margin-bottom: 8px;
          padding-left: 24px;
          font-size: 11px;
          color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
        }

        .weeks-container {
          display: flex;
          gap: 4px;
          overflow-x: auto;

          .heatmap-week {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .heatmap-day {
              width: 12px;
              height: 12px;
              border-radius: 2px;
              transition: all 0.2s ease;

              &.level-0 {
                background: #ebedf0;
              }
              &.level-1 {
                background: #9be9a8;
              }
              &.level-2 {
                background: #40c463;
              }
              &.level-3 {
                background: #30a14e;
              }
              &.level-4 {
                background: #216e39;
              }

              &:hover {
                transform: scale(1.3);
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
              }
            }
          }
        }
      }
    }
  }

  .language-card {
    grid-column: 2;
    grid-row: 1;

    @media (max-width: 992px) {
      grid-column: 1;
      grid-row: auto;
    }

    .language-list {
      .language-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        font-size: 13px;
        border-bottom: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));

        &:last-child {
          border-bottom: none;
        }

        .lang-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .lang-name {
          flex: 1;
          color: var(--tech-text-primary, #ffffff);
        }

        .lang-percent {
          width: 40px;
          color: var(--tech-cyan, #00d4ff);
          font-weight: 600;
        }

        .lang-lines {
          width: 100px;
          text-align: right;
          color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
        }
      }
    }
  }

  .token-card {
    grid-column: 1;
    grid-row: 2;

    @media (max-width: 992px) {
      grid-column: 1;
      grid-row: auto;
    }

    .token-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      .token-stat-item {
        .stat-label {
          font-size: 12px;
          color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: var(--tech-text-primary, #ffffff);
          margin-bottom: 8px;
        }

        .stat-bar {
          height: 4px;
          background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
          border-radius: 2px;
          overflow: hidden;

          .stat-progress {
            height: 100%;
            background: var(--tech-cyan, #00d4ff);
            border-radius: 2px;
            transition: width 0.5s ease;

            &.completion {
              background: var(--tech-green, #00ff88);
            }
          }
        }
      }
    }
  }

  .activity-card {
    grid-column: 2;
    grid-row: 2;

    @media (max-width: 992px) {
      grid-column: 1;
      grid-row: auto;
    }

    .activity-placeholder {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 200px;
      padding: 16px 0;

      .activity-bar {
        flex: 1;
        margin: 0 2px;
        background: var(--tech-cyan-alpha-30, rgba(0, 212, 255, 0.3));
        border-radius: 2px 2px 0 0;
        min-height: 4px;
        transition: all 0.3s ease;

        &:hover {
          background: var(--tech-cyan, #00d4ff);
        }
      }
    }
  }

  .page-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
  }
}
</style>
