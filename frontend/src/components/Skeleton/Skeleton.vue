<template>
  <div v-if="loading" :class="skeletonClasses" :style="skeletonStyle">
    <!-- Text Skeleton -->
    <template v-if="type === 'text'">
      <div
        v-for="i in rows"
        :key="i"
        class="skeleton__item"
        :style="getItemStyle(i)"
      />
    </template>

    <!-- Avatar Skeleton -->
    <template v-else-if="type === 'avatar'">
      <div class="skeleton__avatar" :class="avatarShapeClass" :style="avatarStyle" />
    </template>

    <!-- Button Skeleton -->
    <template v-else-if="type === 'button'">
      <div class="skeleton__button" :style="buttonStyle" />
    </template>

    <!-- Card Skeleton -->
    <template v-else-if="type === 'card'">
      <div class="skeleton__card">
        <div v-if="cardHeader" class="skeleton__card-header">
          <div class="skeleton__card-avatar" :class="avatarShapeClass" :style="cardAvatarStyle" />
          <div class="skeleton__card-meta">
            <div class="skeleton__card-title" :style="itemStyle" />
            <div class="skeleton__card-subtitle" :style="itemStyle" />
          </div>
        </div>
        <div class="skeleton__card-content">
          <div
            v-for="i in rows"
            :key="i"
            class="skeleton__card-row"
            :style="getCardRowStyle(i)"
          />
        </div>
      </div>
    </template>

    <!-- List Skeleton -->
    <template v-else-if="type === 'list'">
      <div class="skeleton__list">
        <div
          v-for="i in rows"
          :key="i"
          class="skeleton__list-item"
          :style="listItemStyle"
        >
          <div v-if="listAvatar" class="skeleton__list-avatar" :class="avatarShapeClass" />
          <div class="skeleton__list-content">
            <div class="skeleton__list-title" :style="itemStyle" />
            <div class="skeleton__list-description" :style="itemStyle" />
          </div>
          <div v-if="listAction" class="skeleton__list-action" :style="actionStyle" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type SkeletonType = 'text' | 'avatar' | 'button' | 'card' | 'list'
export type SkeletonAnimation = 'shimmer' | 'pulse' | 'none'
export type SkeletonSize = 'small' | 'medium' | 'large'
export type SkeletonShape = 'circle' | 'square'

export interface SkeletonProps {
  /** 骨架屏类型 */
  type?: SkeletonType
  /** 动画效果 */
  animation?: SkeletonAnimation
  /** 是否显示加载状态 */
  loading?: boolean
  /** 行数（用于text/card/list类型） */
  rows?: number
  /** 列数（用于grid布局） */
  columns?: number
  /** 宽度 */
  width?: string
  /** 高度 */
  height?: string
  /** 圆角 */
  borderRadius?: string
  /** 背景色 */
  backgroundColor?: string
  /** shimmer动画颜色 */
  shimmerColor?: string
  /** 自定义类名 */
  customClass?: string
  /** 最后一行宽度（百分比） */
  lastRowWidth?: string
  /** 间距 */
  gap?: string
  /** 尺寸（用于avatar） */
  size?: SkeletonSize
  /** 形状（用于avatar） */
  shape?: SkeletonShape
  /** 卡片是否显示头部 */
  cardHeader?: boolean
  /** 列表是否显示头像 */
  listAvatar?: boolean
  /** 列表是否显示操作按钮 */
  listAction?: boolean
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  type: 'text',
  animation: 'shimmer',
  loading: true,
  rows: 3,
  columns: 1,
  borderRadius: '4px',
  backgroundColor: '',
  shimmerColor: '',
  customClass: '',
  lastRowWidth: '60%',
  gap: '12px',
  size: 'medium',
  shape: 'circle',
  cardHeader: false,
  listAvatar: false,
  listAction: false
})

// 尺寸映射
const sizeMap: Record<SkeletonSize, number> = {
  small: 32,
  medium: 40,
  large: 64
}

// 计算组件类名
const skeletonClasses = computed(() => [
  'skeleton',
  `skeleton--${props.type}`,
  `skeleton--${props.animation}`,
  props.customClass
])

// 骨架屏样式
const skeletonStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) {
    style.width = props.width
  }
  if (props.columns > 1) {
    style.display = 'grid'
    style.gridTemplateColumns = `repeat(${props.columns}, 1fr)`
  }
  if (props.gap) {
    style.gap = props.gap
  }
  return style
})

// 基础样式生成器
const createBaseStyle = (extraStyles: Record<string, string> = {}): Record<string, string> => {
  const style: Record<string, string> = {
    borderRadius: props.borderRadius,
    ...extraStyles
  }
  if (props.backgroundColor) {
    style.backgroundColor = props.backgroundColor
  }
  return style
}

