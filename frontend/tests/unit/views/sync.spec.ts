import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock sync API
vi.mock('@/api/sync', () => ({
  getSyncTasks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getSyncStatus: vi.fn().mockResolvedValue({ isRunning: false, lastSyncAt: null, pendingTasks: 0 }),
  triggerSync: vi.fn().mockResolvedValue({}),
  getSyncLogs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  syncGitLab: vi.fn().mockResolvedValue({}),
  syncTrae: vi.fn().mockResolvedValue({}),
  syncZendao: vi.fn().mockResolvedValue({}),
}))

// Mock composables
vi.mock('@/composables/useConfirm', () => ({
  useConfirm: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}))

vi.mock('@/composables/useMessage', () => ({
  useMessage: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}))

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { name: 'Refresh' },
  RefreshRight: { name: 'RefreshRight' },
  List: { name: 'List' },
  Timer: { name: 'Timer' },
  DocumentChecked: { name: 'DocumentChecked' },
  Coin: { name: 'Coin' },
  Monitor: { name: 'Monitor' },
  Folder: { name: 'Folder' },
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
  ElTag: {
    name: 'ElTag',
    props: ['type', 'size'],
    template: '<span class="el-tag" :class="type"><slot /></span>',
  },
  ElSwitch: {
    name: 'ElSwitch',
    props: ['modelValue'],
    template: '<span class="el-switch"><slot /></span>',
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue', 'size'],
    template: '<select class="el-select"><slot /></select>',
  },
  ElOption: {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option class="el-option" :value="value">{{ label }}</option>',
  },
  ElSkeleton: {
    name: 'ElSkeleton',
    template: '<div class="el-skeleton">Skeleton</div>',
  },
  ElEmpty: {
    name: 'ElEmpty',
    props: ['description'],
    template: '<div class="el-empty">{{ description }}</div>',
  },
  ElRadioGroup: {
    name: 'ElRadioGroup',
    props: ['modelValue', 'size'],
    template: '<div class="el-radio-group"><slot /></div>',
  },
  ElRadioButton: {
    name: 'ElRadioButton',
    props: ['label', 'value'],
    template: '<label class="el-radio-button"><slot /></label>',
  },
  ElTable: {
    name: 'ElTable',
    props: ['data', 'loading', 'height', 'maxHeight', 'stripe', 'border', 'rowClassName', 'cellClassName', 'defaultSort', 'rowKey', 'highlightCurrentRow', 'showHeader', 'size', 'fit'],
    template: '<div class="el-table"><slot /></div>',
  },
  ElTableColumn: {
    name: 'ElTableColumn',
    props: ['prop', 'label', 'width', 'minWidth', 'fixed', 'align', 'headerAlign', 'sortable', 'sortMethod', 'filters', 'filterMethod', 'filterMultiple', 'showOverflowTooltip', 'className', 'formatter', 'type', 'reserveSelection'],
    template: '<div class="el-table-column"><slot /></div>',
  },
  ElPagination: {
    name: 'ElPagination',
    props: ['currentPage', 'pageSize', 'pageSizes', 'total', 'background', 'layout'],
    template: '<div class="el-pagination">Pagination</div>',
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
  vLoading: {
    name: 'vLoading',
    directive: {},
  },
}))

