import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TimeRange, FilterValue, FilterConfig } from '@/components/stats/types'

// Mock stats API
const mockGetPersonalActivityHours = vi.fn()
vi.mock('@/api/stats', () => ({
  getPersonalDashboard: vi.fn().mockResolvedValue({
    todayStats: { commits: 10, additions: 100, deletions: 50, tokens: 1000, sessions: 5 },
    weeklyTrend: { dates: ['2024-01-01'], commits: [10], tokens: [1000] },
    languageStats: [{ language: 'TypeScript', lines: 1000, percentage: 50 }],
    heatmapData: [{ date: '2024-01-01', count: 10, level: 2 }],
    ranking: { commits: 5, totalUsers: 100 },
  }),
  getPersonalCodeStats: vi.fn().mockResolvedValue({
    totalCommits: 100,
    totalPrs: 20,
    linesAdded: 5000,
    linesDeleted: 1000,
    avgCommitsPerDay: 5,
  }),
  getPersonalTokenStats: vi.fn().mockResolvedValue({
    totalTokens: 100000,
    promptTokens: 60000,
    completionTokens: 40000,
    avgTokensPerDay: 5000,
  }),
  getPersonalActivityHours: mockGetPersonalActivityHours,
}))

vi.mock('@/api/project', () => ({
  getProjects: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}))

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Download: { name: 'Download' },
  DocumentChecked: { name: 'DocumentChecked' },
  EditPen: { name: 'EditPen' },
  Coin: { name: 'Coin' },
  Timer: { name: 'Timer' },
  ArrowUp: { name: 'ArrowUp' },
  Refresh: { name: 'Refresh' },
}))

// Mock StatsLayout component
vi.mock('@/components/stats/StatsLayout.vue', () => ({
  default: {
    name: 'StatsLayout',
    props: ['title', 'loading', 'showTimeRange', 'showFilter', 'showRefresh', 'timeRange', 'filterValue', 'filterConfigs'],
    emits: ['timeRangeChange', 'filterChange', 'refresh'],
    template: `
      <div class="stats-layout">
        <div class="stats-layout__header">
          <h2 class="stats-layout__title">{{ title }}</h2>
          <div class="stats-layout__controls">
            <div v-if="showTimeRange" class="time-range-selector" @click="$emit('timeRangeChange', { preset: '7d', start: '', end: '' })">Time Range</div>
            <div v-if="showFilter" class="data-filter" @click="$emit('filterChange', { project: 'test' })">Filter</div>
            <button v-if="showRefresh" class="refresh-btn" @click="$emit('refresh')">Refresh</button>
          </div>
        </div>
        <div class="stats-layout__content" :class="{ 'stats-layout--loading': loading }">
          <slot />
        </div>
        <div v-if="$slots.footer" class="stats-layout__footer">
          <slot name="footer" />
        </div>
      </div>
    `,
  },
}))

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElButton: {
    name: 'ElButton',
    props: ['type', 'size', 'loading'],
    template: '<button class="el-button"><slot /></button>',
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
  ElSkeleton: {
    name: 'ElSkeleton',
    props: ['rows', 'animated'],
    template: '<div class="el-skeleton">Skeleton</div>',
  },
  ElEmpty: {
    name: 'ElEmpty',
    props: ['description'],
    template: '<div class="el-empty">{{ description }}</div>',
  },
  ElMessage: Object.assign(
    vi.fn(() => ({ close: vi.fn() })),
    {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      closeAll: vi.fn(),
    }
  ),
}))

