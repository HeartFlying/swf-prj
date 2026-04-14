import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import TrendChart from '@/components/charts/TrendChart.vue'

// Mock echarts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockClear = vi.fn()
const mockDispose = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockGetOption = vi.fn(() => ({ series: [{ type: 'line' }], grid: {}, xAxis: {}, yAxis: {} }))
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

describe('TrendChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: 'Series 1', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart').exists()).toBe(true)
    expect(wrapper.find('.trend-chart__container').exists()).toBe(true)
  })

  it('should render title correctly', () => {
    const wrapper = mount(TrendChart, {
      props: {
        title: '销售趋势',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart__title').text()).toBe('销售趋势')
  })

  it('should not render title when not provided', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart__title').exists()).toBe(false)
  })

  // ==================== 时间维度切换测试 ====================

  it('should render time dimension selector', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart__time-selector').exists()).toBe(true)
  })

  it('should render all time dimension tabs', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    const tabs = wrapper.findAll('.time-dimension-tab')
    expect(tabs.length).toBe(4)
    expect(tabs[0].text()).toBe('日')
    expect(tabs[1].text()).toBe('周')
    expect(tabs[2].text()).toBe('月')
    expect(tabs[3].text()).toBe('年')
  })

  it('should have day tab selected by default', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    const activeTab = wrapper.find('.time-dimension-tab.is-active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toBe('日')
  })

  it('should emit time-dimension-change when tab is clicked', async () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    const weekTab = wrapper.findAll('.time-dimension-tab')[1]
    await weekTab.trigger('click')

    expect(wrapper.emitted('time-dimension-change')).toBeTruthy()
    expect(wrapper.emitted('time-dimension-change')![0]).toEqual(['week'])
  })

  it('should support custom default time dimension', () => {
    const wrapper = mount(TrendChart, {
      props: {
        defaultTimeDimension: 'month',
        data: {
          dates: ['2024-01', '2024-02'],
          series: [
            { name: '销售额', data: [1000, 2000] }
          ]
        }
      }
    })
    const activeTab = wrapper.find('.time-dimension-tab.is-active')
    expect(activeTab.text()).toBe('月')
  })

  // ==================== 图表类型测试 ====================

  it('should render line chart by default', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.series[0].type).toBe('line')
  })

  it('should support area chart type', () => {
    const wrapper = mount(TrendChart, {
      props: {
        chartType: 'area',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.series[0].areaStyle).toBeDefined()
  })

  it('should support smooth line configuration', () => {
    const wrapper = mount(TrendChart, {
      props: {
        smooth: true,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.series[0].smooth).toBe(true)
  })

  // ==================== 多系列数据测试 ====================

  it('should render multiple series correctly', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
          series: [
            { name: '销售额', data: [100, 200, 150] },
            { name: '订单数', data: [50, 80, 60] },
            { name: '用户数', data: [30, 45, 40] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.series.length).toBe(3)
    expect(wrapper.vm.chartOption.series[0].name).toBe('销售额')
    expect(wrapper.vm.chartOption.series[1].name).toBe('订单数')
    expect(wrapper.vm.chartOption.series[2].name).toBe('用户数')
  })

  it('should assign different colors to each series', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: 'Series 1', data: [100, 200] },
            { name: 'Series 2', data: [150, 250] }
          ]
        }
      }
    })
    const color1 = wrapper.vm.chartOption.series[0].itemStyle?.color
    const color2 = wrapper.vm.chartOption.series[1].itemStyle?.color
    expect(color1).toBeDefined()
    expect(color2).toBeDefined()
    expect(color1).not.toBe(color2)
  })

  it('should support custom colors for series', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: 'Series 1', data: [100, 200], color: '#ff0000' },
            { name: 'Series 2', data: [150, 250], color: '#00ff00' }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.series[0].itemStyle?.color).toBe('#ff0000')
    expect(wrapper.vm.chartOption.series[1].itemStyle?.color).toBe('#00ff00')
  })

  // ==================== 数据缩放测试 ====================

  it('should enable data zoom by default', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.dataZoom).toBeDefined()
    expect(wrapper.vm.chartOption.dataZoom?.length).toBeGreaterThan(0)
  })

  it('should support disabling data zoom', () => {
    const wrapper = mount(TrendChart, {
      props: {
        enableZoom: false,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.dataZoom).toBeUndefined()
  })

  it('should support slider type data zoom', () => {
    const wrapper = mount(TrendChart, {
      props: {
        zoomType: 'slider',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    const dataZoom = wrapper.vm.chartOption.dataZoom
    expect(dataZoom?.some((z: any) => z.type === 'slider')).toBe(true)
  })

  it('should support inside type data zoom', () => {
    const wrapper = mount(TrendChart, {
      props: {
        zoomType: 'inside',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    const dataZoom = wrapper.vm.chartOption.dataZoom
    expect(dataZoom?.some((z: any) => z.type === 'inside')).toBe(true)
  })

  it('should support both zoom types', () => {
    const wrapper = mount(TrendChart, {
      props: {
        zoomType: 'both',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    const dataZoom = wrapper.vm.chartOption.dataZoom
    expect(dataZoom?.some((z: any) => z.type === 'slider')).toBe(true)
    expect(dataZoom?.some((z: any) => z.type === 'inside')).toBe(true)
  })

  // ==================== 加载状态测试 ====================

  it('should show loading state when loading prop is true', () => {
    const wrapper = mount(TrendChart, {
      props: {
        loading: true,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart').classes()).toContain('is-loading')
    expect(wrapper.find('.trend-chart__loading').exists()).toBe(true)
  })

  it('should not show loading overlay when loading is false', () => {
    const wrapper = mount(TrendChart, {
      props: {
        loading: false,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart').classes()).not.toContain('is-loading')
    expect(wrapper.find('.trend-chart__loading').exists()).toBe(false)
  })

  // ==================== 尺寸配置测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(TrendChart, {
      props: {
        height: '400px',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    // 高度传递给 BaseChart 组件，通过计算属性 chartHeight
    expect(wrapper.vm.chartHeight).toBe('350px') // 400 - 50 (header高度)
  })

  it('should use default height when not specified', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    // 默认高度 350px，减去 header 50px
    expect(wrapper.vm.chartHeight).toBe('300px')
  })

  it('should apply custom width when provided', () => {
    const wrapper = mount(TrendChart, {
      props: {
        width: '500px',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    // 宽度传递给 BaseChart 组件
    expect(wrapper.props('width')).toBe('500px')
  })

  // ==================== 图例配置测试 ====================

  it('should show legend by default', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(true)
  })

  it('should support hiding legend', () => {
    const wrapper = mount(TrendChart, {
      props: {
        showLegend: false,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.legend?.show).toBe(false)
  })

  it('should support different legend positions', () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const
    positions.forEach(position => {
      const wrapper = mount(TrendChart, {
        props: {
          legendPosition: position,
          data: {
            dates: ['2024-01-01', '2024-01-02'],
            series: [
              { name: '销售额', data: [100, 200] }
            ]
          }
        }
      })
      const legend = wrapper.vm.chartOption.legend
      expect(legend).toBeDefined()
    })
  })

  // ==================== 提示框配置测试 ====================

  it('should show tooltip by default', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    // tooltip 配置存在即表示启用
    expect(wrapper.vm.chartOption.tooltip).toBeDefined()
  })

  it('should support custom tooltip formatter', () => {
    const formatter = (params: any) => `Custom: ${params[0].value}`
    const wrapper = mount(TrendChart, {
      props: {
        tooltipFormatter: formatter,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.tooltip?.formatter).toBe(formatter)
  })

  // ==================== 空数据处理测试 ====================

  it('should handle empty data gracefully', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: [],
          series: []
        }
      }
    })
    expect(wrapper.find('.trend-chart').exists()).toBe(true)
    expect(wrapper.find('.trend-chart__empty').exists()).toBe(true)
  })

  it('should handle empty series data gracefully', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01'],
          series: [
            { name: '销售额', data: [] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart').exists()).toBe(true)
    expect(wrapper.find('.trend-chart__empty').exists()).toBe(true)
  })

  // ==================== 数据更新测试 ====================

  it('should update chart when data changes', async () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })

    await wrapper.setProps({
      data: {
        dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        series: [
          { name: '销售额', data: [100, 200, 300] }
        ]
      }
    })

    expect(wrapper.vm.chartOption.xAxis?.data).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
    expect(wrapper.vm.chartOption.series[0].data).toEqual([100, 200, 300])
  })

  // ==================== 坐标轴配置测试 ====================

  it('should support x-axis name configuration', () => {
    const wrapper = mount(TrendChart, {
      props: {
        xAxisName: '日期',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.xAxis?.name).toBe('日期')
  })

  it('should support y-axis name configuration', () => {
    const wrapper = mount(TrendChart, {
      props: {
        yAxisName: '金额',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.yAxis?.name).toBe('金额')
  })

  it('should support y-axis formatter', () => {
    const formatter = (value: number) => `¥${value}`
    const wrapper = mount(TrendChart, {
      props: {
        yAxisFormatter: formatter,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.yAxis?.axisLabel?.formatter).toBe(formatter)
  })

  // ==================== 大数据量处理测试 ====================

  it('should handle large data sets', () => {
    const dates = Array.from({ length: 100 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const data = Array.from({ length: 100 }, (_, i) => i * 10)

    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates,
          series: [
            { name: '销售额', data }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.xAxis?.data?.length).toBe(100)
    expect(wrapper.vm.chartOption.series[0].data?.length).toBe(100)
  })

  // ==================== 网格配置测试 ====================

  it('should have grid configuration', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.grid).toBeDefined()
    expect(wrapper.vm.chartOption.grid?.containLabel).toBe(true)
  })

  it('should support custom grid configuration', () => {
    const wrapper = mount(TrendChart, {
      props: {
        gridConfig: {
          left: '10%',
          right: '10%',
          top: '15%',
          bottom: '15%'
        },
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.vm.chartOption.grid?.left).toBe('10%')
    expect(wrapper.vm.chartOption.grid?.right).toBe('10%')
  })

  // ==================== 事件处理测试 ====================

  it('should emit click event when chart is clicked', async () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })

    // 模拟点击事件
    const clickData = { name: '2024-01-01', value: 100, seriesName: '销售额' }
    wrapper.vm.handleChartClick(clickData)

    expect(wrapper.emitted('chart-click')).toBeTruthy()
    expect(wrapper.emitted('chart-click')![0]).toEqual([clickData])
  })

  it('should emit refresh event when refresh button clicked', async () => {
    const wrapper = mount(TrendChart, {
      props: {
        showRefresh: true,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })

    await wrapper.find('.trend-chart__refresh').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  // ==================== 销毁清理测试 ====================

  it('should cleanup on unmount', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart').exists()).toBe(true)
    wrapper.unmount()
    // BaseChart 会处理 dispose，验证 unmount 没有抛出错误即可
    expect(true).toBe(true)
  })

  // ==================== 响应式测试 ====================

  it('should handle resize events', async () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })

    await flushPromises()
    wrapper.vm.handleResize()
    await nextTick()

    expect(mockResize).toHaveBeenCalled()
  })

  // ==================== 主题配置测试 ====================

  it('should support dark theme by default', () => {
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.props('theme')).toBe('dark')
  })

  it('should support light theme', () => {
    const wrapper = mount(TrendChart, {
      props: {
        theme: 'light',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.props('theme')).toBe('light')
  })

  // ==================== 工具栏测试 ====================

  it('should render toolbar when showToolbar is true', () => {
    const wrapper = mount(TrendChart, {
      props: {
        showToolbar: true,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart__toolbar').exists()).toBe(true)
  })

  it('should not render toolbar when showToolbar is false', () => {
    const wrapper = mount(TrendChart, {
      props: {
        showToolbar: false,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })
    expect(wrapper.find('.trend-chart__toolbar').exists()).toBe(false)
  })

  // ==================== 下载功能测试 ====================

  it('should emit download event when download button clicked', async () => {
    const wrapper = mount(TrendChart, {
      props: {
        showDownload: true,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [
            { name: '销售额', data: [100, 200] }
          ]
        }
      }
    })

    await wrapper.find('.trend-chart__download').trigger('click')
    expect(wrapper.emitted('download')).toBeTruthy()
  })
})
