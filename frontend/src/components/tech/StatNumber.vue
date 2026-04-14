<template>
  <span ref="numberRef" class="stat-number">{{ displayValue }}</span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Props {
  value: number
  decimals?: number
  duration?: number
  separator?: string
  prefix?: string
  suffix?: string
  startOnMount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  decimals: 0,
  duration: 1500,
  separator: ',',
  prefix: '',
  suffix: '',
  startOnMount: true,
})

const numberRef = ref<HTMLElement>()
const currentValue = ref(0)
const isAnimating = ref(false)

const getValue = <T,>(val: T | undefined, defaultVal: T): T => {
  return val === undefined ? defaultVal : val
}

const displayValue = computed(() => {
  const decimals = getValue(props.decimals, 0)
  const separator = getValue(props.separator, ',')
  const prefix = getValue(props.prefix, '')
  const suffix = getValue(props.suffix, '')
  const num = currentValue.value.toFixed(decimals)
  const parts = num.split('.')
  // @ts-ignore - TypeScript incorrectly infers separator as possibly undefined
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  const decimalPart = parts[1] ? `.${parts[1]}` : ''
  return `${prefix}${integerPart}${decimalPart}${suffix}`
})

const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4)
}

const animate = (targetValue: number) => {
  if (isAnimating.value) return

  isAnimating.value = true
  const startValue = currentValue.value
  const startTime = performance.now()

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    const easedProgress = easeOutQuart(progress)

    currentValue.value = startValue + (targetValue - startValue) * easedProgress

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      currentValue.value = targetValue
      isAnimating.value = false
    }
  }

  requestAnimationFrame(step)
}

const startAnimation = () => {
  currentValue.value = 0
  animate(props.value)
}

// 监听值变化
watch(
  () => props.value,
  newValue => {
    // 如果值发生变化，重新启动动画
    if (newValue !== currentValue.value) {
      // 取消当前动画，以新值重新动画
      isAnimating.value = false
      animate(newValue)
    }
  },
  { immediate: false }
)

onMounted(() => {
  if (props.startOnMount) {
    startAnimation()
  } else {
    currentValue.value = props.value
  }
})

defineExpose({
  startAnimation,
})
</script>

<style scoped lang="scss">
.stat-number {
  font-family: var(--tech-font-mono);
  font-variant-numeric: tabular-nums;
}
</style>
