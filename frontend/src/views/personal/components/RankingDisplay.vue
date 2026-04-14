<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh, ArrowUp, ArrowDown, Minus, Search } from '@element-plus/icons-vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import type { DataTableColumn } from '@/components/DataTable/DataTable.vue'

// 排名数据项接口
export interface RankingItem {
  id: number | string
  username: string
  department?: string
  value: number
  trend?: number
  avatar?: string
  [key: string]: any
}

// 排名类型
export type RankingType = 'codeLines' | 'commits' | 'tokenUsage' | 'activity'

// 当前用户排名信息
export interface UserRankInfo {
  rank: number
  total: number
  value: number
  trend?: number
}

// 组件属性
export interface RankingDisplayProps {
  /** 标题 */
  title?: string
  /** 排名数据 */
  data: Record<RankingType, RankingItem[]>
  /** 当前用户ID */
  currentUserId: number | string
  /** 当前用户排名信息 */
  currentUserRank?: Record<RankingType, UserRankInfo>
  /** 初始选中的排名类型 */
  initialType?: RankingType
  /** 是否加载中 */
  loading?: boolean
  /** 显示前N名 */
  topN?: number
  /** 空数据提示文本 */
  emptyText?: string
  /** 自定义单位 */
  unit?: string
  /** 是否显示搜索 */
  showSearch?: boolean
  /** 是否显示部门筛选 */
  showDepartmentFilter?: boolean
  /** 是否显示分页 */
  showPagination?: boolean
  /** 分页配置 */
  pagination?: {
    currentPage: number
    pageSize: number
    total: number
  }
  /** 视图模式：table 或 card */
  viewMode?: 'table' | 'card'
  /** 姓名字段名 */
  nameKey?: string
  /** 数值格式化函数 */
  valueFormatter?: (value: number) => string
}

const props = withDefaults(defineProps<RankingDisplayProps>(), {
  title: '排名展示',
  initialType: 'codeLines',
  loading: false,
  topN: 10,
  emptyText: '暂无排名数据',
  unit: '',
  showSearch: false,
  showDepartmentFilter: false,
  showPagination: false,
  viewMode: 'table',
  nameKey: 'username',
})

const emit = defineEmits<{
  (e: 'type-change', type: RankingType): void
  (e: 'refresh'): void
  (e: 'row-click', row: RankingItem): void
  (e: 'page-change', page: number): void
  (e: 'search', query: string): void
  (e: 'department-change', department: string): void
}>()

// 当前选中的排名类型
const currentType = ref<RankingType>(props.initialType)

// 搜索查询
const searchQuery = ref('')

// 选中的部门
const selectedDepartment = ref('')

// 监听初始类型变化
watch(() => props.initialType, (newVal) => {
  currentType.value = newVal
})

// 排名类型配置
const rankingTypes: { key: RankingType; label: string; unit: string; icon: string }[] = [
  { key: 'codeLines', label: '代码量', unit: '行', icon: 'Code' },
  { key: 'commits', label: '提交次数', unit: '次', icon: 'GitCommit' },
  { key: 'tokenUsage', label: 'Token使用', unit: '', icon: 'Coin' },
  { key: 'activity', label: '活跃度', unit: '分', icon: 'TrendCharts' },
]

// 当前类型的配置
const currentTypeConfig = computed(() => {
  return rankingTypes.find(t => t.key === currentType.value) ?? rankingTypes[0]
})

// 当前类型的数据
const currentData = computed(() => {
  const data = props.data?.[currentType.value] || []
  // 限制显示前N名
  return data.slice(0, props.topN)
})

// 是否为空数据
const isEmptyData = computed(() => {
  return !currentData.value || currentData.value.length === 0
})

// 当前用户的排名信息
const currentUserRankInfo = computed(() => {
  return props.currentUserRank?.[currentType.value]
})

// 处理类型切换
const handleTypeChange = (type: RankingType) => {
  currentType.value = type
  emit('type-change', type)
}

// 处理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 处理行点击
const handleRowClick = (row: RankingItem) => {
  emit('row-click', row)
}

// 处理页码变化
const handlePageChange = (page: number) => {
  emit('page-change', page)
}

// 处理搜索
const handleSearch = () => {
  emit('search', searchQuery.value)
}

// 处理部门筛选变化
const handleDepartmentChange = (value: string) => {
  selectedDepartment.value = value
  emit('department-change', value)
}

