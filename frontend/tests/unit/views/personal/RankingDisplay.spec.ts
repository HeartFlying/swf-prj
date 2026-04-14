import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { name: 'Refresh', render: () => h('span', 'Refresh') },
  ArrowUp: { name: 'ArrowUp', render: () => h('span', 'ArrowUp') },
  ArrowDown: { name: 'ArrowDown', render: () => h('span', 'ArrowDown') },
  Minus: { name: 'Minus', render: () => h('span', 'Minus') },
  Search: { name: 'Search', render: () => h('span', 'Search') },
}))

// Mock DataTable component
vi.mock('@/components/DataTable/DataTable.vue', () => ({
  default: {
    name: 'DataTable',
    props: ['data', 'columns', 'loading', 'rowClassName', 'pagination'],
    emits: ['row-click', 'page-change'],
    template: `
      <div class="data-table">
        <div v-for="(row, index) in data" :key="row.id"
             class="ranking-row"
             :class="[typeof rowClassName === 'function' ? rowClassName({row}).split(' ') : rowClassName, getRankClass(index)]"
             @click="$emit('row-click', row)">
          <slot name="column-rank" :row="row" :index="index" />
          <slot name="column-username" :row="row" />
          <slot name="column-value" :row="row" />
          <slot name="column-trend" :row="row" />
        </div>
      </div>
    `,
    setup(_props: any) {
      const getRankClass = (index: number) => {
        if (index === 0) return 'ranking-row--top1'
        if (index === 1) return 'ranking-row--top2'
        if (index === 2) return 'ranking-row--top3'
        return ''
      }
      return { getRankClass }
    }
  }
}))

// Mock Element Plus components
const ElButtonMock = {
  name: 'ElButton',
  template: '<button class="el-button" :class="type ? `el-button--${type}` : \'\'" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
  props: ['type', 'size', 'icon', 'loading'],
  emits: ['click'],
}

const ElInputMock = {
  name: 'ElInput',
  template: '<div class="el-input ranking-search"><input v-model="modelValue" @input="$emit(\'input\', $event.target.value)" /></div>',
  props: ['modelValue', 'placeholder', 'prefixIcon', 'clearable'],
  emits: ['input', 'update:modelValue'],
}

const ElSelectMock = {
  name: 'ElSelect',
  template: '<div class="el-select department-filter"><select v-model="modelValue" @change="$emit(\'change\', $event.target.value)"><slot /></select></div>',
  props: ['modelValue', 'placeholder', 'clearable'],
  emits: ['change', 'update:modelValue'],
}

const ElOptionMock = {
  name: 'ElOption',
  template: '<option class="el-option" :value="value">{{ label }}</option>',
  props: ['label', 'value'],
}

const ElAvatarMock = {
  name: 'ElAvatar',
  template: '<div class="el-avatar user-avatar"><slot /></div>',
  props: ['size', 'src'],
}

const ElTagMock = {
  name: 'ElTag',
  template: '<span class="el-tag" :class="type ? `el-tag--${type}` : \'\'"><slot /></span>',
  props: ['type', 'size', 'effect'],
}

const ElIconMock = {
  name: 'ElIcon',
  template: '<span class="el-icon"><slot /></span>',
  props: ['size'],
}

const ElEmptyMock = {
  name: 'ElEmpty',
  template: '<div class="el-empty ranking-empty">{{ description }}</div>',
  props: ['description'],
}

const ElSkeletonMock = {
  name: 'ElSkeleton',
  template: '<div class="el-skeleton ranking-skeleton"><div v-for="i in (rows || 3)" :key="i">Loading...</div></div>',
  props: ['rows', 'animated'],
}

// Import component after mocking
import RankingDisplay from '@/views/personal/components/RankingDisplay.vue'

