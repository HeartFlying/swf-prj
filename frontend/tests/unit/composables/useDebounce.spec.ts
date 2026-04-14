import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDebounce } from '@/composables/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should debounce function calls', async () => {
    const fn = vi.fn()
    const debouncedFn = useDebounce(fn, 300)

    // Call multiple times
    debouncedFn()
    debouncedFn()
    debouncedFn()

    // Function should not be called immediately
    expect(fn).not.toHaveBeenCalled()

    // Fast-forward time
    vi.advanceTimersByTime(300)
    await nextTick()

    // Function should be called only once
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to debounced function', async () => {
    const fn = vi.fn()
    const debouncedFn = useDebounce(fn, 300)

    debouncedFn('arg1', 'arg2', 123)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123)
  })

  it('should reset timer on subsequent calls', async () => {
    const fn = vi.fn()
    const debouncedFn = useDebounce(fn, 300)

    debouncedFn()
    vi.advanceTimersByTime(200)

    // Call again before timer expires
    debouncedFn()
    vi.advanceTimersByTime(200)

    // Should still not be called
    expect(fn).not.toHaveBeenCalled()

    // Wait for full delay
    vi.advanceTimersByTime(100)
    await nextTick()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should support immediate execution option', async () => {
    const fn = vi.fn()
    const debouncedFn = useDebounce(fn, 300, { immediate: true })

    debouncedFn('first')

    // Should be called immediately
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')

    // Subsequent calls within delay should be ignored (not executed immediately)
    debouncedFn('second')
    debouncedFn('third')

    expect(fn).toHaveBeenCalledTimes(1)

    // After delay, the last call should execute (trailing behavior)
    vi.advanceTimersByTime(300)
    await nextTick()

    // The third call executes after delay
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')

    // Next call should execute immediately again
    debouncedFn('fourth')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenLastCalledWith('fourth')
  })

  it('should return the debounced function with cancel method', () => {
    const fn = vi.fn()
    const debouncedFn = useDebounce(fn, 300)

    expect(typeof debouncedFn).toBe('function')
    expect(typeof debouncedFn.cancel).toBe('function')
  })

  it('should cancel pending execution when cancel is called', async () => {
    const fn = vi.fn()
    const debouncedFn = useDebounce(fn, 300)

    debouncedFn()
    debouncedFn.cancel()

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).not.toHaveBeenCalled()
  })

  it('should handle ref value as delay', async () => {
    const fn = vi.fn()
    const delay = ref(500)
    const debouncedFn = useDebounce(fn, delay)

    debouncedFn()
    vi.advanceTimersByTime(300)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    await nextTick()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should update delay when ref changes', async () => {
    const fn = vi.fn()
    const delay = ref(500)
    const debouncedFn = useDebounce(fn, delay)

    debouncedFn()

    // Change delay
    delay.value = 100
    await nextTick()

    // New call should use new delay
    debouncedFn()
    vi.advanceTimersByTime(100)
    await nextTick()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle function returning value (though debounced returns undefined)', async () => {
    const fn = vi.fn().mockReturnValue('result')
    const debouncedFn = useDebounce(fn, 300)

    const result = debouncedFn()

    // Debounced call returns undefined immediately
    expect(result).toBeUndefined()

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fn).toHaveReturnedWith('result')
  })
})
