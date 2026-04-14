<script setup lang="ts">
import { computed, h } from 'vue'

// 内联图标组件
const TrophyIcon = () => h('svg', {
  viewBox: '0 0 1024 1024',
  width: '1em',
  height: '1em',
  fill: 'currentColor'
}, [
  h('path', { d: 'M896 128h-96v-64H224v64H128v128c0 128 85.333 234.667 213.333 256-21.333 42.667-53.333 85.333-96 117.333-42.667 32-96 53.333-160 53.333v128c128 0 234.667-42.667 320-128 42.667-42.667 74.667-96 96-149.333 21.333 53.333 53.333 106.667 96 149.333 85.333 85.333 192 128 320 128v-128c-64 0-117.333-21.333-160-53.333-42.667-32-74.667-74.667-96-117.333C810.667 490.667 896 384 896 256V128z' })
])

const TopIcon = () => h('svg', {
  viewBox: '0 0 1024 1024',
  width: '1em',
  height: '1em',
  fill: 'currentColor'
}, [
  h('path', { d: 'M512 128l-320 384h192v384h256v-384h192L512 128z' })
])

export interface RankingItem {
  id: number | string
  name: string
  score: number
  avatar?: string
  department?: string
  trend?: number
  [key: string]: any
}

export interface RankingListProps {
  /** 排名数据 */
  data: RankingItem[]
  /** 是否加载中 */
  loading?: boolean
  /** 布局方式：vertical(纵向) 或 horizontal(横向) */
  layout?: 'vertical' | 'horizontal'
  /** 是否显示头像 */
  showAvatar?: boolean
  /** 是否显示部门/描述 */
  showDepartment?: boolean
  /** 是否显示进度条 */
  showProgress?: boolean
  /** 是否显示皇冠图标 */
  showCrown?: boolean
  /** 是否显示趋势 */
  showTrend?: boolean
  /** 数值字段名 */
  valueKey?: string
  /** 姓名字段名 */
  nameKey?: string
  /** 部门字段名 */
  departmentKey?: string
  /** 最大值限制 */
  maxItems?: number
  /** 高亮的项目ID */
  highlightId?: number | string | null
  /** 空数据提示文本 */
  emptyText?: string
  /** 数值单位 */
  unit?: string
  /** 数值格式化函数 */
  formatter?: (value: number) => string
}

const props = withDefaults(defineProps<RankingListProps>(), {
  loading: false,
  layout: 'vertical',
  showAvatar: true,
  showDepartment: false,
  showProgress: false,
  showCrown: true,
  showTrend: false,
  valueKey: 'score',
  nameKey: 'name',
  departmentKey: 'department',
  maxItems: undefined,
  highlightId: null,
  emptyText: '暂无数据',
  unit: '',
})

const emit = defineEmits<{
  (e: 'itemClick', item: RankingItem): void
}>()

// 获取显示的数据（考虑maxItems限制）
const displayData = computed(() => {
  if (props.maxItems && props.maxItems > 0) {
    return props.data.slice(0, props.maxItems)
  }
  return props.data
})

// 计算最大值（用于进度条）
const maxValue = computed(() => {
  if (displayData.value.length === 0) return 0
  const values = displayData.value.map(item => getValue(item))
  return Math.max(...values)
})

// 获取数值
const getValue = (item: RankingItem): number => {
  return item[props.valueKey] ?? 0
}

// 获取姓名
const getName = (item: RankingItem): string => {
  return item[props.nameKey] ?? ''
}

// 获取部门
const getDepartment = (item: RankingItem): string | undefined => {
  return item[props.departmentKey]
}

// 格式化数值
const formatValue = (value: number): string => {
  if (props.formatter) {
    return props.formatter(value)
  }
  return value.toLocaleString('zh-CN')
}

// 计算进度百分比
const getProgressPercent = (item: RankingItem): number => {
  if (maxValue.value === 0) return 0
  const percent = (getValue(item) / maxValue.value) * 100
  return Math.min(percent, 100)
}

// 获取排名样式类
const getRankClass = (index: number): string => {
  if (index === 0) return 'ranking-item--top1'
  if (index === 1) return 'ranking-item--top2'
  if (index === 2) return 'ranking-item--top3'
  return ''
}

// 获取趋势样式类
const getTrendClass = (trend: number | undefined): string => {
  if (trend === undefined || trend === null) return ''
  if (trend > 0) return 'ranking-item__trend--up'
  if (trend < 0) return 'ranking-item__trend--down'
  return 'ranking-item__trend--flat'
}

// 处理点击事件
const handleItemClick = (item: RankingItem) => {
  emit('itemClick', item)
}

// 布局类
const layoutClasses = computed(() => ({
  'ranking-list': true,
  [`ranking-list--${props.layout}`]: true,
  'ranking-list--loading': props.loading,
}))
</script>

