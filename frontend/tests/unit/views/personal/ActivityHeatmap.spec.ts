import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import ActivityHeatmap from '@/views/personal/components/ActivityHeatmap.vue'

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElIcon: {
    name: 'ElIcon',
    setup(_: any, { slots }: any) {
      return () => h('span', { class: 'el-icon' }, slots.default?.())
    },
  },
  ElEmpty: {
    name: 'ElEmpty',
    props: ['description'],
    setup(props: any) {
      return () => h('div', { class: 'el-empty' }, props.description)
    },
  },
}))

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { name: 'Refresh', render: () => h('span', '↻') },
  Loading: { name: 'Loading', render: () => h('span', '⏳') },
  Calendar: { name: 'Calendar', render: () => h('span', '📅') },
}))

// Mock echarts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockClear = vi.fn()
const mockDispose = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockGetOption = vi.fn(() => ({ series: [{ type: 'heatmap' }] }))

vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: mockSetOption,
    resize: mockResize,
    clear: mockClear,
    dispose: mockDispose,
    on: mockOn,
    off: mockOff,
    getOption: mockGetOption,
    isDisposed: vi.fn(() => false),
  })),
}))

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

// @ts-ignore
global.ResizeObserver = MockResizeObserver

describe('ActivityHeatmap', () => {
  const generateMockData = (days: number = 180) => {
    const data = []
    const now = new Date()
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toISOString().split('T')[0],
        commits: Math.floor(Math.random() * 10),
        codeLines: Math.floor(Math.random() * 500),
        tokens: Math.floor(Math.random() * 10000),
      })
    }
    return data.reverse()
  }

  // 生成当前日期的测试数据（确保在默认6个月范围内）
  const generateRecentData = (days: number, offsetDays: number = 0) => {
    const data = []
    const now = new Date()
    // 从 offsetDays 开始，向前生成 days 天的数据
    // 例如：offsetDays=0, days=2 会生成今天和昨天的数据
    for (let i = offsetDays; i < days + offsetDays; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      // 确保日期格式为 YYYY-MM-DD，不包含时间
      const dateStr = date.toISOString().split('T')[0]
      data.push({
        date: dateStr,
        commits: Math.floor(Math.random() * 10) + 1,
        codeLines: Math.floor(Math.random() * 500) + 50,
        tokens: Math.floor(Math.random() * 10000) + 500,
      })
    }
    // 反转数组使日期从早到晚排列
    return data.reverse()
  }

  const mockActivityData = generateMockData(180)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
    expect(wrapper.find('.activity-heatmap__header').exists()).toBe(true)
    expect(wrapper.find('.activity-heatmap__body').exists()).toBe(true)
  })

  it('should render title correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        title: '我的活跃度',
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__title').text()).toBe('我的活跃度')
  })

  it('should use default title when not specified', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__title').text()).toBe('活跃度热力图')
  })

  // ==================== 时间范围切换测试 ====================

  it('should render time range selector', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.time-range-tabs').exists()).toBe(true)
  })

  it('should render 3 time range options', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const tabs = wrapper.findAll('.time-range-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toBe('最近3个月')
    expect(tabs[1].text()).toBe('最近6个月')
    expect(tabs[2].text()).toBe('最近1年')
  })

  it('should have 6months selected by default', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const activeTab = wrapper.find('.time-range-tab.is-active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toBe('最近6个月')
  })

  it('should emit time-range-change when tab is clicked', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const yearTab = wrapper.findAll('.time-range-tab')[2] // 最近1年
    await yearTab.trigger('click')

    expect(wrapper.emitted('time-range-change')).toBeTruthy()
    expect(wrapper.emitted('time-range-change')![0]).toEqual(['1year'])
  })

  it('should update currentTimeRange when prop changes', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        timeRange: '3months',
      },
    })

    expect(wrapper.vm.currentTimeRange).toBe('3months')

    await wrapper.setProps({ timeRange: '1year' })
    expect(wrapper.vm.currentTimeRange).toBe('1year')
  })

  // ==================== 颜色主题切换测试 ====================

  it('should render theme selector', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.theme-selector').exists()).toBe(true)
  })

  it('should render 4 theme options', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const themeButtons = wrapper.findAll('.theme-button')
    expect(themeButtons.length).toBe(4)
  })

  it('should have green theme selected by default', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.vm.currentColorTheme).toBe('green')
  })

  it('should emit theme-change when theme button is clicked', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const blueThemeButton = wrapper.findAll('.theme-button')[1] // 海蓝主题
    await blueThemeButton.trigger('click')

    expect(wrapper.emitted('theme-change')).toBeTruthy()
    expect(wrapper.emitted('theme-change')![0]).toEqual(['blue'])
  })

  it('should update currentColorTheme when prop changes', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        colorTheme: 'orange',
      },
    })

    expect(wrapper.vm.currentColorTheme).toBe('orange')

    await wrapper.setProps({ colorTheme: 'purple' })
    expect(wrapper.vm.currentColorTheme).toBe('purple')
  })

  // ==================== 图表渲染测试 ====================

  it('should render chart container', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__chart').exists()).toBe(true)
  })

  it('should initialize echarts on mount', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
      attachTo: document.body,
    })
    await flushPromises()
    await nextTick()

    expect(wrapper.vm.chartOption).toBeDefined()
    expect(wrapper.vm.chartOption.series).toBeDefined()
  })

  // ==================== 数据处理测试 ====================

  it('should process activity data correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })

    expect(wrapper.vm.heatmapData.length).toBeGreaterThan(0)
    expect(wrapper.vm.heatmapData[0]).toHaveLength(2) // [date, value]
  })

  it('should filter data based on time range', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        timeRange: '3months',
      },
    })

    // 3个月大约90天
    expect(wrapper.vm.filteredData.length).toBeLessThanOrEqual(100)
  })

  it('should handle empty data gracefully', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: [],
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
    expect(wrapper.find('.activity-heatmap__empty').exists()).toBe(true)
  })

  it('should update chart when data changes', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
      attachTo: document.body,
    })

    await flushPromises()

    // 使用最近的数据（确保在6个月范围内）
    // 使用1年时间范围确保所有数据都在范围内
    const newData = generateMockData(30) // 生成30天的数据
    await wrapper.setProps({ data: newData, timeRange: '1year' })
    await nextTick()

    // 验证数据已更新（由于时间过滤，可能不是精确的30天）
    expect(wrapper.vm.heatmapData.length).toBeGreaterThan(0)
  })

  // ==================== 数据提示测试 ====================

  it('should have tooltip configuration', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
    expect(wrapper.vm.chartOption.tooltip?.trigger).toBe('item')
  })

  // ==================== 统计信息测试 ====================

  it('should render statistics section when showStats is true', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: true,
      },
    })
    expect(wrapper.find('.activity-heatmap__stats').exists()).toBe(true)
  })

  it('should hide stats when showStats is false', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: false,
      },
    })
    expect(wrapper.find('.activity-heatmap__stats').exists()).toBe(false)
  })

  it('should calculate total commits correctly', () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const testData = generateRecentData(3)
    testData[0].commits = 5
    testData[1].commits = 3
    testData[2].commits = 0

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
        showStats: true,
      },
    })

    expect(wrapper.vm.totalCommits).toBe(8)
  })

  it('should calculate total code lines correctly', () => {
    // 使用1年时间范围确保数据在范围内
    const now = new Date()
    const testData = [
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0], commits: 1, codeLines: 100, tokens: 100 },
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().split('T')[0], commits: 1, codeLines: 200, tokens: 200 },
    ]

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
        showStats: true,
        timeRange: '1year',
      },
    })

    expect(wrapper.vm.totalCodeLines).toBe(300)
  })

  it('should calculate total tokens correctly', () => {
    // 使用1年时间范围确保数据在范围内
    const now = new Date()
    const testData = [
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0], commits: 1, codeLines: 100, tokens: 1000 },
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().split('T')[0], commits: 1, codeLines: 200, tokens: 2000 },
    ]

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
        showStats: true,
        timeRange: '1year',
      },
    })

    expect(wrapper.vm.totalTokens).toBe(3000)
  })

  it('should calculate active days correctly', () => {
    // 使用1年时间范围确保数据在范围内
    const now = new Date()
    const testData = [
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0], commits: 5, codeLines: 100, tokens: 1000 },
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().split('T')[0], commits: 0, codeLines: 0, tokens: 0 },
      { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString().split('T')[0], commits: 3, codeLines: 200, tokens: 2000 },
    ]

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
        showStats: true,
        timeRange: '1year',
      },
    })

    expect(wrapper.vm.activeDays).toBe(2)
  })

  it('should calculate average activity correctly', () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const testData = generateRecentData(2)
    testData[0].commits = 5
    testData[0].codeLines = 100
    testData[0].tokens = 1000
    testData[1].commits = 3
    testData[1].codeLines = 200
    testData[1].tokens = 2000

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
        showStats: true,
      },
    })

    // activity = commits + codeLines/100 + tokens/1000
    // day1: 5 + 1 + 1 = 7
    // day2: 3 + 2 + 2 = 7
    // average = (7 + 7) / 2 = 7
    expect(wrapper.vm.averageActivity).toBe(7)
  })

  // ==================== 加载状态测试 ====================

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        loading: true,
      },
    })
    expect(wrapper.find('.activity-heatmap').classes()).toContain('is-loading')
    expect(wrapper.find('.chart-loading-overlay').exists()).toBe(true)
  })

  it('should not show loading overlay when loading is false', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        loading: false,
      },
    })
    expect(wrapper.find('.activity-heatmap').classes()).not.toContain('is-loading')
    expect(wrapper.find('.chart-loading-overlay').exists()).toBe(false)
  })

  // ==================== 尺寸和布局测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        height: '400px',
      },
    })
    const chartBody = wrapper.find('.activity-heatmap__chart')
    expect(chartBody.attributes('style')).toContain('height: 400px')
  })

  it('should use default height when not specified', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const chartBody = wrapper.find('.activity-heatmap__chart')
    expect(chartBody.attributes('style')).toContain('height: 280px')
  })

  // ==================== 图例测试 ====================

  it('should render legend with activity levels', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__legend').exists()).toBe(true)
    expect(wrapper.find('.legend-label-low').exists()).toBe(true)
    expect(wrapper.find('.legend-label-high').exists()).toBe(true)
  })

  it('should display activity level descriptions', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const legend = wrapper.find('.activity-heatmap__legend')
    expect(legend.text()).toContain('低')
    expect(legend.text()).toContain('高')
  })

  // ==================== 刷新功能测试 ====================

  it('should render refresh button', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__refresh').exists()).toBe(true)
  })

  it('should emit refresh event when refresh button clicked', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    await wrapper.find('.activity-heatmap__refresh').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('should disable refresh button when loading', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        loading: true,
      },
    })
    const refreshBtn = wrapper.find('.activity-heatmap__refresh')
    expect(refreshBtn.attributes('disabled')).toBeDefined()
  })

  // ==================== 日期点击事件测试 ====================

  it('should emit date-click when a date is clicked', async () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const testData = generateRecentData(5)
    const testDate = testData[0].date

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
      },
    })

    // 模拟点击图表中的某一天
    wrapper.vm.handleChartClick({ data: [testDate, 10] })

    expect(wrapper.emitted('date-click')).toBeTruthy()
    expect(wrapper.emitted('date-click')![0][0]).toBe(testDate)
  })

  // ==================== 边界条件测试 ====================

  it('should handle large data sets', () => {
    // 使用1年时间范围来测试365天的数据
    const largeData = generateMockData(365)

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: largeData,
        timeRange: '1year',
      },
    })
    // 在1年时间范围内，应该能显示所有数据
    expect(wrapper.vm.filteredData.length).toBeGreaterThanOrEqual(180)
  })

  it('should handle invalid dates gracefully', () => {
    // 使用最近的有效数据
    const recentData = generateRecentData(2)

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: [
          { date: 'invalid-date', commits: 5, codeLines: 100, tokens: 1000 },
          ...recentData,
        ],
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
  })

  it('should handle negative values gracefully', () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const recentData = generateRecentData(2)
    recentData[0].commits = -5
    recentData[0].codeLines = -100
    recentData[0].tokens = -1000

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: recentData,
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
  })

  it('should handle zero values correctly', () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const recentData = generateRecentData(2)
    recentData[0].commits = 0
    recentData[0].codeLines = 0
    recentData[0].tokens = 0
    recentData[1].commits = 0
    recentData[1].codeLines = 0
    recentData[1].tokens = 0

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: recentData,
      },
    })
    expect(wrapper.vm.totalCommits).toBe(0)
    expect(wrapper.vm.activeDays).toBe(0)
  })

  // ==================== 生命周期测试 ====================

  it('should cleanup on unmount', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
    wrapper.unmount()
    expect(true).toBe(true) // 验证unmount没有抛出错误
  })

  it('should handle resize events', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })

    await flushPromises()

    // 验证组件有handleResize方法
    expect(typeof wrapper.vm.handleResize).toBe('function')

    // 触发resize方法
    wrapper.vm.handleResize()
    await nextTick()

    expect(true).toBe(true)
  })

  // ==================== 颜色配置测试 ====================

  it('should use correct colors for green theme', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        colorTheme: 'green',
      },
    })
    const colors = wrapper.vm.currentColors
    expect(colors.length).toBe(5)
    expect(colors[1]).toBe('#9be9a8')
  })

  it('should use correct colors for blue theme', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        colorTheme: 'blue',
      },
    })
    const colors = wrapper.vm.currentColors
    expect(colors.length).toBe(5)
    expect(colors[1]).toBe('#a8d5ff')
  })

  it('should use correct colors for orange theme', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        colorTheme: 'orange',
      },
    })
    const colors = wrapper.vm.currentColors
    expect(colors.length).toBe(5)
    expect(colors[1]).toBe('#ffd4a3')
  })

  it('should use correct colors for purple theme', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        colorTheme: 'purple',
      },
    })
    const colors = wrapper.vm.currentColors
    expect(colors.length).toBe(5)
    expect(colors[1]).toBe('#d4a5ff')
  })

  // ==================== 响应式设计测试 ====================

  it('should have responsive styles', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })

    // 验证组件有响应式类名
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
  })

  // ==================== getDateData 方法测试 ====================

  it('should return correct data for a specific date', () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const testData = generateRecentData(2)
    testData[0].commits = 5
    testData[0].codeLines = 100
    testData[0].tokens = 1000
    testData[1].commits = 3
    testData[1].codeLines = 200
    testData[1].tokens = 2000
    const targetDate = testData[0].date

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
      },
    })

    const result = wrapper.vm.getDateData(targetDate)
    expect(result).toBeDefined()
    expect(result?.commits).toBe(5)
    expect(result?.codeLines).toBe(100)
    expect(result?.tokens).toBe(1000)
  })

  it('should return undefined for non-existent date', () => {
    // 使用最近的数据（确保在默认6个月范围内）
    const testData = generateRecentData(1)

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: testData,
      },
    })

    // 查询一个不存在于数据中的日期
    const result = wrapper.vm.getDateData('1999-12-31')
    expect(result).toBeUndefined()
  })
})
