<template>
  <Transition
    :name="transitionName"
    :mode="mode"
    :appear="appear"
    @before-enter="$emit('before-enter')"
    @enter="$emit('enter')"
    @after-enter="$emit('after-enter')"
    @enter-cancelled="$emit('enter-cancelled')"
    @before-leave="$emit('before-leave')"
    @leave="$emit('leave')"
    @after-leave="$emit('after-leave')"
    @leave-cancelled="$emit('leave-cancelled')"
  >
    <div
      class="page-transition"
      :class="[
        `page-transition--${resolvedType}`,
        directionClass,
        { 'page-transition--disabled': disabled },
        customClass
      ]"
      :style="transitionStyle"
    >
      <slot />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

/**
 * 页面过渡动画名称 - 符合任务要求的Props设计
 */
export type TransitionName = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom'

/**
 * 过渡模式
 */
export type TransitionMode = 'in-out' | 'out-in' | 'default'

/**
 * 缓动函数类型
 */
export type EasingType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | string

/**
 * 页面过渡组件 Props
 */
interface Props {
  /** 动画名称: fade | slide-left | slide-right | slide-up | zoom */
  name?: TransitionName
  /** 动画时长（毫秒，默认 300） */
  duration?: number
  /** 动画延迟（毫秒） */
  delay?: number
  /** 是否禁用动画（支持prefers-reduced-motion） */
  disabled?: boolean
  /** 过渡模式: in-out | out-in | default */
  mode?: TransitionMode
  /** 是否在初始渲染时应用动画 */
  appear?: boolean
  /** 自定义类名 */
  customClass?: string
  /** 缓动函数 */
  easing?: EasingType
}

const props = withDefaults(defineProps<Props>(), {
  name: 'fade',
  duration: 300,
  delay: 0,
  disabled: false,
  mode: 'out-in',
  appear: false,
  customClass: '',
  easing: 'ease-out'
})

/**
 * 定义组件事件
 */
defineEmits<{
  /** 进入动画开始前 */
  (e: 'before-enter'): void
  /** 进入动画开始时 */
  (e: 'enter'): void
  /** 进入动画完成后 */
  (e: 'after-enter'): void
  /** 进入动画被取消 */
  (e: 'enter-cancelled'): void
  /** 离开动画开始前 */
  (e: 'before-leave'): void
  /** 离开动画开始时 */
  (e: 'leave'): void
  /** 离开动画完成后 */
  (e: 'after-leave'): void
  /** 离开动画被取消 */
  (e: 'leave-cancelled'): void
}>()

/**
 * 解析动画名称，提取类型和方向
 * 例如: 'slide-left' -> { type: 'slide', direction: 'left' }
 */
const resolvedAnimation = computed(() => {
  if (props.name.startsWith('slide-')) {
    return {
      type: 'slide' as const,
      direction: props.name.replace('slide-', '') as 'left' | 'right' | 'up' | 'down'
    }
  }
  return {
    type: props.name as 'fade' | 'zoom',
    direction: null
  }
})

/**
 * 计算过渡名称
 * 根据动画名称生成对应的CSS类名
 */
const transitionName = computed(() => {
  if (props.disabled) return undefined

  const { type, direction } = resolvedAnimation.value
  if (type === 'slide' && direction) {
    return `page-slide-${direction}`
  }
  return `page-${type}`
})

/**
 * 计算解析后的类型（用于类名）
 */
const resolvedType = computed(() => {
  const { type } = resolvedAnimation.value
  return type
})

/**
 * 计算方向类名
 * 用于slide类型的方向样式
 */
const directionClass = computed(() => {
  const { type, direction } = resolvedAnimation.value
  if (type === 'slide' && direction) {
    return `page-transition--slide-${direction}`
  }
  return ''
})

/**
 * 计算过渡样式
 * 动态设置CSS变量
 */
const transitionStyle = computed<CSSProperties>(() => {
  return {
    '--transition-duration': `${props.duration}ms`,
    '--transition-delay': `${props.delay}ms`,
    '--transition-easing': props.easing
  } as CSSProperties
})
</script>

<style scoped lang="scss">
.page-transition {
  width: 100%;
}

/* ========== Fade 淡入淡出动画 ========== */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease-out)
    var(--transition-delay, 0ms);
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

/* ========== Zoom 缩放动画 ========== */
.page-zoom-enter-active,
.page-zoom-leave-active {
  transition:
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms),
    transform var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms);
}

.page-zoom-enter-from,
.page-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ========== Slide 滑动动画 - 从左滑入 ========== */
.page-slide-left-enter-active,
.page-slide-left-leave-active {
  transition:
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms),
    transform var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms);
}

.page-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.page-slide-left-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ========== Slide 滑动动画 - 从右滑入 ========== */
.page-slide-right-enter-active,
.page-slide-right-leave-active {
  transition:
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms),
    transform var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms);
}

.page-slide-right-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.page-slide-right-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* ========== Slide 滑动动画 - 从下滑入 ========== */
.page-slide-up-enter-active,
.page-slide-up-leave-active {
  transition:
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms),
    transform var(--transition-duration, 300ms) var(--transition-easing, ease-out)
      var(--transition-delay, 0ms);
}

.page-slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.page-slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

/* ========== 禁用动画 ========== */
.page-transition--disabled {
  transition: none !important;
}

.page-transition--disabled * {
  transition: none !important;
}

/* ========== 尊重用户偏好：减少动画 ========== */
@media (prefers-reduced-motion: reduce) {
  .page-transition {
    transition: none !important;
  }

  .page-transition * {
    transition: none !important;
  }
}
</style>