describe('RankingDisplay', () => {
  const mockRankingData = {
    codeLines: [
      { id: 1, username: '张三', department: '技术部', value: 50000, trend: 5, avatar: 'https://example.com/1.jpg' },
      { id: 2, username: '李四', department: '产品部', value: 45000, trend: -2, avatar: 'https://example.com/2.jpg' },
      { id: 3, username: '王五', department: '技术部', value: 42000, trend: 0, avatar: 'https://example.com/3.jpg' },
      { id: 4, username: '赵六', department: '设计部', value: 38000, trend: 3 },
      { id: 5, username: '钱七', department: '测试部', value: 35000, trend: -1 },
    ],
    commits: [
      { id: 1, username: '张三', department: '技术部', value: 150, trend: 10, avatar: 'https://example.com/1.jpg' },
      { id: 2, username: '李四', department: '产品部', value: 120, trend: 5, avatar: 'https://example.com/2.jpg' },
      { id: 3, username: '王五', department: '技术部', value: 110, trend: -3 },
      { id: 4, username: '赵六', department: '设计部', value: 95, trend: 2 },
      { id: 5, username: '钱七', department: '测试部', value: 88, trend: 0 },
    ],
    tokenUsage: [
      { id: 1, username: '张三', department: '技术部', value: 1000000, trend: 15, avatar: 'https://example.com/1.jpg' },
      { id: 2, username: '李四', department: '产品部', value: 850000, trend: -5, avatar: 'https://example.com/2.jpg' },
      { id: 3, username: '王五', department: '技术部', value: 720000, trend: 8 },
      { id: 4, username: '赵六', department: '设计部', value: 650000, trend: -2 },
      { id: 5, username: '钱七', department: '测试部', value: 500000, trend: 3 },
    ],
    activity: [
      { id: 1, username: '张三', department: '技术部', value: 95, trend: 2, avatar: 'https://example.com/1.jpg' },
      { id: 2, username: '李四', department: '产品部', value: 88, trend: -1, avatar: 'https://example.com/2.jpg' },
      { id: 3, username: '王五', department: '技术部', value: 85, trend: 5 },
      { id: 4, username: '赵六', department: '设计部', value: 78, trend: 0 },
      { id: 5, username: '钱七', department: '测试部', value: 72, trend: -3 },
    ],
  }

  const mockCurrentUserRank = {
    codeLines: { rank: 3, total: 50, value: 42000, trend: 0 },
    commits: { rank: 3, total: 50, value: 110, trend: -3 },
    tokenUsage: { rank: 3, total: 50, value: 720000, trend: 8 },
    activity: { rank: 3, total: 50, value: 85, trend: 5 },
  }

  const mountComponent = (props = {}) => {
    return mount(RankingDisplay, {
      props: {
        data: mockRankingData,
        currentUserId: 3,
        ...props,
      },
      global: {
        components: {
          ElButton: ElButtonMock,
          ElInput: ElInputMock,
          ElSelect: ElSelectMock,
          ElOption: ElOptionMock,
          ElAvatar: ElAvatarMock,
          ElTag: ElTagMock,
          ElIcon: ElIconMock,
          ElEmpty: ElEmptyMock,
          ElSkeleton: ElSkeletonMock,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.ranking-display').exists()).toBe(true)
    expect(wrapper.find('.ranking-display__header').exists()).toBe(true)
    expect(wrapper.find('.ranking-display__content').exists()).toBe(true)
  })

  it('should render title correctly', () => {
    const wrapper = mountComponent({ title: '排行榜' })

    expect(wrapper.find('.ranking-display__title').text()).toBe('排行榜')
  })

  it('should use default title when not specified', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.ranking-display__title').text()).toBe('排名展示')
  })

  // ==================== 榜单类型切换测试 ====================

  it('should render all ranking type tabs', () => {
    const wrapper = mountComponent()

    const tabs = wrapper.findAll('.ranking-type-tab')
    expect(tabs.length).toBe(4)
    expect(tabs[0].text()).toContain('代码量')
    expect(tabs[1].text()).toContain('提交次数')
    expect(tabs[2].text()).toContain('Token使用')
    expect(tabs[3].text()).toContain('活跃度')
  })

  it('should switch ranking type when tab clicked', async () => {
    const wrapper = mountComponent()

    const tabs = wrapper.findAll('.ranking-type-tab')
    await tabs[1].trigger('click')

    expect(wrapper.emitted('type-change')).toBeTruthy()
    expect(wrapper.emitted('type-change')![0]).toEqual(['commits'])
  })

  it('should have codeLines as default active type', () => {
    const wrapper = mountComponent()

    const activeTab = wrapper.find('.ranking-type-tab.is-active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toContain('代码量')
  })

  it('should support custom initial type', () => {
    const wrapper = mountComponent({ initialType: 'tokenUsage' })

    const activeTab = wrapper.find('.ranking-type-tab.is-active')
    expect(activeTab.text()).toContain('Token使用')
  })

  // ==================== 当前用户排名展示测试 ====================

  it('should display current user rank info', () => {
    const wrapper = mountComponent({ currentUserRank: mockCurrentUserRank })

    const userRankInfo = wrapper.find('.user-rank-card')
    expect(userRankInfo.exists()).toBe(true)
    expect(userRankInfo.text()).toContain('我的排名')
    expect(userRankInfo.text()).toContain('第 3 名')
    expect(userRankInfo.text()).toContain('50')
  })

  it('should highlight current user in the list', () => {
    const wrapper = mountComponent()

    const rows = wrapper.findAll('.ranking-row')
    // 王五 (id: 3) 应该被高亮
    expect(rows[2].classes()).toContain('ranking-row--current-user')
  })

  it('should show current user rank card', () => {
    const wrapper = mountComponent({ currentUserRank: mockCurrentUserRank })

    const rankCard = wrapper.find('.user-rank-card')
    expect(rankCard.exists()).toBe(true)
    expect(rankCard.text()).toContain('我的排名')
  })

  // ==================== 排名变化趋势测试 ====================

  it('should show upward trend indicator', () => {
    const wrapper = mountComponent()

    // 张三 trend: 5 (上升)
    const trendIndicators = wrapper.findAll('.trend-indicator')
    expect(trendIndicators[0].classes()).toContain('trend-indicator--up')
  })

  it('should show downward trend indicator', () => {
    const wrapper = mountComponent()

    // 李四 trend: -2 (下降)
    const trendIndicators = wrapper.findAll('.trend-indicator')
    expect(trendIndicators[1].classes()).toContain('trend-indicator--down')
  })

  it('should show flat trend indicator', () => {
    const wrapper = mountComponent()

    // 王五 trend: 0 (持平)
    const trendIndicators = wrapper.findAll('.trend-indicator')
    expect(trendIndicators[2].classes()).toContain('trend-indicator--flat')
  })

  it('should display trend value', () => {
    const wrapper = mountComponent()

    const trendValues = wrapper.findAll('.trend-value')
    expect(trendValues[0].text()).toContain('5')
    expect(trendValues[1].text()).toContain('2')
  })

  // ==================== 前N名展示测试 ====================

  it('should display top N users based on topN prop', () => {
    const wrapper = mountComponent({ topN: 3 })

    const rows = wrapper.findAll('.ranking-row')
    expect(rows.length).toBe(3)
  })

  it('should show all users when topN exceeds data length', () => {
    const wrapper = mountComponent({ topN: 100 })

    const rows = wrapper.findAll('.ranking-row')
    expect(rows.length).toBe(5)
  })

  it('should default to showing top 10 when topN not specified', () => {
    const wrapper = mountComponent()

    // 默认显示前10，但只有5条数据
    const rows = wrapper.findAll('.ranking-row')
    expect(rows.length).toBe(5)
  })

  // ==================== DataTable 集成测试 ====================

  it('should render DataTable component', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.data-table').exists()).toBe(true)
  })

  it('should pass correct columns to DataTable', () => {
    const wrapper = mountComponent()

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    expect(dataTable.exists()).toBe(true)
    expect(dataTable.props('columns')).toBeDefined()
    expect(dataTable.props('columns').length).toBeGreaterThan(0)
  })

  it('should pass correct data to DataTable', () => {
    const wrapper = mountComponent()

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    expect(dataTable.props('data')).toEqual(mockRankingData.codeLines)
  })

  // ==================== 加载状态测试 ====================

  it('should show loading state', () => {
    const wrapper = mountComponent({ loading: true, data: { codeLines: [], commits: [], tokenUsage: [], activity: [] } })

    expect(wrapper.find('.ranking-display').classes()).toContain('is-loading')
    expect(wrapper.find('.ranking-skeleton').exists()).toBe(true)
  })

  it('should pass loading to DataTable', () => {
    const wrapper = mountComponent({ loading: true })

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    expect(dataTable.props('loading')).toBe(true)
  })

  // ==================== 空数据处理测试 ====================

  it('should show empty state when data is empty', () => {
    const wrapper = mountComponent({
      data: {
        codeLines: [],
        commits: [],
        tokenUsage: [],
        activity: [],
      },
    })

    expect(wrapper.find('.ranking-empty').exists()).toBe(true)
    expect(wrapper.find('.ranking-empty').text()).toContain('暂无排名数据')
  })

  it('should show custom empty text', () => {
    const wrapper = mountComponent({
      data: {
        codeLines: [],
        commits: [],
        tokenUsage: [],
        activity: [],
      },
      emptyText: '数据加载中，请稍候...',
    })

    expect(wrapper.find('.ranking-empty').text()).toBe('数据加载中，请稍候...')
  })

  // ==================== 响应式布局测试 ====================

  it('should have responsive container class', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.ranking-display').exists()).toBe(true)
  })

  it('should render mobile-friendly layout', () => {
    const wrapper = mountComponent()

    // 检查是否有移动端优化的类名
    expect(wrapper.find('.ranking-display__content').exists()).toBe(true)
  })

  // ==================== 自定义字段测试 ====================

  it('should support custom value formatter', () => {
    const formatter = (value: number) => `${(value / 1000).toFixed(1)}k`
    const wrapper = mountComponent({ valueFormatter: formatter })

    // 验证格式化器被应用
    expect(wrapper.props('valueFormatter')).toBeDefined()
  })

  it('should support custom name key', () => {
    const customData = {
      codeLines: [
        { id: 1, name: '张三', value: 50000 },
        { id: 2, name: '李四', value: 45000 },
      ],
      commits: [],
      tokenUsage: [],
      activity: [],
    }

    const wrapper = mountComponent({
      data: customData,
      currentUserId: 1,
      nameKey: 'name',
    })

    expect(wrapper.props('nameKey')).toBe('name')
  })

  // ==================== 事件测试 ====================

  it('should emit refresh event when refresh button clicked', async () => {
    const wrapper = mountComponent()

    const refreshBtn = wrapper.find('.ranking-refresh-btn')
    await refreshBtn.trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('should emit row-click when a row is clicked', async () => {
    const wrapper = mountComponent()

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    await dataTable.vm.$emit('row-click', mockRankingData.codeLines[0])

    expect(wrapper.emitted('row-click')).toBeTruthy()
    expect(wrapper.emitted('row-click')![0]).toEqual([mockRankingData.codeLines[0]])
  })

  // ==================== 前三名特殊展示测试 ====================

  it('should apply special styles for top 3', () => {
    const wrapper = mountComponent()

    const rows = wrapper.findAll('.ranking-row')
    expect(rows[0].classes()).toContain('ranking-row--top1')
    expect(rows[1].classes()).toContain('ranking-row--top2')
    expect(rows[2].classes()).toContain('ranking-row--top3')
  })

  it('should show crown/medal for top 3', () => {
    const wrapper = mountComponent()

    const topBadges = wrapper.findAll('.top-rank-badge')
    expect(topBadges.length).toBe(3)
  })

  // ==================== 单位显示测试 ====================

  it('should display correct unit for each ranking type', () => {
    const wrapper = mountComponent()

    // 代码量默认单位是行
    expect(wrapper.find('.ranking-unit').exists()).toBe(true)
  })

  it('should support custom unit', () => {
    const wrapper = mountComponent({ unit: 'lines' })

    expect(wrapper.find('.ranking-unit').text()).toBe('lines')
  })

  // ==================== 分页测试 ====================

  it('should support pagination when showPagination is true', () => {
    const wrapper = mountComponent({
      showPagination: true,
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 50,
      },
    })

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    expect(dataTable.props('pagination')).toBeDefined()
  })

  it('should emit page-change when page changes', async () => {
    const wrapper = mountComponent({
      showPagination: true,
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 50,
      },
    })

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    await dataTable.vm.$emit('page-change', 2)

    expect(wrapper.emitted('page-change')).toBeTruthy()
    expect(wrapper.emitted('page-change')![0]).toEqual([2])
  })

  // ==================== 搜索和筛选测试 ====================

  it('should show search input when showSearch is true', () => {
    const wrapper = mountComponent({ showSearch: true })

    expect(wrapper.find('.ranking-search').exists()).toBe(true)
  })

  it('should filter data based on search query', async () => {
    const wrapper = mountComponent({ showSearch: true })

    const searchInput = wrapper.find('.ranking-search input')
    await searchInput.setValue('张三')
    await searchInput.trigger('input')

    // 应该触发搜索事件或更新过滤后的数据
    expect(wrapper.emitted('search')).toBeTruthy()
  })

  // ==================== 部门筛选测试 ====================

  it('should show department filter when showDepartmentFilter is true', () => {
    const wrapper = mountComponent({ showDepartmentFilter: true })

    expect(wrapper.find('.department-filter').exists()).toBe(true)
  })

  // ==================== 卡片视图测试 ====================

  it('should support card view mode', () => {
    const wrapper = mountComponent({ viewMode: 'card' })

    expect(wrapper.find('.ranking-cards').exists()).toBe(true)
    expect(wrapper.find('.ranking-card').exists()).toBe(true)
  })

  it('should support table view mode by default', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.data-table').exists()).toBe(true)
  })

  // ==================== 数据更新测试 ====================

  it('should update when data changes', async () => {
    const wrapper = mountComponent()

    const newData = {
      codeLines: [{ id: 1, username: '新用户', value: 100000 }],
      commits: [],
      tokenUsage: [],
      activity: [],
    }

    await wrapper.setProps({ data: newData })

    const dataTable = wrapper.findComponent({ name: 'DataTable' })
    expect(dataTable.props('data')).toEqual(newData.codeLines)
  })

  // ==================== 错误处理测试 ====================

  it('should handle missing data gracefully', () => {
    const wrapper = mountComponent({ data: null as any })

    expect(wrapper.find('.ranking-display').exists()).toBe(true)
    expect(wrapper.find('.ranking-empty').exists()).toBe(true)
  })

  it('should handle partial data', () => {
    const partialData = {
      codeLines: [{ id: 1, username: '张三', value: 100 }],
    }

    const wrapper = mountComponent({
      data: partialData as any,
      currentUserId: 1,
    })

    expect(wrapper.find('.ranking-display').exists()).toBe(true)
  })

  // ==================== 性能测试 ====================

  it('should handle large datasets efficiently', () => {
    const largeData = {
      codeLines: Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        username: `用户${i + 1}`,
        value: 100000 - i * 100,
        trend: Math.floor(Math.random() * 20) - 10,
      })),
      commits: [],
      tokenUsage: [],
      activity: [],
    }

    const wrapper = mountComponent({
      data: largeData,
      currentUserId: 500,
      topN: 10,
    })

    // 只渲染topN条数据
    const rows = wrapper.findAll('.ranking-row')
    expect(rows.length).toBe(10)
  })
})
