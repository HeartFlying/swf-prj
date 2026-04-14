import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TimeRangeSelector from '@/components/stats/TimeRangeSelector.vue'

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElSelect: {
    name: 'ElSelect',
    template: '<select class="el-select" @change="$emit(\'change\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue', 'change'],
  },
  ElOption: {
    name: 'ElOption',
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  ElDatePicker: {
    name: 'ElDatePicker',
    template: '<input type="text" class="el-date-picker" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'startPlaceholder', 'endPlaceholder', 'valueFormat', 'shortcuts'],
    emits: ['update:modelValue', 'change'],
  },
  ElButton: {
    name: 'ElButton',
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'size', 'icon'],
    emits: ['click'],
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
}))

describe('TimeRangeSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-31'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render with default props', () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    expect(wrapper.find('.time-range-selector').exists()).toBe(true)
    expect(wrapper.find('.time-range-selector__preset').exists()).toBe(true)
    // Custom picker is hidden by default (preset is 'last7days', not 'custom')
    expect(wrapper.find('.time-range-selector__custom').exists()).toBe(false)
  })

  it('should emit change event with preset value', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    await wrapper.vm.applyPreset('last7days')
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const emittedValue = wrapper.emitted('change')![0][0]
    expect(emittedValue).toHaveProperty('preset')
    expect(emittedValue.preset).toBe('last7days')
  })

  it('should emit change event with custom date range', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    // First set preset to custom
    await wrapper.vm.applyPreset('custom')

    // Then set custom date range
    await wrapper.vm.handleCustomDateChange(['2024-01-01', '2024-01-31'])
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { start: string; end: string; preset: string }
    expect(lastCall.preset).toBe('custom')
    expect(lastCall.start).toBe('2024-01-01')
    expect(lastCall.end).toBe('2024-01-31')
  })

  it('should update modelValue when preset changes', async () => {
    const wrapper = mount(TimeRangeSelector, {
      props: {
        modelValue: {
          preset: 'today',
          start: '2024-03-31',
          end: '2024-03-31',
        },
      },
    })

    expect(wrapper.find('.time-range-selector__preset').exists()).toBe(true)
  })

  it('should show custom date picker when preset is custom', async () => {
    const wrapper = mount(TimeRangeSelector, {
      props: {
        modelValue: {
          preset: 'custom',
          start: '',
          end: '',
        },
      },
    })

    expect(wrapper.find('.time-range-selector__custom').exists()).toBe(true)
  })

  it('should apply preset and calculate date range correctly', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    // Test last7days preset (today - 6 days = 7 days total including today)
    await wrapper.vm.applyPreset('last7days')
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { start: string; end: string; preset: string }
    expect(lastCall.preset).toBe('last7days')
    // March 31 - 6 days = March 25
    expect(lastCall.start).toBe('2024-03-25')
    expect(lastCall.end).toBe('2024-03-31')
  })

  it('should handle today preset correctly', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    await wrapper.vm.applyPreset('today')
    await flushPromises()

    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { start: string; end: string; preset: string }
    expect(lastCall.preset).toBe('today')
    expect(lastCall.start).toBe('2024-03-31')
    expect(lastCall.end).toBe('2024-03-31')
  })

  it('should handle thisWeek preset correctly', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    await wrapper.vm.applyPreset('thisWeek')
    await flushPromises()

    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { start: string; end: string; preset: string }
    expect(lastCall.preset).toBe('thisWeek')
    expect(lastCall.start).toBeDefined()
    expect(lastCall.end).toBe('2024-03-31')
  })

  it('should handle thisMonth preset correctly', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    await wrapper.vm.applyPreset('thisMonth')
    await flushPromises()

    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { start: string; end: string; preset: string }
    expect(lastCall.preset).toBe('thisMonth')
    expect(lastCall.start).toBe('2024-03-01')
    expect(lastCall.end).toBe('2024-03-31')
  })

  it('should handle lastMonth preset correctly', async () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    await wrapper.vm.applyPreset('lastMonth')
    await flushPromises()

    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { start: string; end: string; preset: string }
    expect(lastCall.preset).toBe('lastMonth')
    expect(lastCall.start).toBe('2024-02-01')
    expect(lastCall.end).toBe('2024-02-29')
  })

  it('should clear selection when clear is called', async () => {
    const wrapper = mount(TimeRangeSelector, {
      props: {
        modelValue: {
          preset: 'today',
          start: '2024-03-31',
          end: '2024-03-31',
        },
      },
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    await wrapper.vm.clear()
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as { preset: string | null; start: string; end: string }
    expect(lastCall.preset).toBeNull()
    expect(lastCall.start).toBe('')
    expect(lastCall.end).toBe('')
  })

  it('should format date correctly', () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    const date = new Date('2024-03-15')
    const formatted = wrapper.vm.formatDate(date)

    expect(formatted).toBe('2024-03-15')
  })

  it('should disable future dates', () => {
    const wrapper = mount(TimeRangeSelector, {
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    const today = new Date('2024-03-31')
    const future = new Date('2024-04-01')

    expect(wrapper.vm.disabledDate(today)).toBe(false)
    expect(wrapper.vm.disabledDate(future)).toBe(true)
  })

  it('should expose current range through exposed method', () => {
    const wrapper = mount(TimeRangeSelector, {
      props: {
        modelValue: {
          preset: 'today',
          start: '2024-03-31',
          end: '2024-03-31',
        },
      },
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElDatePicker'],
      },
    })

    const range = wrapper.vm.getCurrentRange()
    expect(range).toEqual({
      preset: 'today',
      start: '2024-03-31',
      end: '2024-03-31',
    })
  })
})
