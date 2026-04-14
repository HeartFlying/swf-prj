import { ref, computed, type Ref, type ComputedRef, getCurrentScope, onScopeDispose } from 'vue'

/**
 * 断点键名
 */
export type BreakpointKey = 'XS' | 'SM' | 'MD' | 'LG' | 'XL' | 'XXL'

/**
 * 断点配置
 * 定义各断点的最小宽度（像素）
 */
export const breakpoints: Record<BreakpointKey, number> = {
  XS: 0, // < 576px
  SM: 576, // 576px - 767px
  MD: 768, // 768px - 991px
  LG: 992, // 992px - 1399px
  XL: 1400, // 1400px - 1599px
  XXL: 1600, // >= 1600px
}

/**
 * 断点顺序（从小到大）
 */
const breakpointOrder: BreakpointKey[] = ['XS', 'SM', 'MD', 'LG', 'XL', 'XXL']

/**
 * useBreakpoint 选项
 */
export interface UseBreakpointOptions {
  /**
   * 防抖延迟时间（毫秒）
   * @default 100
   */
  debounceDelay?: number
}

/**
 * useBreakpoint 返回值
 */
export interface UseBreakpointReturn {
  /** 当前断点 */
  current: Ref<BreakpointKey>
  /** 当前视口宽度 */
  width: Ref<number>
  /** 是否为 XS 断点 */
  isXS: ComputedRef<boolean>
  /** 是否为 SM 断点 */
  isSM: ComputedRef<boolean>
  /** 是否为 MD 断点 */
  isMD: ComputedRef<boolean>
  /** 是否为 LG 断点 */
  isLG: ComputedRef<boolean>
  /** 是否为 XL 断点 */
  isXL: ComputedRef<boolean>
  /** 是否为 XXL 断点 */
  isXXL: ComputedRef<boolean>
  /** 大于各断点的状态 */
  greaterThan: ComputedRef<Record<BreakpointKey, boolean>>
  /** 小于各断点的状态 */
  lessThan: ComputedRef<Record<BreakpointKey, boolean>>
}

/**
 * 根据宽度获取当前断点
 * @param width - 视口宽度
 * @returns 当前断点键名
 */
export function getCurrentBreakpoint(width: number): BreakpointKey {
  if (width >= breakpoints.XXL) return 'XXL'
  if (width >= breakpoints.XL) return 'XL'
  if (width >= breakpoints.LG) return 'LG'
  if (width >= breakpoints.MD) return 'MD'
  if (width >= breakpoints.SM) return 'SM'
  return 'XS'
}

/**
 * 检查当前断点是否大于目标断点
 * @param current - 当前断点
 * @param target - 目标断点
 * @returns 是否大于
 */
export function isGreaterThan(current: BreakpointKey, target: BreakpointKey): boolean {
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(target)
  return currentIndex > targetIndex
}

/**
 * 检查当前断点是否小于目标断点
 * @param current - 当前断点
 * @param target - 目标断点
 * @returns 是否小于
 */
export function isLessThan(current: BreakpointKey, target: BreakpointKey): boolean {
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(target)
  return currentIndex < targetIndex
}

/**
 * 检查当前断点是否在指定范围内（含边界）
 * @param current - 当前断点
 * @param min - 最小断点
 * @param max - 最大断点
 * @returns 是否在范围内
 */
export function isBetween(current: BreakpointKey, min: BreakpointKey, max: BreakpointKey): boolean {
  const currentIndex = breakpointOrder.indexOf(current)
  const minIndex = breakpointOrder.indexOf(min)
  const maxIndex = breakpointOrder.indexOf(max)
  return currentIndex >= minIndex && currentIndex <= maxIndex
}

/**
 * 断点响应式 Composable
 * 监听窗口大小变化，提供响应式断点状态
 *
 * @param options - 配置选项
 * @returns 断点响应式状态
 *
 * @example
 * ```ts
 * // 基础用法
 * const { current, isLG, greaterThan } = useBreakpoint()
 *
 * // 在模板中使用
 * <div v-if="isLG">大屏幕内容</div>
 * <div v-if="greaterThan.MD">大于中等屏幕</div>
 *
 * // 自定义防抖延迟
 * const { current } = useBreakpoint({ debounceDelay: 200 })
 * ```
 */
export function useBreakpoint(options: UseBreakpointOptions = {}): UseBreakpointReturn {
  const { debounceDelay = 100 } = options

  // 检查是否在浏览器环境
  const isClient = typeof window !== 'undefined'

  // 当前视口宽度
  const width = ref(isClient ? window.innerWidth : 0)

  // 当前断点
  const current = computed<BreakpointKey>(() => getCurrentBreakpoint(width.value))

  // 各断点状态
  const isXS = computed(() => current.value === 'XS')
  const isSM = computed(() => current.value === 'SM')
  const isMD = computed(() => current.value === 'MD')
  const isLG = computed(() => current.value === 'LG')
  const isXL = computed(() => current.value === 'XL')
  const isXXL = computed(() => current.value === 'XXL')

  // 大于各断点的状态
  const greaterThan = computed(() => ({
    XS: isGreaterThan(current.value, 'XS'),
    SM: isGreaterThan(current.value, 'SM'),
    MD: isGreaterThan(current.value, 'MD'),
    LG: isGreaterThan(current.value, 'LG'),
    XL: isGreaterThan(current.value, 'XL'),
    XXL: isGreaterThan(current.value, 'XXL'),
  }))

  // 小于各断点的状态
  const lessThan = computed(() => ({
    XS: isLessThan(current.value, 'XS'),
    SM: isLessThan(current.value, 'SM'),
    MD: isLessThan(current.value, 'MD'),
    LG: isLessThan(current.value, 'LG'),
    XL: isLessThan(current.value, 'XL'),
    XXL: isLessThan(current.value, 'XXL'),
  }))

  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 更新宽度
   */
  const updateWidth = (): void => {
    if (isClient) {
      width.value = window.innerWidth
    }
  }

  /**
   * 处理窗口大小变化
   */
  const handleResize = (): void => {
    if (debounceDelay > 0) {
      // 防抖处理
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }
      resizeTimer = setTimeout(updateWidth, debounceDelay)
    } else {
      // 立即更新
      updateWidth()
    }
  }

  /**
   * 清理函数
   */
  const cleanup = (): void => {
    if (isClient) {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) {
        clearTimeout(resizeTimer)
        resizeTimer = null
      }
    }
  }

  // 在客户端环境立即设置事件监听
  if (isClient) {
    window.addEventListener('resize', handleResize)
    // 初始化时确保宽度正确
    updateWidth()

    // 如果在 effect scope 中，注册清理函数
    if (getCurrentScope()) {
      onScopeDispose(cleanup)
    }
  }

  return {
    current,
    width,
    isXS,
    isSM,
    isMD,
    isLG,
    isXL,
    isXXL,
    greaterThan,
    lessThan,
  }
}

export default useBreakpoint