// 格式化数值
const formatValue = (value: number): string => {
  if (props.valueFormatter) {
    return props.valueFormatter(value)
  }
  return value.toLocaleString('zh-CN')
}

// 获取排名样式类
const getRankClass = (index: number): string => {
  if (index === 0) return 'ranking-row--top1'
  if (index === 1) return 'ranking-row--top2'
  if (index === 2) return 'ranking-row--top3'
  return ''
}

// 获取趋势样式类
const getTrendClass = (trend?: number): string => {
  if (trend === undefined || trend === null) return ''
  if (trend > 0) return 'trend-indicator--up'
  if (trend < 0) return 'trend-indicator--down'
  return 'trend-indicator--flat'
}

// 获取趋势图标
const getTrendIcon = (trend?: number) => {
  if (trend === undefined || trend === null) return Minus
  if (trend > 0) return ArrowUp
  if (trend < 0) return ArrowDown
  return Minus
}

// 表格列配置
const tableColumns = computed<DataTableColumn<RankingItem>[]>(() => [
  {
    prop: 'rank',
    label: '排名',
    width: 80,
    align: 'center',
    slot: 'rank',
  },
  {
    prop: 'username',
    label: '用户名',
    minWidth: 120,
    slot: 'username',
  },
  {
    prop: 'department',
    label: '部门',
    width: 120,
    formatter: (row) => row.department || '-',
  },
  {
    prop: 'value',
    label: `数值 (${currentTypeConfig.value?.unit ?? props.unit ?? '-'})`,
    width: 150,
    align: 'right',
    sortable: true,
    slot: 'value',
  },
  {
    prop: 'trend',
    label: '趋势',
    width: 100,
    align: 'center',
    slot: 'trend',
  },
])

// 行类名
const rowClassName = ({ row }: { row: RankingItem }) => {
  const classes: string[] = ['ranking-row']
  if (row.id === props.currentUserId) {
    classes.push('ranking-row--current-user')
  }
  return classes.join(' ')
}

// 获取部门列表（用于筛选）
const departments = computed(() => {
  const deptSet = new Set<string>()
  currentData.value.forEach(item => {
    if (item.department) {
      deptSet.add(item.department)
    }
  })
  return Array.from(deptSet)
})

// 暴露给父组件
defineExpose({
  currentType,
  currentData,
  handleTypeChange,
})
</script>

