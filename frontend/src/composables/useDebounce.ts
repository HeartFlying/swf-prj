import { ref, type Ref } from 'vue'

/**
 * 防抖选项
 */
export interface DebounceOptions {
  /**
   * 是否立即执行
   * @default false
   */
  immediate?: boolean
}

/**
 * 防抖函数返回值
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined
  /**
   * 取消待执行的防抖调用
   */
  cancel: () => void
}

/**
 * 防抖 composable
 * 用于限制函数在指定时间内的执行次数，延迟执行直到停止调用一段时间后才执行
 *
 * @param fn 需要防抖的函数
 * @param delay 延迟时间（毫秒），可以是 ref 响应式值
 * @param options 防抖选项
 * @returns 防抖后的函数，带有 cancel 方法
 *
 * @example
 * ```ts
 * const debouncedSearch = useDebounce((query: string) => {
 *   return searchAPI(query)
 * }, 300)
 *
 * // 立即执行模式
 * const debouncedSave = useDebounce(saveData, 500, { immediate: true })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number | Ref<number>,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { immediate = false } = options
  const delayRef = typeof delay === 'number' ? ref(delay) : delay

  let timer: ReturnType<typeof setTimeout> | null = null
  let isImmediateInvoked = false

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const debouncedFn = (...args: Parameters<T>): ReturnType<T> | undefined => {
    cancel()

    if (immediate && !isImmediateInvoked) {
      isImmediateInvoked = true
      return fn(...args)
    }

    timer = setTimeout(() => {
      timer = null
      isImmediateInvoked = false
      fn(...args)
    }, delayRef.value)

    return undefined
  }

  debouncedFn.cancel = cancel

  return debouncedFn
}

export default useDebounce
