<script setup lang="ts">
import { computed } from 'vue'

export type StatusTagType = 'success' | 'warning' | 'error' | 'info' | 'processing' | 'default'
export type StatusTagSize = 'small' | 'medium' | 'large'

export interface StatusTagProps {
  /** 状态类型 */
  status: StatusTagType
  /** 显示文本 */
  text?: string
  /** 自定义颜色（CSS颜色值） */
  color?: string
  /** 是否点状样式 */
  dot?: boolean
  /** 尺寸 */
  size?: StatusTagSize
}

const props = withDefaults(defineProps<StatusTagProps>(), {
  status: 'default',
  dot: false,
  size: 'medium'
})

// 状态配置映射
const statusConfig: Record<StatusTagType, { text: string; color: string }> = {
  success: { text: '成功', color: '#52c41a' },
  warning: { text: '警告', color: '#faad14' },
  error: { text: '错误', color: '#f5222d' },
  info: { text: '信息', color: '#1890ff' },
  processing: { text: '进行中', color: '#1890ff' },
  default: { text: '默认', color: '#d9d9d9' }
}

// 计算当前状态的颜色
const currentColor = computed(() => {
  return props.color || statusConfig[props.status].color
})

// 计算显示文本
const displayText = computed(() => {
  return props.text ?? statusConfig[props.status].text
})

// 计算组件类名
const tagClasses = computed(() => [
  'status-tag',
  `status-tag--${props.status}`,
  `status-tag--${props.size}`,
  {
    'status-tag--dot': props.dot,
    'status-tag--filled': !props.dot
  }
])

// 计算组件样式
const tagStyle = computed(() => {
  return {
    '--status-color': currentColor.value
  } as Record<string, string>
})

// 计算点状样式
const dotStyle = computed(() => {
  return {
    '--dot-color': currentColor.value
  } as Record<string, string>
})

// 是否为 processing 状态（需要动画）
const isProcessing = computed(() => props.status === 'processing')
</script>

<template>
  <span :class="tagClasses" :style="tagStyle">
    <!-- 点状样式 -->
    <span
      v-if="dot"
      :class="[
        'status-tag__dot',
        { 'status-tag__dot--animated': isProcessing }
      ]"
      :style="dotStyle"
    />

    <!-- 文本内容 -->
    <span class="status-tag__text">
      <slot>{{ displayText }}</slot>
    </span>
  </span>
</template>

<style scoped lang="scss">
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 4px;
  transition: all 0.3s;

  // ========== 尺寸变体 ==========
  &--small {
    font-size: 12px;
    gap: 4px;

    .status-tag__dot {
      width: 6px;
      height: 6px;
    }

    .status-tag__text {
      padding: 0 4px;
    }
  }

  &--medium {
    font-size: 14px;
    gap: 6px;

    .status-tag__dot {
      width: 8px;
      height: 8px;
    }

    .status-tag__text {
      padding: 2px 8px;
    }
  }

  &--large {
    font-size: 16px;
    gap: 8px;

    .status-tag__dot {
      width: 10px;
      height: 10px;
    }

    .status-tag__text {
      padding: 4px 12px;
    }
  }

  // ========== 填充样式（默认） ==========
  &--filled {
    background-color: var(--status-color);
    color: #fff;

    .status-tag__text {
      padding: 2px 8px;
    }

    &.status-tag--small .status-tag__text {
      padding: 0 6px;
    }

    &.status-tag--large .status-tag__text {
      padding: 4px 12px;
    }
  }

  // ========== 点状样式 ==========
  &--dot {
    background-color: transparent;
    color: rgba(0, 0, 0, 0.85);

    .status-tag__text {
      padding: 0;
    }
  }

  // ========== 状态颜色（用于点状样式） ==========
  &--success {
    --status-color: #52c41a;
  }

  &--warning {
    --status-color: #faad14;
  }

  &--error {
    --status-color: #f5222d;
  }

  &--info {
    --status-color: #1890ff;
  }

  &--processing {
    --status-color: #1890ff;
  }

  &--default {
    --status-color: #d9d9d9;
  }

  // ========== 点元素 ==========
  &__dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--dot-color, var(--status-color));
    flex-shrink: 0;

    &--animated {
      animation: status-tag-pulse 1.2s ease-in-out infinite;
    }
  }

  // ========== 文本元素 ==========
  &__text {
    display: inline-block;
  }
}

// ========== 动画 ==========
@keyframes status-tag-pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
