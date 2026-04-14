import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useRetry, useAutoRetry } from '@/composables/useRetry'

// 辅助函数：在 Vue 组合式函数中运行测试
function runComposable<T>(fn: () => T): T {
  return fn()
}

describe('useRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default values', () => {
    const { retryCount, isRetrying, canRetry } = runComposable(() => useRetry())

    expect(retryCount.value).toBe(0)
    expect(isRetrying.value).toBe(false)
    expect(canRetry.value).toBe(true)
  })

  it('should increment retry count when retry is called', () => {
    const onRetry = vi.fn()
    const { retryCount, retry } = runComposable(() =>
      useRetry({ onRetry })
    )

    retry()
    vi.advanceTimersByTime(500)

    expect(retryCount.value).toBe(1)
    expect(onRetry).toHaveBeenCalled()
  })

  it('should not retry when max retries reached', () => {
    const onRetry = vi.fn()
    const { retry, canRetry } = runComposable(() =>
      useRetry({ maxRetries: 1, onRetry })
    )

    retry()
    vi.advanceTimersByTime(500)

    expect(canRetry.value).toBe(false)

    // 再次重试应该不执行
    retry()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should set isRetrying during retry', () => {
    const { isRetrying, retry } = runComposable(() => useRetry())

    retry()
    expect(isRetrying.value).toBe(true)

    vi.advanceTimersByTime(500)
    expect(isRetrying.value).toBe(false)
  })

  it('should reset all state when reset is called', () => {
    const { retryCount, reset, retry } = runComposable(() =>
      useRetry({ maxRetries: 1 })
    )

    retry()
    vi.advanceTimersByTime(500)

    expect(retryCount.value).toBe(1)

    reset()
    expect(retryCount.value).toBe(0)
  })

  it('should use custom retry delay', () => {
    const onRetry = vi.fn()
    const { retry } = runComposable(() =>
      useRetry({ retryDelay: 1000, onRetry })
    )

    retry()
    expect(onRetry).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('useAutoRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with enabled state', () => {
    const { showAutoRetry, countdown } = runComposable(() =>
      useAutoRetry({ enabled: true, autoRetryDelay: 5 })
    )

    expect(showAutoRetry.value).toBe(true)
    expect(countdown.value).toBe(5)
  })

  it('should countdown when startAutoRetry is called', () => {
    const { countdown, startAutoRetry } = runComposable(() =>
      useAutoRetry({ autoRetryDelay: 5 })
    )

    startAutoRetry()
    expect(countdown.value).toBe(5)

    vi.advanceTimersByTime(1000)
    expect(countdown.value).toBe(4)

    vi.advanceTimersByTime(2000)
    expect(countdown.value).toBe(2)
  })

  it('should trigger retry when countdown reaches zero', () => {
    const onRetry = vi.fn()
    const { startAutoRetry } = runComposable(() =>
      useAutoRetry({ autoRetryDelay: 3, onRetry })
    )

    startAutoRetry()

    vi.advanceTimersByTime(3000)
    vi.advanceTimersByTime(500) // 等待 retry 延迟

    expect(onRetry).toHaveBeenCalled()
  })

  it('should cancel auto retry when cancelAutoRetry is called', () => {
    const onRetry = vi.fn()
    const { startAutoRetry, cancelAutoRetry, showAutoRetry } = runComposable(() =>
      useAutoRetry({ autoRetryDelay: 5, onRetry })
    )

    startAutoRetry()
    cancelAutoRetry()

    expect(showAutoRetry.value).toBe(false)

    vi.advanceTimersByTime(5000)
    vi.advanceTimersByTime(500)

    expect(onRetry).not.toHaveBeenCalled()
  })

  it('should hide auto retry after countdown completes', () => {
    const { startAutoRetry, showAutoRetry } = runComposable(() =>
      useAutoRetry({ autoRetryDelay: 2 })
    )

    startAutoRetry()
    expect(showAutoRetry.value).toBe(true)

    vi.advanceTimersByTime(2000)
    vi.advanceTimersByTime(500)

    expect(showAutoRetry.value).toBe(false)
  })

  it('should reset all state when reset is called', () => {
    const { startAutoRetry, showAutoRetry, retryCount, reset } = runComposable(() =>
      useAutoRetry({ autoRetryDelay: 5, enabled: true })
    )

    expect(showAutoRetry.value).toBe(true)

    reset()

    expect(showAutoRetry.value).toBe(false)
    expect(retryCount.value).toBe(0)
  })

  it('should not start multiple timers', () => {
    const onRetry = vi.fn()
    const { startAutoRetry } = runComposable(() =>
      useAutoRetry({ autoRetryDelay: 2, onRetry })
    )

    startAutoRetry()
    startAutoRetry() // 第二次调用应该被忽略

    vi.advanceTimersByTime(2000)
    vi.advanceTimersByTime(500)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
