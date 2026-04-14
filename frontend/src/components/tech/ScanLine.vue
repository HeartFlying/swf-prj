<template>
  <div class="scan-line-container" :class="{ 'full-screen': fullScreen }">
    <div class="scan-line" :class="`direction-${direction}`" :style="lineStyle" />
    <!-- 网格背景 -->
    <div v-if="grid" class="grid-overlay" :style="gridStyle" />
    <!-- 粒子效果 -->
    <div v-if="particles" class="particles-container">
      <span v-for="n in particleCount" :key="n" class="particle" :style="getParticleStyle(n)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  direction?: 'horizontal' | 'vertical'
  speed?: number
  color?: string
  opacity?: number
  width?: number
  fullScreen?: boolean
  grid?: boolean
  gridSize?: number
  gridOpacity?: number
  particles?: boolean
  particleCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'horizontal',
  speed: 3,
  color: 'var(--tech-cyan)',
  opacity: 0.6,
  width: 2,
  fullScreen: true,
  grid: false,
  gridSize: 50,
  gridOpacity: 0.03,
  particles: false,
  particleCount: 20,
})

const lineStyle = computed(() => ({
  background: `linear-gradient(
    ${props.direction === 'horizontal' ? '90deg' : '180deg'},
    transparent,
    ${props.color},
    transparent
  )`,
  opacity: props.opacity,
  [props.direction === 'horizontal' ? 'height' : 'width']: `${props.width}px`,
  animationDuration: `${props.speed}s`,
}))

const gridStyle = computed(() => ({
  backgroundImage: `
    linear-gradient(rgba(0, 212, 255, ${props.gridOpacity}) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, ${props.gridOpacity}) 1px, transparent 1px)
  `,
  backgroundSize: `${props.gridSize}px ${props.gridSize}px`,
}))

// 将 CSS 变量转换为 RGB 值用于 grid
const getGridColor = () => {
  // 使用 tech-cyan 的 RGB 值
  return '0, 212, 255'
}

const getParticleStyle = (_index: number) => {
  const size = Math.random() * 4 + 2
  const left = Math.random() * 100
  const delay = Math.random() * 5
  const duration = Math.random() * 3 + 4
  const tx = (Math.random() - 0.5) * 200
  const ty = (Math.random() - 0.5) * 200

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    '--tx': `${tx}px`,
    '--ty': `${ty}px`,
  } as Record<string, string>
}
</script>

<style scoped lang="scss">
.scan-line-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;

  &.full-screen {
    position: fixed;
  }

  .scan-line {
    position: absolute;
    animation: scan-horizontal 3s linear infinite;

    &.direction-horizontal {
      left: 0;
      right: 0;
      animation-name: scan-horizontal;
    }

    &.direction-vertical {
      top: 0;
      bottom: 0;
      animation-name: scan-vertical;
    }
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
  }

  .particles-container {
    position: absolute;
    inset: 0;

    .particle {
      position: absolute;
      background: var(--tech-cyan);
      border-radius: 50%;
      opacity: 0;
      animation: particle-float 5s ease-in-out infinite;
      box-shadow: 0 0 6px var(--tech-cyan);
    }
  }
}

@keyframes scan-horizontal {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(calc(100vh + 100%));
  }
}

@keyframes scan-vertical {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(calc(100vw + 100%));
  }
}

@keyframes particle-float {
  0%,
  100% {
    transform: translate(0, 0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translate(var(--tx), var(--ty));
    opacity: 0;
  }
}
</style>