<template>
  <div :class="layoutClasses">
    <!-- 加载状态 -->
    <ElSkeleton v-if="loading" :rows="5" animated />

    <!-- 空状态 -->
    <ElEmpty v-else-if="data.length === 0" :description="emptyText" />

    <!-- 排名列表 -->
    <template v-else>
      <div
        v-for="(item, index) in displayData"
        :key="item.id"
        class="ranking-item"
        :class="[
          getRankClass(index),
          { 'ranking-item--highlighted': highlightId === item.id }
        ]"
        @click="handleItemClick(item)"
      >
        <!-- 排名序号 -->
        <div class="ranking-item__rank">
          <span v-if="!showCrown || index > 2" class="ranking-item__rank-number">{{ index + 1 }}</span>
          <ElIcon v-else class="ranking-item__crown" :class="`ranking-item__crown--top${index + 1}`">
            <TrophyIcon />
          </ElIcon>
        </div>

        <!-- 头像 -->
        <div v-if="showAvatar" class="ranking-item__avatar-wrapper">
          <ElAvatar
            :size="40"
            :src="item.avatar"
            shape="circle"
            class="ranking-item__avatar"
          >
            <span v-if="!item.avatar" class="ranking-item__avatar-fallback">{{ getName(item).charAt(0) }}</span>
          </ElAvatar>
        </div>

        <!-- 信息区域 -->
        <div class="ranking-item__info">
          <div class="ranking-item__name-row">
            <span class="ranking-item__name">{{ getName(item) }}</span>
            <span v-if="showTrend && item.trend !== undefined" class="ranking-item__trend" :class="getTrendClass(item.trend)">
              <ElIcon v-if="item.trend > 0"><TopIcon /></ElIcon>
              <ElIcon v-else-if="item.trend < 0" class="ranking-item__trend-icon--down"><TopIcon /></ElIcon>
              <span v-if="item.trend !== 0">{{ Math.abs(item.trend) }}</span>
              <span v-else>-</span>
            </span>
          </div>
          <div v-if="showDepartment && getDepartment(item)" class="ranking-item__department">
            {{ getDepartment(item) }}
          </div>

          <!-- 进度条 -->
          <div v-if="showProgress" class="ranking-item__progress">
            <div class="ranking-item__progress-track">
              <div
                class="ranking-item__progress-bar"
                :style="{ width: `${getProgressPercent(item)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 数值 -->
        <div class="ranking-item__value-wrapper">
          <span class="ranking-item__value">{{ formatValue(getValue(item)) }}</span>
          <span v-if="unit" class="ranking-item__unit">{{ unit }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.ranking-list {
  width: 100%;

  // 覆盖 Element Plus Skeleton 和 Empty 默认白色背景
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

  &--vertical {
    display: flex;
    flex-direction: column;
    gap: var(--tech-spacing-small, 12px);

    .ranking-item {
      display: flex;
      align-items: center;
      gap: var(--tech-spacing-small, 12px);
      padding: var(--tech-spacing-small, 12px);
      border-radius: var(--tech-border-radius, 4px);
      transition: all 0.3s ease;
      cursor: pointer;

      &:hover {
        background-color: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
      }

      &--highlighted {
        background-color: var(--tech-bg-overlay, rgba(0, 212, 255, 0.15)) !important;
        border: 1px solid var(--tech-cyan, #00d4ff) !important;
      }
    }
  }

  &--horizontal {
    display: flex;
    flex-direction: row;
    gap: var(--tech-spacing-base, 16px);
    overflow-x: auto;

    .ranking-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--tech-spacing-small, 8px);
      padding: var(--tech-spacing-base, 16px);
      min-width: 120px;
      border-radius: var(--tech-border-radius, 4px);
      transition: all 0.3s ease;
      cursor: pointer;
      text-align: center;

      &:hover {
        background-color: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1)) !important;
      }

      &--highlighted {
        background-color: var(--tech-bg-overlay, rgba(0, 212, 255, 0.15)) !important;
        border: 1px solid var(--tech-cyan, #00d4ff) !important;
      }

      &__info {
        align-items: center;
      }

      &__name-row {
        flex-direction: column;
        gap: 4px;
      }
    }
  }

  &--loading {
    pointer-events: none;
  }
}

.ranking-item {
  &__rank {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: var(--tech-font-size-base, 14px);
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
  }

  &__rank-number {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--tech-bg-tertiary, rgba(0, 212, 255, 0.1));
  }

  &__crown {
    font-size: 24px;

    &--top1 {
      color: #ffd700;
    }

    &--top2 {
      color: #c0c0c0;
    }

    &--top3 {
      color: #cd7f32;
    }
  }

  &--top1 {
    .ranking-item__rank-number {
      background-color: #ffd700;
      color: #fff;
    }
  }

  &--top2 {
    .ranking-item__rank-number {
      background-color: #c0c0c0;
      color: #fff;
    }
  }

  &--top3 {
    .ranking-item__rank-number {
      background-color: #cd7f32;
      color: #fff;
    }
  }

  &__avatar-wrapper {
    flex-shrink: 0;
  }

  &__avatar {
    background-color: var(--tech-cyan, #00d4ff) !important;
    color: #fff;
    font-weight: 500;
  }

  &__avatar-fallback {
    font-size: 16px;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__name-row {
    display: flex;
    align-items: center;
    gap: var(--tech-spacing-small, 8px);
  }

  &__name {
    font-size: var(--tech-font-size-base, 14px);
    font-weight: 500;
    color: var(--tech-text-primary, #ffffff);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__department {
    font-size: var(--tech-font-size-small, 13px);
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
  }

  &__trend {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: var(--tech-font-size-small, 12px);
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
  }

  &__trend-icon--down {
    transform: rotate(180deg);
  }

  &__progress {
    margin-top: 4px;
  }

  &__progress-track {
    height: 4px;
    background-color: var(--tech-bg-tertiary, rgba(0, 212, 255, 0.1));
    border-radius: 2px;
    overflow: hidden;
  }

  &__progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--tech-cyan, #00d4ff), rgba(0, 212, 255, 0.7));
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  &__value-wrapper {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  &__value {
    font-size: var(--tech-font-size-medium, 16px);
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff);
  }

  &__unit {
    font-size: var(--tech-font-size-small, 12px);
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
  }
}

@media (max-width: 768px) {
  .ranking-list {
    &--horizontal {
      .ranking-item {
        min-width: 100px;
        padding: var(--tech-spacing-small, 12px);
      }
    }
  }

  .ranking-item {
    &__rank {
      width: 28px;
      height: 28px;
    }

    &__crown {
      font-size: 20px;
    }
  }
}
</style>
