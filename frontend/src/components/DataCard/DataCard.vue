<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, ArrowDown, TrendCharts } from '@element-plus/icons-vue'
import { ElIcon, ElSkeleton, ElSkeletonItem } from 'element-plus'

export type DataCardTheme = 'default' | 'primary' | 'success' | 'warning' | 'danger'
export type DataCardSize = 'small' | 'default' | 'large'
export type DataCardFormat = 'number' | 'currency' | 'percentage' | 'decimal'

export interface DataCardProps {
  /** 卡片标题 */
  title?: string
  /** 数值 */
  value?: number | string
  /** 数值格式化类型 */
  format?: DataCardFormat
  /** 趋势值（正数表示上升，负数表示下降） */
  trend?: number
  /** 图标名称 */
  icon?: string
  /** 主题样式 */
  theme?: DataCardTheme
  /** 是否加载中 */
  loading?: boolean
  /** 描述文本 */
  description?: string
  /** 是否可悬停 */
  hoverable?: boolean
  /** 尺寸 */
  size?: DataCardSize
  /** 数值前缀 */
  prefix?: string
  /** 数值后缀 */
  suffix?: string
  /** 自定义格式化函数 */
  formatter?: (value: number | string) => string
  /** 是否显示趋势图标 */
  showTrendIcon?: boolean
}

const props = withDefaults(defineProps<DataCardProps>(), {
  theme: 'default',
  size: 'default',
  format: 'number',
  loading: false,
  hoverable: false,
  showTrendIcon: false,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

// 格式化数值
const formattedValue = computed(() => {
  if (props.value === undefined || props.value === null) {
    return '-'
  }

  // 优先使用自定义格式化函数
  if (props.formatter) {
    return props.formatter(props.value)
  }

  const numValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value

  if (isNaN(numValue)) {
    return String(props.value)
  }

  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue)
    case 'percentage':
      return `${(numValue * 100).toFixed(2)}%`
    case 'decimal':
      return numValue.toFixed(2)
    case 'number':
    default:
      return new Intl.NumberFormat('zh-CN').format(numValue)
  }
})

// 趋势文本
const trendText = computed(() => {
  if (props.trend === undefined || props.trend === null) {
    return ''
  }
  const sign = props.trend > 0 ? '+' : ''
  return `${sign}${props.trend}%`
})

// 趋势方向
const isTrendUp = computed(() => (props.trend ?? 0) > 0)
const isTrendDown = computed(() => (props.trend ?? 0) < 0)

// 卡片类名
const cardClasses = computed(() => [
  'data-card',
  `data-card--${props.theme}`,
  `data-card--${props.size}`,
  {
    'is-hoverable': props.hoverable,
    'is-loading': props.loading,
  },
])

// 处理点击事件
const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

// 动态获取图标组件
const iconComponent = computed(() => {
  if (!props.icon) return null
  // 支持传入的图标名称映射
  const iconMap: Record<string, typeof TrendCharts> = {
    TrendCharts,
    ArrowUp,
    ArrowDown,
  }
  return iconMap[props.icon] || null
})
</script>

<template>
  <div :class="cardClasses" @click="handleClick">
    <!-- 加载状态 -->
    <div v-if="loading" class="data-card__loading">
      <el-skeleton :rows="2" animated class="data-card__skeleton">
        <template #template>
          <el-skeleton-item variant="text" style="width: 40%; margin-bottom: 12px" />
          <el-skeleton-item variant="h3" style="width: 60%" />
        </template>
      </el-skeleton>
    </div>

    <!-- 内容区域 -->
    <div v-else class="data-card__content">
      <!-- 头部：图标和标题 -->
      <div class="data-card__header">
        <div v-if="icon" class="data-card__icon">
          <el-icon :size="size === 'small' ? 20 : size === 'large' ? 32 : 24">
            <component :is="iconComponent" v-if="iconComponent" />
            <span v-else>{{ icon }}</span>
          </el-icon>
        </div>
        <div class="data-card__header-content">
          <div v-if="title" class="data-card__title">{{ title }}</div>
          <div v-if="description" class="data-card__description">{{ description }}</div>
        </div>
      </div>

      <!-- 数值区域 -->
      <div class="data-card__body">
        <div class="data-card__value-wrapper">
          <span v-if="prefix" class="data-card__prefix">{{ prefix }}</span>
          <span class="data-card__value">{{ formattedValue }}</span>
          <span v-if="suffix" class="data-card__suffix">{{ suffix }}</span>
        </div>

        <!-- 趋势 -->
        <div
          v-if="trend !== undefined && trend !== null"
          class="data-card__trend"
          :class="{
            'is-up': isTrendUp,
            'is-down': isTrendDown,
          }"
        >
          <el-icon v-if="showTrendIcon" class="data-card__trend-icon" :size="12">
            <ArrowUp v-if="isTrendUp" />
            <ArrowDown v-if="isTrendDown" />
          </el-icon>
          <span>{{ trendText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-card {
  position: relative;
  padding: 16px 20px;
  border-radius: 8px;
  background-color: var(--tech-bg-card) !important;
  border: 1px solid var(--tech-border-secondary) !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &__content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background-color: var(--tech-bg-secondary) !important;
    color: var(--tech-text-primary) !important;
  }

  &__header-content {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    color: var(--tech-text-secondary) !important;
    line-height: 1.4;
  }

  &__description {
    font-size: 12px;
    color: var(--tech-text-muted) !important;
    margin-top: 4px;
    line-height: 1.4;
  }

  &__body {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  &__value-wrapper {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  &__value {
    font-size: 24px;
    font-weight: 600;
    color: var(--tech-text-primary) !important;
    line-height: 1.2;
  }

  &__prefix,
  &__suffix {
    font-size: 14px;
    color: var(--tech-text-secondary) !important;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background-color: var(--tech-bg-secondary) !important;
    color: var(--tech-text-secondary) !important;

    &.is-up {
      color: var(--tech-green) !important;
      background-color: rgba(74, 222, 128, 0.15) !important;
    }

    &.is-down {
      color: var(--tech-red) !important;
      background-color: rgba(248, 113, 113, 0.15) !important;
    }
  }

  &__trend-icon {
    flex-shrink: 0;
  }

  // 主题样式
  &--primary {
    .data-card__icon {
      background-color: rgba(34, 211, 238, 0.15) !important;
      color: var(--tech-cyan) !important;
    }
  }

  &--success {
    .data-card__icon {
      background-color: rgba(74, 222, 128, 0.15) !important;
      color: var(--tech-green) !important;
    }
  }

  &--warning {
    .data-card__icon {
      background-color: rgba(251, 146, 60, 0.15) !important;
      color: var(--tech-orange) !important;
    }
  }

  &--danger {
    .data-card__icon {
      background-color: rgba(248, 113, 113, 0.15) !important;
      color: var(--tech-red) !important;
    }
  }

  // 尺寸样式
  &--small {
    padding: 12px 16px;

    .data-card__value {
      font-size: 20px;
    }

    .data-card__icon {
      width: 32px;
      height: 32px;
    }
  }

  &--large {
    padding: 24px 28px;

    .data-card__value {
      font-size: 32px;
    }

    .data-card__icon {
      width: 48px;
      height: 48px;
    }
  }

  // 悬停效果
  &.is-hoverable {
    cursor: pointer;

    &:hover {
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.2);
      transform: translateY(-2px);
      border-color: var(--tech-cyan) !important;
    }
  }

  // 覆盖 ElSkeleton 样式
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

  // 加载状态
  &.is-loading {
    .data-card__skeleton {
      padding: 0;
    }
  }
}
</style>
