import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeStatsCard from '@/components/stats/CodeStatsCard.vue'

// Mock DataCard component
vi.mock('@/components/DataCard/DataCard.vue', () => ({
  default: {
    name: 'DataCard',
    template: `
      <div class="data-card" :class="[
        'data-card--' + (theme || 'default'),
        'data-card--' + (size || 'default'),
        { 'is-hoverable': hoverable, 'is-loading': loading }
      ]">
        <div v-if="loading" class="data-card__loading">
          <div class="data-card__skeleton">Loading...</div>
        </div>
        <div v-else class="data-card__content">
          <div class="data-card__header">
            <div v-if="icon" class="data-card__icon">{{ icon }}</div>
            <div class="data-card__header-content">
              <div v-if="title" class="data-card__title">{{ title }}</div>
              <div v-if="description" class="data-card__description">{{ description }}</div>
            </div>
          </div>
          <div class="data-card__body">
            <div class="data-card__value-wrapper">
              <span v-if="prefix" class="data-card__prefix">{{ prefix }}</span>
              <span class="data-card__value">{{ formattedValue }}</span>
              <span v-if="suffix" class="data-card__suffix">{{ suffix }}</span>
            </div>
            <div v-if="trend !== undefined && trend !== null" class="data-card__trend" :class="{ 'is-up': trend > 0, 'is-down': trend < 0 }">
              <span v-if="showTrendIcon">{{ trend > 0 ? '↑' : '↓' }}</span>
              <span>{{ trend > 0 ? '+' : '' }}{{ trend }}%</span>
            </div>
          </div>
        </div>
      </div>
    `,
    props: ['title', 'value', 'format', 'trend', 'icon', 'theme', 'loading', 'description', 'hoverable', 'size', 'prefix', 'suffix', 'formatter', 'showTrendIcon'],
    computed: {
      formattedValue() {
        if (this.formatter) return this.formatter(this.value)
        if (this.value === undefined || this.value === null) return '-'
        return new Intl.NumberFormat('zh-CN').format(this.value)
      }
    }
  }
}))

describe('CodeStatsCard', () => {
  // 基础渲染测试
  it('should render with default props', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits'
      }
    })
    expect(wrapper.find('.code-stats-card').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DataCard' }).exists()).toBe(true)
  })

  // 提交数卡片测试
  it('should render commits card with correct title and icon', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 150
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('title')).toBe('提交数')
    expect(dataCard.props('icon')).toBe('Document')
    expect(dataCard.props('theme')).toBe('primary')
  })

  // 新增行数卡片测试
  it('should render additions card with correct title and icon', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'additions',
        value: 5000
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('title')).toBe('新增行数')
    expect(dataCard.props('icon')).toBe('Plus')
    expect(dataCard.props('theme')).toBe('success')
  })

  // 删除行数卡片测试
  it('should render deletions card with correct title and icon', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'deletions',
        value: 1200
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('title')).toBe('删除行数')
    expect(dataCard.props('icon')).toBe('Minus')
    expect(dataCard.props('theme')).toBe('danger')
  })

  // 文件变更数卡片测试
  it('should render files card with correct title and icon', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'files',
        value: 45
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('title')).toBe('文件变更数')
    expect(dataCard.props('icon')).toBe('DocumentCopy')
    expect(dataCard.props('theme')).toBe('warning')
  })

  // 数值传递测试
  it('should pass value to DataCard', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 999
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('value')).toBe(999)
  })

  // 趋势值传递测试
  it('should pass trend to DataCard', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        trend: 15.5
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('trend')).toBe(15.5)
    expect(dataCard.props('showTrendIcon')).toBe(true)
  })

  // 负趋势测试
  it('should handle negative trend correctly', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        trend: -8.3
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('trend')).toBe(-8.3)
  })

  // 环比描述测试
  it('should show month-over-month description when compareType is mom', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        trend: 10,
        compareType: 'mom'
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('description')).toBe('较上月')
  })

  // 同比描述测试
  it('should show year-over-year description when compareType is yoy', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        trend: 10,
        compareType: 'yoy'
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('description')).toBe('较去年同期')
  })

  // 自定义描述测试
  it('should use custom description when provided', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        description: '本周数据'
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('description')).toBe('本周数据')
  })

  // 加载状态测试
  it('should pass loading state to DataCard', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        loading: true
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('loading')).toBe(true)
  })

  // 尺寸测试
  it('should pass size to DataCard', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        size: 'large'
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('size')).toBe('large')
  })

  // 悬停效果测试
  it('should pass hoverable to DataCard', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        hoverable: true
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('hoverable')).toBe(true)
  })

  // 点击事件测试
  it('should emit click event when clicked', async () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100
      }
    })
    await wrapper.find('.code-stats-card').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  // 无效类型测试
  it('should handle invalid type gracefully', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'invalid' as any,
        value: 100
      }
    })
    expect(wrapper.find('.code-stats-card').exists()).toBe(true)
  })

  // 零值测试
  it('should handle zero value correctly', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 0
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('value')).toBe(0)
  })

  // 大数据值测试
  it('should handle large values correctly', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'additions',
        value: 1000000
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('value')).toBe(1000000)
  })

  // 趋势为空测试
  it('should handle undefined trend', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        trend: undefined
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('trend')).toBeUndefined()
  })

  // 默认尺寸测试
  it('should use default size when not specified', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits'
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('size')).toBe('default')
  })

  // 默认对比类型测试
  it('should use mom as default compareType', () => {
    const wrapper = mount(CodeStatsCard, {
      props: {
        type: 'commits',
        value: 100,
        trend: 10
      }
    })
    const dataCard = wrapper.findComponent({ name: 'DataCard' })
    expect(dataCard.props('description')).toBe('较上月')
  })
})
