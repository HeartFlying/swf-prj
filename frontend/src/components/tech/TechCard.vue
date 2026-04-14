<!--
  TechCard Component
  科技感卡片组件

  @description 具有科技风格的卡片组件，支持多种变体、悬停效果和角标装饰
  @author DevMetrics Team

  @example
  <TechCard title="卡片标题" :icon="IconComponent" variant="primary">
    卡片内容
  </TechCard>
-->
<template>
  <div
    class="tech-card"
    :class="[`variant-${variant}`, { hoverable: hoverable, glow: glow, corner: cornerDecoration }]"
    :style="customStyle"
  >
    <div v-if="title || $slots.header" class="card-header">
      <div class="header-content">
        <span v-if="icon" class="header-icon">
          <el-icon><component :is="icon" /></el-icon>
        </span>
        <h3 v-if="title" class="card-title">{{ title }}</h3>
        <slot name="header-extra" />
      </div>
      <div v-if="$slots.header" class="header-slot">
        <slot name="header" />
      </div>
    </div>
    <div class="card-body" :class="{ 'no-padding': noPadding }">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
    <div v-if="scanLine" class="scan-line" />
  </div>
</template>

<script setup lang="ts">
/**
 * TechCard Component Logic
 * 科技感卡片组件逻辑
 *
 * @description 提供科技风格卡片的样式计算和属性处理
 */
import { computed } from 'vue'
import type { Component } from 'vue'

/**
 * TechCard 组件属性接口
 * @interface Props
 */
interface Props {
  /** 卡片标题 */
  title?: string
  /** 标题图标组件 */
  icon?: Component
  /** 变体样式：default | primary | success | warning | danger */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  /** 是否启用悬停效果 */
  hoverable?: boolean
  /** 是否启用发光效果 */
  glow?: boolean
  /** 是否显示角标装饰 */
  cornerDecoration?: boolean
  /** 是否显示扫描线动画 */
  scanLine?: boolean
  /** 内容区是否无内边距 */
  noPadding?: boolean
  /** 卡片高度 */
  height?: string
  /** 卡片最小高度 */
  minHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  hoverable: true,
  glow: false,
  cornerDecoration: true,
  scanLine: false,
  noPadding: false,
})

/**
 * 计算自定义样式
 * @returns {Record<string, string>} 样式对象
 */
const customStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.height) style.height = props.height
  if (props.minHeight) style.minHeight = props.minHeight
  return style
})
</script>

<style scoped lang="scss">
.tech-card {
  position: relative;
  background: var(--tech-bg-card);
  border: 1px solid var(--tech-border-secondary);
  border-radius: var(--tech-radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;

  // 角标装饰
  &.corner::before,
  &.corner::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border: 2px solid var(--tech-cyan);
    transition: all 0.3s ease;
    z-index: 1;
  }

  &.corner::before {
    top: -1px;
    left: -1px;
    border-right: none;
    border-bottom: none;
    border-top-left-radius: var(--tech-radius-lg);
  }

  &.corner::after {
    bottom: -1px;
    right: -1px;
    border-left: none;
    border-top: none;
    border-bottom-right-radius: var(--tech-radius-lg);
  }

  // 变体样式
  &.variant-primary {
    border-color: var(--tech-border-cyan);

    &.corner::before,
    &.corner::after {
      border-color: var(--tech-cyan);
    }
  }

  &.variant-success {
    border-color: var(--tech-border-green);

    &.corner::before,
    &.corner::after {
      border-color: var(--tech-green);
    }
  }

  &.variant-warning {
    border-color: var(--tech-border-orange);

    &.corner::before,
    &.corner::after {
      border-color: var(--tech-orange);
    }
  }

  &.variant-danger {
    border-color: var(--tech-border-pink);

    &.corner::before,
    &.corner::after {
      border-color: var(--tech-pink);
    }
  }

  // 悬停效果
  &.hoverable:hover {
    border-color: var(--tech-border-primary);
    box-shadow: var(--tech-glow-cyan-sm);
    transform: translateY(-2px);

    &.corner::before,
    &.corner::after {
      width: 20px;
      height: 20px;
    }
  }

  // 发光效果
  &.glow {
    box-shadow: var(--tech-glow-cyan-sm);
    animation: pulse-glow 3s ease-in-out infinite;
  }

  // 头部
  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--tech-border-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: rgba(0, 212, 255, 0.1);
      border-radius: var(--tech-radius-sm);
      color: var(--tech-cyan);
    }

    .card-title {
      margin: 0;
      font-size: var(--tech-font-size-md);
      font-weight: var(--tech-font-weight-semibold);
      color: var(--tech-text-primary);
      font-family: var(--tech-font-chinese);
    }
  }

  // 内容区
  .card-body {
    flex: 1;
    padding: 20px;
    overflow: auto;

    &.no-padding {
      padding: 0;
    }
  }

  // 底部
  .card-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--tech-border-secondary);
    background: rgba(0, 0, 0, 0.2);
  }

  // 扫描线
  .scan-line {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--tech-cyan), transparent);
    animation: scan-line 3s linear infinite;
    opacity: 0.6;
    pointer-events: none;
  }
}

@keyframes scan-line {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(calc(100% + 400px));
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: var(--tech-glow-cyan-sm);
  }
  50% {
    box-shadow: var(--tech-glow-cyan);
  }
}
</style>
