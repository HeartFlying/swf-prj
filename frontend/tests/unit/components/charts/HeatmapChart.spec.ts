import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HeatmapChart from '@/components/charts/HeatmapChart.vue'

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

describe('HeatmapChart', () => {
  const mockData = [
    { x: '周一', y: '上午', value: 10 },
    { x: '周一', y: '下午', value: 20 },
    { x: '周二', y: '上午', value: 30 },
    { x: '周二', y: '下午', value: 40 },
  ]

  const mockXAxisData = ['周一', '周二']
  const mockYAxisData = ['上午', '下午']

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })
    expect(wrapper.findComponent({ name: 'BaseChart' }).exists()).toBe(true)
  })

  it('should render with xAxisData and yAxisData', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        xAxisData: mockXAxisData,
        yAxisData: mockYAxisData,
      },
    })
    expect(wrapper.findComponent({ name: 'BaseChart' }).exists()).toBe(true)
  })

  // ==================== 数据配置测试 ====================

  it('should process data correctly', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        xAxisData: mockXAxisData,
        yAxisData: mockYAxisData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].data).toHaveLength(4)
    expect(option.series[0].data[0].value).toEqual([0, 0, 10])
    expect(option.series[0].data[1].value).toEqual([0, 1, 20])
    expect(option.series[0].data[2].value).toEqual([1, 0, 30])
    expect(option.series[0].data[3].value).toEqual([1, 1, 40])
  })

  it('should auto-generate axis data when not provided', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.xAxis.data).toContain('周一')
    expect(option.xAxis.data).toContain('周二')
    expect(option.yAxis.data).toContain('上午')
    expect(option.yAxis.data).toContain('下午')
  })

  it('should handle empty data array', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: [],
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].data).toHaveLength(0)
  })

  // ==================== 标题配置测试 ====================

  it('should render title when provided', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        title: '热力图标题',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.title).toBeDefined()
    expect(option.title?.text).toBe('热力图标题')
  })

  it('should render subtitle when provided', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        title: '热力图标题',
        subtitle: '副标题',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.title?.subtext).toBe('副标题')
  })

  it('should not render title when not provided', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.title).toBeUndefined()
  })

  // ==================== 坐标轴配置测试 ====================

  it('should set xAxis name correctly', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        xAxisName: '时间',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.xAxis.name).toBe('时间')
  })

  it('should set yAxis name correctly', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        yAxisName: '时段',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.yAxis.name).toBe('时段')
  })

  it('should set xAxis label rotation', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        xAxisRotate: 45,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.xAxis.axisLabel?.rotate).toBe(45)
  })

  it('should set yAxis label rotation', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        yAxisRotate: 30,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.yAxis.axisLabel?.rotate).toBe(30)
  })

  // ==================== 颜色方案测试 ====================

  it('should use blue color scheme by default', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(wrapper.props('colorScheme')).toBe('blue')
  })

  it('should support green color scheme', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        colorScheme: 'green',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.inRange?.color).toContain('rgba(0, 255, 136, 0.2)')
  })

  it('should support red color scheme', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        colorScheme: 'red',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.inRange?.color).toContain('rgba(255, 0, 110, 0.2)')
  })

  it('should support purple color scheme', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        colorScheme: 'purple',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.inRange?.color).toContain('rgba(157, 78, 221, 0.2)')
  })

  it('should support orange color scheme', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        colorScheme: 'orange',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.inRange?.color).toContain('rgba(255, 149, 0, 0.2)')
  })

  it('should support custom color scheme', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff']
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        colorScheme: 'custom',
        customColors,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.inRange?.color).toEqual(customColors)
  })

  // ==================== VisualMap 配置测试 ====================

  it('should show visualMap by default', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap).toBeDefined()
  })

  it('should support hiding visualMap', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        showVisualMap: false,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap).toBeUndefined()
  })

  it('should support calculable visualMap', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        calculable: true,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.calculable).toBe(true)
  })

  it('should support different visualMap positions', () => {
    const positions: Array<'left' | 'right' | 'top' | 'bottom'> = ['left', 'right', 'top', 'bottom']
    positions.forEach((position) => {
      const wrapper = mount(HeatmapChart, {
        props: {
          data: mockData,
          visualMapPosition: position,
        },
      })
      const visualMap = wrapper.vm.mergedOption.visualMap
      expect(visualMap).toBeDefined()
      if (position === 'left') {
        expect(visualMap?.left).toBe(0)
        expect(visualMap?.orient).toBe('vertical')
      } else if (position === 'right') {
        expect(visualMap?.right).toBe(0)
        expect(visualMap?.orient).toBe('vertical')
      } else if (position === 'top') {
        expect(visualMap?.top).toBe(0)
        expect(visualMap?.orient).toBe('horizontal')
      } else if (position === 'bottom') {
        expect(visualMap?.bottom).toBe(0)
        expect(visualMap?.orient).toBe('horizontal')
      }
    })
  })

  // ==================== 数值范围测试 ====================

  it('should calculate data range automatically', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    // Component uses Math.min(...values, 0) so min is always <= 0
    expect(option.visualMap?.min).toBe(0)
    expect(option.visualMap?.max).toBe(40)
  })

  it('should support custom min value', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        minValue: 0,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.min).toBe(0)
  })

  it('should support custom max value', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        maxValue: 100,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.max).toBe(100)
  })

  it('should support custom min and max values', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        minValue: 0,
        maxValue: 50,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.min).toBe(0)
    expect(option.visualMap?.max).toBe(50)
  })

  // ==================== 标签配置测试 ====================

  it('should hide labels by default', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].label?.show).toBe(false)
  })

  it('should show labels when enabled', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        showLabel: true,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].label?.show).toBe(true)
  })

  it('should use default label formatter', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        showLabel: true,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].label?.formatter).toBe('{c}')
  })

  it('should support custom label formatter', () => {
    const formatter = (params: any) => `${params.value[2]}次`
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        showLabel: true,
        labelFormatter: formatter,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].label?.formatter).toBe(formatter)
  })

  // ==================== 单元格样式测试 ====================

  it('should set cell border radius', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        cellBorderRadius: 8,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].itemStyle?.borderRadius).toBe(8)
  })

  it('should set cell border width', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        cellBorderWidth: 2,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].itemStyle?.borderWidth).toBe(2)
  })

  it('should set cell border color', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        cellBorderColor: '#ffffff',
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].itemStyle?.borderColor).toBe('#ffffff')
  })

  // ==================== 提示框配置测试 ====================

  it('should show tooltip by default', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.tooltip).toBeDefined()
    expect(option.tooltip?.position).toBe('top')
  })

  it('should support hiding tooltip', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        showTooltip: false,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.tooltip).toBeUndefined()
  })

  it('should support custom tooltip formatter', () => {
    const formatter = (params: any) => `Custom: ${params.value[2]}`
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        tooltipFormatter: formatter,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.tooltip?.formatter).toBe(formatter)
  })

  // ==================== 网格配置测试 ====================

  it('should show grid by default', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.grid).toBeDefined()
    expect(option.grid?.left).toBe('10%')
  })

  it('should support hiding grid', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        showGrid: false,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.grid).toBeUndefined()
  })

  it('should support custom grid config', () => {
    const gridConfig = { left: '5%', right: '5%' }
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        gridConfig,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.grid?.left).toBe('5%')
    expect(option.grid?.right).toBe('5%')
  })

  // ==================== 尺寸配置测试 ====================

  it('should apply custom height when provided', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        height: '400px',
      },
    })

    expect(wrapper.props('height')).toBe('400px')
  })

  it('should use default height when not specified', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(wrapper.props('height')).toBe('300px')
  })

  it('should apply custom width when provided', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        width: '500px',
      },
    })

    expect(wrapper.props('width')).toBe('500px')
  })

  // ==================== 加载状态测试 ====================

  it('should pass loading prop to BaseChart', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        loading: true,
      },
    })

    expect(wrapper.props('loading')).toBe(true)
  })

  // ==================== 主题配置测试 ====================

  it('should use dark theme by default', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(wrapper.props('theme')).toBe('dark')
  })

  it('should support light theme', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        theme: 'light',
      },
    })

    expect(wrapper.props('theme')).toBe('light')
  })

  // ==================== 事件处理测试 ====================

  it('should emit click event', async () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const baseChart = wrapper.findComponent({ name: 'BaseChart' })
    const clickData = { name: '测试', value: [0, 0, 10], dataIndex: 0 }
    await baseChart.vm.$emit('click', clickData)

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0]).toEqual([clickData])
  })

  it('should emit dblclick event', async () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const baseChart = wrapper.findComponent({ name: 'BaseChart' })
    const clickData = { name: '测试', value: [0, 0, 10], dataIndex: 0 }
    await baseChart.vm.$emit('dblclick', clickData)

    expect(wrapper.emitted('dblclick')).toBeTruthy()
    expect(wrapper.emitted('dblclick')![0]).toEqual([clickData])
  })

  it('should emit resize event', async () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    const baseChart = wrapper.findComponent({ name: 'BaseChart' })
    await baseChart.vm.$emit('resize', { width: 500, height: 300 })

    expect(wrapper.emitted('resize')).toBeTruthy()
  })

  // ==================== 数据更新测试 ====================

  it('should update chart when data changes', async () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
        xAxisData: mockXAxisData,
        yAxisData: mockYAxisData,
      },
    })

    const newData = [
      { x: '周一', y: '上午', value: 50 },
      { x: '周一', y: '下午', value: 60 },
    ]

    await wrapper.setProps({ data: newData })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].data).toHaveLength(2)
    expect(option.series[0].data[0].value).toEqual([0, 0, 50])
  })

  // ==================== 暴露方法测试 ====================

  it('should expose chartInstance', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(wrapper.vm.chartInstance).toBeDefined()
  })

  it('should expose resize method', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(typeof wrapper.vm.resize).toBe('function')
  })

  it('should expose updateChart method', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(typeof wrapper.vm.updateChart).toBe('function')
  })

  it('should expose getOption method', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(typeof wrapper.vm.getOption).toBe('function')
  })

  it('should expose clear method', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(typeof wrapper.vm.clear).toBe('function')
  })

  it('should expose dispatchAction method', () => {
    const wrapper = mount(HeatmapChart, {
      props: {
        data: mockData,
      },
    })

    expect(typeof wrapper.vm.dispatchAction).toBe('function')
  })

  // ==================== 数据项样式测试 ====================

  it('should support itemStyle in data items', () => {
    const dataWithStyle = [
      { x: '周一', y: '上午', value: 10, itemStyle: { color: '#ff0000' } },
    ]
    const wrapper = mount(HeatmapChart, {
      props: {
        data: dataWithStyle,
        xAxisData: ['周一'],
        yAxisData: ['上午'],
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].data[0].itemStyle?.color).toBe('#ff0000')
  })

  // ==================== 数值为0的边界情况测试 ====================

  it('should handle zero values correctly', () => {
    const dataWithZero = [
      { x: '周一', y: '上午', value: 0 },
      { x: '周一', y: '下午', value: 10 },
    ]
    const wrapper = mount(HeatmapChart, {
      props: {
        data: dataWithZero,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.visualMap?.min).toBe(0)
    expect(option.visualMap?.max).toBe(10)
  })

  // ==================== 大数据集测试 ====================

  it('should handle large datasets', () => {
    const largeData = []
    for (let i = 0; i < 100; i++) {
      largeData.push({
        x: `类别${i % 10}`,
        y: `时段${Math.floor(i / 10)}`,
        value: i,
      })
    }
    const wrapper = mount(HeatmapChart, {
      props: {
        data: largeData,
      },
    })

    const option = wrapper.vm.mergedOption
    expect(option.series[0].data).toHaveLength(100)
  })
})