<template>
  <div class="ranking-display" :class="{ 'is-loading': loading }">
    <!-- 头部 -->
    <div class="ranking-display__header">
      <div class="ranking-display__title-section">
        <h3 class="ranking-display__title">{{ title }}</h3>
        <!-- 当前用户排名卡片 -->
        <div v-if="currentUserRankInfo" class="user-rank-card">
          <span class="user-rank-card__label">我的排名</span>
          <div class="user-rank-card__content">
            <span class="user-rank-card__rank">第 {{ currentUserRankInfo.rank }} 名</span>
            <span class="user-rank-card__total">/ {{ currentUserRankInfo.total }} 人</span>
            <span
              v-if="currentUserRankInfo.trend !== undefined"
              class="user-rank-card__trend"
              :class="getTrendClass(currentUserRankInfo.trend)"
            >
              <ElIcon :size="12">
                <component :is="getTrendIcon(currentUserRankInfo.trend)" />
              </ElIcon>
              {{ Math.abs(currentUserRankInfo.trend) }}
            </span>
          </div>
        </div>
      </div>

      <div class="ranking-display__controls">
        <!-- 部门筛选 -->
        <div v-if="showDepartmentFilter" class="department-filter">
          <ElSelect v-model="selectedDepartment" placeholder="选择部门" clearable @change="handleDepartmentChange">
            <ElOption
              v-for="dept in departments"
              :key="dept"
              :label="dept"
              :value="dept"
            />
          </ElSelect>
        </div>

        <!-- 搜索 -->
        <div v-if="showSearch" class="ranking-search">
          <ElInput
            v-model="searchQuery"
            placeholder="搜索用户..."
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </div>

        <!-- 刷新按钮 -->
        <ElButton
          class="ranking-refresh-btn"
          :icon="Refresh"
          :loading="loading"
          @click="handleRefresh"
        >
          刷新
        </ElButton>
      </div>
    </div>

    <!-- 榜单类型切换 -->
    <div class="ranking-type-tabs">
      <button
        v-for="type in rankingTypes"
        :key="type.key"
        class="ranking-type-tab"
        :class="{ 'is-active': currentType === type.key }"
        @click="handleTypeChange(type.key)"
      >
        {{ type.label }}
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="ranking-display__content">
      <!-- 加载骨架屏 -->
      <div v-if="loading && isEmptyData" class="ranking-skeleton">
        <ElSkeleton :rows="5" animated />
      </div>

      <!-- 空状态 -->
      <div v-else-if="isEmptyData" class="ranking-empty">
        <ElEmpty :description="emptyText" />
      </div>

      <!-- 表格视图 -->
      <div v-else-if="viewMode === 'table'" class="ranking-table-wrapper">
        <DataTable
          :data="currentData"
          :columns="tableColumns"
          :loading="loading"
          :row-class-name="rowClassName"
          :pagination="showPagination ? pagination : null"
          stripe
          @row-click="handleRowClick"
          @page-change="handlePageChange"
        >
          <!-- 排名列自定义插槽 -->
          <template #column-rank="{ row, index }">
            <div class="rank-cell" :class="getRankClass(index)">
              <span v-if="index < 3" class="top-rank-badge">
                <ElIcon :size="20">
                  <TrophyIcon v-if="index === 0" class="trophy-gold" />
                  <TrophyIcon v-else-if="index === 1" class="trophy-silver" />
                  <TrophyIcon v-else class="trophy-bronze" />
                </ElIcon>
              </span>
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </div>
          </template>

          <!-- 用户名列自定义插槽 -->
          <template #column-username="{ row }">
            <div class="user-cell">
              <ElAvatar
                v-if="row.avatar"
                :size="32"
                :src="row.avatar"
                class="user-avatar"
              />
              <ElAvatar v-else :size="32" class="user-avatar">
                {{ row[nameKey]?.charAt(0) || '?' }}
              </ElAvatar>
              <span class="user-name" :class="{ 'is-current-user': row.id === currentUserId }">
                {{ row[nameKey] }}
                <ElTag v-if="row.id === currentUserId" size="small" type="primary" effect="plain">我</ElTag>
              </span>
            </div>
          </template>

          <!-- 数值列自定义插槽 -->
          <template #column-value="{ row }">
            <span class="value-cell">
              {{ formatValue(row.value) }}
              <span v-if="unit || currentTypeConfig?.unit" class="ranking-unit">
                {{ unit || currentTypeConfig?.unit }}
              </span>
            </span>
          </template>

          <!-- 趋势列自定义插槽 -->
          <template #column-trend="{ row }">
            <div
              v-if="row.trend !== undefined"
              class="trend-indicator"
              :class="getTrendClass(row.trend)"
            >
              <ElIcon :size="14">
                <component :is="getTrendIcon(row.trend)" />
              </ElIcon>
              <span class="trend-value">{{ Math.abs(row.trend) }}</span>
            </div>
            <span v-else class="trend-indicator--flat">-</span>
          </template>
        </DataTable>
      </div>

      <!-- 卡片视图 -->
      <div v-else class="ranking-cards">
        <div
          v-for="(item, index) in currentData"
          :key="item.id"
          class="ranking-card"
          :class="[getRankClass(index), { 'ranking-card--current-user': item.id === currentUserId }]"
          @click="handleRowClick(item)"
        >
          <div class="ranking-card__rank">
            <span v-if="index < 3" class="top-rank-badge">
              <ElIcon :size="24">
                <TrophyIcon v-if="index === 0" class="trophy-gold" />
                <TrophyIcon v-else-if="index === 1" class="trophy-silver" />
                <TrophyIcon v-else class="trophy-bronze" />
              </ElIcon>
            </span>
            <span v-else class="rank-number">{{ index + 1 }}</span>
          </div>

          <ElAvatar
            v-if="item.avatar"
            :size="48"
            :src="item.avatar"
            class="ranking-card__avatar"
          />
          <ElAvatar v-else :size="48" class="ranking-card__avatar">
            {{ item[nameKey]?.charAt(0) || '?' }}
          </ElAvatar>

          <div class="ranking-card__info">
            <div class="ranking-card__name">
              {{ item[nameKey] }}
              <ElTag v-if="item.id === currentUserId" size="small" type="primary">我</ElTag>
            </div>
            <div v-if="item.department" class="ranking-card__department">{{ item.department }}</div>
          </div>

          <div class="ranking-card__stats">
            <div class="ranking-card__value">
              {{ formatValue(item.value) }}
              <span v-if="unit || currentTypeConfig?.unit" class="ranking-unit">
                {{ unit || currentTypeConfig?.unit }}
              </span>
            </div>
            <div
              v-if="item.trend !== undefined"
              class="ranking-card__trend"
              :class="getTrendClass(item.trend)"
            >
              <ElIcon :size="12">
                <component :is="getTrendIcon(item.trend)" />
              </ElIcon>
              {{ Math.abs(item.trend) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// 奖杯图标组件
const TrophyIcon = {
  setup() {
    return () =>
      h(
        'svg',
        {
          viewBox: '0 0 1024 1024',
          width: '1em',
          height: '1em',
          fill: 'currentColor',
        },
        [
          h('path', {
            d: 'M896 128h-96v-64H224v64H128v128c0 128 85.333 234.667 213.333 256-21.333 42.667-53.333 85.333-96 117.333-42.667 32-96 53.333-160 53.333v128c128 0 234.667-42.667 320-128 42.667-42.667 74.667-96 96-149.333 21.333 53.333 53.333 106.667 96 149.333 85.333 85.333 192 128 320 128v-128c-64 0-117.333-21.333-160-53.333-42.667-32-74.667-74.667-96-117.333C810.667 490.667 896 384 896 256V128z',
          }),
        ]
      )
  },
}

import { h } from 'vue'
export { TrophyIcon }
</script>

<style scoped lang="scss">
.ranking-display {
  background: var(--tech-bg-card, rgba(13, 33, 55, 0.8)) !important;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2)) !important;
  backdrop-filter: blur(10px);

  &.is-loading {
    opacity: 0.7;
    pointer-events: none;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }

  &__title-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff) !important;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
}

