import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StatsLayout from '@/components/stats/StatsLayout.vue'
import TimeRangeSelector from '@/components/stats/TimeRangeSelector.vue'
import DataFilter from '@/components/stats/DataFilter.vue'

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElCard: {
    name: 'ElCard',
    template: '<div class="el-card"><slot /></div>',
  },
  ElRow: {
    name: 'ElRow',
    template: '<div class="el-row"><slot /></div>',
  },
  ElCol: {
    name: 'ElCol',
    template: '<div class="el-col"><slot /></div>',
  },
  ElSkeleton: {
    name: 'ElSkeleton',
    template: '<div class="el-skeleton"><slot /></div>',
    props: ['loading'],
  },
  ElEmpty: {
    name: 'ElEmpty',
    template: '<div class="el-empty">Empty</div>',
  },
  ElButton: {
    name: 'ElButton',
    template: '<button class="el-button"><slot /></button>',
    props: ['type', 'size', 'loading'],
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
}))

describe('StatsLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render with default props', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.find('.stats-layout').exists()).toBe(true)
    expect(wrapper.find('.stats-layout__title').text()).toBe('Test Statistics')
  })

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        loading: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.find('.stats-layout--loading').exists()).toBe(true)
  })

  it('should show empty state when empty prop is true', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        empty: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.find('.stats-layout--empty').exists()).toBe(true)
  })

  it('should render TimeRangeSelector when showTimeRange is true', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        showTimeRange: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.findComponent(TimeRangeSelector).exists()).toBe(true)
  })

  it('should not render TimeRangeSelector when showTimeRange is false', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        showTimeRange: false,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.findComponent(TimeRangeSelector).exists()).toBe(false)
  })

  it('should render DataFilter when showFilter is true', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        showFilter: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.findComponent(DataFilter).exists()).toBe(true)
  })

  it('should emit timeRangeChange when time range changes', async () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        showTimeRange: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: {
            template: '<div @click="$emit(\'change\', { start: \'2024-01-01\', end: \'2024-01-31\' })">Time Selector</div>',
            emits: ['change'],
          },
          DataFilter: true,
        },
      },
    })

    await wrapper.findComponent(TimeRangeSelector).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('timeRangeChange')).toBeTruthy()
    expect(wrapper.emitted('timeRangeChange')![0]).toEqual([{ start: '2024-01-01', end: '2024-01-31' }])
  })

  it('should emit filterChange when filter changes', async () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        showFilter: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: {
            template: '<div @click="$emit(\'change\', { projectId: 1 })">Filter</div>',
            emits: ['change'],
          },
        },
      },
    })

    await wrapper.findComponent(DataFilter).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('filterChange')).toBeTruthy()
    expect(wrapper.emitted('filterChange')![0]).toEqual([{ projectId: 1 }])
  })

  it('should emit refresh when refresh button is clicked', async () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
        showRefresh: true,
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    const refreshBtn = wrapper.find('.stats-layout__refresh')
    expect(refreshBtn.exists()).toBe(true)

    await refreshBtn.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('should render default slot content', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
      },
      slots: {
        default: '<div class="custom-content">Custom Content</div>',
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.find('.custom-content').exists()).toBe(true)
    expect(wrapper.find('.custom-content').text()).toBe('Custom Content')
  })

  it('should render header slot when provided', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
      },
      slots: {
        header: '<div class="custom-header">Custom Header</div>',
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.find('.custom-header').exists()).toBe(true)
  })

  it('should render footer slot when provided', () => {
    const wrapper = mount(StatsLayout, {
      props: {
        title: 'Test Statistics',
      },
      slots: {
        footer: '<div class="custom-footer">Custom Footer</div>',
      },
      global: {
        stubs: {
          TimeRangeSelector: true,
          DataFilter: true,
        },
      },
    })

    expect(wrapper.find('.custom-footer').exists()).toBe(true)
  })
})
