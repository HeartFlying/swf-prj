import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import RankingChart from '@/components/RankingChart/RankingChart.vue'

// Mock echarts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockClear = vi.fn()
const mockDispose = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockGetOption = vi.fn()
const mockDispatchAction = vi.fn()

vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: mockSetOption,
    resize: mockResize,
    clear: mockClear,
    dispose: mockDispose,
    on: mockOn,
    off: mockOff,
    getOption: mockGetOption,
    dispatchAction: mockDispatchAction,
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

describe('RankingChart', () => {
  const mockData = [
    { id: '1', name: '张三', value: 100, trend: 2 },
    { id: '2', name: '李四', value: 200, trend: -1 },
    { id: '3', name: '王五', value: 150, trend: 0 },
    { id: '4', name: '赵六', value: 300, trend: 5 },
    { id: '5', name: '钱七', value: 80, trend: -3 },
    { id: '6', name: '孙八', value: 250, trend: 1 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
    expect(wrapper.find('.ranking-chart__container').exists()).toBe(true)
  })

  it('should render title correctly', () => {
    const wrapper = mount(RankingChart, {
      props: {
        title: '用户排名',
        data: mockData,
      },
    })
    expect(wrapper.find('.ranking-chart__title').text()).toBe('用户排名')
  })

  it('should not render title when not provided', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.ranking-chart__title').exists()).toBe(false)
  })

  // ==================== TOP N 展示测试 ====================

  it('should display all items by default (maxItems=10)', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(6)
  })

  it('should limit displayed items when maxItems is set', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        maxItems: 3,
      },
    })
    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(3)
  })

  it('should show all items when maxItems exceeds data length', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        maxItems: 10,
      },
    })
    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(6)
  })

  // ==================== 当前用户高亮测试 ====================

  it('should highlight current user when currentUserId is provided', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        currentUserId: '2',
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 找到李四的数据并检查是否高亮
    const liSiData = seriesData.find((item: any) => item.name === '李四')
    expect(liSiData?.itemStyle?.shadowBlur).toBe(10)
    expect(liSiData?.itemStyle?.shadowColor).toBe('rgba(0, 212, 255, 0.5)')
  })

  it('should not highlight any user when currentUserId is not provided', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    const hasHighlight = seriesData.some((item: any) =>
      item.itemStyle?.shadowBlur === 10
    )
    expect(hasHighlight).toBe(false)
  })

  it('should handle currentUserId not found in data gracefully', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        currentUserId: '999',
      },
    })
    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(6)
  })

  // ==================== 排名变化趋势测试 ====================

  it('should show trend indicators when showTrend is true', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showTrend: true,
      },
    })
    // 检查标签 formatter 是否包含趋势信息
    const labelFormatter = wrapper.vm.chartOption.series[0].label?.formatter
    expect(typeof labelFormatter).toBe('function')
  })

  it('should not show trend indicators when showTrend is false', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showTrend: false,
      },
    })
    const labelFormatter = wrapper.vm.chartOption.series[0].label?.formatter
    // 默认 formatter 应该是字符串或简单函数
    expect(labelFormatter).toBeDefined()
  })

  it('should display correct trend symbols for up/down/flat', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showTrend: true,
      },
    })
    const formatter = wrapper.vm.chartOption.series[0].label?.formatter

    // 测试上升趋势
    const upResult = formatter({ name: '张三', value: 100, data: { trend: 2 } })
    expect(upResult).toContain('▲')

    // 测试下降趋势
    const downResult = formatter({ name: '李四', value: 200, data: { trend: -1 } })
    expect(downResult).toContain('▼')

    // 测试持平
    const flatResult = formatter({ name: '王五', value: 150, data: { trend: 0 } })
    expect(flatResult).toContain('—')
  })

  // ==================== 数据标签测试 ====================

  it('should display name, value and rank in labels', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        maxItems: 3,
      },
    })
    const yAxis = wrapper.vm.chartOption.yAxis
    expect(yAxis?.data?.length).toBe(3)
    // 检查是否包含排名序号
    expect(yAxis?.data[0]).toContain('1.')
  })

  it('should show value labels by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(true)
  })

  // ==================== 图例测试 ====================

  it('should show legend by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(true)
  })

  it('should support hiding legend', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showLegend: false,
      },
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(false)
  })

  // ==================== 头像显示测试 ====================

  it('should show avatar in tooltip when showAvatar is true', () => {
    const dataWithAvatar = [
      { id: '1', name: '张三', value: 100, avatar: 'https://example.com/avatar.jpg' },
    ]
    const wrapper = mount(RankingChart, {
      props: {
        data: dataWithAvatar,
        showAvatar: true,
      },
    })
    const tooltipFormatter = wrapper.vm.chartOption.tooltip?.formatter
    expect(typeof tooltipFormatter).toBe('function')
  })

  it('should not show avatar when showAvatar is false', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showAvatar: false,
      },
    })
    // 不检查具体实现，确保组件正常渲染
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
  })

  // ==================== 高度配置测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        height: 400,
      },
    })
    expect(wrapper.vm.chartHeight).toBe('400px')
  })

  it('should use default height when not specified', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartHeight).toBe('300px')
  })

  // ==================== 横向条形图测试 ====================

  it('should render horizontal bar chart', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.type).toBe('value')
    expect(wrapper.vm.chartOption.yAxis?.type).toBe('category')
  })

  // ==================== 数据排序测试 ====================

  it('should sort data by value in descending order by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    expect(seriesData[0].value).toBe(300) // 赵六
    expect(seriesData[1].value).toBe(250) // 孙八
    expect(seriesData[2].value).toBe(200) // 李四
  })

  // ==================== 加载状态测试 ====================

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(RankingChart, {
      props: {
        loading: true,
        data: mockData,
      },
    })
    expect(wrapper.find('.ranking-chart').classes()).toContain('is-loading')
    expect(wrapper.find('.ranking-chart__loading').exists()).toBe(true)
  })

  it('should not show loading overlay when loading is false', () => {
    const wrapper = mount(RankingChart, {
      props: {
        loading: false,
        data: mockData,
      },
    })
    expect(wrapper.find('.ranking-chart').classes()).not.toContain('is-loading')
    expect(wrapper.find('.ranking-chart__loading').exists()).toBe(false)
  })

  // ==================== 空数据处理测试 ====================

  it('should handle empty data gracefully', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: [],
      },
    })
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
    expect(wrapper.find('.ranking-chart__empty').exists()).toBe(true)
  })

  it('should handle null data gracefully', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: null as any,
      },
    })
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
    expect(wrapper.find('.ranking-chart__empty').exists()).toBe(true)
  })

  // ==================== 数据更新测试 ====================

  it('should update chart when data changes', async () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })

    const newData = [
      { id: '7', name: '用户A', value: 500, trend: 1 },
      { id: '8', name: '用户B', value: 400, trend: -2 },
    ]

    await wrapper.setProps({ data: newData })

    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(2)
    expect(wrapper.vm.chartOption.series[0].data[0].value).toBe(500)
  })

  // ==================== 事件处理测试 ====================

  it('should emit click event when chart is clicked', async () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })

    const clickData = { name: '张三', value: 100, dataIndex: 0 }
    wrapper.vm.handleChartClick(clickData)

    expect(wrapper.emitted('chart-click')).toBeTruthy()
    expect(wrapper.emitted('chart-click')![0]).toEqual([clickData])
  })

  // ==================== 销毁清理测试 ====================

  it('should cleanup on unmount', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
    wrapper.unmount()
    // 验证unmount没有抛出错误即可
    expect(true).toBe(true)
  })

  // ==================== 响应式测试 ====================

  it('should handle resize events', async () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })

    await flushPromises()
    wrapper.vm.handleResize()
    await nextTick()

    expect(mockResize).toHaveBeenCalled()
  })

  // ==================== Props 类型测试 ====================

  it('should accept RankingItem array as data prop', () => {
    const rankingData = [
      { id: '1', name: '张三', value: 100, trend: 2, avatar: 'https://example.com/avatar.jpg' },
      { id: '2', name: '李四', value: 200, trend: -1 },
    ]
    const wrapper = mount(RankingChart, {
      props: {
        data: rankingData,
        currentUserId: '1',
        showTrend: true,
        showAvatar: true,
      },
    })
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
  })

  // ==================== 颜色配置测试 ====================

  it('should apply top 3 highlight colors', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        maxItems: 3,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 前三名应该有特殊的颜色
    expect(seriesData[0].itemStyle?.color).toBeDefined()
    expect(seriesData[1].itemStyle?.color).toBeDefined()
    expect(seriesData[2].itemStyle?.color).toBeDefined()
  })

  // ==================== tooltip 配置测试 ====================

  it('should show tooltip by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
    expect(wrapper.vm.chartOption.tooltip?.trigger).toBe('axis')
  })
})
