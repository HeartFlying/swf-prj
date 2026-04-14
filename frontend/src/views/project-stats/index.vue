<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import StatsLayout from '@/components/stats/StatsLayout.vue'
import ProjectSelector from '@/components/ProjectSelector/ProjectSelector.vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import MemberContribution from '@/components/MemberContribution/MemberContribution.vue'
import type { TimeRange, FilterValue, FilterConfig } from '@/components/stats/types'
import type { EChartsOption } from 'echarts'
import type { IMemberContribution } from '@/components/MemberContribution/MemberContribution.vue'
// 项目选择器组件中的项目类型
interface IProjectSelectorItem {
  id: number | string
  name: string
  description?: string
  icon?: string
  avatar?: string
  disabled?: boolean
}

// 项目类型
interface IProjectExt {
  id: number
  name: string
  description?: string
  avatar?: string
}

// 项目统计卡片类型定义
interface IProjectStat {
  label: string
  value: number
  suffix?: string
  icon: typeof DocumentChecked
  color: 'primary' | 'success' | 'warning' | 'purple'
}

// 项目概览统计响应类型
interface IProjectOverviewStats {
  projectId: number
  projectName: string
  totalCommits: number
  totalTokens: number
  activeMembers: number
  bugCount: number
}

// 成员统计类型定义 - 使用新的 IMemberContribution 接口

// 代码趋势数据类型
interface ICodeTrendData {
  dates: string[]
  totalLines: number[]
  additions: number[]
  deletions: number[]
}

import {
  FolderOpened,
  TrendCharts,
  PieChart,
  DocumentChecked,
  EditPen,
  Delete,
  User,
} from '@element-plus/icons-vue'
import { getProjects, getProjectById } from '@/api/project'
import { getProjectDashboard, getProjectCodeRank, getProjectCodeTrend, getProjectStats } from '@/api/stats'
import { ElMessage } from 'element-plus'

// 时间范围
const timeRange = ref<TimeRange>({
  preset: 'last30days',
  start: '',
  end: '',
})

// 筛选器配置
const filterConfigs = ref<FilterConfig[]>([
  {
    key: 'department',
    label: '部门',
    type: 'select',
    placeholder: '选择部门',
    clearable: true,
    options: [
      { label: '前端组', value: 'frontend' },
      { label: '后端组', value: 'backend' },
      { label: '测试组', value: 'qa' },
      { label: '运维组', value: 'devops' },
    ],
  },
  {
    key: 'member',
    label: '成员',
    type: 'select',
    placeholder: '选择成员',
    clearable: true,
    options: [],
  },
])

// 筛选值
const filterValue = ref<FilterValue>({
  department: undefined,
  member: undefined,
})

// 加载状态
const loading = ref(false)

// 项目选择器数据
const projects = ref<IProjectExt[]>([])

// 加载项目列表
const loadProjects = async () => {
  try {
    const response = await getProjects({ pageSize: 100 })
    projects.value = response.items.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      avatar: '',
    }))
    // 如果有项目，默认选中第一个
    if (projects.value.length > 0 && !selectedProject.value) {
      const firstProject = projects.value[0]
      if (firstProject) {
        selectedProject.value = firstProject.id
        selectedProjects.value = [firstProject.id]
      }
    }
  } catch (error) {
    console.error('加载项目列表失败', error)
  }
}

const selectedProject = ref<number>(0)
const selectedProjects = ref<number[]>([])

// 是否启用多选模式
const isMultiSelect = ref(false)

const currentProject = computed(() =>
  projects.value.find(p => p.id === selectedProject.value)
)

// 处理项目选择变化
const handleProjectChange = (value: string | number | (string | number)[] | undefined, project?: IProjectSelectorItem | IProjectSelectorItem[]) => {
  console.log('项目选择变化:', value, project)
  refreshData()
}

// 项目统计数据
const projectStats = reactive<IProjectStat[]>([
  {
    label: '总提交数',
    value: 0,
    icon: DocumentChecked,
    color: 'primary',
  },
  {
    label: '贡献者',
    value: 0,
    suffix: '人',
    icon: User,
    color: 'success',
  },
  {
    label: '代码行数',
    value: 0,
    suffix: '行',
    icon: EditPen,
    color: 'warning',
  },
  {
    label: 'Pull Requests',
    value: 0,
    icon: Delete,
    color: 'purple',
  },
])

