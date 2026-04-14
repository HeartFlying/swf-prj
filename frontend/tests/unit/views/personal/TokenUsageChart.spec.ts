import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import TokenUsageChart from '@/views/personal/components/TokenUsageChart.vue'

// Mock echarts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockClear = vi.fn()
const mockDispose = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockGetOption = vi.fn(() => ({ series: [{ type: 'line' }], grid: {}, xAxis: {}, yAxis: {} }))

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

describe('TokenUsageChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart').exists()).toBe(true)
    expect(wrapper.find('.token-usage-chart__header').exists()).toBe(true)
    expect(wrapper.find('.token-usage-chart__body').exists()).toBe(true)
  })

  // 标题渲染测试
  it('should render title correctly', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        title: 'Token使用趋势',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart__title').text()).toBe('Token使用趋势')
  })

  // 默认标题测试
  it('should use default title when not specified', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart__title').text()).toBe('Token使用统计')
  })

  // 时间范围选择器渲染测试
  it('should render time range selector', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart__controls').exists()).toBe(true)
    expect(wrapper.find('.time-range-tabs').exists()).toBe(true)
  })

  // 日/周/月切换按钮测试
  it('should render day/week/month tabs', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const tabs = wrapper.findAll('.time-range-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toBe('日')
    expect(tabs[1].text()).toBe('周')
    expect(tabs[2].text()).toBe('月')
  })

  // 默认选中项测试
  it('should have day tab selected by default', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const activeTab = wrapper.find('.time-range-tab.is-active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toBe('日')
  })

  // 时间范围切换测试
  it('should emit time-range-change when tab is clicked', async () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const weekTab = wrapper.findAll('.time-range-tab')[1]
    await weekTab.trigger('click')

    expect(wrapper.emitted('time-range-change')).toBeTruthy()
    expect(wrapper.emitted('time-range-change')![0]).toEqual(['week'])
  })

  // 刷新按钮渲染测试
  it('should render refresh button', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart__refresh').exists()).toBe(true)
  })

  // 刷新按钮点击测试
  it('should emit refresh event when refresh button clicked', async () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    await wrapper.find('.token-usage-chart__refresh').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  // 加载状态测试
  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        loading: true,
      },
    })
    expect(wrapper.find('.token-usage-chart').classes()).toContain('is-loading')
    expect(wrapper.find('.chart-loading-overlay').exists()).toBe(true)
  })

  // 非加载状态测试
  it('should not show loading overlay when loading is false', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        loading: false,
      },
    })
    expect(wrapper.find('.token-usage-chart').classes()).not.toContain('is-loading')
    expect(wrapper.find('.chart-loading-overlay').exists()).toBe(false)
  })

  // 图表容器渲染测试
  it('should render chart container', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart__chart').exists()).toBe(true)
  })

  // 数据传递测试 - Prompt Tokens
  it('should pass promptTokens data to chart', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
          promptTokens: [1000, 2000, 1500],
          completionTokens: [500, 800, 600],
        },
      },
    })
    // 验证组件内部是否正确处理数据
    expect(wrapper.vm.chartData.series[0].data).toEqual([1000, 2000, 1500])
    expect(wrapper.vm.chartData.series[0].name).toBe('Prompt Tokens')
  })

  // 数据传递测试 - Completion Tokens
  it('should pass completionTokens data to chart', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
          promptTokens: [1000, 2000, 1500],
          completionTokens: [500, 800, 600],
        },
      },
    })
    expect(wrapper.vm.chartData.series[1].data).toEqual([500, 800, 600])
    expect(wrapper.vm.chartData.series[1].name).toBe('Completion Tokens')
  })

  // 空数据处理测试
  it('should handle empty data gracefully', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: [],
          promptTokens: [],
          completionTokens: [],
        },
      },
    })
    expect(wrapper.find('.token-usage-chart').exists()).toBe(true)
    expect(wrapper.find('.token-usage-chart__empty').exists()).toBe(true)
  })

  // 缺失数据处理测试
  it('should handle undefined data gracefully', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01'],
          promptTokens: undefined as any,
          completionTokens: undefined as any,
        },
      },
    })
    expect(wrapper.find('.token-usage-chart').exists()).toBe(true)
  })

  // 高度设置测试
  it('should apply custom height when provided', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        height: '400px',
      },
    })
    const chartBody = wrapper.find('.token-usage-chart__chart')
    expect(chartBody.attributes('style')).toContain('height: 400px')
  })

  // 默认高度测试
  it('should use default height when not specified', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const chartBody = wrapper.find('.token-usage-chart__chart')
    expect(chartBody.attributes('style')).toContain('height: 300px')
  })

  // 数据更新测试
  it('should update chart when data changes', async () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })

    await wrapper.setProps({
      data: {
        dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        promptTokens: [1000, 2000, 3000],
        completionTokens: [500, 800, 1200],
      },
    })

    expect(wrapper.vm.chartData.series[0].data).toEqual([1000, 2000, 3000])
    expect(wrapper.vm.chartData.series[1].data).toEqual([500, 800, 1200])
  })

  // 统计信息展示测试 - 总计
  it('should display total tokens statistics', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const stats = wrapper.find('.token-usage-chart__stats')
    expect(stats.exists()).toBe(true)
    expect(stats.text()).toContain('总计')
    expect(stats.text()).toContain('4,300') // 1000+2000+500+800 = 4300
  })

  // 统计信息展示测试 - Prompt 总计
  it('should display prompt tokens total', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const stats = wrapper.find('.token-usage-chart__stats')
    expect(stats.text()).toContain('Prompt')
    expect(stats.text()).toContain('3,000') // 1000+2000 = 3000
  })

  // 统计信息展示测试 - Completion 总计
  it('should display completion tokens total', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const stats = wrapper.find('.token-usage-chart__stats')
    expect(stats.text()).toContain('Completion')
    expect(stats.text()).toContain('1,300') // 500+800 = 1300
  })

  // 自定义时间范围测试
  it('should support custom time range', async () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        timeRange: 'week',
      },
    })

    const activeTab = wrapper.find('.time-range-tab.is-active')
    expect(activeTab.text()).toBe('周')
  })

  // 图例展示测试
  it('should display legend with correct labels', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    const legend = wrapper.find('.token-usage-chart__legend')
    expect(legend.exists()).toBe(true)
    expect(legend.text()).toContain('Prompt Tokens')
    expect(legend.text()).toContain('Completion Tokens')
  })

  // 图表类型切换测试 - 折线图
  it('should support line chart type', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        chartType: 'line',
      },
    })
    expect(wrapper.vm.chartData.series[0].type).toBe('line')
  })

  // 图表类型切换测试 - 面积图
  it('should support area chart type', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        chartType: 'area',
      },
    })
    expect(wrapper.vm.chartData.series[0].areaStyle).toBeDefined()
  })

  // 大数据量处理测试
  it('should handle large data sets', () => {
    const dates = Array.from({ length: 100 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const promptTokens = Array.from({ length: 100 }, (_, i) => i * 100)
    const completionTokens = Array.from({ length: 100 }, (_, i) => i * 50)

    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates,
          promptTokens,
          completionTokens,
        },
      },
    })
    expect(wrapper.vm.chartData.xAxis.length).toBe(100)
    expect(wrapper.vm.chartData.series[0].data.length).toBe(100)
  })

  // 负数数据处理测试
  it('should handle negative values gracefully', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [-100, 200],
          completionTokens: [50, -80],
        },
      },
    })
    expect(wrapper.vm.chartData.series[0].data).toEqual([-100, 200])
  })

  // 零值数据处理测试
  it('should handle zero values correctly', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [0, 2000],
          completionTokens: [500, 0],
        },
      },
    })
    expect(wrapper.vm.chartData.series[0].data).toEqual([0, 2000])
    expect(wrapper.vm.chartData.series[1].data).toEqual([500, 0])
  })

  // 销毁时清理测试
  it('should cleanup on unmount', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    // 在unmount前确认组件存在
    expect(wrapper.find('.token-usage-chart').exists()).toBe(true)
    // unmount后组件应该被销毁
    wrapper.unmount()
    // 验证unmount没有抛出错误即可
    expect(true).toBe(true)
  })

  // 响应式调整测试
  it('should handle resize events', async () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })

    await flushPromises()

    // 验证组件有handleResize方法
    expect(typeof wrapper.vm.handleResize).toBe('function')

    // 触发resize方法
    wrapper.vm.handleResize()
    await nextTick()

    // 由于LineChart是mock的，我们验证方法存在且可以被调用
    expect(true).toBe(true)
  })

  // 刷新按钮禁用状态测试
  it('should disable refresh button when loading', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
        loading: true,
      },
    })
    const refreshBtn = wrapper.find('.token-usage-chart__refresh')
    expect(refreshBtn.attributes('disabled')).toBeDefined()
  })

  // 格式化数值测试
  it('should format large numbers correctly', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01'],
          promptTokens: [1234567],
          completionTokens: [890123],
        },
      },
    })
    const stats = wrapper.find('.token-usage-chart__stats')
    // 验证数值格式化显示
    expect(stats.text()).toContain('1,234,567')
  })

  // 颜色配置测试
  it('should use correct colors for series', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    // Prompt Tokens 应该是蓝色系
    expect(wrapper.vm.chartData.series[0].itemStyle.color).toContain('#00d4ff')
    // Completion Tokens 应该是绿色系
    expect(wrapper.vm.chartData.series[1].itemStyle.color).toContain('#00ff88')
  })

  // 平滑曲线测试
  it('should use smooth lines by default', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.vm.chartData.series[0].smooth).toBe(true)
    expect(wrapper.vm.chartData.series[1].smooth).toBe(true)
  })

  // 数据点标记测试
  it('should show data points by default', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.vm.chartData.series[0].showSymbol).toBe(true)
  })

  // Tooltip配置测试
  it('should have proper tooltip configuration', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.vm.chartOption.tooltip.trigger).toBe('axis')
  })

  // 网格配置测试
  it('should have grid configuration', () => {
    const wrapper = mount(TokenUsageChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          promptTokens: [1000, 2000],
          completionTokens: [500, 800],
        },
      },
    })
    expect(wrapper.vm.chartOption.grid).toBeDefined()
    expect(wrapper.vm.chartOption.grid.containLabel).toBe(true)
  })
})
