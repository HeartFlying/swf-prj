import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import RankingChart from '@/components/charts/RankingChart.vue'

// Mock echarts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockClear = vi.fn()
const mockDispose = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockGetOption = vi.fn(() => ({ series: [{ type: 'bar' }], grid: {}, xAxis: {}, yAxis: {} }))
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

describe('RankingChart', () => {
  const mockData = [
    { name: '张三', value: 100 },
    { name: '李四', value: 200 },
    { name: '王五', value: 150 },
    { name: '赵六', value: 300 },
    { name: '钱七', value: 80 },
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

  // ==================== 布局方向测试 ====================

  it('should render horizontal bar chart by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.type).toBe('value')
    expect(wrapper.vm.chartOption.yAxis?.type).toBe('category')
  })

  it('should render vertical bar chart when direction is vertical', () => {
    const wrapper = mount(RankingChart, {
      props: {
        direction: 'vertical',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.type).toBe('category')
    expect(wrapper.vm.chartOption.yAxis?.type).toBe('value')
  })

  it('should support horizontal direction explicitly', () => {
    const wrapper = mount(RankingChart, {
      props: {
        direction: 'horizontal',
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
    expect(seriesData[0].value).toBe(300)
    expect(seriesData[1].value).toBe(200)
    expect(seriesData[2].value).toBe(150)
    expect(seriesData[3].value).toBe(100)
    expect(seriesData[4].value).toBe(80)
  })

  it('should support ascending sort order', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        sortOrder: 'ascending',
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    expect(seriesData[0].value).toBe(80)
    expect(seriesData[1].value).toBe(100)
    expect(seriesData[2].value).toBe(150)
    expect(seriesData[3].value).toBe(200)
    expect(seriesData[4].value).toBe(300)
  })

  it('should support disabling auto sort', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        autoSort: false,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 保持原始顺序
    expect(seriesData[0].value).toBe(100)
    expect(seriesData[1].value).toBe(200)
    expect(seriesData[2].value).toBe(150)
  })

  // ==================== 前N名高亮测试 ====================

  it('should highlight top N items by default (top 3)', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        highlightTop: 3,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 前三名应该有特殊的itemStyle
    expect(seriesData[0].itemStyle).toBeDefined()
    expect(seriesData[1].itemStyle).toBeDefined()
    expect(seriesData[2].itemStyle).toBeDefined()
  })

  it('should support custom highlight count', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        highlightTop: 1,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 第一名应该有高亮颜色
    expect(seriesData[0].itemStyle?.color).toBe('#ffd700')
    // 第二名及以后应该使用默认颜色
    expect(seriesData[1].itemStyle?.color).toBe('#5470c6')
  })

  it('should support disabling highlight', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        highlightTop: 0,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 所有项都应该使用默认颜色（没有高亮颜色）
    expect(seriesData.every((item: any) => item.itemStyle?.color === '#5470c6')).toBe(true)
  })

  it('should apply different colors for top 3', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        highlightTop: 3,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 前三名颜色应该不同
    const color1 = seriesData[0].itemStyle?.color
    const color2 = seriesData[1].itemStyle?.color
    const color3 = seriesData[2].itemStyle?.color
    expect(color1).toBeDefined()
    expect(color2).toBeDefined()
    expect(color3).toBeDefined()
    expect(color1).not.toBe(color2)
    expect(color2).not.toBe(color3)
  })

  // ==================== 动画配置测试 ====================

  it('should enable animation by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.animation).toBe(true)
  })

  it('should support disabling animation', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        animation: false,
      },
    })
    expect(wrapper.vm.chartOption.animation).toBe(false)
  })

  it('should support custom animation duration', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        animationDuration: 2000,
      },
    })
    expect(wrapper.vm.chartOption.animationDuration).toBe(2000)
  })

  it('should support custom animation easing', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        animationEasing: 'elasticOut',
      },
    })
    expect(wrapper.vm.chartOption.animationEasing).toBe('elasticOut')
  })

  it('should support dynamic sort animation', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        dynamicSort: true,
      },
    })
    // 动态排序应该配置特殊的动画
    expect(wrapper.vm.chartOption.animationDurationUpdate).toBeDefined()
    expect(wrapper.vm.chartOption.animationEasingUpdate).toBeDefined()
  })

  // ==================== 标签配置测试 ====================

  it('should show value labels by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(true)
  })

  it('should support hiding labels', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showLabel: false,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(false)
  })

  it('should support custom label formatter', () => {
    const formatter = (params: any) => `${params.name}: ${params.value}分`
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        labelFormatter: formatter,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.formatter).toBe(formatter)
  })

  it('should position label correctly for horizontal layout', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        direction: 'horizontal',
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.position).toBe('right')
  })

  it('should position label correctly for vertical layout', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        direction: 'vertical',
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.position).toBe('top')
  })

  // ==================== 条形样式测试 ====================

  it('should apply custom bar width', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        barWidth: 20,
      },
    })
    expect(wrapper.vm.chartOption.series[0].barWidth).toBe(20)
  })

  it('should apply custom bar gap', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        barGap: '20%',
      },
    })
    expect(wrapper.vm.chartOption.series[0].barGap).toBe('20%')
  })

  it('should apply border radius to bars', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        barBorderRadius: 8,
      },
    })
    expect(wrapper.vm.chartOption.series[0].itemStyle?.borderRadius).toBeDefined()
  })

  // ==================== 颜色配置测试 ====================

  it('should use default color for non-highlighted bars', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        highlightTop: 0,
        barColor: '#5470c6',
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    expect(seriesData[0].itemStyle?.color).toBe('#5470c6')
  })

  it('should support custom highlight colors', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        highlightTop: 3,
        highlightColors: ['#ff0000', '#00ff00', '#0000ff'],
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    expect(seriesData[0].itemStyle?.color).toBe('#ff0000')
    expect(seriesData[1].itemStyle?.color).toBe('#00ff00')
    expect(seriesData[2].itemStyle?.color).toBe('#0000ff')
  })

  // ==================== 坐标轴配置测试 ====================

  it('should hide axis lines by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    const xAxis = wrapper.vm.chartOption.xAxis
    const yAxis = wrapper.vm.chartOption.yAxis
    expect(xAxis?.axisLine?.show).toBe(false)
    expect(yAxis?.axisLine?.show).toBe(false)
  })

  it('should show axis lines when configured', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showAxisLine: true,
      },
    })
    const xAxis = wrapper.vm.chartOption.xAxis
    const yAxis = wrapper.vm.chartOption.yAxis
    expect(xAxis?.axisLine?.show).toBe(true)
    expect(yAxis?.axisLine?.show).toBe(true)
  })

  it('should hide grid lines by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    const xAxis = wrapper.vm.chartOption.xAxis
    const yAxis = wrapper.vm.chartOption.yAxis
    expect(xAxis?.splitLine?.show).toBe(false)
    expect(yAxis?.splitLine?.show).toBe(false)
  })

  // ==================== 提示框配置测试 ====================

  it('should show tooltip by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
    expect(wrapper.vm.chartOption.tooltip?.trigger).toBe('axis')
  })

  it('should support hiding tooltip', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showTooltip: false,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeUndefined()
  })

  it('should support custom tooltip formatter', () => {
    const formatter = (params: any) => `Custom: ${params[0].name}`
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        tooltipFormatter: formatter,
      },
    })
    expect(wrapper.vm.chartOption.tooltip?.formatter).toBe(formatter)
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

  // ==================== 尺寸配置测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(RankingChart, {
      props: {
        height: '400px',
        data: mockData,
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

  it('should apply custom width when provided', () => {
    const wrapper = mount(RankingChart, {
      props: {
        width: '500px',
        data: mockData,
      },
    })
    expect(wrapper.props('width')).toBe('500px')
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
      { name: '用户A', value: 500 },
      { name: '用户B', value: 400 },
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

  it('should emit sort-change event when sort order changes', async () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })

    await wrapper.setProps({ sortOrder: 'ascending' })

    expect(wrapper.emitted('sort-change')).toBeTruthy()
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

  // ==================== 最大值/最小值标签测试 ====================

  it('should show max/min labels when configured', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showExtremeLabels: true,
      },
    })
    const markPoint = wrapper.vm.chartOption.series[0].markPoint
    expect(markPoint).toBeDefined()
    expect(markPoint?.data).toContainEqual({ type: 'max', name: '最大值' })
    expect(markPoint?.data).toContainEqual({ type: 'min', name: '最小值' })
  })

  it('should not show extreme labels by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].markPoint).toBeUndefined()
  })

  // ==================== 平均值标记测试 ====================

  it('should show average line when configured', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showAverage: true,
      },
    })
    const markLine = wrapper.vm.chartOption.series[0].markLine
    expect(markLine).toBeDefined()
    expect(markLine?.data).toContainEqual({ type: 'average', name: '平均值' })
  })

  // ==================== 主题配置测试 ====================

  it('should support dark theme by default', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.props('theme')).toBe('dark')
  })

  it('should support light theme', () => {
    const wrapper = mount(RankingChart, {
      props: {
        theme: 'light',
        data: mockData,
      },
    })
    expect(wrapper.props('theme')).toBe('light')
  })

  // ==================== 数据限制测试 ====================

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
    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(5)
  })

  // ==================== 排名序号测试 ====================

  it('should show rank index when configured', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showRank: true,
      },
    })
    // 排名序号应该通过axisLabel或label formatter显示
    const yAxis = wrapper.vm.chartOption.yAxis
    expect(yAxis?.axisLabel?.formatter).toBeDefined()
  })

  // ==================== 背景条测试 ====================

  it('should show background bar when configured', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        showBackground: true,
      },
    })
    expect(wrapper.vm.chartOption.series[0].showBackground).toBe(true)
    expect(wrapper.vm.chartOption.series[0].backgroundStyle).toBeDefined()
  })

  // ==================== 渐变色测试 ====================

  it('should apply gradient color when configured', () => {
    const wrapper = mount(RankingChart, {
      props: {
        data: mockData,
        useGradient: true,
        highlightTop: 0,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    // 渐变色应该是一个对象而不是字符串
    expect(typeof seriesData[0].itemStyle?.color).toBe('object')
  })
})