// 项目概览统计数据（来自getProjectStats API）
const projectOverviewStats = reactive<IProjectOverviewStats>({
  projectId: 0,
  projectName: '',
  totalCommits: 0,
  totalTokens: 0,
  activeMembers: 0,
  bugCount: 0,
})

// 成员贡献统计数据
const memberContributionData = ref<IMemberContribution[]>([])

// 加载项目概览统计数据（来自getProjectStats API）
const loadProjectOverviewStats = async () => {
  if (!selectedProject.value) return

  try {
    const stats = await getProjectStats(selectedProject.value)
    projectOverviewStats.projectId = stats.projectId
    projectOverviewStats.projectName = stats.projectName
    projectOverviewStats.totalCommits = stats.totalCommits
    projectOverviewStats.totalTokens = stats.totalTokens
    projectOverviewStats.activeMembers = stats.activeMembers
    projectOverviewStats.bugCount = stats.bugCount
  } catch (error) {
    console.error('加载项目概览统计失败', error)
    // 不显示错误消息，因为这不是核心功能
  }
}

// 加载项目统计数据
const loadProjectStats = async () => {
  if (!selectedProject.value) return

  loading.value = true
  try {
    const [dashboard, codeRank] = await Promise.all([
      getProjectDashboard(selectedProject.value, {
        startDate: timeRange.value.start || undefined,
        endDate: timeRange.value.end || undefined,
      }),
      getProjectCodeRank(selectedProject.value, {
        startDate: timeRange.value.start || undefined,
        endDate: timeRange.value.end || undefined,
      }),
    ])

    // 更新项目统计数据
    const stats = projectStats
    if (stats[0]) stats[0].value = dashboard?.total_stats?.commits || 0
    if (stats[1]) stats[1].value = dashboard?.total_stats?.contributors || 0
    if (stats[2]) stats[2].value = dashboard?.total_stats?.lines_of_code || 0
    if (stats[3]) stats[3].value = dashboard?.total_stats?.pull_requests || 0

    // 更新成员贡献数据
    memberContributionData.value = codeRank.map((member, index) => ({
      userId: member.userId,
      username: member.username,
      avatar: '',
      commits: 0, // 需要后端提供
      additions: member.linesAdded,
      deletions: member.linesDeleted,
      filesChanged: 0,
      lastCommitTime: new Date().toISOString(),
    }))

    // 更新成员筛选器选项
    const memberFilter = filterConfigs.value.find(f => f.key === 'member')
    if (memberFilter) {
      memberFilter.options = codeRank.map(m => ({
        label: m.username,
        value: m.userId.toString(),
      }))
    }
  } catch (error) {
    ElMessage.error('加载项目统计数据失败')
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
  loadProjectStats()
  loadProjectOverviewStats()
  loadCodeTrendData()
}

// ==================== 代码趋势图表相关 ====================

// 时间范围选项
type TimeRangeOption = '7days' | '30days' | '90days'
const codeTrendTimeRange = ref<TimeRangeOption>('30days')

// 时间范围选项配置
const codeTrendTimeRanges = [
  { label: '最近7天', value: '7days' as TimeRangeOption },
  { label: '最近30天', value: '30days' as TimeRangeOption },
  { label: '最近90天', value: '90days' as TimeRangeOption },
]

// 代码趋势数据
const codeTrendData = ref<ICodeTrendData>({
  dates: [],
  totalLines: [],
  additions: [],
  deletions: [],
})

// 加载代码趋势数据
const loadCodeTrendData = async () => {
  if (!selectedProject.value) return

  // 根据时间范围计算日期
  const days = codeTrendTimeRange.value === '7days' ? 7 : codeTrendTimeRange.value === '30days' ? 30 : 90
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days + 1)

  try {
    const response = await getProjectCodeTrend(selectedProject.value, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })

    // 转换日期格式为 MM-DD
    const formattedDates = response.dates.map(dateStr => {
      const d = new Date(dateStr)
      return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    })

    codeTrendData.value = {
      dates: formattedDates,
      totalLines: response.total_lines,
      additions: response.additions,
      deletions: response.deletions,
    }
  } catch (error) {
    console.error('加载代码趋势数据失败', error)
    ElMessage.error('加载代码趋势数据失败')
  }
}

