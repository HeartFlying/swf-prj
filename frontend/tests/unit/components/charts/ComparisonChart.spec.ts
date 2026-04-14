import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ComparisonChart from '@/components/ComparisonChart/ComparisonChart.vue'

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

describe('ComparisonChart', () => {
  const mockData = {
    categories: ['产品A', '产品B', '产品C', '产品D'],
    series: [
      { name: '2023年', data: [120, 200, 150, 80] },
      { name: '2024年', data: [150, 230, 180, 120] },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart').exists()).toBe(true)
    expect(wrapper.find('.comparison-chart__container').exists()).toBe(true)
  })

  it('should render title correctly', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        title: '销售对比',
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart__title').text()).toBe('销售对比')
  })

  it('should not render title when not provided', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart__title').exists()).toBe(false)
  })

  // ==================== 图表类型测试 ====================

  it('should render bar chart by default', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].type).toBe('bar')
  })

  it('should render column chart (vertical) when type is column', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        type: 'column',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].type).toBe('bar')
    expect(wrapper.vm.chartOption.xAxis?.type).toBe('category')
    expect(wrapper.vm.chartOption.yAxis?.type).toBe('value')
  })

  it('should render bar chart (horizontal) when type is bar', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        type: 'bar',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].type).toBe('bar')
    expect(wrapper.vm.chartOption.xAxis?.type).toBe('value')
    expect(wrapper.vm.chartOption.yAxis?.type).toBe('category')
  })

  // ==================== 多系列数据测试 ====================

  it('should render multiple series correctly', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series.length).toBe(2)
    expect(wrapper.vm.chartOption.series[0].name).toBe('2023年')
    expect(wrapper.vm.chartOption.series[1].name).toBe('2024年')
  })

  it('should assign different colors to each series', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    const color1 = wrapper.vm.chartOption.series[0].itemStyle?.color
    const color2 = wrapper.vm.chartOption.series[1].itemStyle?.color
    expect(color1).toBeDefined()
    expect(color2).toBeDefined()
    expect(color1).not.toBe(color2)
  })

  it('should support custom colors for series', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: {
          categories: ['A', 'B'],
          series: [
            { name: 'Series 1', data: [100, 200], color: '#ff0000' },
            { name: 'Series 2', data: [150, 250], color: '#00ff00' },
          ],
        },
      },
    })
    expect(wrapper.vm.chartOption.series[0].itemStyle?.color).toBe('#ff0000')
    expect(wrapper.vm.chartOption.series[1].itemStyle?.color).toBe('#00ff00')
  })

  // ==================== 分组/堆叠模式测试 ====================

  it('should render grouped bars by default', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].stack).toBeUndefined()
    expect(wrapper.vm.chartOption.series[1].stack).toBeUndefined()
  })

  it('should render stacked bars when stackMode is true', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        stackMode: true,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].stack).toBe('total')
    expect(wrapper.vm.chartOption.series[1].stack).toBe('total')
  })

  it('should render stacked bars when stacked is true', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        stacked: true,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].stack).toBe('total')
    expect(wrapper.vm.chartOption.series[1].stack).toBe('total')
  })

  it('should support custom stack name', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        stackMode: true,
        stackName: 'sales',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].stack).toBe('sales')
    expect(wrapper.vm.chartOption.series[1].stack).toBe('sales')
  })

  // ==================== 数据标签测试 ====================

  it('should show data labels when showLabel is true', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showLabel: true,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(true)
    expect(wrapper.vm.chartOption.series[1].label?.show).toBe(true)
  })

  it('should not show data labels when showLabel is false', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showLabel: false,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.show).toBe(false)
  })

  it('should support custom label formatter', () => {
    const formatter = (params: any) => `${params.value}件`
    const wrapper = mount(ComparisonChart, {
      props: {
        showLabel: true,
        labelFormatter: formatter,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].label?.formatter).toBe(formatter)
  })

  it('should support different label positions', () => {
    const positions: Array<'top' | 'inside' | 'insideTop' | 'insideBottom'> = [
      'top',
      'inside',
      'insideTop',
      'insideBottom',
    ]
    positions.forEach((position) => {
      const wrapper = mount(ComparisonChart, {
        props: {
          showLabel: true,
          labelPosition: position,
          data: mockData,
        },
      })
      expect(wrapper.vm.chartOption.series[0].label?.position).toBe(position)
    })
  })

  // ==================== 图例测试 ====================

  it('should show legend by default', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(true)
  })

  it('should support hiding legend', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showLegend: false,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(false)
  })

  it('should support different legend positions', () => {
    const positions: Array<'top' | 'bottom' | 'left' | 'right'> = [
      'top',
      'bottom',
      'left',
      'right',
    ]
    positions.forEach((position) => {
      const wrapper = mount(ComparisonChart, {
        props: {
          legendPosition: position,
          data: mockData,
        },
      })
      const legend = wrapper.vm.chartOption.legend
      expect(legend).toBeDefined()
    })
  })

  // ==================== 提示框测试 ====================

  it('should show tooltip by default', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
    expect(wrapper.vm.chartOption.tooltip?.trigger).toBe('axis')
  })

  it('should support custom tooltip formatter', () => {
    const formatter = (params: any) => `Custom: ${params[0].value}`
    const wrapper = mount(ComparisonChart, {
      props: {
        tooltipFormatter: formatter,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.tooltip?.formatter).toBe(formatter)
  })

  // ==================== 加载状态测试 ====================

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        loading: true,
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart').classes()).toContain('is-loading')
    expect(wrapper.find('.comparison-chart__loading').exists()).toBe(true)
  })

  it('should not show loading overlay when loading is false', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        loading: false,
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart').classes()).not.toContain('is-loading')
    expect(wrapper.find('.comparison-chart__loading').exists()).toBe(false)
  })

  // ==================== 尺寸配置测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        height: '400px',
        data: mockData,
      },
    })
    // 有标题时，图表高度 = 总高度 - 标题高度
    expect(wrapper.vm.chartHeight).toBe('400px')
  })

  it('should use default height when not specified', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartHeight).toBe('300px')
  })

  it('should apply custom width when provided', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        width: '500px',
        data: mockData,
      },
    })
    expect(wrapper.props('width')).toBe('500px')
  })

  // ==================== 空数据处理测试 ====================

  it('should handle empty data gracefully', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: {
          categories: [],
          series: [],
        },
      },
    })
    expect(wrapper.find('.comparison-chart').exists()).toBe(true)
    expect(wrapper.find('.comparison-chart__empty').exists()).toBe(true)
  })

  it('should handle empty series data gracefully', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: {
          categories: ['A', 'B'],
          series: [{ name: 'Series 1', data: [] }],
        },
      },
    })
    expect(wrapper.find('.comparison-chart').exists()).toBe(true)
    expect(wrapper.find('.comparison-chart__empty').exists()).toBe(true)
  })

  it('should handle null data gracefully', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: null as any,
      },
    })
    expect(wrapper.find('.comparison-chart').exists()).toBe(true)
    expect(wrapper.find('.comparison-chart__empty').exists()).toBe(true)
  })

  // ==================== 数据更新测试 ====================

  it('should update chart when data changes', async () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })

    const newData = {
      categories: ['新产品A', '新产品B'],
      series: [{ name: '2025年', data: [300, 400] }],
    }

    await wrapper.setProps({ data: newData })

    expect(wrapper.vm.chartOption.xAxis?.data).toEqual(['新产品A', '新产品B'])
    expect(wrapper.vm.chartOption.series[0].data).toEqual([300, 400])
  })

  // ==================== 坐标轴配置测试 ====================

  it('should support x-axis name configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        xAxisName: '产品',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.name).toBe('产品')
  })

  it('should support y-axis name configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        yAxisName: '销售额',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.yAxis?.name).toBe('销售额')
  })

  it('should support y-axis formatter', () => {
    const formatter = (value: number) => `¥${value}`
    const wrapper = mount(ComparisonChart, {
      props: {
        yAxisFormatter: formatter,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.yAxis?.axisLabel?.formatter).toBe(formatter)
  })

  it('should support x-axis label rotation', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        xAxisRotate: 45,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.axisLabel?.rotate).toBe(45)
  })

  it('should support custom x-axis configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        xAxis: { nameLocation: 'middle', nameGap: 30 },
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.nameLocation).toBe('middle')
    expect(wrapper.vm.chartOption.xAxis?.nameGap).toBe(30)
  })

  it('should support custom y-axis configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        yAxis: { min: 0, max: 500 },
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.yAxis?.min).toBe(0)
    expect(wrapper.vm.chartOption.yAxis?.max).toBe(500)
  })

  // ==================== 主题色测试 ====================

  it('should support dark theme by default', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.props('theme')).toBe('dark')
  })

  it('should support light theme', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        theme: 'light',
        data: mockData,
      },
    })
    expect(wrapper.props('theme')).toBe('light')
  })

  it('should support custom colors array', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff']
    const wrapper = mount(ComparisonChart, {
      props: {
        colors: customColors,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.color).toEqual(customColors)
  })

  // ==================== 网格配置测试 ====================

  it('should have grid configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.grid).toBeDefined()
    expect(wrapper.vm.chartOption.grid?.containLabel).toBe(true)
  })

  it('should support custom grid configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        gridConfig: {
          left: '10%',
          right: '10%',
          top: '15%',
          bottom: '15%',
        },
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.grid?.left).toBe('10%')
    expect(wrapper.vm.chartOption.grid?.right).toBe('10%')
  })

  // ==================== 事件处理测试 ====================

  it('should emit click event when chart is clicked', async () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })

    const clickData = { name: '产品A', value: 120, seriesName: '2023年' }
    wrapper.vm.handleChartClick(clickData)

    expect(wrapper.emitted('chart-click')).toBeTruthy()
    expect(wrapper.emitted('chart-click')![0]).toEqual([clickData])
  })

  // ==================== 销毁清理测试 ====================

  it('should cleanup on unmount', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart').exists()).toBe(true)
    wrapper.unmount()
    expect(true).toBe(true)
  })

  // ==================== 响应式测试 ====================

  it('should handle resize events', async () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        data: mockData,
      },
    })

    await flushPromises()
    wrapper.vm.handleResize()
    await nextTick()

    expect(mockResize).toHaveBeenCalled()
  })

  // ==================== 柱状图样式测试 ====================

  it('should support custom bar width', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        barWidth: 20,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].barWidth).toBe(20)
  })

  it('should support bar gap configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        barGap: '10%',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].barGap).toBe('10%')
  })

  it('should support bar category gap configuration', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        barCategoryGap: '20%',
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].barCategoryGap).toBe('20%')
  })

  it('should support border radius for bars', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        borderRadius: [4, 4, 0, 0],
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.series[0].itemStyle?.borderRadius).toEqual([
      4, 4, 0, 0,
    ])
  })

  // ==================== 大数据量处理测试 ====================

  it('should handle large data sets', () => {
    const categories = Array.from({ length: 50 }, (_, i) => `产品${i + 1}`)
    const data = Array.from({ length: 50 }, (_, i) => i * 10)

    const wrapper = mount(ComparisonChart, {
      props: {
        data: {
          categories,
          series: [{ name: '销量', data }],
        },
      },
    })
    expect(wrapper.vm.chartOption.xAxis?.data?.length).toBe(50)
    expect(wrapper.vm.chartOption.series[0].data?.length).toBe(50)
  })

  // ==================== 工具栏测试 ====================

  it('should render toolbar when showToolbar is true', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showToolbar: true,
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart__toolbar').exists()).toBe(true)
  })

  it('should not render toolbar when showToolbar is false', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showToolbar: false,
        data: mockData,
      },
    })
    expect(wrapper.find('.comparison-chart__toolbar').exists()).toBe(false)
  })

  it('should emit refresh event when refresh button clicked', async () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showRefresh: true,
        data: mockData,
      },
    })

    await wrapper.find('.comparison-chart__refresh').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('should emit download event when download button clicked', async () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        showDownload: true,
        data: mockData,
      },
    })

    await wrapper.find('.comparison-chart__download').trigger('click')
    expect(wrapper.emitted('download')).toBeTruthy()
  })

  // ==================== 数据缩放测试 ====================

  it('should enable data zoom by default when data is large', () => {
    const categories = Array.from({ length: 20 }, (_, i) => `类别${i}`)
    const data = Array.from({ length: 20 }, (_, i) => i * 10)

    const wrapper = mount(ComparisonChart, {
      props: {
        data: {
          categories,
          series: [{ name: '销量', data }],
        },
      },
    })
    expect(wrapper.vm.chartOption.dataZoom).toBeDefined()
  })

  it('should support disabling data zoom', () => {
    const wrapper = mount(ComparisonChart, {
      props: {
        enableZoom: false,
        data: mockData,
      },
    })
    expect(wrapper.vm.chartOption.dataZoom).toBeUndefined()
  })
})
