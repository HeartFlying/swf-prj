<script setup lang="ts">
import { computed, ref } from 'vue'
import { UserFilled, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import type { DataTableColumn } from '@/components/DataTable/DataTable.vue'

// 成员贡献数据接口
export interface IMemberContribution {
  /** 用户ID */
  userId: number | string
  /** 用户名 */
  username: string
  /** 用户头像 */
  avatar?: string
  /** 提交次数 */
  commits: number
  /** 新增代码行数 */
  additions: number
  /** 删除代码行数 */
  deletions: number
  /** 修改文件数 */
  filesChanged: number
  /** 最后提交时间 */
  lastCommitTime: string
}

// 排序字段类型
type SortField = 'commits' | 'additions' | 'deletions' | 'filesChanged' | 'lastCommitTime'
type SortOrder = 'ascending' | 'descending'

// 组件属性
export interface MemberContributionProps {
  /** 成员贡献数据 */
  data: IMemberContribution[]
  /** 是否加载中 */
  loading?: boolean
  /** 标题 */
  title?: string
  /** 是否显示排名 */
  showRank?: boolean
  /** 默认排序字段 */
  defaultSortField?: SortField
  /** 默认排序方向 */
  defaultSortOrder?: SortOrder
}

const props = withDefaults(defineProps<MemberContributionProps>(), {
  loading: false,
  title: '成员贡献统计',
  showRank: true,
  defaultSortField: 'commits',
  defaultSortOrder: 'descending',
})

// 当前排序状态
const currentSort = ref<{ field: SortField; order: SortOrder }>({
  field: props.defaultSortField,
  order: props.defaultSortOrder,
})

// 处理排序变化（预留接口，当前使用默认排序）
const _handleSortChange = (_field: SortField) => {
  if (currentSort.value.field === _field) {
    // 切换排序方向
    currentSort.value.order = currentSort.value.order === 'ascending' ? 'descending' : 'ascending'
  } else {
    // 切换排序字段，默认降序
    currentSort.value.field = _field
    currentSort.value.order = 'descending'
  }
}

// 获取排序图标（预留接口）
const _getSortIcon = (_field: SortField) => {
  if (currentSort.value.field !== _field) {
    return null
  }
  return currentSort.value.order === 'ascending' ? ArrowUp : ArrowDown
}

// 计算总提交数（用于贡献占比计算）
const totalCommits = computed(() => {
  return props.data.reduce((sum, member) => sum + member.commits, 0)
})

// 排序后的数据
const sortedData = computed(() => {
  const { field, order } = currentSort.value
  const sorted = [...props.data].sort((a, b) => {
    let comparison = 0
    switch (field) {
      case 'commits':
        comparison = a.commits - b.commits
        break
      case 'additions':
        comparison = a.additions - b.additions
        break
      case 'deletions':
        comparison = a.deletions - b.deletions
        break
      case 'filesChanged':
        comparison = a.filesChanged - b.filesChanged
        break
      case 'lastCommitTime':
        comparison = new Date(a.lastCommitTime).getTime() - new Date(b.lastCommitTime).getTime()
        break
    }
    return order === 'ascending' ? comparison : -comparison
  })
  return sorted
})

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else if (days < 30) {
    return `${Math.floor(days / 7)}周前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

// 计算贡献占比
const getContributionPercent = (commits: number) => {
  if (totalCommits.value === 0) return 0
  return Math.round((commits / totalCommits.value) * 100)
}

// 表格列配置
const columns = computed<DataTableColumn<IMemberContribution>[]>(() => [
  ...(props.showRank
    ? [
        {
          prop: 'rank',
          label: '排名',
          width: 80,
          align: 'center' as const,
          slot: 'rank',
        },
      ]
    : []),
  {
    prop: 'user',
    label: '成员',
    minWidth: 150,
    slot: 'user',
  },
  {
    prop: 'commits',
    label: '提交次数',
    width: 120,
    align: 'center' as const,
    sortable: true,
  },
  {
    prop: 'contribution',
    label: '贡献占比',
    width: 150,
    align: 'center' as const,
    slot: 'contribution',
  },
  {
    prop: 'additions',
    label: '新增代码',
    width: 120,
    align: 'center' as const,
    sortable: true,
  },
  {
    prop: 'deletions',
    label: '删除代码',
    width: 120,
    align: 'center' as const,
    sortable: true,
  },
  {
    prop: 'filesChanged',
    label: '修改文件',
    width: 120,
    align: 'center' as const,
    sortable: true,
  },
  {
    prop: 'lastCommitTime',
    label: '最后提交',
    width: 120,
    align: 'center' as const,
    sortable: true,
    slot: 'lastCommitTime',
  },
])
</script>

<template>
  <div class="member-contribution">
    <!-- 头部 -->
    <div class="member-contribution__header">
      <h3 class="member-contribution__title">
        <ElIcon><UserFilled /></ElIcon>
        {{ title }}
      </h3>
      <div class="member-contribution__summary">
        <span class="summary-item">
          <span class="summary-label">总成员:</span>
          <span class="summary-value">{{ data.length }}人</span>
        </span>
        <span class="summary-item">
          <span class="summary-label">总提交:</span>
          <span class="summary-value">{{ totalCommits.toLocaleString() }}次</span>
        </span>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="member-contribution__table">
      <!-- 桌面端表格 -->
      <div class="desktop-table">
        <DataTable
          :data="sortedData"
          :columns="columns"
          :loading="loading"
          :pagination="null"
          :stripe="true"
          :border="false"
        >
          <!-- 排名列 -->
          <template v-if="showRank" #column-rank="{ index }">
            <span
              class="rank-badge"
              :class="[`rank-${index + 1}`, { 'top-three': index < 3 }]"
            >
              {{ index + 1 }}
            </span>
          </template>

          <!-- 成员列 -->
          <template #column-user="{ row }">
            <div class="user-cell">
              <img
                v-if="row.avatar"
                :src="row.avatar"
                :alt="row.username"
                class="user-avatar"
              />
              <div v-else class="user-avatar user-avatar--default">
                {{ row.username.slice(0, 2) }}
              </div>
              <span class="user-name">{{ row.username }}</span>
            </div>
          </template>

          <!-- 贡献占比列 -->
          <template #column-contribution="{ row }">
            <div class="contribution-cell">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${getContributionPercent(row.commits)}%` }"
                  :class="{ 'high': getContributionPercent(row.commits) >= 30, 'medium': getContributionPercent(row.commits) >= 15 && getContributionPercent(row.commits) < 30 }"
                />
              </div>
              <span class="progress-text">{{ getContributionPercent(row.commits) }}%</span>
            </div>
          </template>

          <!-- 新增代码列 -->
          <template #column-additions="{ row: _row }">
            <span class="code-additions">+{{ _row.additions.toLocaleString() }}</span>
          </template>

          <!-- 删除代码列 -->
          <template #column-deletions="{ row }">
            <span class="code-deletions">-{{ row.deletions.toLocaleString() }}</span>
          </template>

          <!-- 最后提交时间列 -->
          <template #column-lastCommitTime="{ row }">
            <ElTooltip :content="new Date(row.lastCommitTime).toLocaleString('zh-CN')" placement="top">
              <span class="last-commit-time">{{ formatDate(row.lastCommitTime) }}</span>
            </ElTooltip>
          </template>
        </DataTable>
      </div>

      <!-- 移动端卡片列表 -->
      <div class="mobile-list">
        <div
          v-for="(member, index) in sortedData"
          :key="member.userId"
          class="member-card"
          :class="{ 'top-three': index < 3 }"
        >
          <div class="member-card__header">
            <span v-if="showRank" class="rank-badge" :class="`rank-${index + 1}`">
              {{ index + 1 }}
            </span>
            <div class="user-cell">
              <img
                v-if="member.avatar"
                :src="member.avatar"
                :alt="member.username"
                class="user-avatar"
              />
              <div v-else class="user-avatar user-avatar--default">
                {{ member.username.slice(0, 2) }}
              </div>
              <span class="user-name">{{ member.username }}</span>
            </div>
          </div>

          <div class="member-card__stats">
            <div class="stat-item">
              <span class="stat-label">提交</span>
              <span class="stat-value">{{ member.commits }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">占比</span>
              <span class="stat-value">{{ getContributionPercent(member.commits) }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">新增</span>
              <span class="stat-value code-additions">+{{ member.additions }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">删除</span>
              <span class="stat-value code-deletions">-{{ member.deletions }}</span>
            </div>
          </div>

          <div class="member-card__progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${getContributionPercent(member.commits)}%` }"
              />
            </div>
          </div>

          <div class="member-card__footer">
            <span class="files-changed">{{ member.filesChanged }} 个文件</span>
            <span class="last-commit">{{ formatDate(member.lastCommitTime) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.member-contribution {
  background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
  border-radius: var(--tech-border-radius, 8px);
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
  padding: 16px;
  backdrop-filter: blur(10px);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;

    @media (max-width: 576px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff);
  }

  &__summary {
    display: flex;
    gap: 16px;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;

      .summary-label {
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
      }

      .summary-value {
        color: var(--tech-cyan, #00d4ff);
        font-weight: 600;
      }
    }
  }

  &__table {
    .desktop-table {
      display: block;

      @media (max-width: 992px) {
        display: none;
      }
    }

    .mobile-list {
      display: none;

      @media (max-width: 992px) {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    }
  }
}

// 排名徽章
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
  color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));

  &.top-three {
    &.rank-1 {
      background: linear-gradient(135deg, #ffd700, #ffaa00);
      color: #000;
    }

    &.rank-2 {
      background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
      color: #000;
    }

    &.rank-3 {
      background: linear-gradient(135deg, #cd7f32, #b87333);
      color: #fff;
    }
  }
}

// 用户单元格
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;

    &--default {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--tech-cyan, #00d4ff);
      color: var(--tech-bg-primary, #0a1929);
      font-size: 12px;
      font-weight: 600;
    }
  }

  .user-name {
    color: var(--tech-text-primary, #ffffff);
    font-weight: 500;
  }
}

// 贡献占比单元格
.contribution-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--tech-cyan, #00d4ff);
    border-radius: 4px;
    transition: width 0.5s ease;

    &.high {
      background: var(--tech-green, #00ff88);
    }

    &.medium {
      background: var(--tech-orange, #ff9500);
    }
  }

  .progress-text {
    font-size: 12px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
    min-width: 40px;
    text-align: right;
  }
}

// 代码统计样式
.code-additions {
  color: var(--tech-green, #00ff88);
  font-weight: 500;
}

.code-deletions {
  color: var(--tech-red, #ff006e);
  font-weight: 500;
}

// 最后提交时间
.last-commit-time {
  color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
  font-size: 13px;
  cursor: pointer;
}

// 移动端卡片
.member-card {
  background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.05));
  border-radius: var(--tech-border-radius, 8px);
  padding: 16px;
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--tech-glow-cyan, 0 0 20px rgba(0, 212, 255, 0.3));
    border-color: var(--tech-cyan, #00d4ff);
  }

  &.top-three {
    background: var(--tech-bg-card, rgba(13, 33, 55, 0.8));
    border-color: var(--tech-cyan-alpha-30, rgba(0, 212, 255, 0.3));
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 12px;

    @media (max-width: 576px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .stat-label {
        font-size: 12px;
        color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
      }

      .stat-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff);
      }
    }
  }

  &__progress {
    margin-bottom: 12px;

    .progress-bar {
      height: 6px;
      background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--tech-cyan, #00d4ff);
      border-radius: 3px;
      transition: width 0.5s ease;
    }
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
    padding-top: 12px;
    border-top: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));
  }
}

// 深度选择器覆盖 Element Plus 表格样式（使用科技风主题变量）
:deep(.el-table) {
  --el-table-header-bg-color: var(--tech-bg-tertiary, #132f4c);
  --el-table-header-text-color: var(--tech-cyan, #00d4ff);

  .el-table__header {
    th {
      font-weight: 600;
      color: var(--tech-cyan, #00d4ff);
      background-color: var(--tech-bg-tertiary, #132f4c);
    }
  }

  .el-table__row {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(0, 212, 255, 0.05);
    }
  }

  td {
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.85));
  }
}
</style>
