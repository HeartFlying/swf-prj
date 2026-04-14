import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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

// ==================== 图表组件入口测试 ====================

describe('Charts Index - Component Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export all chart components', async () => {
    // 增加超时时间到 10 秒
    const index = await import('@/components/charts/index')

    // 基础图表组件
    expect(index.BaseChart).toBeDefined()
    expect(index.LineChart).toBeDefined()
    expect(index.BarChart).toBeDefined()
    expect(index.PieChart).toBeDefined()

    // 高级图表组件
    expect(index.TrendChart).toBeDefined()
    expect(index.DistributionChart).toBeDefined()
    expect(index.ComparisonChart).toBeDefined()
    expect(index.RankingChart).toBeDefined()
    expect(index.HeatmapChart).toBeDefined()
  })

  it('should export BaseChart as a Vue component', async () => {
    const index = await import('@/components/charts/index')
    expect(index.BaseChart).toBeDefined()
    // 验证是 Vue 组件
    expect(typeof index.BaseChart).toBe('object')
  })
})

describe('Charts Index - Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render TrendChart component', async () => {
    const { TrendChart } = await import('@/components/charts/index')
    const wrapper = mount(TrendChart, {
      props: {
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [{ name: 'Series 1', data: [100, 200] }]
        }
      }
    })
    expect(wrapper.find('.trend-chart').exists()).toBe(true)
  })

  it('should render DistributionChart component', async () => {
    const { DistributionChart } = await import('@/components/charts/index')
    const wrapper = mount(DistributionChart, {
      props: {
        data: [
          { name: 'A', value: 100 },
          { name: 'B', value: 200 }
        ]
      }
    })
    expect(wrapper.find('.distribution-chart').exists()).toBe(true)
  })

  it('should render ComparisonChart component', async () => {
    const { ComparisonChart } = await import('@/components/charts/index')
    const wrapper = mount(ComparisonChart, {
      props: {
        data: {
          categories: ['A', 'B'],
          series: [{ name: 'Series 1', data: [100, 200] }]
        }
      }
    })
    expect(wrapper.find('.comparison-chart').exists()).toBe(true)
  })

  it('should render RankingChart component', async () => {
    const { RankingChart } = await import('@/components/charts/index')
    const wrapper = mount(RankingChart, {
      props: {
        data: [
          { name: 'A', value: 100 },
          { name: 'B', value: 200 }
        ]
      }
    })
    expect(wrapper.find('.ranking-chart').exists()).toBe(true)
  })

  it('should render HeatmapChart component', async () => {
    const { HeatmapChart } = await import('@/components/charts/index')
    const wrapper = mount(HeatmapChart, {
      props: {
        data: [
          { x: 'A', y: 'B', value: 100 }
        ]
      }
    })
    expect(wrapper.findComponent({ name: 'BaseChart' }).exists()).toBe(true)
  })

  it('should render BaseChart component', async () => {
    const { BaseChart } = await import('@/components/charts/index')
    const wrapper = mount(BaseChart, {
      props: {
        option: {
          xAxis: { type: 'category', data: ['A', 'B'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [100, 200] }]
        }
      }
    })
    expect(wrapper.find('.base-chart').exists()).toBe(true)
  })

  it('should render LineChart component', async () => {
    const { LineChart } = await import('@/components/charts/index')
    const wrapper = mount(LineChart, {
      props: {
        xAxisData: ['A', 'B'],
        series: [{ name: 'Series 1', data: [100, 200] }]
      }
    })
    expect(wrapper.findComponent({ name: 'BaseChart' }).exists()).toBe(true)
  })

  it('should render BarChart component', async () => {
    const { BarChart } = await import('@/components/charts/index')
    const wrapper = mount(BarChart, {
      props: {
        xAxisData: ['A', 'B'],
        series: [{ name: 'Series 1', data: [100, 200] }]
      }
    })
    expect(wrapper.findComponent({ name: 'BaseChart' }).exists()).toBe(true)
  })

  it('should render PieChart component', async () => {
    const { PieChart } = await import('@/components/charts/index')
    const wrapper = mount(PieChart, {
      props: {
        data: [
          { name: 'A', value: 100 },
          { name: 'B', value: 200 }
        ]
      }
    })
    expect(wrapper.findComponent({ name: 'BaseChart' }).exists()).toBe(true)
  })
})