// 当前用户排名卡片
.user-rank-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.2)) !important;
  border-radius: 20px;
  border: 1px solid rgba(0, 212, 255, 0.3) !important;

  &__label {
    font-size: 12px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__rank {
    font-size: 16px;
    font-weight: 600;
    color: var(--tech-cyan, #00d4ff) !important;
  }

  &__total {
    font-size: 12px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 4px;
    font-size: 12px;
    font-weight: 500;

    &.trend-indicator--up {
      color: var(--tech-green, #00ff88) !important;
    }

    &.trend-indicator--down {
      color: var(--tech-red, #ff006e) !important;
    }

    &.trend-indicator--flat {
      color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
    }
  }
}

// 搜索框
.ranking-search {
  width: 200px;

  :deep(.el-input__wrapper) {
    border-radius: 20px;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
    box-shadow: 0 0 0 1px var(--tech-border-primary, rgba(0, 212, 255, 0.3)) inset !important;
  }

  :deep(.el-input__inner) {
    color: var(--tech-text-primary, #ffffff) !important;
  }

  :deep(.el-input__inner::placeholder) {
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
  }
}

// 榜单类型切换
.ranking-type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1)) !important;
  flex-wrap: wrap;
}

.ranking-type-tab {
  padding: 8px 20px;
  font-size: 14px;
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.3)) !important;
  background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
  color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--tech-cyan, #00d4ff) !important;
    color: var(--tech-cyan, #00d4ff) !important;
  }

  &.is-active {
    background: rgba(0, 212, 255, 0.3) !important;
    border-color: var(--tech-cyan, #00d4ff) !important;
    color: var(--tech-cyan, #00d4ff) !important;
  }
}

// 内容区域
.ranking-display__content {
  min-height: 300px;
}

.ranking-skeleton {
  padding: 20px 0;

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
}

.ranking-empty {
  padding: 60px 0;

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

// 表格样式
.ranking-table-wrapper {
  :deep(.data-table) {
    .ranking-row {
      &--current-user {
        background-color: rgba(0, 212, 255, 0.1) !important;
      }

      &--top1,
      &--top2,
      &--top3 {
        font-weight: 500;
      }
    }
  }

  // 覆盖 Element Plus 表格样式
  :deep(.el-table) {
    background: transparent !important;

    th.el-table__cell {
      background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
      color: var(--tech-text-primary, #ffffff) !important;
      border-bottom: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2)) !important;
    }

    td.el-table__cell {
      background: transparent !important;
      color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
      border-bottom: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1)) !important;
    }

    tr:hover > td.el-table__cell {
      background: rgba(0, 212, 255, 0.05) !important;
    }
  }
}

