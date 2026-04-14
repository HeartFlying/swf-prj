import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { name: 'Refresh' },
  FolderOpened: { name: 'FolderOpened' },
  TrendCharts: { name: 'TrendCharts' },
  PieChart: { name: 'PieChart' },
  UserFilled: { name: 'UserFilled' },
  DocumentChecked: { name: 'DocumentChecked' },
  EditPen: { name: 'EditPen' },
  Delete: { name: 'Delete' },
  User: { name: 'User' },
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
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue', 'placeholder'],
    template: '<select class="el-select"><slot /></select>',
  },
  ElOption: {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option class="el-option">{{ label }}</option>',
  },
  ElTag: {
    name: 'ElTag',
    props: ['type', 'size'],
    template: '<span class="el-tag"><slot /></span>',
  },
  ElTooltip: {
    name: 'ElTooltip',
    props: ['content', 'placement'],
    template: '<span class="el-tooltip"><slot /></span>',
  },
  ElTable: {
    name: 'ElTable',
    props: ['data', 'loading'],
    template: '<div class="el-table"><slot /></div>',
  },
  ElTableColumn: {
    name: 'ElTableColumn',
    props: ['prop', 'label'],
    template: '<div class="el-table-column"><slot /></div>',
  },
  ElSwitch: {
    name: 'ElSwitch',
    props: ['modelValue'],
    template: '<span class="el-switch"><slot /></span>',
  },
  vLoading: {
    name: 'vLoading',
    directive: {},
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

describe('ProjectStats View', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render page with StatsLayout component', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
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
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.stats-layout').exists()).toBe(true)
    expect(wrapper.find('.stats-layout__title').text()).toBe('项目统计')
  })

  it('should pass correct props to StatsLayout', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
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
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const statsLayout = wrapper.find('.stats-layout')
    expect(statsLayout.attributes('data-show-time-range')).toBe('true')
    expect(statsLayout.attributes('data-show-filter')).toBe('true')
    expect(statsLayout.attributes('data-show-refresh')).toBe('true')
    expect(statsLayout.attributes('data-loading')).toBe('false')
  })

  it('should render project selector in header slot', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: `
              <div class="stats-layout">
                <div class="stats-layout__header">
                  <slot name="header" />
                </div>
                <div class="stats-layout__content"><slot /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: {
            name: 'ElSelect',
            template: '<div class="project-selector"><slot /></div>',
          },
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.project-selector').exists()).toBe(true)
  })

  it('should render project overview section', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.project-overview').exists()).toBe(true)
    expect(wrapper.find('.project-info-card').exists()).toBe(true)
    expect(wrapper.find('.project-stats-grid').exists()).toBe(true)
  })

  it('should render 4 project stat cards', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const statCards = wrapper.findAll('.project-stats-grid .stat-card')
    expect(statCards.length).toBe(4)
  })

  it('should render charts section with correct structure', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.charts-section').exists()).toBe(true)
    expect(wrapper.find('.trend-card').exists()).toBe(true)
    expect(wrapper.find('.language-card').exists()).toBe(true)
  })

  it('should render member contribution section', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.members-section').exists()).toBe(true)
    expect(wrapper.find('.members-table').exists()).toBe(true)
  })

  it('should render member table with correct columns', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const tableHeaders = wrapper.findAll('.members-table .table-header .th')
    expect(tableHeaders.length).toBeGreaterThanOrEqual(5)
  })

  it('should have correct CSS classes for styling', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.project-stats-page').exists()).toBe(true)
    expect(wrapper.find('.project-overview').exists()).toBe(true)
    expect(wrapper.find('.charts-section').exists()).toBe(true)
    expect(wrapper.find('.members-section').exists()).toBe(true)
  })

  it('should handle time range change event', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
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
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const timeRangeSelector = wrapper.find('.time-range-selector')
    expect(timeRangeSelector.exists()).toBe(true)
  })

  it('should handle filter change event', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
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
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const dataFilter = wrapper.find('.data-filter')
    expect(dataFilter.exists()).toBe(true)
  })

  it('should handle refresh event', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
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
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const refreshBtn = wrapper.find('.refresh-btn')
    expect(refreshBtn.exists()).toBe(true)
  })

  it('should display correct project stat labels', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    const statLabels = wrapper.findAll('.project-stats-grid .stat-label')
    const labels = statLabels.map(label => label.text())
    expect(labels).toContain('总提交数')
    expect(labels).toContain('贡献者')
    expect(labels).toContain('代码行数')
    expect(labels).toContain('Pull Requests')
  })

  it('should render code trend chart placeholder', async () => {
    const ProjectStats = await import('@/views/project-stats/index.vue')
    const wrapper = mount(ProjectStats.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
        },
      },
    })

    expect(wrapper.find('.trend-card').exists()).toBe(true)
    expect(wrapper.find('.chart-placeholder').exists()).toBe(true)
  })
})
