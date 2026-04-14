import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusTag from '@/components/StatusTag/StatusTag.vue'

describe('StatusTag', () => {
  // ========== 基础渲染测试 ==========
  it('should render with default props', () => {
    const wrapper = mount(StatusTag, {
      props: {
        status: 'success'
      }
    })
    expect(wrapper.find('.status-tag').exists()).toBe(true)
    expect(wrapper.find('.status-tag__text').exists()).toBe(true)
  })

  // ========== 预设状态样式测试 ==========
  describe('preset status types', () => {
    it('should render success status with green color', () => {
      const wrapper = mount(StatusTag, {
        props: { status: 'success', text: '成功' }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--success')
      expect(wrapper.find('.status-tag__text').text()).toBe('成功')
      // 验证绿色样式
      const tag = wrapper.find('.status-tag')
      expect(tag.attributes('style')).toContain('--status-color')
    })

    it('should render warning status with orange color', () => {
      const wrapper = mount(StatusTag, {
        props: { status: 'warning', text: '警告' }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--warning')
      expect(wrapper.find('.status-tag__text').text()).toBe('警告')
    })

    it('should render error status with red color', () => {
      const wrapper = mount(StatusTag, {
        props: { status: 'error', text: '错误' }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--error')
      expect(wrapper.find('.status-tag__text').text()).toBe('错误')
    })

    it('should render info status with blue color', () => {
      const wrapper = mount(StatusTag, {
        props: { status: 'info', text: '信息' }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--info')
      expect(wrapper.find('.status-tag__text').text()).toBe('信息')
    })

    it('should render processing status with blue color', () => {
      const wrapper = mount(StatusTag, {
        props: { status: 'processing', text: '进行中', dot: true }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--processing')
      expect(wrapper.find('.status-tag__text').text()).toBe('进行中')
      // processing 状态应该有动画
      expect(wrapper.find('.status-tag__dot').classes()).toContain('status-tag__dot--animated')
    })

    it('should render default status with gray color', () => {
      const wrapper = mount(StatusTag, {
        props: { status: 'default', text: '默认' }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--default')
      expect(wrapper.find('.status-tag__text').text()).toBe('默认')
    })
  })

  // ========== 自定义颜色测试 ==========
  it('should apply custom color when provided', () => {
    const wrapper = mount(StatusTag, {
      props: {
        status: 'success',
        color: '#ff6b6b',
        text: '自定义颜色'
      }
    })
    const tag = wrapper.find('.status-tag')
    expect(tag.attributes('style')).toContain('#ff6b6b')
  })

  // ========== 自定义文本测试 ==========
  it('should display custom text', () => {
    const wrapper = mount(StatusTag, {
      props: {
        status: 'info',
        text: '自定义文本'
      }
    })
    expect(wrapper.find('.status-tag__text').text()).toBe('自定义文本')
  })

  // ========== 点状/填充样式测试 ==========
  describe('dot style', () => {
    it('should render dot style when dot is true', () => {
      const wrapper = mount(StatusTag, {
        props: {
          status: 'success',
          dot: true,
          text: '点状样式'
        }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--dot')
      expect(wrapper.find('.status-tag__dot').exists()).toBe(true)
    })

    it('should render filled style by default', () => {
      const wrapper = mount(StatusTag, {
        props: {
          status: 'success',
          text: '填充样式'
        }
      })
      expect(wrapper.find('.status-tag').classes()).not.toContain('status-tag--dot')
      expect(wrapper.find('.status-tag__dot').exists()).toBe(false)
      expect(wrapper.find('.status-tag--filled').exists()).toBe(true)
    })

    it('should apply correct color to dot', () => {
      const wrapper = mount(StatusTag, {
        props: {
          status: 'success',
          dot: true
        }
      })
      const dot = wrapper.find('.status-tag__dot')
      expect(dot.exists()).toBe(true)
      expect(dot.attributes('style')).toContain('--dot-color')
    })
  })

  // ========== 尺寸测试 ==========
  describe('size variants', () => {
    it('should render small size', () => {
      const wrapper = mount(StatusTag, {
        props: {
          status: 'success',
          size: 'small'
        }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--small')
    })

    it('should render medium size (default)', () => {
      const wrapper = mount(StatusTag, {
        props: {
          status: 'success'
        }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--medium')
    })

    it('should render large size', () => {
      const wrapper = mount(StatusTag, {
        props: {
          status: 'success',
          size: 'large'
        }
      })
      expect(wrapper.find('.status-tag').classes()).toContain('status-tag--large')
    })
  })

  // ========== 插槽测试 ==========
  it('should render default slot content', () => {
    const wrapper = mount(StatusTag, {
      props: { status: 'success' },
      slots: {
        default: '<span class="custom-slot">插槽内容</span>'
      }
    })
    expect(wrapper.find('.custom-slot').exists()).toBe(true)
    expect(wrapper.find('.custom-slot').text()).toBe('插槽内容')
  })

  // ========== 默认文本测试 ==========
  it('should use default text for each status type', () => {
    const testCases = [
      { status: 'success', expected: '成功' },
      { status: 'warning', expected: '警告' },
      { status: 'error', expected: '错误' },
      { status: 'info', expected: '信息' },
      { status: 'processing', expected: '进行中' },
      { status: 'default', expected: '默认' }
    ]

    testCases.forEach(({ status, expected }) => {
      const wrapper = mount(StatusTag, {
        props: { status }
      })
      expect(wrapper.find('.status-tag__text').text()).toBe(expected)
    })
  })

  // ========== 组合测试 ==========
  it('should work with dot style and custom color', () => {
    const wrapper = mount(StatusTag, {
      props: {
        status: 'success',
        dot: true,
        color: '#custom',
        text: '组合测试'
      }
    })
    expect(wrapper.find('.status-tag--dot').exists()).toBe(true)
    expect(wrapper.find('.status-tag').attributes('style')).toContain('#custom')
    expect(wrapper.find('.status-tag__text').text()).toBe('组合测试')
  })

  it('should work with all props combined', () => {
    const wrapper = mount(StatusTag, {
      props: {
        status: 'processing',
        dot: true,
        color: '#1890ff',
        text: '处理中',
        size: 'large'
      }
    })
    const tag = wrapper.find('.status-tag')
    expect(tag.classes()).toContain('status-tag--processing')
    expect(tag.classes()).toContain('status-tag--dot')
    expect(tag.classes()).toContain('status-tag--large')
    expect(tag.attributes('style')).toContain('#1890ff')
    expect(wrapper.find('.status-tag__text').text()).toBe('处理中')
    expect(wrapper.find('.status-tag__dot--animated').exists()).toBe(true)
  })
})
