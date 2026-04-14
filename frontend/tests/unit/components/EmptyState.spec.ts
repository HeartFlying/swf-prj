import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '@/components/EmptyState/EmptyState.vue'
import { ElEmpty, ElButton } from 'element-plus'

describe('EmptyState', () => {
  // 基础渲染测试
  it('should render with default props', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data'
      }
    })
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.findComponent(ElEmpty).exists()).toBe(true)
  })

  // 预设类型测试 - no-data
  it('should render no-data type correctly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data'
      }
    })
    expect(wrapper.find('.empty-state--no-data').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无数据')
  })

  // 预设类型测试 - no-search
  it('should render no-search type correctly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-search'
      }
    })
    expect(wrapper.find('.empty-state--no-search').exists()).toBe(true)
    expect(wrapper.text()).toContain('无搜索结果')
  })

  // 预设类型测试 - no-network
  it('should render no-network type correctly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-network'
      }
    })
    expect(wrapper.find('.empty-state--no-network').exists()).toBe(true)
    expect(wrapper.text()).toContain('网络异常')
  })

  // 预设类型测试 - no-permission
  it('should render no-permission type correctly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-permission'
      }
    })
    expect(wrapper.find('.empty-state--no-permission').exists()).toBe(true)
    expect(wrapper.text()).toContain('无权限')
  })

  // 预设类型测试 - error
  it('should render error type correctly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'error'
      }
    })
    expect(wrapper.find('.empty-state--error').exists()).toBe(true)
    expect(wrapper.text()).toContain('加载失败')
  })

  // 自定义标题测试
  it('should render custom title', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        title: '自定义标题'
      }
    })
    expect(wrapper.text()).toContain('自定义标题')
  })

  // 自定义描述测试
  it('should render custom description', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        description: '自定义描述信息'
      }
    })
    expect(wrapper.text()).toContain('自定义描述信息')
  })

  // 自定义图标测试
  it('should render custom icon when icon prop is provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        icon: 'Search'
      }
    })
    expect(wrapper.find('.empty-state__custom-icon').exists()).toBe(true)
  })

  // 图片图标测试
  it('should render image when image prop is provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        image: '/assets/empty.png'
      }
    })
    const img = wrapper.find('.empty-state__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/assets/empty.png')
  })

  // 操作按钮测试 - 单个按钮
  it('should render single action button', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        buttonText: '刷新',
        showButton: true
      }
    })
    expect(wrapper.findComponent(ElButton).exists()).toBe(true)
    expect(wrapper.findComponent(ElButton).text()).toBe('刷新')
  })

  // 操作按钮测试 - 多个按钮
  it('should render multiple action buttons', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        buttons: [
          { text: '刷新', type: 'primary' },
          { text: '返回', type: 'default' }
        ]
      }
    })
    const buttons = wrapper.findAllComponents(ElButton)
    expect(buttons.length).toBe(2)
    expect(buttons[0].text()).toBe('刷新')
    expect(buttons[1].text()).toBe('返回')
  })

  // 按钮点击事件测试
  it('should emit button-click when button is clicked', async () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        showButton: true,
        buttonText: '刷新'
      }
    })
    await wrapper.findComponent(ElButton).trigger('click')
    expect(wrapper.emitted('button-click')).toBeTruthy()
  })

  // 多按钮点击事件测试
  it('should emit button-click with index when multiple buttons', async () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        buttons: [
          { text: '刷新', type: 'primary' },
          { text: '返回', type: 'default' }
        ]
      }
    })
    const buttons = wrapper.findAllComponents(ElButton)
    await buttons[1].trigger('click')
    expect(wrapper.emitted('button-click')).toBeTruthy()
    expect(wrapper.emitted('button-click')![0]).toEqual([1])
  })

  // 尺寸测试 - small
  it('should apply small size', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        size: 'small'
      }
    })
    expect(wrapper.find('.empty-state--small').exists()).toBe(true)
  })

  // 尺寸测试 - large
  it('should apply large size', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        size: 'large'
      }
    })
    expect(wrapper.find('.empty-state--large').exists()).toBe(true)
  })

  // 自定义类名测试
  it('should apply custom class', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        customClass: 'my-custom-class'
      }
    })
    expect(wrapper.find('.my-custom-class').exists()).toBe(true)
  })

  // 默认插槽测试
  it('should render default slot content', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data'
      },
      slots: {
        default: '<div class="custom-content">自定义内容</div>'
      }
    })
    expect(wrapper.find('.custom-content').exists()).toBe(true)
  })

  // 底部插槽测试
  it('should render footer slot content', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data'
      },
      slots: {
        footer: '<div class="custom-footer">自定义底部</div>'
      }
    })
    expect(wrapper.find('.custom-footer').exists()).toBe(true)
  })

  // 图标插槽测试
  it('should render icon slot content', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data'
      },
      slots: {
        icon: '<div class="custom-icon-slot">★</div>'
      }
    })
    expect(wrapper.find('.custom-icon-slot').exists()).toBe(true)
  })

  // 空按钮配置测试
  it('should not render button when showButton is false', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        showButton: false
      }
    })
    expect(wrapper.findComponent(ElButton).exists()).toBe(false)
  })

  // 无按钮数组测试
  it('should not render buttons when buttons array is empty', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        buttons: []
      }
    })
    expect(wrapper.findComponent(ElButton).exists()).toBe(false)
  })

  // 按钮类型测试
  it('should apply correct button type', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        showButton: true,
        buttonText: '刷新',
        buttonType: 'success'
      }
    })
    const button = wrapper.findComponent(ElButton)
    expect(button.props('type')).toBe('success')
  })

  // 按钮尺寸测试
  it('should apply correct button size', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        showButton: true,
        buttonText: '刷新',
        buttonSize: 'small'
      }
    })
    const button = wrapper.findComponent(ElButton)
    expect(button.props('size')).toBe('small')
  })

  // 按钮 plain 样式测试
  it('should apply plain style to button when buttonPlain is true', () => {
    const wrapper = mount(EmptyState, {
      props: {
        type: 'no-data',
        showButton: true,
        buttonText: '刷新',
        buttonPlain: true
      }
    })
    const button = wrapper.findComponent(ElButton)
    expect(button.props('plain')).toBe(true)
  })
})
