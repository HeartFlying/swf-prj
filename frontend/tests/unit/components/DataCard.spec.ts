import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataCard from '@/components/DataCard/DataCard.vue'

describe('DataCard', () => {
  // 基础渲染测试
  it('should render with default props', () => {
    const wrapper = mount(DataCard)
    expect(wrapper.find('.data-card').exists()).toBe(true)
  })

  // 标题测试
  it('should display title when provided', () => {
    const wrapper = mount(DataCard, {
      props: {
        title: '销售额'
      }
    })
    expect(wrapper.find('.data-card__title').text()).toBe('销售额')
  })

  // 数值测试
  it('should display value when provided', () => {
    const wrapper = mount(DataCard, {
      props: {
        value: 12345
      }
    })
    // 数值会被格式化为千分位格式
    expect(wrapper.find('.data-card__value').text()).toBe('12,345')
  })

  // 格式化数值测试
  it('should format value when format is provided', () => {
    const wrapper = mount(DataCard, {
      props: {
        value: 12345.67,
        format: 'currency'
      }
    })
    expect(wrapper.find('.data-card__value').text()).toContain('¥')
  })

  // 趋势测试 - 上升
  it('should display upward trend correctly', () => {
    const wrapper = mount(DataCard, {
      props: {
        trend: 15.5
      }
    })
    const trendEl = wrapper.find('.data-card__trend')
    expect(trendEl.exists()).toBe(true)
    expect(trendEl.classes()).toContain('is-up')
    expect(trendEl.text()).toContain('+15.5%')
  })

  // 趋势测试 - 下降
  it('should display downward trend correctly', () => {
    const wrapper = mount(DataCard, {
      props: {
        trend: -8.3
      }
    })
    const trendEl = wrapper.find('.data-card__trend')
    expect(trendEl.classes()).toContain('is-down')
    expect(trendEl.text()).toContain('-8.3%')
  })

  // 图标测试
  it('should display icon when provided', () => {
    const wrapper = mount(DataCard, {
      props: {
        icon: 'TrendCharts'
      }
    })
    expect(wrapper.find('.data-card__icon').exists()).toBe(true)
  })

  // 主题样式测试 - primary
  it('should apply primary theme', () => {
    const wrapper = mount(DataCard, {
      props: {
        theme: 'primary'
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('data-card--primary')
  })

  // 主题样式测试 - success
  it('should apply success theme', () => {
    const wrapper = mount(DataCard, {
      props: {
        theme: 'success'
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('data-card--success')
  })

  // 主题样式测试 - warning
  it('should apply warning theme', () => {
    const wrapper = mount(DataCard, {
      props: {
        theme: 'warning'
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('data-card--warning')
  })

  // 主题样式测试 - danger
  it('should apply danger theme', () => {
    const wrapper = mount(DataCard, {
      props: {
        theme: 'danger'
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('data-card--danger')
  })

  // 加载状态测试
  it('should show loading state when loading is true', () => {
    const wrapper = mount(DataCard, {
      props: {
        loading: true
      }
    })
    expect(wrapper.find('.data-card__loading').exists()).toBe(true)
    expect(wrapper.find('.data-card__skeleton').exists()).toBe(true)
  })

  // 加载状态测试 - 内容隐藏
  it('should hide content when loading', () => {
    const wrapper = mount(DataCard, {
      props: {
        title: '测试标题',
        value: 100,
        loading: true
      }
    })
    expect(wrapper.find('.data-card__content').exists()).toBe(false)
  })

  // 描述文本测试
  it('should display description when provided', () => {
    const wrapper = mount(DataCard, {
      props: {
        description: '较上月同期'
      }
    })
    expect(wrapper.find('.data-card__description').text()).toBe('较上月同期')
  })

  // 点击事件测试
  it('should emit click event when clicked', async () => {
    const wrapper = mount(DataCard)
    await wrapper.find('.data-card').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  // 悬停效果测试
  it('should have hoverable class when hoverable is true', () => {
    const wrapper = mount(DataCard, {
      props: {
        hoverable: true
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('is-hoverable')
  })

  // 尺寸测试 - small
  it('should apply small size', () => {
    const wrapper = mount(DataCard, {
      props: {
        size: 'small'
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('data-card--small')
  })

  // 尺寸测试 - large
  it('should apply large size', () => {
    const wrapper = mount(DataCard, {
      props: {
        size: 'large'
      }
    })
    expect(wrapper.find('.data-card').classes()).toContain('data-card--large')
  })

  // 前缀和后缀测试
  it('should display prefix and suffix', () => {
    const wrapper = mount(DataCard, {
      props: {
        value: 100,
        prefix: '$',
        suffix: '元'
      }
    })
    const valueWrapper = wrapper.find('.data-card__value-wrapper')
    expect(valueWrapper.find('.data-card__prefix').text()).toBe('$')
    expect(valueWrapper.find('.data-card__suffix').text()).toBe('元')
    expect(valueWrapper.find('.data-card__value').text()).toBe('100')
  })

  // 自定义格式化函数测试
  it('should use custom formatter when provided', () => {
    const formatter = (val: number) => `自定义${val}格式`
    const wrapper = mount(DataCard, {
      props: {
        value: 100,
        formatter
      }
    })
    expect(wrapper.find('.data-card__value').text()).toBe('自定义100格式')
  })

  // 趋势图标测试
  it('should show trend icon when showTrendIcon is true', () => {
    const wrapper = mount(DataCard, {
      props: {
        trend: 10,
        showTrendIcon: true
      }
    })
    expect(wrapper.find('.data-card__trend-icon').exists()).toBe(true)
  })

  // 默认主题测试
  it('should use default theme when not specified', () => {
    const wrapper = mount(DataCard)
    expect(wrapper.find('.data-card').classes()).toContain('data-card--default')
  })

  // 默认尺寸测试
  it('should use default size when not specified', () => {
    const wrapper = mount(DataCard)
    expect(wrapper.find('.data-card').classes()).toContain('data-card--default')
  })
})
