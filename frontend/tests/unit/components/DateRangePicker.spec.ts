import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import DateRangePicker, {
  type DateRangePickerProps,
  type DateRangeType,
  type DateRangeShortcut,
} from '@/components/DateRangePicker/DateRangePicker.vue'
import { ElDatePicker, ElButton } from 'element-plus'

// Helper function to compare dates by checking year, month, day
describe('DateRangePicker', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // Helper to compare dates by year, month, day
  const expectSameDate = (actual: Date, expected: Date) => {
    expect(actual.getFullYear()).toBe(expected.getFullYear())
    expect(actual.getMonth()).toBe(expected.getMonth())
    expect(actual.getDate()).toBe(expected.getDate())
  }

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      wrapper = mount(DateRangePicker)
      expect(wrapper.find('.date-range-picker').exists()).toBe(true)
    })

    it('should render ElDatePicker component', () => {
      wrapper = mount(DateRangePicker)
      expect(wrapper.findComponent(ElDatePicker).exists()).toBe(true)
    })

    it('should have correct CSS class structure', () => {
      wrapper = mount(DateRangePicker)
      expect(wrapper.find('.date-range-picker__content').exists()).toBe(true)
    })
  })

  // ========== Props 测试 ==========
  describe('Props', () => {
    it('should accept modelValue prop', () => {
      const dateRange = [new Date('2024-01-01'), new Date('2024-01-31')]
      wrapper = mount(DateRangePicker, {
        props: {
          modelValue: dateRange,
        },
      })

      const datePicker = wrapper.findComponent(ElDatePicker)
      expect(datePicker.props('modelValue')).toEqual(dateRange)
    })

    it('should emit update:modelValue when date changes', async () => {
      wrapper = mount(DateRangePicker)
      const newRange = [new Date('2024-02-01'), new Date('2024-02-28')]

      const datePicker = wrapper.findComponent(ElDatePicker)
      await datePicker.vm.$emit('update:modelValue', newRange)
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([newRange])
    })

    it('should support type=daterange', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          type: 'daterange',
        },
      })

      const datePicker = wrapper.findComponent(ElDatePicker)
      expect(datePicker.props('type')).toBe('daterange')
    })

    it('should support type=datetimerange', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          type: 'datetimerange',
        },
      })

      const datePicker = wrapper.findComponent(ElDatePicker)
      expect(datePicker.props('type')).toBe('datetimerange')
    })

    it('should support type=monthrange', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          type: 'monthrange',
        },
      })

      const datePicker = wrapper.findComponent(ElDatePicker)
      expect(datePicker.props('type')).toBe('monthrange')
    })

    it('should show shortcuts when shortcuts=true', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.find('.date-range-picker__shortcuts').exists()).toBe(true)
    })

    it('should hide shortcuts when shortcuts=false', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: false,
        },
      })

      expect(wrapper.find('.date-range-picker__shortcuts').exists()).toBe(false)
    })
  })

  // ========== 快捷选项测试 ==========
  describe('Shortcuts', () => {
    it('should render shortcut buttons when enabled', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const buttons = wrapper.findAllComponents(ElButton)
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have "今天" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('今天')
    })

    it('should have "昨天" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('昨天')
    })

    it('should have "本周" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('本周')
    })

    it('should have "上周" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('上周')
    })

    it('should have "本月" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('本月')
    })

    it('should have "上月" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('上月')
    })

    it('should have "本季度" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('本季度')
    })

    it('should have "上季度" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('上季度')
    })

    it('should have "本年" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('本年')
    })

    it('should have "去年" shortcut button', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.text()).toContain('去年')
    })

    it('should emit update:modelValue when clicking 今天 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const todayButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '今天')
      expect(todayButton).toBeDefined()

      await todayButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-03-15'))
      expectSameDate(emittedValue[1], new Date('2024-03-15'))
    })

    it('should emit update:modelValue when clicking 昨天 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const yesterdayButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '昨天')
      expect(yesterdayButton).toBeDefined()

      await yesterdayButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-03-14'))
      expectSameDate(emittedValue[1], new Date('2024-03-14'))
    })

    it('should emit update:modelValue when clicking 本周 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const thisWeekButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '本周')
      expect(thisWeekButton).toBeDefined()

      await thisWeekButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      // 2024-03-15 is Friday, so week starts on Monday 2024-03-11
      expectSameDate(emittedValue[0], new Date('2024-03-11'))
      expectSameDate(emittedValue[1], new Date('2024-03-17'))
    })

    it('should emit update:modelValue when clicking 上周 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const lastWeekButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '上周')
      expect(lastWeekButton).toBeDefined()

      await lastWeekButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-03-04'))
      expectSameDate(emittedValue[1], new Date('2024-03-10'))
    })

    it('should emit update:modelValue when clicking 本月 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const thisMonthButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '本月')
      expect(thisMonthButton).toBeDefined()

      await thisMonthButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-03-01'))
      expectSameDate(emittedValue[1], new Date('2024-03-31'))
    })

    it('should emit update:modelValue when clicking 上月 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const lastMonthButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '上月')
      expect(lastMonthButton).toBeDefined()

      await lastMonthButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-02-01'))
      expectSameDate(emittedValue[1], new Date('2024-02-29')) // 2024 is leap year
    })

    it('should emit update:modelValue when clicking 本季度 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const thisQuarterButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '本季度')
      expect(thisQuarterButton).toBeDefined()

      await thisQuarterButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-01-01'))
      expectSameDate(emittedValue[1], new Date('2024-03-31'))
    })

    it('should emit update:modelValue when clicking 上季度 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const lastQuarterButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '上季度')
      expect(lastQuarterButton).toBeDefined()

      await lastQuarterButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2023-10-01'))
      expectSameDate(emittedValue[1], new Date('2023-12-31'))
    })

    it('should emit update:modelValue when clicking 本年 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const thisYearButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '本年')
      expect(thisYearButton).toBeDefined()

      await thisYearButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2024-01-01'))
      expectSameDate(emittedValue[1], new Date('2024-12-31'))
    })

    it('should emit update:modelValue when clicking 去年 shortcut', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      const lastYearButton = wrapper.findAllComponents(ElButton).find(btn => btn.text() === '去年')
      expect(lastYearButton).toBeDefined()

      await lastYearButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')![0][0] as Date[]
      expectSameDate(emittedValue[0], new Date('2023-01-01'))
      expectSameDate(emittedValue[1], new Date('2023-12-31'))
    })
  })

  // ========== 自定义日期范围测试 ==========
  describe('Custom Date Range Selection', () => {
    it('should allow custom date range selection', async () => {
      wrapper = mount(DateRangePicker)
      const customRange = [new Date('2024-06-01'), new Date('2024-06-30')]

      const datePicker = wrapper.findComponent(ElDatePicker)
      await datePicker.vm.$emit('update:modelValue', customRange)
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([customRange])
    })

    it('should emit change event when date range changes', async () => {
      wrapper = mount(DateRangePicker)
      const newRange = [new Date('2024-07-01'), new Date('2024-07-31')]

      const datePicker = wrapper.findComponent(ElDatePicker)
      await datePicker.vm.$emit('change', newRange)
      await nextTick()

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')![0]).toEqual([newRange])
    })
  })

  // ========== 事件测试 ==========
  describe('Events', () => {
    it('should emit focus event when date picker is focused', async () => {
      wrapper = mount(DateRangePicker)

      const datePicker = wrapper.findComponent(ElDatePicker)
      await datePicker.vm.$emit('focus')
      await nextTick()

      expect(wrapper.emitted('focus')).toBeTruthy()
    })

    it('should emit blur event when date picker is blurred', async () => {
      wrapper = mount(DateRangePicker)

      const datePicker = wrapper.findComponent(ElDatePicker)
      await datePicker.vm.$emit('blur')
      await nextTick()

      expect(wrapper.emitted('blur')).toBeTruthy()
    })
  })

  // ========== 样式和布局测试 ==========
  describe('Styling and Layout', () => {
    it('should have proper CSS classes for styling', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          shortcuts: true,
        },
      })

      expect(wrapper.find('.date-range-picker').exists()).toBe(true)
      expect(wrapper.find('.date-range-picker__content').exists()).toBe(true)
      expect(wrapper.find('.date-range-picker__picker').exists()).toBe(true)
      expect(wrapper.find('.date-range-picker__shortcuts').exists()).toBe(true)
    })

    it('should apply size class when size prop is provided', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          size: 'small',
        },
      })

      const datePicker = wrapper.findComponent(ElDatePicker)
      expect(datePicker.props('size')).toBe('small')
    })

    it('should support disabled state', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          disabled: true,
        },
      })

      const datePicker = wrapper.findComponent(ElDatePicker)
      expect(datePicker.props('disabled')).toBe(true)
    })
  })

  // ========== 边界情况测试 ==========
  describe('Edge Cases', () => {
    it('should handle empty modelValue gracefully', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          modelValue: null as any,
        },
      })

      expect(wrapper.find('.date-range-picker').exists()).toBe(true)
    })

    it('should handle undefined modelValue gracefully', () => {
      wrapper = mount(DateRangePicker, {
        props: {
          modelValue: undefined,
        },
      })

      expect(wrapper.find('.date-range-picker').exists()).toBe(true)
    })

    it('should handle invalid date range gracefully', async () => {
      wrapper = mount(DateRangePicker)

      const datePicker = wrapper.findComponent(ElDatePicker)
      // Start date after end date
      await datePicker.vm.$emit('update:modelValue', [new Date('2024-12-31'), new Date('2024-01-01')])
      await nextTick()

      // Component should still emit the value, validation is up to parent
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  // ========== 方法测试 ==========
  describe('Methods', () => {
    it('should expose clear method', () => {
      wrapper = mount(DateRangePicker)
      expect(typeof wrapper.vm.clear).toBe('function')
    })

    it('should clear date range when clear method is called', async () => {
      wrapper = mount(DateRangePicker, {
        props: {
          modelValue: [new Date('2024-01-01'), new Date('2024-01-31')],
        },
      })

      wrapper.vm.clear()
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([null])
    })

    it('should expose getCurrentRange method', () => {
      wrapper = mount(DateRangePicker)
      expect(typeof wrapper.vm.getCurrentRange).toBe('function')
    })
  })
})
