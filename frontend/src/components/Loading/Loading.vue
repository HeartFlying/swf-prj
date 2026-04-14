<template>
  <!-- 行内加载模式 - 无遮罩 -->
  <div
    v-if="inline && isVisible"
    class="loading loading--inline"
    :class="contentSizeClass"
  >
    <div class="loading__animation">
      <!-- 自定义图标 -->
      <div v-if="icon" class="loading__custom-icon">
        <el-icon :size="iconSize"><component :is="icon" /></el-icon>
      </div>
      <!-- 默认 Spinner -->
      <div v-else class="loading__spinner" :style="spinnerStyle">
        <div class="loading__spinner-circle"></div>
      </div>
    </div>
    <p v-if="text" class="loading__text">{{ text }}</p>
  </div>

  <!-- 全屏加载模式 -->
  <Teleport v-else-if="fullscreen && isVisible" to="body">
    <div
      class="loading loading--fullscreen"
      :style="loadingStyle"
      @click="handleMaskClick"
    >
      <div class="loading__mask" :style="maskStyle"></div>
      <div class="loading__content" :class="contentSizeClass">
        <div class="loading__animation">
          <!-- 自定义图标 -->
          <div v-if="icon" class="loading__custom-icon">
            <el-icon :size="iconSize"><component :is="icon" /></el-icon>
          </div>
          <!-- 默认 Spinner -->
          <div v-else class="loading__spinner" :style="spinnerStyle">
            <div class="loading__spinner-circle"></div>
          </div>
        </div>
        <p v-if="text" class="loading__text">{{ text }}</p>
      </div>
    </div>
  </Teleport>

  <!-- 局部加载模式（默认） -->
  <div
    v-else-if="isVisible"
    class="loading loading--local"
    :style="loadingStyle"
    @click="handleMaskClick"
  >
    <div class="loading__mask" :style="maskStyle"></div>
    <div class="loading__content" :class="contentSizeClass">
      <div class="loading__animation">
        <!-- 自定义图标 -->
        <div v-if="icon" class="loading__custom-icon">
          <el-icon :size="iconSize"><component :is="icon" /></el-icon>
        </div>
        <!-- 默认 Spinner -->
        <div v-else class="loading__spinner" :style="spinnerStyle">
          <div class="loading__spinner-circle"></div>
        </div>
      </div>
      <p v-if="text" class="loading__text">{{ text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { ElIcon } from 'element-plus'
import type { Component } from 'vue'

export type LoadingSize = 'small' | 'medium' | 'large'

export interface LoadingProps {
  /** 是否显示加载 */
  loading?: boolean
  /** 是否全屏 */
  fullscreen?: boolean
  /** 是否行内模式（无遮罩） */
  inline?: boolean
  /** 自定义图标组件 */
  icon?: Component
  /** 提示文字 */
  text?: string
  /** 遮罩层透明度 */
  opacity?: number
  /** 遮罩层背景色 */
  background?: string
  /** z-index */
  zIndex?: number
  /** 是否锁定滚动 */
  lock?: boolean
  /** 点击遮罩是否关闭 */
  closeOnClickMask?: boolean
  /** 尺寸 */
  size?: LoadingSize
  /** 图标颜色 */
  color?: string
  /** 延迟显示时间(ms) */
  delay?: number
}

const props = withDefaults(defineProps<LoadingProps>(), {
  loading: true,
  fullscreen: false,
  inline: false,
  icon: undefined,
  text: '',
  opacity: 0.7,
  background: 'rgba(255, 255, 255, 0.9)',
  zIndex: 2000,
  lock: true,
  closeOnClickMask: false,
  size: 'medium',
  color: '',
  delay: 0
})

const emit = defineEmits<{
  close: []
}>()

// 延迟显示控制
const delayShow = ref(false)
let delayTimer: ReturnType<typeof setTimeout> | null = null

// 实际显示状态（考虑延迟）
const isVisible = computed(() => {
  if (!props.loading) return false
  if (props.delay > 0 && !delayShow.value) return false
  return true
})

// 内容尺寸类名
const contentSizeClass = computed(() => {
  return `loading__content--${props.size}`
})

// 图标尺寸
const iconSize = computed(() => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56
  }
  return sizeMap[props.size]
})

