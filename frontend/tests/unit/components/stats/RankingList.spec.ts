import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mock Element Plus components before importing the component
vi.mock('element-plus', () => ({
  ElAvatar: {
    name: 'ElAvatar',
    template: '<div class="el-avatar"><slot /></div>',
    props: ['size', 'src', 'shape'],
  },
  ElSkeleton: {
    name: 'ElSkeleton',
    template: '<div class="el-skeleton"><div v-for="i in (rows || 3)" :key="i" class="el-skeleton__row">Loading...</div></div>',
    props: ['rows', 'animated'],
  },
  ElEmpty: {
    name: 'ElEmpty',
    template: '<div class="el-empty">{{ description || "暂无数据" }}</div>',
    props: ['description'],
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
}))

// Import component after mocking
import RankingList from '@/components/stats/RankingList.vue'

describe('RankingList', () => {
  const mockData = [
    { id: 1, name: '张三', score: 1000, avatar: 'https://example.com/avatar1.jpg', department: '技术部' },
    { id: 2, name: '李四', score: 850, avatar: 'https://example.com/avatar2.jpg', department: '产品部' },
    { id: 3, name: '王五', score: 720, avatar: 'https://example.com/avatar3.jpg', department: '设计部' },
    { id: 4, name: '赵六', score: 650, department: '运营部' },
    { id: 5, name: '钱七', score: 500 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 基础渲染测试 ====================

  it('should render with default props', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    expect(wrapper.find('.ranking-list').exists()).toBe(true)
    expect(wrapper.findAll('.ranking-item').length).toBe(5)
  })

  it('should render empty state when data is empty', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: [],
      },
    })

    expect(wrapper.find('.el-empty').exists()).toBe(true)
  })

  it('should render loading state when loading is true', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: [],
        loading: true,
      },
    })

    expect(wrapper.find('.el-skeleton').exists()).toBe(true)
    expect(wrapper.find('.ranking-list--loading').exists()).toBe(true)
  })

  // ==================== 排名显示测试 ====================

  it('should display correct rank numbers', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showCrown: false,
      },
    })

    const rankNumbers = wrapper.findAll('.ranking-item__rank-number')
    expect(rankNumbers[0].text()).toBe('1')
    expect(rankNumbers[1].text()).toBe('2')
    expect(rankNumbers[2].text()).toBe('3')
    expect(rankNumbers[3].text()).toBe('4')
    expect(rankNumbers[4].text()).toBe('5')
  })

  it('should display user names correctly', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    const names = wrapper.findAll('.ranking-item__name')
    expect(names[0].text()).toBe('张三')
    expect(names[1].text()).toBe('李四')
    expect(names[2].text()).toBe('王五')
  })

  it('should display scores correctly', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    const values = wrapper.findAll('.ranking-item__value')
    // Values are formatted with toLocaleString, so they contain commas
    expect(values[0].text()).toContain('1,000')
    expect(values[1].text()).toContain('850')
    expect(values[2].text()).toContain('720')
  })

  // ==================== 前三名特殊样式测试 ====================

  it('should apply special styles for top 3', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    const items = wrapper.findAll('.ranking-item')
    expect(items[0].classes()).toContain('ranking-item--top1')
    expect(items[1].classes()).toContain('ranking-item--top2')
    expect(items[2].classes()).toContain('ranking-item--top3')
    expect(items[3].classes()).not.toContain('ranking-item--top1')
    expect(items[3].classes()).not.toContain('ranking-item--top2')
    expect(items[3].classes()).not.toContain('ranking-item--top3')
  })

  it('should show crown icons for top 3 when showCrown is true', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showCrown: true,
      },
    })

    const crowns = wrapper.findAll('.ranking-item__crown')
    expect(crowns.length).toBe(3)
  })

  it('should not show crown icons when showCrown is false', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showCrown: false,
      },
    })

    const crowns = wrapper.findAll('.ranking-item__crown')
    expect(crowns.length).toBe(0)
  })

  // ==================== 布局测试 ====================

  it('should render vertical layout by default', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    expect(wrapper.find('.ranking-list--vertical').exists()).toBe(true)
    expect(wrapper.find('.ranking-list--horizontal').exists()).toBe(false)
  })

  it('should render horizontal layout when layout is horizontal', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        layout: 'horizontal',
      },
    })

    expect(wrapper.find('.ranking-list--horizontal').exists()).toBe(true)
    expect(wrapper.find('.ranking-list--vertical').exists()).toBe(false)
  })

  // ==================== 头像测试 ====================

  it('should render avatars when showAvatar is true', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showAvatar: true,
      },
    })

    const avatars = wrapper.findAll('.ranking-item__avatar')
    expect(avatars.length).toBe(5)
  })

  it('should not render avatars when showAvatar is false', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showAvatar: false,
      },
    })

    const avatars = wrapper.findAll('.ranking-item__avatar')
    expect(avatars.length).toBe(0)
  })

  it('should handle missing avatar gracefully', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showAvatar: true,
      },
    })

    const avatars = wrapper.findAll('.ranking-item__avatar')
    // 第4、5个数据没有头像，应该显示默认头像或占位符
    expect(avatars[3].exists()).toBe(true)
    expect(avatars[4].exists()).toBe(true)
  })

  // ==================== 部门/描述测试 ====================

  it('should render department when showDepartment is true', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showDepartment: true,
      },
    })

    const departments = wrapper.findAll('.ranking-item__department')
    expect(departments.length).toBeGreaterThan(0)
    expect(departments[0].text()).toBe('技术部')
  })

  it('should not render department when showDepartment is false', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showDepartment: false,
      },
    })

    const departments = wrapper.findAll('.ranking-item__department')
    expect(departments.length).toBe(0)
  })

  // ==================== 最大值和进度条测试 ====================

  it('should show progress bar when showProgress is true', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showProgress: true,
      },
    })

    const progressBars = wrapper.findAll('.ranking-item__progress')
    expect(progressBars.length).toBe(5)
  })

  it('should not show progress bar when showProgress is false', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showProgress: false,
      },
    })

    const progressBars = wrapper.findAll('.ranking-item__progress')
    expect(progressBars.length).toBe(0)
  })

  it('should calculate progress correctly based on max value', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        showProgress: true,
      },
    })

    const progressBars = wrapper.findAll('.ranking-item__progress-bar')
    // 第一名应该是100%
    expect(progressBars[0].attributes('style')).toContain('width: 100%')
    // 最后一名应该是50% (500/1000)
    expect(progressBars[4].attributes('style')).toContain('width: 50%')
  })

  // ==================== 点击事件测试 ====================

  it('should emit itemClick when an item is clicked', async () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    const items = wrapper.findAll('.ranking-item')
    await items[0].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('itemClick')).toBeTruthy()
    expect(wrapper.emitted('itemClick')![0]).toEqual([mockData[0]])
  })

  it('should emit itemClick with correct data for each item', async () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
      },
    })

    const items = wrapper.findAll('.ranking-item')
    await items[2].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('itemClick')![0]).toEqual([mockData[2]])
  })

  // ==================== 自定义字段测试 ====================

  it('should use custom valueKey for score field', () => {
    const customData = [
      { id: 1, name: '张三', points: 1000 },
      { id: 2, name: '李四', points: 850 },
    ]

    const wrapper = mount(RankingList, {
      props: {
        data: customData,
        valueKey: 'points',
      },
    })

    const values = wrapper.findAll('.ranking-item__value')
    expect(values[0].text()).toContain('1,000')
    expect(values[1].text()).toContain('850')
  })

  it('should use custom nameKey for name field', () => {
    const customData = [
      { id: 1, username: '张三', score: 1000 },
      { id: 2, username: '李四', score: 850 },
    ]

    const wrapper = mount(RankingList, {
      props: {
        data: customData,
        nameKey: 'username',
      },
    })

    const names = wrapper.findAll('.ranking-item__name')
    expect(names[0].text()).toBe('张三')
    expect(names[1].text()).toBe('李四')
  })

  // ==================== 最大值限制测试 ====================

  it('should limit items when maxItems is set', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        maxItems: 3,
      },
    })

    const items = wrapper.findAll('.ranking-item')
    expect(items.length).toBe(3)
  })

  it('should show all items when maxItems is greater than data length', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        maxItems: 10,
      },
    })

    const items = wrapper.findAll('.ranking-item')
    expect(items.length).toBe(5)
  })

  // ==================== 趋势测试 ====================

  it('should show trend indicator when showTrend is true and trend data exists', () => {
    const dataWithTrend = [
      { id: 1, name: '张三', score: 1000, trend: 5 },
      { id: 2, name: '李四', score: 850, trend: -3 },
      { id: 3, name: '王五', score: 720, trend: 0 },
    ]

    const wrapper = mount(RankingList, {
      props: {
        data: dataWithTrend,
        showTrend: true,
      },
    })

    const trends = wrapper.findAll('.ranking-item__trend')
    expect(trends.length).toBe(3)
    expect(trends[0].classes()).toContain('ranking-item__trend--up')
    expect(trends[1].classes()).toContain('ranking-item__trend--down')
    expect(trends[2].classes()).toContain('ranking-item__trend--flat')
  })

  it('should not show trend indicator when showTrend is false', () => {
    const dataWithTrend = [
      { id: 1, name: '张三', score: 1000, trend: 5 },
    ]

    const wrapper = mount(RankingList, {
      props: {
        data: dataWithTrend,
        showTrend: false,
      },
    })

    const trends = wrapper.findAll('.ranking-item__trend')
    expect(trends.length).toBe(0)
  })

  // ==================== 自定义单位测试 ====================

  it('should display custom unit', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        unit: '分',
      },
    })

    const units = wrapper.findAll('.ranking-item__unit')
    expect(units[0].text()).toBe('分')
  })

  // ==================== 高亮测试 ====================

  it('should highlight specified item', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        highlightId: 2,
      },
    })

    const items = wrapper.findAll('.ranking-item')
    expect(items[1].classes()).toContain('ranking-item--highlighted')
    expect(items[0].classes()).not.toContain('ranking-item--highlighted')
  })

  // ==================== 空数据自定义描述测试 ====================

  it('should show custom empty text', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: [],
        emptyText: '暂无排名数据',
      },
    })

    expect(wrapper.find('.el-empty').text()).toBe('暂无排名数据')
  })

  // ==================== 数值格式化测试 ====================

  it('should format value with formatter function', () => {
    const wrapper = mount(RankingList, {
      props: {
        data: mockData,
        formatter: (value: number) => `${(value / 1000).toFixed(1)}k`,
      },
    })

    const values = wrapper.findAll('.ranking-item__value')
    expect(values[0].text()).toContain('1.0k')
    expect(values[1].text()).toContain('0.8k')
  })
})
