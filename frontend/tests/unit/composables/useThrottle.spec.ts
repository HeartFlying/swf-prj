import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useThrottle } from '@/composables/useThrottle'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should throttle function calls with default options (leading: true, trailing: false)', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300)

    // First call should execute immediately
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    // Subsequent calls within delay should be ignored
    throttledFn()
    throttledFn()
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    // After delay, next call should execute
    vi.advanceTimersByTime(300)
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should pass arguments to throttled function', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300)

    throttledFn('arg1', 'arg2', 123)
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123)
  })

  it('should support trailing execution option', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: false, trailing: true })

    // First call should not execute immediately
    throttledFn('first')
    expect(fn).not.toHaveBeenCalled()

    // Call again
    throttledFn('second')
    expect(fn).not.toHaveBeenCalled()

    // After delay, last call should execute
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('should support both leading and trailing execution', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: true, trailing: true })

    // First call executes immediately
    throttledFn('first')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')

    // Subsequent calls queued
    throttledFn('second')
    throttledFn('third')

    // After delay, last queued call executes
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('should support neither leading nor trailing (no execution)', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: false, trailing: false })

    throttledFn()
    throttledFn()

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).not.toHaveBeenCalled()
  })

  it('should return the throttled function with cancel and flush methods', () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300)

    expect(typeof throttledFn).toBe('function')
    expect(typeof throttledFn.cancel).toBe('function')
    expect(typeof throttledFn.flush).toBe('function')
  })

  it('should cancel pending trailing execution when cancel is called', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: false, trailing: true })

    throttledFn()
    throttledFn.cancel()

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).not.toHaveBeenCalled()
  })

  it('should flush pending trailing execution immediately when flush is called', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: false, trailing: true })

    throttledFn('test')
    expect(fn).not.toHaveBeenCalled()

    throttledFn.flush()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('test')

    // After flush, timer should be cleared
    vi.advanceTimersByTime(300)
    await nextTick()

    // Should not be called again
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle ref value as limit', async () => {
    const fn = vi.fn()
    const limit = ref(500)
    const throttledFn = useThrottle(fn, limit, { leading: true })

    // First call executes
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    // Call during throttle period
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    // Wait for throttle period
    vi.advanceTimersByTime(500)
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should use latest arguments for trailing execution', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: true, trailing: true })

    throttledFn('first')
    throttledFn('second')
    throttledFn('third')

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('should reset throttle period after execution', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: true })

    // First call
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    // Wait full period
    vi.advanceTimersByTime(300)

    // Next call should execute
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(2)

    // Call immediately after
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(2) // Should not execute
  })

  it('should handle multiple flush calls correctly', async () => {
    const fn = vi.fn()
    const throttledFn = useThrottle(fn, 300, { leading: false, trailing: true })

    throttledFn('first')
    throttledFn.flush()
    expect(fn).toHaveBeenCalledTimes(1)

    // Second flush should do nothing
    throttledFn.flush()
    expect(fn).toHaveBeenCalledTimes(1)

    // New call and flush
    throttledFn('second')
    throttledFn.flush()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should handle ref limit changes', async () => {
    const fn = vi.fn()
    const limit = ref(500)
    const throttledFn = useThrottle(fn, limit, { leading: true })

    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    // Change limit
    limit.value = 100
    await nextTick()

    // Wait for new limit
    vi.advanceTimersByTime(100)
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
