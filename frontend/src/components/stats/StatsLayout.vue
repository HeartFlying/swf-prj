<script setup lang="ts">
/**
 * StatsLayout Component
 * 统计布局组件
 *
 * @description 统计页面通用布局组件，包含标题、时间选择器、筛选器和刷新按钮
 * @author DevMetrics Team
 *
 * @example
 * <StatsLayout
 *   title="页面标题"
 *   :loading="loading"
 *   @refresh="handleRefresh"
 * >
 *   <!-- 内容区域 -->
 * </StatsLayout>
 */
/**
 * StatsLayout Component Logic
 * 统计布局组件逻辑
 *
 * @description 提供统计页面通用布局结构和交互处理
 */
import { computed } from 'vue'
import TimeRangeSelector from './TimeRangeSelector.vue'
import StatsDataFilter from './StatsDataFilter.vue'
import type { TimeRange, FilterValue, FilterConfig } from './types'

/**
 * 组件属性接口
 * @interface Props
 */
interface Props {
  /** 页面标题 */
  title: string
  /** 是否加载中 */
  loading?: boolean
  /** 是否为空数据 */
  empty?: boolean
  /** 是否显示时间范围选择器 */
  showTimeRange?: boolean
  /** 是否显示筛选器 */
  showFilter?: boolean
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 当前时间范围 */
  timeRange?: TimeRange
  /** 筛选值 */
  filterValue?: FilterValue
  /** 筛选配置 */
  filterConfigs?: FilterConfig[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  empty: false,
  showTimeRange: true,
  showFilter: false,
  showRefresh: true,
  filterConfigs: () => [],
})

const emit = defineEmits<{
  (e: 'timeRangeChange', range: TimeRange): void
  (e: 'filterChange', value: FilterValue): void
  (e: 'refresh'): void
}>()

/**
 * 布局类名
 * @returns {Object} 类名对象
 */
const layoutClasses = computed(() => ({
  'stats-layout': true,
  'stats-layout--loading': props.loading,
  'stats-layout--empty': props.empty,
}))

/**
 * 处理时间范围变化
 * @param {TimeRange} range - 时间范围
 */
const handleTimeRangeChange = (range: TimeRange) => {
  emit('timeRangeChange', range)
}

/**
 * 处理筛选值变化
 * @param {FilterValue} value - 筛选值
 */
const handleFilterChange = (value: FilterValue) => {
  emit('filterChange', value)
}

/**
 * 处理刷新事件
 */
const handleRefresh = () => {
  emit('refresh')
}
</script>

<template>
  <div :class="layoutClasses">
    <!-- Header -->
    <div class="stats-layout__header">
      <div class="stats-layout__title-section">
        <h2 class="stats-layout__title">{{ title }}</h2>
        <slot name="header" />
      </div>

      <div class="stats-layout__controls">
        <!-- Time Range Selector -->
        <TimeRangeSelector
          v-if="showTimeRange"
          :model-value="timeRange"
          @change="handleTimeRangeChange"
        />

        <!-- Data Filter -->
        <StatsDataFilter
          v-if="showFilter"
          :filters="filterConfigs"
          :model-value="filterValue"
          @change="handleFilterChange"
        />

        <!-- Refresh Button -->
        <ElButton
          v-if="showRefresh"
          class="stats-layout__refresh"
          type="primary"
          size="small"
          :loading="loading"
          @click="handleRefresh"
        >
          <ElIcon><Refresh /></ElIcon>
          刷新
        </ElButton>
      </div>
    </div>

    <!-- Content -->
    <div class="stats-layout__content">
      <ElSkeleton v-if="loading" :rows="10" animated data-testid="el-skeleton loading-mask" />

      <ElEmpty v-else-if="empty" description="暂无数据" />

      <slot v-else />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="stats-layout__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats-layout {
  display: flex;
  flex-direction: column;
  gap: var(--tech-spacing-base, 16px);
  padding: var(--tech-spacing-base, 16px);
  background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
  border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
  border-radius: var(--tech-border-radius, 8px);
  backdrop-filter: blur(10px);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--tech-spacing-small, 12px);
    padding-bottom: var(--tech-spacing-base, 16px);
    border-bottom: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));
  }

  &__title-section {
    display: flex;
    align-items: center;
    gap: var(--tech-spacing-small, 12px);
  }

  &__title {
    margin: 0;
    font-size: var(--tech-font-size-large, 18px);
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff);
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: var(--tech-spacing-small, 12px);
    flex-wrap: wrap;
  }

  &__refresh {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__content {
    flex: 1;
    min-height: 200px;

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

  &__footer {
    padding-top: var(--tech-spacing-base, 16px);
    border-top: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));
  }

  &--loading {
    .stats-layout__content {
      opacity: 0.7;
    }
  }

  &--empty {
    .stats-layout__content {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

@media (max-width: 768px) {
  .stats-layout {
    padding: var(--tech-spacing-small, 12px);

    &__header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__controls {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
