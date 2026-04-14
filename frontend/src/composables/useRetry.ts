import { ref, computed, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface UseRetryOptions {
  /** 最大重试次数 */
  maxRetries?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
  /** 重试回调函数 */
  onRetry?: () => void
}

export interface UseRetryReturn {
  /** 当前重试次数 */
  retryCount: Ref<number>
  /** 是否正在重试中 */
  isRetrying: Ref<boolean>
  /** 是否还可以重试 */
  canRetry: ComputedRef<boolean>
  /** 执行重试 */
  retry: () => void
  /** 重置重试计数 */
  reset: () => void
}

/**
 * 重试逻辑组合式函数
 * @param options - 配置选项
 * @returns 重试相关状态和方法
 */
export function useRetry(options: UseRetryOptions = {}): UseRetryReturn {
  const { maxRetries = 3, retryDelay = 500, onRetry } = options

  const retryCount = ref(0)
  const isRetrying = ref(false)
  let retryTimeout: ReturnType<typeof setTimeout> | null = null

  const canRetry = computed(() => retryCount.value < maxRetries)

  const retry = () => {
    if (isRetrying.value || !canRetry.value) return

    isRetrying.value = true

    retryTimeout = setTimeout(() => {
      retryCount.value++
      onRetry?.()
      isRetrying.value = false
    }, retryDelay)
  }

  const reset = () => {
    retryCount.value = 0
    isRetrying.value = false
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
  }

  onUnmounted(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout)
    }
  })

  return {
    retryCount,
    isRetrying,
    canRetry,
    retry,
    reset,
  }
}

export interface UseAutoRetryOptions extends UseRetryOptions {
  /** 自动重试延迟（秒） */
  autoRetryDelay?: number
  /** 是否启用自动重试 */
  enabled?: boolean
}

export interface UseAutoRetryReturn extends UseRetryReturn {
  /** 倒计时数值 */
  countdown: Ref<number>
  /** 是否显示自动重试 */
  showAutoRetry: Ref<boolean>
  /** 开始自动重试 */
  startAutoRetry: () => void
  /** 取消自动重试 */
  cancelAutoRetry: () => void
}

/**
 * 自动重试逻辑组合式函数
 * @param options - 配置选项
 * @returns 自动重试相关状态和方法
 */
export function useAutoRetry(options: UseAutoRetryOptions = {}): UseAutoRetryReturn {
  const { autoRetryDelay = 5, enabled = false, onRetry, ...retryOptions } = options

  const baseRetry = useRetry({ ...retryOptions, onRetry })
  const countdown = ref(autoRetryDelay)
  const showAutoRetry = ref(enabled)
  let timer: ReturnType<typeof setInterval> | null = null

  const startAutoRetry = () => {
    if (timer) return

    countdown.value = autoRetryDelay
    showAutoRetry.value = true

    timer = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        clearInterval(timer!)
        timer = null
        showAutoRetry.value = false
        baseRetry.retry()
      }
    }, 1000)
  }

  const cancelAutoRetry = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    showAutoRetry.value = false
  }

  const reset = () => {
    baseRetry.reset()
    cancelAutoRetry()
  }

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  return {
    ...baseRetry,
    countdown,
    showAutoRetry,
    startAutoRetry,
    cancelAutoRetry,
    reset,
  }
}
