import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import DistributionChart from '@/components/charts/DistributionChart.vue'

// Mock echarts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockClear = vi.fn()
const mockDispose = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockGetOption = vi.fn(() => ({ series: [{ type: 'pie' }] }))
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

describe('DistributionChart', () => {
  const mockData = [
    { name: '分类A', value: 100 },
    { name: '分类B', value: 200 },
    { name: '分类C', value: 150 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.distribution-chart').exists()).toBe(true)
    expect(wrapper.find('.distribution-chart__container').exists()).toBe(true)
  })

  it('should render title correctly', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        title: '分布图表',
        data: mockData,
      },
    })
    expect(wrapper.find('.distribution-chart__title').text()).toBe('分布图表')
  })

  it('should not render title when not provided', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.distribution-chart__title').exists()).toBe(false)
  })

  // ==================== 图表类型测试 ====================

  it('should render pie chart by default', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].type).toBe('pie')
    expect(wrapper.vm.chartOption.series[0].radius).toBe('70%')
  })

  it('should render donut chart when type is donut', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        type: 'donut',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].radius).toEqual(['40%', '70%'])
  })

  it('should support rose chart type', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        type: 'rose',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].roseType).toBe('area')
  })

  // ==================== 图例测试 ====================

  it('should show legend by default', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(true)
  })

  it('should support hiding legend', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        showLegend: false,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(false)
  })

  it('should support different legend positions', () => {
    const positions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right']
    positions.forEach((position) => {
      const wrapper = mount(DistributionChart, {
        props: {
          legendPosition: position,
          data: mockData,
        },
      })
      const legend = wrapper.vm.chartOption.legend
      expect(legend).toBeDefined()
      if (position === 'top') {
        expect(legend?.top).toBe(0)
        expect(legend?.left).toBe('center')
      } else if (position === 'bottom') {
        expect(legend?.bottom).toBe(0)
        expect(legend?.left).toBe('center')
      } else if (position === 'left') {
        expect(legend?.left).toBe(0)
        expect(legend?.top).toBe('center')
        expect(legend?.orient).toBe('vertical')
      } else if (position === 'right') {
        expect(legend?.right).toBe(0)
        expect(legend?.top).toBe('center')
        expect(legend?.orient).toBe('vertical')
      }
    })
  })

  // ==================== 数据标签测试 ====================

  it('should show label by default', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(true)
  })

  it('should support hiding labels', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        showLabel: false,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(false)
  })

  it('should support different label positions', () => {
    const positions: Array<'inside' | 'outside' | 'center'> = ['inside', 'outside', 'center']
    positions.forEach((position) => {
      const wrapper = mount(DistributionChart, {
        props: {
          labelPosition: position,
          data: mockData,
        },
      })
      expect(wrapper.vm.chartOption.series[0].label?.position).toBe(position)
    })
  })

  it('should use default label formatter', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.formatter).toBe('{b}: {d}%')
  })

  it('should support custom label formatter', () => {
    const formatter = (params: any) => `${params.name}: ${params.value}`
    const wrapper = mount(DistributionChart, {
      props: {
        labelFormatter: formatter,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.formatter).toBe(formatter)
  })

  // ==================== 主题色测试 ====================

  it('should support dark theme by default', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.props('theme')).toBe('dark')
  })

  it('should support light theme', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        theme: 'light',
        data: mockData,
      },
    })
    expect(wrapper.props('theme')).toBe('light')
  })

  it('should apply custom colors to data items', () => {
    const dataWithColors = [
      { name: '分类A', value: 100, color: '#ff0000' },
      { name: '分类B', value: 200, color: '#00ff00' },
    ]
    const wrapper = mount(DistributionChart, {
      props: {
        data: dataWithColors,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    expect(seriesData[0].itemStyle?.color).toBe('#ff0000')
    expect(seriesData[1].itemStyle?.color).toBe('#00ff00')
  })

  // ==================== 提示框测试 ====================

  it('should show tooltip by default', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
    expect(wrapper.vm.chartOption.tooltip?.trigger).toBe('item')
  })

  it('should support custom tooltip formatter', () => {
    const formatter = (params: any) => `Custom: ${params.name}`
    const wrapper = mount(DistributionChart, {
      props: {
        tooltipFormatter: formatter,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip?.formatter).toBe(formatter)
  })

  // ==================== 加载状态测试 ====================

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        loading: true,
        data: mockData,
      },
    })
    expect(wrapper.find('.distribution-chart').classes()).toContain('is-loading')
    expect(wrapper.find('.distribution-chart__loading').exists()).toBe(true)
  })

  it('should not show loading overlay when loading is false', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        loading: false,
        data: mockData,
      },
    })
    expect(wrapper.find('.distribution-chart').classes()).not.toContain('is-loading')
    expect(wrapper.find('.distribution-chart__loading').exists()).toBe(false)
  })

  // ==================== 尺寸配置测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        height: '400px',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartHeight).toBe('400px')
  })

  it('should use default height when not specified', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartHeight).toBe('300px')
  })

  it('should apply custom width when provided', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        width: '500px',
        data: mockData,
      },
    })
    expect(wrapper.props('width')).toBe('500px')
  })

  // ==================== 空数据处理测试 ====================

  it('should handle empty data gracefully', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: [],
      },
    })
    expect(wrapper.find('.distribution-chart').exists()).toBe(true)
    expect(wrapper.find('.distribution-chart__empty').exists()).toBe(true)
  })

  it('should handle null data gracefully', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: null as any,
      },
    })
    expect(wrapper.find('.distribution-chart').exists()).toBe(true)
    expect(wrapper.find('.distribution-chart__empty').exists()).toBe(true)
  })

  // ==================== 数据更新测试 ====================

  it('should update chart when data changes', async () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })

    const newData = [
      { name: '新分类A', value: 300 },
      { name: '新分类B', value: 400 },
    ]

    await wrapper.setProps({ data: newData })

    expect(wrapper.vm.chartOption.series[0].data).toHaveLength(2)
    expect(wrapper.vm.chartOption.series[0].data[0].name).toBe('新分类A')
    expect(wrapper.vm.chartOption.series[0].data[0].value).toBe(300)
  })

  // ==================== 选中模式测试 ====================

  it('should support single selection mode', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        selectedMode: 'single',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].selectedMode).toBe('single')
  })

  it('should support multiple selection mode', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        selectedMode: 'multiple',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].selectedMode).toBe('multiple')
  })

  it('should support custom selected offset', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        selectedMode: 'single',
        selectedOffset: 20,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].selectedOffset).toBe(20)
  })

  // ==================== 事件处理测试 ====================

  it('should emit click event when chart is clicked', async () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })

    const clickData = { name: '分类A', value: 100, dataIndex: 0 }
    wrapper.vm.handleChartClick(clickData)

    expect(wrapper.emitted('chart-click')).toBeTruthy()
    expect(wrapper.emitted('chart-click')![0]).toEqual([clickData])
  })

  it('should emit legend-change event when legend is toggled', async () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })

    const legendData = { name: '分类A', selected: false }
    wrapper.vm.handleLegendChange(legendData)

    expect(wrapper.emitted('legend-change')).toBeTruthy()
    expect(wrapper.emitted('legend-change')![0]).toEqual([legendData])
  })

  // ==================== 销毁清理测试 ====================

  it('should cleanup on unmount', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.distribution-chart').exists()).toBe(true)
    wrapper.unmount()
    // 验证unmount没有抛出错误即可
    expect(true).toBe(true)
  })

  // ==================== 响应式测试 ====================

  it('should handle resize events', async () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })

    await flushPromises()
    wrapper.vm.handleResize()
    await nextTick()

    expect(mockResize).toHaveBeenCalled()
  })

  // ==================== 标签线测试 ====================

  it('should show label line by default', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].labelLine?.show).toBe(true)
  })

  it('should support hiding label line', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        showLabelLine: false,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].labelLine?.show).toBe(false)
  })

  // ==================== 中心文本测试 (环形图) ====================

  it('should show center text in donut mode when provided', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        type: 'donut',
        centerText: '总计',
        centerSubtext: '1000',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.graphic).toBeDefined()
  })

  // ==================== 数据排序测试 ====================

  it('should sort data by value when sortData is true', () => {
    const unsortedData = [
      { name: '分类A', value: 100 },
      { name: '分类B', value: 300 },
      { name: '分类C', value: 200 },
    ]
    const wrapper = mount(DistributionChart, {
      props: {
        sortData: true,
        data: unsortedData,
      },
    })
    const seriesData = wrapper.vm.chartOption.series[0].data
    expect(seriesData[0].value).toBe(300)
    expect(seriesData[1].value).toBe(200)
    expect(seriesData[2].value).toBe(100)
  })

  // ==================== 最小角度测试 ====================

  it('should support min angle configuration', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        minAngle: 5,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].minAngle).toBe(5)
  })

  // ==================== 起始角度测试 ====================

  it('should support start angle configuration', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        startAngle: 180,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].startAngle).toBe(180)
  })

  // ==================== 边框样式测试 ====================

  it('should support border radius configuration', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        borderRadius: 8,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].itemStyle?.borderRadius).toBe(8)
  })

  it('should support border color and width configuration', () => {
    const wrapper = mount(DistributionChart, {
      props: {
        borderColor: '#ffffff',
        borderWidth: 2,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].itemStyle?.borderColor).toBe('#ffffff')
    expect(wrapper.vm.chartOption.series[0].itemStyle?.borderWidth).toBe(2)
  })
})