// 排名单元格
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;

  &.ranking-row--top1,
  &.ranking-row--top2,
  &.ranking-row--top3 {
    .rank-number {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 600;
    }
  }

  &.ranking-row--top1 .rank-number {
    background: linear-gradient(135deg, #ffd700, #ffed4a);
    color: #fff;
  }

  &.ranking-row--top2 .rank-number {
    background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
    color: #fff;
  }

  &.ranking-row--top3 .rank-number {
    background: linear-gradient(135deg, #cd7f32, #daa520);
    color: #fff;
  }
}

.rank-number {
  font-size: 14px;
  color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
}

.top-rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;

  .trophy-gold {
    color: #ffd700;
  }

  .trophy-silver {
    color: #c0c0c0;
  }

  .trophy-bronze {
    color: #cd7f32;
  }
}

// 用户单元格
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .user-avatar {
    flex-shrink: 0;
    background: var(--tech-cyan, #00d4ff) !important;
    color: #fff;
  }

  .user-name {
    font-weight: 500;
    color: var(--tech-text-primary, #ffffff) !important;

    &.is-current-user {
      color: var(--tech-cyan, #00d4ff) !important;
    }

    .el-tag {
      margin-left: 6px;
    }
  }
}

// 数值单元格
.value-cell {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--tech-text-primary, #ffffff) !important;

  .ranking-unit {
    margin-left: 4px;
    font-size: 12px;
    font-weight: normal;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
  }
}

// 趋势指示器
.trend-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;

  &--up {
    color: var(--tech-green, #00ff88) !important;
  }

  &--down {
    color: var(--tech-red, #ff006e) !important;
  }

  &--flat {
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
  }

  .trend-value {
    min-width: 16px;
    text-align: center;
  }
}

// 卡片视图
.ranking-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.ranking-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);
  }

  &--current-user {
    border-color: var(--tech-cyan, #00d4ff) !important;
    background: rgba(0, 212, 255, 0.15) !important;
  }

  &--top1 {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 237, 74, 0.05));
    border-color: rgba(255, 215, 0, 0.3);
  }

  &--top2 {
    background: linear-gradient(135deg, rgba(192, 192, 192, 0.1), rgba(232, 232, 232, 0.05));
    border-color: rgba(192, 192, 192, 0.3);
  }

  &--top3 {
    background: linear-gradient(135deg, rgba(205, 127, 50, 0.1), rgba(218, 165, 32, 0.05));
    border-color: rgba(205, 127, 50, 0.3);
  }

  &__rank {
    flex-shrink: 0;
    width: 40px;
    display: flex;
    justify-content: center;
  }

  &__avatar {
    flex-shrink: 0;
    background: var(--tech-cyan, #00d4ff) !important;
    color: #fff;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff) !important;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;

    .el-tag {
      flex-shrink: 0;
    }
  }

  &__department {
    font-size: 12px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
  }

  &__stats {
    text-align: right;
  }

  &__value {
    font-size: 18px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: var(--tech-text-primary, #ffffff) !important;

    .ranking-unit {
      font-size: 12px;
      font-weight: normal;
      color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
    }
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    margin-top: 4px;

    &.trend-indicator--up {
      color: var(--tech-green, #00ff88) !important;
    }

    &.trend-indicator--down {
      color: var(--tech-red, #ff006e) !important;
    }

    &.trend-indicator--flat {
      color: var(--tech-text-muted, rgba(255, 255, 255, 0.5)) !important;
    }
  }
}

// 响应式布局
@media (max-width: 768px) {
  .ranking-display {
    padding: 16px;

    &__header {
      flex-direction: column;
      align-items: stretch;
    }

    &__controls {
      width: 100%;
      justify-content: space-between;
    }
  }

  .ranking-type-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 12px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .ranking-type-tab {
    flex-shrink: 0;
    padding: 6px 16px;
    font-size: 13px;
  }

  .ranking-search {
    width: 100%;
    order: -1;
  }

  .ranking-cards {
    grid-template-columns: 1fr;
  }

  .ranking-card {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .user-rank-card {
    padding: 6px 12px;

    &__label {
      display: none;
    }
  }

  .ranking-card {
    &__department {
      display: none;
    }
  }
}
</style>