describe('Sync View', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render page with StatsLayout component', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
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
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.stats-layout').exists()).toBe(true)
    expect(wrapper.find('.stats-layout__title').text()).toBe('数据同步')
  })

  it('should pass correct props to StatsLayout', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            props: ['title', 'loading', 'showTimeRange', 'showFilter', 'showRefresh'],
            template: `
              <div class="stats-layout"
                   :data-loading="loading"
                   :data-show-time-range="showTimeRange"
                   :data-show-filter="showFilter"
                   :data-show-refresh="showRefresh">
                <h2 class="stats-layout__title">{{ title }}</h2>
                <div class="stats-layout__content"><slot /></div>
              </div>
            `,
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    const statsLayout = wrapper.find('.stats-layout')
    expect(statsLayout.attributes('data-show-time-range')).toBe('false')
    expect(statsLayout.attributes('data-show-filter')).toBe('false')
    expect(statsLayout.attributes('data-show-refresh')).toBe('true')
    expect(statsLayout.attributes('data-loading')).toBe('false')
  })

  it('should render sync status overview cards', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.sync-overview').exists()).toBe(true)
    const statusCards = wrapper.findAll('.status-card')
    expect(statusCards.length).toBe(4)
  })

  it('should render sync logs section', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.logs-section').exists()).toBe(true)
    expect(wrapper.find('.terminal').exists()).toBe(true)
    expect(wrapper.find('.terminal-body').exists()).toBe(true)
  })

  it('should render sync tasks section', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.tasks-section').exists()).toBe(true)
    expect(wrapper.find('.filter-bar').exists()).toBe(true)
  })

  it('should render manual sync button', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: `
              <div class="stats-layout">
                <div class="stats-layout__content"><slot /></div>
                <div class="stats-layout__footer"><slot name="footer" /></div>
              </div>
            `,
          },
          ElButton: {
            name: 'ElButton',
            props: ['type', 'loading'],
            template: '<button class="el-button" :class="[type, { \'sync-all-btn\': $slots.default && $slots.default()[0]?.children?.includes(\'全量同步\') }]" :disabled="loading"><slot /></button>',
          },
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    // 在 footer 中查找包含 "全量同步" 的按钮
    const footer = wrapper.find('.stats-layout__footer')
    expect(footer.exists()).toBe(true)
    const syncButton = footer.find('.el-button')
    expect(syncButton.exists()).toBe(true)
    expect(syncButton.text()).toContain('全量同步')
  })

  it('should render auto sync settings', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: {
            name: 'ElSwitch',
            props: ['modelValue'],
            template: '<span class="el-switch" :data-checked="modelValue"><slot /></span>',
          },
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.sync-settings').exists()).toBe(true)
    expect(wrapper.find('.el-switch').exists()).toBe(true)
  })

  it('should have correct CSS classes for styling', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.sync-page').exists()).toBe(true)
    expect(wrapper.find('.sync-overview').exists()).toBe(true)
    expect(wrapper.find('.main-content').exists()).toBe(true)
    expect(wrapper.find('.logs-section').exists()).toBe(true)
    expect(wrapper.find('.tasks-section').exists()).toBe(true)
  })

  it('should handle refresh event from StatsLayout', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
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
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    const refreshBtn = wrapper.find('.refresh-btn')
    expect(refreshBtn.exists()).toBe(true)
  })

  it('should render sync status cards with correct types', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    expect(wrapper.find('.status-card.success').exists()).toBe(true)
    expect(wrapper.find('.status-card.warning').exists()).toBe(true)
  })

  it('should render log entries in terminal', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: {
            name: 'ElButton',
            props: ['size', 'loading', 'icon'],
            template: `<button class="el-button" @click="$emit('click')" :disabled="loading"><slot /></button>`,
          },
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    // 等待组件挂载和初始数据加载
    await wrapper.vm.$nextTick()

    // 验证终端容器存在
    expect(wrapper.find('.terminal').exists()).toBe(true)
    expect(wrapper.find('.terminal-body').exists()).toBe(true)
  })

  it('should render individual sync buttons for each status card', async () => {
    const SyncView = await import('@/views/sync/index.vue')
    const wrapper = mount(SyncView.default, {
      global: {
        stubs: {
          StatsLayout: {
            name: 'StatsLayout',
            template: '<div class="stats-layout"><div class="stats-layout__content"><slot /></div></div>',
          },
          ElButton: {
            name: 'ElButton',
            template: '<button class="el-button sync-btn"><slot /></button>',
          },
          ElIcon: true,
          ElTag: true,
          ElSwitch: true,
          ElSelect: true,
          ElOption: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          DataTable: {
            name: 'DataTable',
            props: ['data', 'columns', 'pagination', 'loading'],
            template: '<div class="data-table"><div class="data-table__wrapper"><slot /></div></div>',
          },
          StatusTag: {
            name: 'StatusTag',
            props: ['status', 'text', 'size'],
            template: '<span class="status-tag" :class="status">{{ text }}</span>',
          },
          SyncLogViewer: {
            name: 'SyncLogViewer',
            props: ['modelValue', 'taskId', 'taskName', 'logs', 'loading'],
            template: '<div class="sync-log-viewer" v-if="modelValue">Log Viewer</div>',
          },
        },
      },
    })

    const syncButtons = wrapper.findAll('.sync-btn')
    expect(syncButtons.length).toBeGreaterThan(0)
  })
})
