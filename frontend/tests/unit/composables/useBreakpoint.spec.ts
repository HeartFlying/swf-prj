import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, effectScope } from 'vue'
import {
  useBreakpoint,
  breakpoints,
  isGreaterThan,
  isLessThan,
  isBetween,
  getCurrentBreakpoint
} from '@/composables/useBreakpoint'

describe('useBreakpoint', () => {
  // Mock window and document for node environment
  let mockWindow: {
    innerWidth: number
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    dispatchEvent: ReturnType<typeof vi.fn>
  }
  let eventListeners: Map<string, EventListener[]>

  beforeEach(() => {
    eventListeners = new Map()

    mockWindow = {
      innerWidth: 1024,
      addEventListener: vi.fn((event: string, listener: EventListener) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, [])
        }
        eventListeners.get(event)!.push(listener)
      }),
      removeEventListener: vi.fn((event: string, listener: EventListener) => {
        const listeners = eventListeners.get(event)
        if (listeners) {
          const index = listeners.indexOf(listener)
          if (index > -1) {
            listeners.splice(index, 1)
          }
        }
      }),
      dispatchEvent: vi.fn((event: Event) => {
        const listeners = eventListeners.get(event.type)
        if (listeners) {
          listeners.forEach(listener => listener(event))
        }
      })
    }

    // @ts-expect-error - mock window for node environment
    global.window = mockWindow
  })

  afterEach(() => {
    vi.restoreAllMocks()
    eventListeners.clear()
    // @ts-expect-error - cleanup
    global.window = undefined
  })

  describe('breakpoints', () => {
    it('should have correct breakpoint values', () => {
      expect(breakpoints).toEqual({
        XS: 0,
        SM: 576,
        MD: 768,
        LG: 992,
        XL: 1400,
        XXL: 1600
      })
    })
  })

  describe('getCurrentBreakpoint', () => {
    it('should return XS for width < 576', () => {
      expect(getCurrentBreakpoint(575)).toBe('XS')
      expect(getCurrentBreakpoint(0)).toBe('XS')
    })

    it('should return SM for width 576-767', () => {
      expect(getCurrentBreakpoint(576)).toBe('SM')
      expect(getCurrentBreakpoint(767)).toBe('SM')
    })

    it('should return MD for width 768-991', () => {
      expect(getCurrentBreakpoint(768)).toBe('MD')
      expect(getCurrentBreakpoint(991)).toBe('MD')
    })

    it('should return LG for width 992-1399', () => {
      expect(getCurrentBreakpoint(992)).toBe('LG')
      expect(getCurrentBreakpoint(1399)).toBe('LG')
    })

    it('should return XL for width 1400-1599', () => {
      expect(getCurrentBreakpoint(1400)).toBe('XL')
      expect(getCurrentBreakpoint(1599)).toBe('XL')
    })

    it('should return XXL for width >= 1600', () => {
      expect(getCurrentBreakpoint(1600)).toBe('XXL')
      expect(getCurrentBreakpoint(1920)).toBe('XXL')
    })
  })

  describe('isGreaterThan', () => {
    it('should return true when current breakpoint is greater than target', () => {
      expect(isGreaterThan('LG', 'MD')).toBe(true)
      expect(isGreaterThan('XXL', 'SM')).toBe(true)
    })

    it('should return false when current breakpoint is less than or equal to target', () => {
      expect(isGreaterThan('SM', 'MD')).toBe(false)
      expect(isGreaterThan('MD', 'MD')).toBe(false)
      expect(isGreaterThan('XS', 'XXL')).toBe(false)
    })
  })

  describe('isLessThan', () => {
    it('should return true when current breakpoint is less than target', () => {
      expect(isLessThan('SM', 'MD')).toBe(true)
      expect(isLessThan('XS', 'XXL')).toBe(true)
    })

    it('should return false when current breakpoint is greater than or equal to target', () => {
      expect(isLessThan('MD', 'SM')).toBe(false)
      expect(isLessThan('LG', 'LG')).toBe(false)
    })
  })

  describe('isBetween', () => {
    it('should return true when current breakpoint is between min and max (inclusive)', () => {
      expect(isBetween('MD', 'SM', 'LG')).toBe(true)
      expect(isBetween('SM', 'SM', 'LG')).toBe(true)
      expect(isBetween('LG', 'SM', 'LG')).toBe(true)
    })

    it('should return false when current breakpoint is outside range', () => {
      expect(isBetween('XS', 'SM', 'LG')).toBe(false)
      expect(isBetween('XXL', 'SM', 'LG')).toBe(false)
    })
  })

  describe('useBreakpoint composable', () => {
    it('should initialize with current breakpoint', () => {
      mockWindow.innerWidth = 1024

      const { current } = useBreakpoint()
      expect(current.value).toBe('LG')
    })

    it('should provide reactive breakpoint refs', () => {
      mockWindow.innerWidth = 1024

      const {
        isXS,
        isSM,
        isMD,
        isLG,
        isXL,
        isXXL
      } = useBreakpoint()

      expect(isXS.value).toBe(false)
      expect(isSM.value).toBe(false)
      expect(isMD.value).toBe(false)
      expect(isLG.value).toBe(true)
      expect(isXL.value).toBe(false)
      expect(isXXL.value).toBe(false)
    })

    it('should provide greater than checks', () => {
      mockWindow.innerWidth = 1024

      const { greaterThan } = useBreakpoint()

      expect(greaterThan.value.SM).toBe(true)
      expect(greaterThan.value.MD).toBe(true)
      expect(greaterThan.value.LG).toBe(false)
      expect(greaterThan.value.XL).toBe(false)
    })

    it('should provide less than checks', () => {
      mockWindow.innerWidth = 1024

      const { lessThan } = useBreakpoint()

      expect(lessThan.value.XS).toBe(false)
      expect(lessThan.value.SM).toBe(false)
      expect(lessThan.value.MD).toBe(false)
      expect(lessThan.value.XL).toBe(true)
      expect(lessThan.value.XXL).toBe(true)
    })

    it('should update breakpoint on window resize', async () => {
      vi.useFakeTimers()

      mockWindow.innerWidth = 1024

      const { current, isLG, isMD } = useBreakpoint()

      expect(current.value).toBe('LG')
      expect(isLG.value).toBe(true)
      expect(isMD.value).toBe(false)

      // Simulate resize to MD
      mockWindow.innerWidth = 800

      // Trigger resize event
      mockWindow.dispatchEvent(new Event('resize'))

      // Fast-forward debounce time
      vi.advanceTimersByTime(100)
      await nextTick()

      expect(current.value).toBe('MD')
      expect(isLG.value).toBe(false)
      expect(isMD.value).toBe(true)

      vi.useRealTimers()
    })

    it('should cleanup event listeners on scope dispose', () => {
      const scope = effectScope()
      scope.run(() => {
        useBreakpoint()
      })

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))

      scope.stop()

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should provide width ref', () => {
      mockWindow.innerWidth = 1024

      const { width } = useBreakpoint()

      expect(width.value).toBe(1024)
    })

    it('should handle SSR environment gracefully', () => {
      // Save original window
      const originalWindow = global.window

      // @ts-expect-error - simulate SSR
      global.window = undefined

      const { current, width } = useBreakpoint()

      // Should return default values
      expect(current.value).toBe('XS')
      expect(width.value).toBe(0)

      // Restore window
      global.window = originalWindow
    })

    it('should debounce resize handler by default', async () => {
      vi.useFakeTimers()

      mockWindow.innerWidth = 1024

      const { current } = useBreakpoint()
      expect(current.value).toBe('LG')

      // Multiple rapid resize events
      mockWindow.innerWidth = 800
      mockWindow.dispatchEvent(new Event('resize'))
      mockWindow.innerWidth = 600
      mockWindow.dispatchEvent(new Event('resize'))
      mockWindow.innerWidth = 400
      mockWindow.dispatchEvent(new Event('resize'))

      // Should not update immediately
      expect(current.value).toBe('LG')

      // Fast-forward debounce time (default 100ms)
      vi.advanceTimersByTime(100)
      await nextTick()

      // Should update to final value
      expect(current.value).toBe('XS')

      vi.useRealTimers()
    })

    it('should support custom debounce delay', async () => {
      vi.useFakeTimers()

      mockWindow.innerWidth = 1024

      const { current } = useBreakpoint({ debounceDelay: 200 })
      expect(current.value).toBe('LG')

      mockWindow.innerWidth = 800
      mockWindow.dispatchEvent(new Event('resize'))

      vi.advanceTimersByTime(100)
      await nextTick()

      // Should not update yet with custom delay
      expect(current.value).toBe('LG')

      vi.advanceTimersByTime(100)
      await nextTick()

      expect(current.value).toBe('MD')

      vi.useRealTimers()
    })

    it('should support disabling debounce', async () => {
      mockWindow.innerWidth = 1024

      const { current } = useBreakpoint({ debounceDelay: 0 })
      expect(current.value).toBe('LG')

      mockWindow.innerWidth = 800
      mockWindow.dispatchEvent(new Event('resize'))
      await nextTick()

      // Should update immediately
      expect(current.value).toBe('MD')
    })
  })
})
