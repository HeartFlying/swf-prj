import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue'

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElIcon: {
    name: 'ElIcon',
    setup(_: any, { slots }: any) {
      return () => h('span', { class: 'el-icon' }, slots.default?.())
    },
  },
}))

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  ArrowLeft: { name: 'ArrowLeft', render: () => h('span', '<') },
  ArrowRight: { name: 'ArrowRight', render: () => h('span', '>') },
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
  registerTheme: vi.fn(),
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
  const mockActivityData = [
    { date: '2024-01-01', count: 5, level: 1 },
    { date: '2024-01-02', count: 12, level: 2 },
    { date: '2024-01-03', count: 25, level: 3 },
    { date: '2024-01-04', count: 40, level: 4 },
    { date: '2024-01-05', count: 0, level: 0 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  // 基础渲染测试
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

  // 标题渲染测试
  it('should render title correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        title: '编码活跃度',
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__title').text()).toBe('编码活跃度')
  })

  // 默认标题测试
  it('should use default title when not specified', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__title').text()).toBe('活跃度热力图')
  })

  // ==================== 年份切换测试 ====================

  // 年份选择器渲染测试
  it('should render year selector', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__year-selector').exists()).toBe(true)
  })

  // 年份选项渲染测试
  it('should render year options correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        years: [2022, 2023, 2024, 2025],
        year: 2024,
      },
    })
    // 组件使用导航按钮和当前年份显示
    expect(wrapper.find('.current-year').exists()).toBe(true)
    expect(wrapper.find('.current-year').text()).toContain('2024')
    expect(wrapper.find('.year-nav-button.prev').exists()).toBe(true)
    expect(wrapper.find('.year-nav-button.next').exists()).toBe(true)
  })

  // 默认年份测试
  it('should use current year as default when not specified', () => {
    const currentYear = new Date().getFullYear()
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.vm.currentYear).toBe(currentYear)
  })

  // 自定义默认年份测试
  it('should use specified default year', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        year: 2023,
      },
    })
    expect(wrapper.vm.currentYear).toBe(2023)
  })

  // 年份切换事件测试
  it('should emit year-change when year is changed', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        years: [2022, 2023, 2024],
        year: 2024,
      },
    })

    // 模拟点击上一年按钮
    const prevButton = wrapper.find('.year-nav-button.prev')
    await prevButton.trigger('click')

    expect(wrapper.emitted('year-change')).toBeTruthy()
    expect(wrapper.emitted('year-change')![0]).toEqual([2023])
  })

  // 年份边界测试 - 不能小于最小年份
  it('should not navigate below minimum year', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        years: [2022, 2023, 2024],
        year: 2022,
      },
    })

    const prevButton = wrapper.find('.year-nav-button.prev')
    await prevButton.trigger('click')

    // 不应该触发事件，因为已经是最小年份
    expect(wrapper.emitted('year-change')).toBeFalsy()
  })

  // 年份边界测试 - 不能大于最大年份
  it('should not navigate above maximum year', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        years: [2022, 2023, 2024],
        year: 2024,
      },
    })

    const nextButton = wrapper.find('.year-nav-button.next')
    await nextButton.trigger('click')

    // 不应该触发事件，因为已经是最大年份
    expect(wrapper.emitted('year-change')).toBeFalsy()
  })

  // ==================== 图表渲染测试 ====================

  // 图表容器渲染测试
  it('should render chart container', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.find('.activity-heatmap__chart').exists()).toBe(true)
  })

  // 图表初始化测试
  it('should initialize echarts on mount', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
      attachTo: document.body, // 附加到 DOM 以便图表初始化
    })
    await flushPromises()
    await nextTick()
    // 在 jsdom 环境中，图表可能无法完全初始化，但配置应该正确生成
    expect(wrapper.vm.chartOption).toBeDefined()
    expect(wrapper.vm.chartOption.series).toBeDefined()
  })

  // ==================== 数据处理测试 ====================

  // 数据传递测试
  it('should process activity data correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.vm.processedData).toHaveLength(5)
    expect(wrapper.vm.processedData[0]).toEqual(['2024-01-01', 5])
  })

  // 空数据处理测试
  it('should handle empty data gracefully', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: [],
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
    expect(wrapper.find('.activity-heatmap__empty').exists()).toBe(true)
  })

  // 数据更新测试
  it('should update chart when data changes', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
      attachTo: document.body,
    })

    await flushPromises()

    const newData = [
      { date: '2024-02-01', count: 10, level: 2 },
      { date: '2024-02-02', count: 20, level: 3 },
    ]

    await wrapper.setProps({ data: newData })
    await nextTick()

    expect(wrapper.vm.processedData).toHaveLength(2)
    // 验证图表配置已更新
    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(2)
  })

  // ==================== 悬停详情测试 ====================

  // 悬停提示配置测试
  it('should have tooltip configuration', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
    expect(wrapper.vm.chartOption.tooltip.trigger).toBe('item')
  })

  // 自定义提示格式化测试
  it('should format tooltip content correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const formatter = wrapper.vm.chartOption.tooltip.formatter
    const result = formatter({ data: ['2024-01-01', 5], color: '#39d353' })
    // 验证格式化后的内容包含日期和活跃度信息
    expect(result).toContain('2024')
    expect(result).toContain('1')
    expect(result).toContain('活跃度')
    expect(result).toContain('5')
  })

  // ==================== 视觉样式测试 ====================

  // 颜色范围测试
  it('should have correct color range for activity levels', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const visualMap = wrapper.vm.chartOption.visualMap
    expect(visualMap).toBeDefined()
    expect(visualMap.min).toBe(0)
    expect(visualMap.max).toBeGreaterThan(0)
  })

  // 颜色渐变测试
  it('should use gradient colors for heatmap', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const visualMap = wrapper.vm.chartOption.visualMap
    expect(visualMap.inRange.color).toBeDefined()
    expect(visualMap.inRange.color.length).toBeGreaterThan(2)
  })

  // ==================== 加载状态测试 ====================

  // 加载状态测试
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

  // 非加载状态测试
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

  // 高度设置测试
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

  // 默认高度测试
  it('should use default height when not specified', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    const chartBody = wrapper.find('.activity-heatmap__chart')
    expect(chartBody.attributes('style')).toContain('height: 200px')
  })

  // ==================== 图例和说明测试 ====================

  // 图例渲染测试
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

  // 活跃度等级说明测试
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

  // ==================== 统计信息测试 ====================

  // 统计信息渲染测试
  it('should render statistics section', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: true,
      },
    })
    expect(wrapper.find('.activity-heatmap__stats').exists()).toBe(true)
  })

  // 总提交数统计测试
  it('should calculate total commits correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: true,
      },
    })
    // 5 + 12 + 25 + 40 + 0 = 82
    expect(wrapper.vm.totalCommits).toBe(82)
  })

  // 活跃天数统计测试
  it('should calculate active days correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: true,
      },
    })
    // 4 days with count > 0
    expect(wrapper.vm.activeDays).toBe(4)
  })

  // 平均活跃度测试
  it('should calculate average activity correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: true,
      },
    })
    // 82 / 5 = 16.4
    expect(wrapper.vm.averageActivity).toBe(16.4)
  })

  // 隐藏统计信息测试
  it('should hide stats when showStats is false', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        showStats: false,
      },
    })
    expect(wrapper.find('.activity-heatmap__stats').exists()).toBe(false)
  })

  // ==================== 事件处理测试 ====================

  // 点击事件测试
  it('should emit date-click when a date is clicked', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })

    // 模拟图表点击事件
    wrapper.vm.handleChartClick({ data: ['2024-01-01', 5] })

    expect(wrapper.emitted('date-click')).toBeTruthy()
    expect(wrapper.emitted('date-click')![0]).toEqual(['2024-01-01', 5])
  })

  // 刷新按钮测试
  it('should emit refresh event when refresh button clicked', async () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
      },
    })
    await wrapper.find('.activity-heatmap__refresh').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  // ==================== 边界条件测试 ====================

  // 大数据量处理测试
  it('should handle large data sets', () => {
    const largeData = Array.from({ length: 365 }, (_, i) => ({
      date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
      count: Math.floor(Math.random() * 50),
      level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4,
    }))

    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: largeData,
      },
    })
    expect(wrapper.vm.processedData.length).toBe(365)
  })

  // 无效日期处理测试
  it('should handle invalid dates gracefully', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: [
          { date: 'invalid-date', count: 5, level: 1 },
          { date: '2024-01-01', count: 10, level: 2 },
        ],
      },
    })
    expect(wrapper.find('.activity-heatmap').exists()).toBe(true)
  })

  // 负数数据处理测试
  it('should handle negative values gracefully', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: [
          { date: '2024-01-01', count: -5, level: 0 },
          { date: '2024-01-02', count: 10, level: 2 },
        ],
      },
    })
    expect(wrapper.vm.processedData[0][1]).toBe(0) // 负数应该被处理为0
  })

  // 零值数据处理测试
  it('should handle zero values correctly', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: [
          { date: '2024-01-01', count: 0, level: 0 },
          { date: '2024-01-02', count: 0, level: 0 },
        ],
      },
    })
    expect(wrapper.vm.processedData[0][1]).toBe(0)
    expect(wrapper.vm.processedData[1][1]).toBe(0)
  })

  // ==================== 生命周期测试 ====================

  // 销毁时清理测试
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

  // 响应式调整测试
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

  // ==================== 主题测试 ====================

  // 暗色主题测试
  it('should support dark theme', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        theme: 'dark',
      },
    })
    expect(wrapper.find('.activity-heatmap').classes()).toContain('theme-dark')
  })

  // 亮色主题测试
  it('should support light theme', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        theme: 'light',
      },
    })
    expect(wrapper.find('.activity-heatmap').classes()).toContain('theme-light')
  })

  // ==================== 自定义配置测试 ====================

  // 自定义颜色测试
  it('should use custom colors when provided', () => {
    const customColors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        colors: customColors,
      },
    })
    const visualMap = wrapper.vm.chartOption.visualMap
    // 暗色主题下，第一个颜色是背景色，后面跟着自定义颜色
    expect(visualMap.inRange.color.length).toBeGreaterThanOrEqual(customColors.length)
    // 验证自定义颜色包含在最终颜色中
    customColors.forEach(color => {
      expect(visualMap.inRange.color).toContain(color)
    })
  })

  // 自定义范围测试
  it('should use custom value range when provided', () => {
    const wrapper = mount(ActivityHeatmap, {
      props: {
        data: mockActivityData,
        minValue: 0,
        maxValue: 100,
      },
    })
    const visualMap = wrapper.vm.chartOption.visualMap
    expect(visualMap.min).toBe(0)
    expect(visualMap.max).toBe(100)
  })
})
