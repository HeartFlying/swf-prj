<template>
  <button
    class="tech-button"
    :class="[
      `size-${size}`,
      `variant-${variant}`,
      {
        block: block,
        loading: loading,
        disabled: disabled,
        glow: glow,
        pulse: pulse,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="loading-spinner" />
    <span v-else-if="icon" class="btn-icon">
      <el-icon><component :is="icon" /></el-icon>
    </span>
    <span v-if="$slots.default" class="btn-text">
      <slot />
    </span>
    <span class="btn-glow" />
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  icon?: Component
  block?: boolean
  loading?: boolean
  disabled?: boolean
  glow?: boolean
  pulse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  block: false,
  loading: false,
  disabled: false,
  glow: false,
  pulse: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (e: MouseEvent) => {
  if (!props.loading && !props.disabled) {
    emit('click', e)
  }
}
</script>

<style scoped lang="scss">
.tech-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--tech-radius-md);
  font-family: var(--tech-font-chinese);
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  white-space: nowrap;

  // 尺寸
  &.size-small {
    padding: 6px 12px;
    font-size: var(--tech-font-size-sm);
    height: 28px;
  }

  &.size-medium {
    padding: 10px 20px;
    font-size: var(--tech-font-size-base);
    height: 40px;
  }

  &.size-large {
    padding: 14px 28px;
    font-size: var(--tech-font-size-md);
    height: 52px;
  }

  // 变体
  &.variant-primary {
    background: linear-gradient(135deg, var(--tech-cyan) 0%, var(--tech-cyan-dark) 100%);
    color: var(--tech-bg-primary);

    &:hover:not(:disabled) {
      box-shadow: var(--tech-glow-cyan);
      transform: translateY(-1px);
    }

    .btn-glow {
      background: radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%);
    }
  }

  &.variant-secondary {
    background: var(--tech-bg-tertiary);
    color: var(--tech-text-primary);
    border: 1px solid var(--tech-border-secondary);

    &:hover:not(:disabled) {
      border-color: var(--tech-cyan);
      box-shadow: var(--tech-glow-cyan-sm);
    }

    .btn-glow {
      background: radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%);
    }
  }

  &.variant-success {
    background: linear-gradient(135deg, var(--tech-green) 0%, var(--tech-green-dark) 100%);
    color: var(--tech-bg-primary);

    &:hover:not(:disabled) {
      box-shadow: var(--tech-glow-green);
    }

    .btn-glow {
      background: radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%);
    }
  }

  &.variant-danger {
    background: linear-gradient(135deg, var(--tech-pink) 0%, var(--tech-pink-dark) 100%);
    color: var(--tech-text-primary);

    &:hover:not(:disabled) {
      box-shadow: var(--tech-glow-pink);
    }

    .btn-glow {
      background: radial-gradient(circle, rgba(255, 0, 110, 0.4) 0%, transparent 70%);
    }
  }

  &.variant-warning {
    background: linear-gradient(135deg, var(--tech-orange) 0%, var(--tech-orange-dark) 100%);
    color: var(--tech-bg-primary);

    &:hover:not(:disabled) {
      box-shadow: var(--tech-glow-orange, 0 0 20px rgba(255, 149, 0, 0.5));
    }

    .btn-glow {
      background: radial-gradient(circle, rgba(255, 149, 0, 0.4) 0%, transparent 70%);
    }
  }

  &.variant-ghost {
    background: transparent;
    color: var(--tech-cyan);
    border: 1px solid var(--tech-border-primary);

    &:hover:not(:disabled) {
      background: rgba(0, 212, 255, 0.1);
      border-color: var(--tech-cyan);
      box-shadow: var(--tech-glow-cyan-sm);
    }

    .btn-glow {
      background: radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%);
    }
  }

  // 块级按钮
  &.block {
    width: 100%;
  }

  // 禁用状态
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // 加载状态
  &.loading {
    cursor: wait;
  }

  // 发光效果
  &.glow {
    .btn-glow {
      opacity: 1;
    }
  }

  // 脉冲效果
  &.pulse {
    animation: btn-pulse 2s ease-in-out infinite;
  }

  // 图标
  .btn-icon {
    display: flex;
    align-items: center;
    font-size: 1.1em;
  }

  // 文字
  .btn-text {
    position: relative;
    z-index: 1;
  }

  // 加载动画
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  // 发光层
  .btn-glow {
    position: absolute;
    inset: -50%;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:hover .btn-glow {
    opacity: 1;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes btn-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(0, 212, 255, 0);
  }
}
</style>