describe('PersonalStats View', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render page with StatsLayout component', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            props: ['title', 'loading', 'showTimeRange', 'showFilter', 'showRefresh'],
            template: `
              <div class="stats-layout">
                <h2 class="stats-layout__title">{{ title }}</h2>
                <div class="stats-layout__content"><slot /></div>
                <div class="stats-layout__footer"><slot name="footer" /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.stats-layout').exists()).toBe(true)
    expect(wrapper.find('.stats-layout__title').text()).toBe('个人统计')
  })

  it('should pass correct props to StatsLayout', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            props: ['title', 'loading', 'showTimeRange', 'showFilter', 'showRefresh'],
            template: `
              <div class="stats-layout" :data-loading="loading" :data-show-time-range="showTimeRange" :data-show-filter="showFilter" :data-show-refresh="showRefresh">
                <h2 class="stats-layout__title">{{ title }}</h2>
                <div class="stats-layout__content"><slot /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    const statsLayout = wrapper.find('.stats-layout')
    expect(statsLayout.attributes('data-show-time-range')).toBe('true')
    expect(statsLayout.attributes('data-show-filter')).toBe('true')
    expect(statsLayout.attributes('data-show-refresh')).toBe('true')
    expect(statsLayout.attributes('data-loading')).toBe('false')
  })

  it('should render 4 overview cards', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    const cards = wrapper.findAll('.overview-card')
    expect(cards.length).toBe(4)
  })

  it('should have correct card types', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.overview-card.primary').exists()).toBe(true)
    expect(wrapper.find('.overview-card.success').exists()).toBe(true)
    expect(wrapper.find('.overview-card.warning').exists()).toBe(true)
    expect(wrapper.find('.overview-card.purple').exists()).toBe(true)
  })

  it('should render charts section with correct structure', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.charts-section').exists()).toBe(true)
    expect(wrapper.find('.heatmap-card').exists()).toBe(true)
    expect(wrapper.find('.language-card').exists()).toBe(true)
    expect(wrapper.find('.token-card').exists()).toBe(true)
    expect(wrapper.find('.activity-card').exists()).toBe(true)
  })

  it('should render contribution heatmap', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.contribution-heatmap').exists()).toBe(true)
    expect(wrapper.find('.heatmap-grid').exists()).toBe(true)
    expect(wrapper.find('.heatmap-legend').exists()).toBe(true)
    expect(wrapper.find('.weeks-container').exists()).toBe(true)
  })

  it('should render language stats section', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.language-list').exists()).toBe(true)
    const languageItems = wrapper.findAll('.language-item')
    expect(languageItems.length).toBeGreaterThan(0)
  })

  it('should render token stats section', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.token-stats').exists()).toBe(true)
    const tokenStatItems = wrapper.findAll('.token-stat-item')
    expect(tokenStatItems.length).toBe(2)
  })

  it('should render activity chart section', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.activity-card').exists()).toBe(true)
    expect(wrapper.find('.activity-placeholder').exists()).toBe(true)
  })

  it('should have correct CSS classes for styling', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.personal-stats-page').exists()).toBe(true)
    expect(wrapper.find('.overview-section').exists()).toBe(true)
    expect(wrapper.find('.charts-section').exists()).toBe(true)
  })

  it('should render footer slot with export button', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__footer"><slot name="footer" /></div></div>',
          },
          ElButton: {
            name: 'ElButton',
            template: '<button class="el-button"><slot /></button>',
          },
          ElIcon: true,
        },
      },
    })

    expect(wrapper.find('.page-footer').exists()).toBe(true)
    expect(wrapper.find('.el-button').exists()).toBe(true)
  })

  it('should handle time range change event', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            props: ['showTimeRange'],
            emits: ['timeRangeChange'],
            template: `
              <div class="stats-layout">
                <div v-if="showTimeRange" class="time-range-selector" @click="$emit('timeRangeChange', { preset: '7d', start: '2024-01-01', end: '2024-01-07' })">Time Range</div>
                <div class="stats-layout__content"><slot /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    const timeRangeSelector = wrapper.find('.time-range-selector')
    expect(timeRangeSelector.exists()).toBe(true)
  })

  it('should handle filter change event', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            props: ['showFilter'],
            emits: ['filterChange'],
            template: `
              <div class="stats-layout">
                <div v-if="showFilter" class="data-filter" @click="$emit('filterChange', { project: 'test' })">Filter</div>
                <div class="stats-layout__content"><slot /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    const dataFilter = wrapper.find('.data-filter')
    expect(dataFilter.exists()).toBe(true)
  })

  it('should handle refresh event', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            props: ['showRefresh'],
            emits: ['refresh'],
            template: `
              <div class="stats-layout">
                <button v-if="showRefresh" class="refresh-btn" @click="$emit('refresh')">Refresh</button>
                <div class="stats-layout__content"><slot /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    const refreshBtn = wrapper.find('.refresh-btn')
    expect(refreshBtn.exists()).toBe(true)
  })

  it('should display correct overview data', async () => {
    const PersonalStats = await import('@/views/personal-stats/index.vue')
    const wrapper = mount(PersonalStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
        },
      },
    })

    const cardValues = wrapper.findAll('.card-value')
    expect(cardValues.length).toBeGreaterThan(0)

    // Check that we have the expected card labels
    const cardLabels = wrapper.findAll('.card-label')
    const labels = cardLabels.map(label => label.text())
    expect(labels).toContain('总提交数')
    expect(labels).toContain('代码行数')
    expect(labels).toContain('Token使用')
    expect(labels).toContain('编码时长')
  })

  describe('Active Hours Chart', () => {
    it('should fetch activity hours data from API instead of using Math.random', async () => {
      // Setup mock to return predictable data
      const mockActivityData = Array(24).fill(0).map((_, i) => ({
        hour: i,
        count: i * 10, // Predictable values: 0, 10, 20, ..., 230
      }))
      mockGetPersonalActivityHours.mockResolvedValue(mockActivityData)

      const PersonalStats = await import('@/views/personal-stats/index.vue')
      const wrapper = mount(PersonalStats.default, {
        global: {
          stubs: {
            StatsLayout: {
              name: 'StatsLayout',
              template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
            },
            ElButton: true,
            ElIcon: true,
          },
        },
      })

      await flushPromises()

      // Verify API was called
      expect(mockGetPersonalActivityHours).toHaveBeenCalled()

      // Verify activity bars are rendered (24 hours)
      const activityBars = wrapper.findAll('.activity-bar')
      expect(activityBars.length).toBe(24)
    })

    it('should render activity bars with correct heights from API data', async () => {
      // Setup mock with specific data
      const mockActivityData = Array(24).fill(0).map((_, i) => ({
        hour: i,
        count: i * 10,
      }))
      mockGetPersonalActivityHours.mockResolvedValue(mockActivityData)

      const PersonalStats = await import('@/views/personal-stats/index.vue')
      const wrapper = mount(PersonalStats.default, {
        global: {
          stubs: {
            StatsLayout: {
              name: 'StatsLayout',
              template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
            },
            ElButton: true,
            ElIcon: true,
          },
        },
      })

      await flushPromises()

      // Get all activity bars
      const activityBars = wrapper.findAll('.activity-bar')

      // Verify each bar has a height style based on API data (not Math.random)
      activityBars.forEach((bar, index) => {
        const style = bar.attributes('style')
        expect(style).toBeDefined()
        // Height should be based on API data, not random
        // API data: count = index * 10, max = 230
        // Expected height percentage: (index * 10 / 230) * 100
        const expectedHeight = (index * 10 / 230) * 100
        // Vue renders the full precision number, check it contains the expected value
        expect(style).toContain(`${expectedHeight}`)
        expect(style).toContain('%')
      })
    })

    it('should handle empty activity data gracefully', async () => {
      // Setup mock to return empty data
      mockGetPersonalActivityHours.mockResolvedValue([])

      const PersonalStats = await import('@/views/personal-stats/index.vue')
      const wrapper = mount(PersonalStats.default, {
        global: {
          stubs: {
            StatsLayout: {
              name: 'StatsLayout',
              template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
            },
            ElButton: true,
            ElIcon: true,
          },
        },
      })

      await flushPromises()

      // Should still render the activity card
      expect(wrapper.find('.activity-card').exists()).toBe(true)

      // Activity bars should still be rendered (with 0 height or placeholder)
      const activityBars = wrapper.findAll('.activity-bar')
      expect(activityBars.length).toBe(24)
    })

    it('should handle API error gracefully', async () => {
      // Setup mock to throw error
      mockGetPersonalActivityHours.mockRejectedValue(new Error('API Error'))

      const PersonalStats = await import('@/views/personal-stats/index.vue')
      const wrapper = mount(PersonalStats.default, {
        global: {
          stubs: {
            StatsLayout: {
              name: 'StatsLayout',
              template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
            },
            ElButton: true,
            ElIcon: true,
          },
        },
      })

      await flushPromises()

      // Should still render the activity card even on error
      expect(wrapper.find('.activity-card').exists()).toBe(true)

      // Activity bars should still be rendered
      const activityBars = wrapper.findAll('.activity-bar')
      expect(activityBars.length).toBe(24)
    })
  })
})