// 单项样式
const itemStyle = computed(() => createBaseStyle())

// 获取单项样式（带最后一行特殊宽度）
const getItemStyle = (index: number) => {
  const extraStyles: Record<string, string> = {}
  // 最后一行使用特殊宽度
  if (index === props.rows && props.lastRowWidth && props.rows > 1) {
    extraStyles.width = props.lastRowWidth
  }
  return createBaseStyle(extraStyles)
}

// 头像形状类名
const avatarShapeClass = computed(() => {
  return `skeleton__avatar--${props.shape}`
})

// 头像样式
const avatarStyle = computed(() => {
  const size = sizeMap[props.size]
  return createBaseStyle({
    width: props.width || `${size}px`,
    height: props.height || `${size}px`,
    borderRadius: props.shape === 'circle' ? '50%' : props.borderRadius
  })
})

// 卡片头像样式
const cardAvatarStyle = computed(() =>
  createBaseStyle({
    width: '40px',
    height: '40px',
    borderRadius: props.shape === 'circle' ? '50%' : props.borderRadius
  })
)

// 按钮样式
const buttonStyle = computed(() =>
  createBaseStyle({
    width: props.width || '100px',
    height: props.height || '36px'
  })
)

// 卡片行样式
const getCardRowStyle = (index: number) => {
  const extraStyles: Record<string, string> = {}
  // 最后一行使用特殊宽度
  if (index === props.rows && props.lastRowWidth && props.rows > 1) {
    extraStyles.width = props.lastRowWidth
  }
  return createBaseStyle(extraStyles)
}

// 列表项样式
const listItemStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.gap) {
    style.gap = props.gap
  }
  return style
})

// 列表操作按钮样式
const actionStyle = computed(() =>
  createBaseStyle({
    width: '60px',
    height: '24px'
  })
)
</script>

<style scoped lang="scss">
// 基础变量
$skeleton-bg: #e4e7ed;
$skeleton-bg-dark: #dcdfe6;

.skeleton {
  display: flex;
  flex-direction: column;

  // 动画效果 - shimmer
  &--shimmer {
    .skeleton__item,
    .skeleton__avatar,
    .skeleton__button,
    .skeleton__card-title,
    .skeleton__card-subtitle,
    .skeleton__card-row,
    .skeleton__list-title,
    .skeleton__list-description,
    .skeleton__list-action {
      background: linear-gradient(
        90deg,
        $skeleton-bg 25%,
        #f0f2f5 50%,
        $skeleton-bg 75%
      );
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
  }

  // 动画效果 - pulse
  &--pulse {
    .skeleton__item,
    .skeleton__avatar,
    .skeleton__button,
    .skeleton__card-title,
    .skeleton__card-subtitle,
    .skeleton__card-row,
    .skeleton__list-title,
    .skeleton__list-description,
    .skeleton__list-action {
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
  }

  // Text 类型
  &--text {
    width: 100%;

    .skeleton__item {
      height: 16px;
      background-color: $skeleton-bg;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  // Avatar 类型
  &--avatar {
    display: inline-flex;

    .skeleton__avatar {
      background-color: $skeleton-bg;

      &--circle {
        border-radius: 50%;
      }

      &--square {
        border-radius: 4px;
      }
    }
  }

  // Button 类型
  &--button {
    display: inline-flex;

    .skeleton__button {
      background-color: $skeleton-bg;
    }
  }

  // Card 类型
  &--card {
    width: 100%;

    .skeleton__card {
      border-radius: 8px;
      overflow: hidden;
    }

    .skeleton__card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #ebeef5;
    }

    .skeleton__card-avatar {
      flex-shrink: 0;
      background-color: $skeleton-bg;
    }

    .skeleton__card-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton__card-title {
      height: 16px;
      width: 40%;
      background-color: $skeleton-bg;
    }

    .skeleton__card-subtitle {
      height: 12px;
      width: 60%;
      background-color: $skeleton-bg;
    }

    .skeleton__card-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton__card-row {
      height: 14px;
      background-color: $skeleton-bg;
    }
  }

  // List 类型
  &--list {
    width: 100%;

    .skeleton__list {
      display: flex;
      flex-direction: column;
    }

    .skeleton__list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #ebeef5;

      &:last-child {
        border-bottom: none;
      }
    }

    .skeleton__list-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      background-color: $skeleton-bg;
    }

    .skeleton__list-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton__list-title {
      height: 16px;
      width: 60%;
      background-color: $skeleton-bg;
    }

    .skeleton__list-description {
      height: 12px;
      width: 80%;
      background-color: $skeleton-bg;
    }

    .skeleton__list-action {
      flex-shrink: 0;
      background-color: $skeleton-bg;
    }
  }
}

// Shimmer 动画
@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

// Pulse 动画
@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