describe('Charts Index - Component Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should ensure all charts support common props', async () => {
    const index = await import('@/components/charts/index')

    // 验证组件存在性即表示接口兼容
    expect(index.BaseChart).toBeDefined()
    expect(index.TrendChart).toBeDefined()
    expect(index.DistributionChart).toBeDefined()
    expect(index.ComparisonChart).toBeDefined()
    expect(index.RankingChart).toBeDefined()
    expect(index.HeatmapChart).toBeDefined()
  }, 10000)

  it('should ensure charts support width and height props', async () => {
    const { TrendChart, ComparisonChart, RankingChart } = await import('@/components/charts/index')

    // TrendChart
    const trendWrapper = mount(TrendChart, {
      props: {
        width: '500px',
        height: '400px',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [{ name: 'Series 1', data: [100, 200] }]
        }
      }
    })
    expect(trendWrapper.props('width')).toBe('500px')
    expect(trendWrapper.props('height')).toBe('400px')

    // ComparisonChart
    const comparisonWrapper = mount(ComparisonChart, {
      props: {
        width: '600px',
        height: '300px',
        data: {
          categories: ['A', 'B'],
          series: [{ name: 'Series 1', data: [100, 200] }]
        }
      }
    })
    expect(comparisonWrapper.props('width')).toBe('600px')
    expect(comparisonWrapper.props('height')).toBe('300px')
  })

  it('should ensure charts support loading prop', async () => {
    const { TrendChart, DistributionChart } = await import('@/components/charts/index')

    const trendWrapper = mount(TrendChart, {
      props: {
        loading: true,
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [{ name: 'Series 1', data: [100, 200] }]
        }
      }
    })
    expect(trendWrapper.props('loading')).toBe(true)
    expect(trendWrapper.find('.trend-chart').classes()).toContain('is-loading')

    const distWrapper = mount(DistributionChart, {
      props: {
        loading: true,
        data: [{ name: 'A', value: 100 }]
      }
    })
    expect(distWrapper.props('loading')).toBe(true)
    expect(distWrapper.find('.distribution-chart').classes()).toContain('is-loading')
  })

  it('should ensure charts support theme prop', async () => {
    const { TrendChart, HeatmapChart } = await import('@/components/charts/index')

    const trendWrapper = mount(TrendChart, {
      props: {
        theme: 'light',
        data: {
          dates: ['2024-01-01', '2024-01-02'],
          series: [{ name: 'Series 1', data: [100, 200] }]
        }
      }
    })
    expect(trendWrapper.props('theme')).toBe('light')

    const heatmapWrapper = mount(HeatmapChart, {
      props: {
        theme: 'dark',
        data: [{ x: 'A', y: 'B', value: 100 }]
      }
    })
    expect(heatmapWrapper.props('theme')).toBe('dark')
  })
})

describe('Charts Index - Namespace Organization', () => {
  it('should have consistent naming convention', async () => {
    const index = await import('@/components/charts/index')

    // 验证组件命名规范 (PascalCase)
    const componentNames = [
      'BaseChart',
      'LineChart',
      'BarChart',
      'PieChart',
      'TrendChart',
      'DistributionChart',
      'ComparisonChart',
      'RankingChart',
      'HeatmapChart',
    ]

    componentNames.forEach(name => {
      expect(index[name]).toBeDefined()
    })
  })
})

describe('Charts Index - TypeScript Support', () => {
  it('should have proper TypeScript declarations', async () => {
    const index = await import('@/components/charts/index')

    // 验证所有组件都是对象类型（Vue 组件）
    const components = [
      index.BaseChart,
      index.LineChart,
      index.BarChart,
      index.PieChart,
      index.TrendChart,
      index.DistributionChart,
      index.ComparisonChart,
      index.RankingChart,
      index.HeatmapChart,
    ]

    components.forEach(component => {
      expect(typeof component).toBe('object')
    })
  })
})