// 加载层样式
const loadingStyle = computed(() => {
  return {
    zIndex: props.zIndex
  }
})

// 遮罩层样式
const maskStyle = computed(() => {
  return {
    opacity: props.opacity,
    backgroundColor: props.background
  }
})

// Spinner样式
const spinnerStyle = computed(() => {
  if (props.color) {
    return { color: props.color }
  }
  return {}
})

// 处理延迟显示
const handleDelay = () => {
  if (delayTimer) {
    clearTimeout(delayTimer)
    delayTimer = null
  }
  if (props.delay > 0 && props.loading) {
    delayShow.value = false
    delayTimer = setTimeout(() => {
      delayShow.value = true
    }, props.delay)
  } else {
    delayShow.value = true
  }
}

// 处理遮罩点击
const handleMaskClick = () => {
  if (props.closeOnClickMask) {
    emit('close')
  }
}

// 锁定/解锁滚动
const lockScroll = () => {
  if (props.fullscreen && props.lock && isVisible.value) {
    document.body.style.overflow = 'hidden'
    document.body.classList.add('loading-active')
  }
}

const unlockScroll = () => {
  if (props.fullscreen) {
    document.body.style.overflow = ''
    document.body.classList.remove('loading-active')
  }
}

// 监听 loading 变化
watch(() => props.loading, (newVal) => {
  if (newVal) {
    handleDelay()
    lockScroll()
  } else {
    if (delayTimer) {
      clearTimeout(delayTimer)
      delayTimer = null
    }
    delayShow.value = false
    unlockScroll()
  }
})

// 监听实际显示状态变化
watch(isVisible, (newVal) => {
  if (newVal && props.fullscreen && props.lock) {
    lockScroll()
  }
})

// 监听全屏模式变化
watch(() => props.fullscreen, () => {
  if (isVisible.value) {
    if (props.fullscreen) {
      lockScroll()
    } else {
      unlockScroll()
    }
  }
})

onMounted(() => {
  if (props.loading) {
    handleDelay()
    lockScroll()
  }
})

onUnmounted(() => {
  if (delayTimer) {
    clearTimeout(delayTimer)
  }
  unlockScroll()
})
</script>

<style scoped lang="scss">
.loading {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  // 全屏模式
  &--fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
  }

  // 局部加载模式（默认）
  &--local {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }

  // 行内加载模式（无遮罩）
  &--inline {
    position: static;
    display: inline-flex;
    flex-direction: row;
    gap: 8px;
    background: transparent;

    .loading__text {
      margin: 0;
      font-size: 14px;
      color: #606266;
    }
  }

  &__mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    transition: opacity 0.3s ease;
  }

  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;

    &--small {
      .loading__spinner-circle {
        width: 24px;
        height: 24px;
        border-width: 2px;
      }
    }

    &--medium {
      .loading__spinner-circle {
        width: 40px;
        height: 40px;
        border-width: 3px;
      }
    }

    &--large {
      .loading__spinner-circle {
        width: 56px;
        height: 56px;
        border-width: 4px;
      }
    }
  }

  // 行内模式尺寸
  &--inline {
    &.loading__content--small {
      .loading__spinner-circle {
        width: 16px;
        height: 16px;
        border-width: 2px;
      }

      .loading__custom-icon {
        font-size: 16px;
      }
    }

    &.loading__content--medium {
      .loading__spinner-circle {
        width: 20px;
        height: 20px;
        border-width: 2px;
      }

      .loading__custom-icon {
        font-size: 20px;
      }
    }

    &.loading__content--large {
      .loading__spinner-circle {
        width: 24px;
        height: 24px;
        border-width: 2px;
      }

      .loading__custom-icon {
        font-size: 24px;
      }
    }
  }

  &__text {
    margin: 0;
    font-size: 14px;
    color: #606266;
    line-height: 1.5;
  }

  // 自定义图标
  &__custom-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #409eff;
    animation: loading-spin 1s linear infinite;
  }

  // Spinner Animation
  &__spinner {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__spinner-circle {
    border-style: solid;
    border-color: #e4e7ed;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: loading-spin 1s linear infinite;
    color: #409eff;
  }
}

@keyframes loading-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes loading-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes loading-wave {
  0%,
  40%,
  100% {
    transform: scaleY(0.4);
    opacity: 0.5;
  }
  20% {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