// 处理时间范围切换
const handleCodeTrendTimeChange = (range: TimeRangeOption) => {
  codeTrendTimeRange.value = range
  loadCodeTrendData()
}

// 图表配置
const codeTrendChartOption = computed<EChartsOption>(() => {
  const { dates, totalLines, additions, deletions } = codeTrendData.value

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#999' },
      },
      backgroundColor: 'rgba(13, 33, 55, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#ffffff' },
      formatter: (params: any) => {
        let result = `<div style="font-weight:600;margin-bottom:8px;">${params[0].axisValue}</div>`
        params.forEach((param: any) => {
          const value = param.value?.toLocaleString() || 0
          const marker = `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${param.color};"></span>`
          result += `<div style="margin:4px 0;">${marker} ${param.seriesName}: <strong>${value}</strong> 行</div>`
        })
        return result
      },
    },
    legend: {
      data: ['代码总行数', '新增代码', '删除代码'],
      top: 0,
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisPointer: { type: 'shadow' },
      axisLine: {
        lineStyle: { color: 'rgba(0, 212, 255, 0.3)' },
      },
      axisTick: {
        lineStyle: { color: 'rgba(0, 212, 255, 0.3)' },
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        rotate: dates.length > 30 ? 45 : 0,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '代码行数',
        position: 'left',
        axisLine: {
          lineStyle: { color: 'rgba(0, 212, 255, 0.3)' },
        },
        axisTick: {
          lineStyle: { color: 'rgba(0, 212, 255, 0.3)' },
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.6)',
          formatter: (value: number) => {
            if (value >= 10000) return (value / 10000).toFixed(1) + 'w'
            if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
            return value.toString()
          },
        },
        splitLine: {
          lineStyle: { color: 'rgba(0, 212, 255, 0.1)' },
        },
      },
      {
        type: 'value',
        name: '变更行数',
        position: 'right',
        axisLine: {
          lineStyle: { color: 'rgba(0, 212, 255, 0.3)' },
        },
        axisTick: {
          lineStyle: { color: 'rgba(0, 212, 255, 0.3)' },
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.6)',
          formatter: (value: number) => {
            if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
            return value.toString()
          },
        },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: dates.length > 30 ? 50 : 100,
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
        end: dates.length > 30 ? 50 : 100,
      },
    ],
    series: [
      {
        name: '代码总行数',
        type: 'line',
        yAxisIndex: 0,
        data: totalLines,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#00d4ff',
        },
        itemStyle: {
          color: '#00d4ff',
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff',
          },
        },
      },
      {
        name: '新增代码',
        type: 'bar',
        yAxisIndex: 1,
        data: additions,
        barWidth: '40%',
        itemStyle: {
          color: '#00ff88',
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: {
          focus: 'series',
        },
      },
      {
        name: '删除代码',
        type: 'bar',
        yAxisIndex: 1,
        data: deletions,
        barWidth: '40%',
        itemStyle: {
          color: '#ff006e',
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  }
})

// 初始化数据
onMounted(() => {
  loadProjects().then(() => {
    loadProjectStats()
    loadProjectOverviewStats()
    loadCodeTrendData()
  })
})

// 切换多选模式
const toggleMultiSelect = () => {
  isMultiSelect.value = !isMultiSelect.value
  if (isMultiSelect.value) {
    // 切换到多选时，将当前单选值加入多选列表
    selectedProjects.value = selectedProject.value ? [selectedProject.value] : []
  } else {
    // 切换到单选时，取多选列表的第一个值
    selectedProject.value = selectedProjects.value[0] || 1
  }
}
</script>

