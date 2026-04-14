<template>
  <div
    class="data-panel"
    :class="{
      clickable: clickable,
      glow: glow,
      pulse: pulse,
      horizontal: horizontal,
    }"
    @click="handleClick"
  >
    <div class="panel-icon" :style="iconStyle" v-if="icon">
      <el-icon><component :is="icon" /></el-icon>
    </div>
    <div class="panel-content">
      <div class="panel-label">{{ label }}</div>
      <div class="panel-value" :style="valueStyle">
        <span v-if="prefix" class="value-prefix">{{ prefix }}</span>
        <stat-number
          v-if="animated"
          :value="numericValue"
          :decimals="decimals"
          :duration="duration"
        />
        <span v-else class="value-text">{{ formattedValue }}</span>
        <span v-if="suffix" class="value-suffix">{{ suffix }}</span>
      </div>
      <div v-if="trend !== undefined" class="panel-trend" :class="trendClass">
        <el-icon>
          <component :is="trend >= 0 ? ArrowUp : ArrowDown" />
        </el-icon>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>
    <div v-if="cornerDecoration" class="corner-decoration" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import StatNumber from './StatNumber.vue'

interface Props {
  label: string
  value: string | number
  icon?: Component
  iconColor?: string
  iconBgColor?: string
  valueColor?: string
  prefix?: string
  suffix?: string
  trend?: number
  decimals?: number
  animated?: boolean
  duration?: number
  clickable?: boolean
  glow?: boolean
  pulse?: boolean
  horizontal?: boolean
  cornerDecoration?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'var(--tech-cyan)',
  iconBgColor: 'var(--tech-border-secondary)',
  valueColor: 'var(--tech-text-primary)',
  decimals: 0,
  animated: true,
  duration: 1500,
  clickable: false,
  glow: false,
  pulse: false,
  horizontal: false,
  cornerDecoration: true,
})

const emit = defineEmits<{
  click: []
}>()

const numericValue = computed(() => {
  const num = typeof props.value === 'string' ? parseFloat(props.value) : props.value
  return isNaN(num) ? 0 : num
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString('zh-CN', {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals,
    })
  }
  return props.value
})

const iconStyle = computed(() => ({
  color: props.iconColor,
  background: props.iconBgColor,
}))

const valueStyle = computed(() => ({
  color: props.valueColor,
}))

const trendClass = computed(() => ({
  'trend-up': (props.trend || 0) >= 0,
  'trend-down': (props.trend || 0) < 0,
}))

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped lang="scss">
.data-panel {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--tech-bg-card);
  border: 1px solid var(--tech-border-secondary);
  border-radius: var(--tech-radius-lg);
  transition: all 0.3s ease;
  overflow: hidden;

  &.clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--tech-border-primary);
      transform: translateY(-2px);
      box-shadow: var(--tech-glow-cyan-sm);
    }
  }

  &.glow {
    box-shadow: var(--tech-glow-cyan-sm);
  }

  &.pulse {
    animation: panel-pulse 2s ease-in-out infinite;
  }

  &.horizontal {
    flex-direction: row;
    align-items: center;

    .panel-content {
      flex-direction: row;
      align-items: center;
      gap: 16px;
    }
  }

  .panel-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--tech-radius-md);
    font-size: 24px;
    flex-shrink: 0;
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .panel-label {
    font-size: var(--tech-font-size-sm);
    color: var(--tech-text-muted);
    font-family: var(--tech-font-chinese);
  }

  .panel-value {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-family: var(--tech-font-mono);
    font-size: var(--tech-font-size-3xl);
    font-weight: var(--tech-font-weight-bold);

    .value-prefix,
    .value-suffix {
      font-size: var(--tech-font-size-md);
      font-weight: var(--tech-font-weight-medium);
      color: var(--tech-text-muted);
    }

    .value-text {
      font-size: var(--tech-font-size-3xl);
      font-weight: var(--tech-font-weight-bold);
    }
  }

  .panel-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--tech-font-size-sm);
    font-family: var(--tech-font-mono);
    margin-top: 4px;

    &.trend-up {
      color: var(--tech-green);
    }

    &.trend-down {
      color: var(--tech-pink);
    }

    .el-icon {
      font-size: var(--tech-font-size-sm);
    }
  }

  .corner-decoration {
    position: absolute;
    top: 0;
    right: 0;
    width: 40px;
    height: 40px;

    &::before {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-top: 2px solid var(--tech-cyan);
      border-right: 2px solid var(--tech-cyan);
      opacity: 0.5;
    }
  }
}

@keyframes panel-pulse {
  0%,
  100% {
    box-shadow: var(--tech-glow-cyan-sm);
  }
  50% {
    box-shadow: var(--tech-glow-cyan);
  }
}
</style>
