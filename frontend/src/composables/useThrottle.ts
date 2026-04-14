import { ref, type Ref } from 'vue'

/**
 * 节流选项
 */
export interface ThrottleOptions {
  /**
   * 是否在开始时执行
   * @default true
   */
  leading?: boolean
  /**
   * 是否在结束时执行
   * @default false
   */
  trailing?: boolean
}

/**
 * 节流函数返回值
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined
  /**
   * 取消待执行的节流调用
   */
  cancel: () => void
  /**
   * 立即执行待执行的节流调用
   */
  flush: () => void
}

/**
 * 节流 composable
 * 用于限制函数在指定时间内的执行次数，按固定频率执行
 *
 * @param fn 需要节流的函数
 * @param limit 限制时间（毫秒），可以是 ref 响应式值
 * @param options 节流选项
 * @returns 节流后的函数，带有 cancel 和 flush 方法
 *
 * @example
 * ```ts
 * // 默认配置：leading: true, trailing: false
 * const throttledScroll = useThrottle(handleScroll, 100)
 *
 * // 结束时执行
 * const throttledResize = useThrottle(handleResize, 200, { leading: false, trailing: true })
 *
 * // 开始和结束都执行
 * const throttledInput = useThrottle(handleInput, 300, { leading: true, trailing: true })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number | Ref<number>,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = false } = options
  const limitRef = typeof limit === 'number' ? ref(limit) : limit

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastCallTime: number | null = null

  const invokeFn = (args: Parameters<T>): ReturnType<T> => {
    lastCallTime = Date.now()
    lastArgs = null
    return fn(...args)
  }

  const shouldInvoke = (time: number): boolean => {
    if (lastCallTime === null) return true
    const timeSinceLastCall = time - lastCallTime
    return timeSinceLastCall >= limitRef.value
  }

  const trailingEdge = (): void => {
    timer = null
    if (trailing && lastArgs) {
      invokeFn(lastArgs)
    }
    lastArgs = null
  }

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    lastArgs = null
    lastCallTime = null
  }

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer)
      trailingEdge()
    }
  }

  const throttledFn = (...args: Parameters<T>): ReturnType<T> | undefined => {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args

    if (isInvoking) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }

      if (leading) {
        return invokeFn(args)
      } else {
        lastCallTime = time
        if (trailing) {
          timer = setTimeout(() => trailingEdge(), limitRef.value)
        }
        return undefined
      }
    }

    if (!timer && trailing) {
      timer = setTimeout(() => trailingEdge(), limitRef.value - (time - (lastCallTime || 0)))
    }

    return undefined
  }

  throttledFn.cancel = cancel
  throttledFn.flush = flush

  return throttledFn
}

export default useThrottle