<template>
  <div class="project-stats-page">
    <StatsLayout
      title="项目统计"
      :loading="loading"
      :show-time-range="true"
      :show-filter="true"
      :show-refresh="true"
      :time-range="timeRange"
      :filter-value="filterValue"
      :filter-configs="filterConfigs"
      @time-range-change="handleTimeRangeChange"
      @filter-change="handleFilterChange"
      @refresh="handleRefresh"
    >
      <!-- 项目选择器 -->
      <template #header>
        <div class="project-selector-wrapper" data-testid="project-selector-wrapper">
          <!-- 单选模式 -->
          <ProjectSelector
            v-if="!isMultiSelect"
            v-model="selectedProject"
            :projects="projects"
            placeholder="选择项目"
            :width="260"
            @change="handleProjectChange"
          />

          <!-- 多选模式 -->
          <ProjectSelector
            v-else
            v-model:model-value-list="selectedProjects"
            :projects="projects"
            :multiple="true"
            placeholder="选择多个项目"
            :width="320"
            :max-count="5"
            @change="handleProjectChange"
          />

          <!-- 切换多选按钮 -->
          <ElButton
            class="toggle-mode-btn"
            :type="isMultiSelect ? 'primary' : 'default'"
            size="small"
            @click="toggleMultiSelect"
          >
            {{ isMultiSelect ? '多选' : '单选' }}
          </ElButton>
        </div>
      </template>

      <!-- 项目概览 -->
      <div class="project-overview">
        <div class="project-info-card" data-testid="project-info-card">
          <div class="project-header">
            <div class="project-icon">
              <ElIcon><FolderOpened /></ElIcon>
            </div>
            <div class="project-details">
              <h3 data-testid="project-name">{{ currentProject?.name || '选择项目' }}</h3>
              <p data-testid="project-description">{{ currentProject?.description || '暂无描述' }}</p>
            </div>
          </div>
          <!-- 项目概览统计 -->
          <div v-if="projectOverviewStats.projectId" class="project-overview-stats">
            <div class="overview-stat-item">
              <span class="overview-stat-label">总提交数</span>
              <span class="overview-stat-value">{{ projectOverviewStats.totalCommits.toLocaleString() }}</span>
            </div>
            <div class="overview-stat-item">
              <span class="overview-stat-label">Token使用量</span>
              <span class="overview-stat-value">{{ projectOverviewStats.totalTokens.toLocaleString() }}</span>
            </div>
            <div class="overview-stat-item">
              <span class="overview-stat-label">活跃成员</span>
              <span class="overview-stat-value">{{ projectOverviewStats.activeMembers }}人</span>
            </div>
            <div class="overview-stat-item">
              <span class="overview-stat-label">Bug数</span>
              <span class="overview-stat-value">{{ projectOverviewStats.bugCount }}</span>
            </div>
          </div>
        </div>

        <div class="project-stats-grid" data-testid="project-stats-grid">
          <div
            v-for="(stat, index) in projectStats"
            :key="index"
            class="stat-card"
            :class="stat.color"
            :data-testid="`stat-card stat-card-${stat.color}`"
          >
            <div class="stat-icon">
              <ElIcon><component :is="stat.icon" /></ElIcon>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-value" data-testid="stat-value">
                {{ stat.value.toLocaleString() }}
                <span v-if="stat.suffix" class="stat-suffix">{{ stat.suffix }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section" data-testid="charts-section">
        <div class="chart-card trend-card">
          <div class="chart-header">
            <h3 class="chart-title">
              <ElIcon><TrendCharts /></ElIcon>
              代码趋势
            </h3>
            <!-- 时间范围选择器 -->
            <div class="time-range-selector">
              <button
                v-for="range in codeTrendTimeRanges"
                :key="range.value"
                class="time-range-btn"
                :class="{ 'is-active': codeTrendTimeRange === range.value }"
                @click="handleCodeTrendTimeChange(range.value)"
              >
                {{ range.label }}
              </button>
            </div>
          </div>
          <div class="chart-content">
            <BaseChart
              data-testid="echarts"
              :option="codeTrendChartOption"
              width="100%"
              height="320px"
              theme="tech-dark"
              :auto-resize="true"
            />
          </div>
        </div>

        <div class="chart-card language-card">
          <div class="chart-header">
            <h3 class="chart-title">
              <ElIcon><PieChart /></ElIcon>
              语言分布
            </h3>
          </div>
          <div class="chart-placeholder" data-testid="chart-placeholder">
            <div class="placeholder-content">
              <ElIcon class="placeholder-icon"><PieChart /></ElIcon>
              <span>语言分布图表区域</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 成员贡献统计 -->
      <MemberContribution
        :data="memberContributionData"
        :loading="loading"
        title="成员贡献统计"
        :show-rank="true"
        default-sort-field="commits"
        default-sort-order="descending"
      />
    </StatsLayout>
  </div>
</template>

<style scoped lang="scss">
.project-stats-page {
  .project-selector-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: 16px;

    .toggle-mode-btn {
      white-space: nowrap;
    }
  }

  .project-overview {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
    margin-bottom: 24px;

    @media (max-width: 992px) {
      grid-template-columns: 1fr;
    }

    .project-info-card {
      padding: 20px;
      background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
      border-radius: var(--tech-border-radius, 8px);
      border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
      backdrop-filter: blur(10px);

      .project-header {
        display: flex;
        align-items: center;
        gap: 16px;

        .project-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 212, 255, 0.15);
          border-radius: var(--tech-border-radius, 8px);
          color: var(--tech-cyan, #00d4ff);
          font-size: 24px;
        }

        .project-details {
          h3 {
            margin: 0 0 4px;
            font-size: 16px;
            font-weight: 600;
            color: var(--tech-text-primary, #ffffff);
          }

          p {
            margin: 0;
            font-size: 13px;
            color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
          }
        }
      }

      .project-overview-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));

        .overview-stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .overview-stat-label {
            font-size: 12px;
            color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
          }

          .overview-stat-value {
            font-size: 18px;
            font-weight: 600;
            color: var(--tech-cyan, #00d4ff);
          }
        }
      }
    }

    .project-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;

      @media (max-width: 1200px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
        border-radius: var(--tech-border-radius, 8px);
        border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--tech-glow-cyan, 0 0 20px rgba(0, 212, 255, 0.3));
          border-color: var(--tech-cyan, #00d4ff);
        }

        &.primary {
          border-color: rgba(0, 212, 255, 0.3);
          .stat-icon {
            background: rgba(0, 212, 255, 0.15);
            color: var(--tech-cyan, #00d4ff);
          }
        }

        &.success {
          border-color: rgba(0, 255, 136, 0.3);
          .stat-icon {
            background: rgba(0, 255, 136, 0.15);
            color: var(--tech-green, #00ff88);
          }
        }

        &.warning {
          border-color: rgba(255, 149, 0, 0.3);
          .stat-icon {
            background: rgba(255, 149, 0, 0.15);
            color: var(--tech-orange, #ff9500);
          }
        }

        &.purple {
          border-color: rgba(157, 78, 221, 0.3);
          .stat-icon {
            background: rgba(157, 78, 221, 0.15);
            color: var(--tech-purple, #9d4edd);
          }
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--tech-border-radius, 8px);
          font-size: 20px;
        }

        .stat-content {
          flex: 1;

          .stat-label {
            font-size: 13px;
            color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
            margin-bottom: 4px;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 600;
            color: var(--tech-text-primary, #ffffff);

            .stat-suffix {
              font-size: 13px;
              font-weight: 400;
              margin-left: 4px;
              color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
            }
          }
        }
      }
    }
  }

  .charts-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 24px;

    @media (max-width: 992px) {
      grid-template-columns: 1fr;
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
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--tech-text-primary, #ffffff);
        }

        .time-range-selector {
          display: flex;
          gap: 4px;
          background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
          border-radius: 4px;
          padding: 2px;

          .time-range-btn {
            padding: 4px 12px;
            font-size: 12px;
            color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
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
              background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
            }
          }
        }
      }

      .chart-content {
        height: 320px;
        background: var(--tech-card-bg, rgba(13, 33, 55, 0.8));
        border-radius: var(--tech-border-radius, 8px);
        overflow: hidden;
      }

      .chart-placeholder {
        height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.05));
        border-radius: var(--tech-border-radius, 8px);

        .placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));

          .placeholder-icon {
            font-size: 48px;
            opacity: 0.5;
          }

          span {
            font-size: 14px;
          }
        }
      }
    }
  }
}
</style>
