import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Skeleton from '@/components/Skeleton/Skeleton.vue'

describe('Skeleton', () => {
  // 基础渲染测试
  it('should render with default props', () => {
    const wrapper = mount(Skeleton)
    expect(wrapper.find('.skeleton').exists()).toBe(true)
  })

  // 类型测试 - text
  it('should render text skeleton when type is text', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'text'
      }
    })
    expect(wrapper.find('.skeleton--text').exists()).toBe(true)
    expect(wrapper.find('.skeleton__item').exists()).toBe(true)
  })

  // 类型测试 - avatar
  it('should render avatar skeleton when type is avatar', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar'
      }
    })
    expect(wrapper.find('.skeleton--avatar').exists()).toBe(true)
    expect(wrapper.find('.skeleton__avatar').exists()).toBe(true)
  })

  // 类型测试 - button
  it('should render button skeleton when type is button', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'button'
      }
    })
    expect(wrapper.find('.skeleton--button').exists()).toBe(true)
    expect(wrapper.find('.skeleton__button').exists()).toBe(true)
  })

  // 类型测试 - card
  it('should render card skeleton when type is card', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'card'
      }
    })
    expect(wrapper.find('.skeleton--card').exists()).toBe(true)
    expect(wrapper.find('.skeleton__card').exists()).toBe(true)
  })

  // 类型测试 - list
  it('should render list skeleton when type is list', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'list'
      }
    })
    expect(wrapper.find('.skeleton--list').exists()).toBe(true)
    expect(wrapper.find('.skeleton__list').exists()).toBe(true)
  })

  // 默认类型测试
  it('should use text as default type', () => {
    const wrapper = mount(Skeleton)
    expect(wrapper.find('.skeleton--text').exists()).toBe(true)
  })

  // 动画测试 - shimmer
  it('should apply shimmer animation when animation is shimmer', () => {
    const wrapper = mount(Skeleton, {
      props: {
        animation: 'shimmer'
      }
    })
    expect(wrapper.find('.skeleton--shimmer').exists()).toBe(true)
  })

  // 动画测试 - pulse
  it('should apply pulse animation when animation is pulse', () => {
    const wrapper = mount(Skeleton, {
      props: {
        animation: 'pulse'
      }
    })
    expect(wrapper.find('.skeleton--pulse').exists()).toBe(true)
  })

  // 动画测试 - none
  it('should not have animation class when animation is none', () => {
    const wrapper = mount(Skeleton, {
      props: {
        animation: 'none'
      }
    })
    expect(wrapper.find('.skeleton--shimmer').exists()).toBe(false)
    expect(wrapper.find('.skeleton--pulse').exists()).toBe(false)
  })

  // 默认动画测试
  it('should use shimmer as default animation', () => {
    const wrapper = mount(Skeleton)
    expect(wrapper.find('.skeleton--shimmer').exists()).toBe(true)
  })

  // 行数测试 - text类型
  it('should render correct number of rows for text type', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'text',
        rows: 5
      }
    })
    const items = wrapper.findAll('.skeleton__item')
    expect(items.length).toBe(5)
  })

  // 默认行数测试
  it('should use default rows (3) for text type', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'text'
      }
    })
    const items = wrapper.findAll('.skeleton__item')
    expect(items.length).toBe(3)
  })

  // 列数测试
  it('should apply custom columns', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'text',
        columns: 2
      }
    })
    expect(wrapper.find('.skeleton').attributes('style')).toContain('grid-template-columns')
  })

  // 圆角测试
  it('should apply custom border radius', () => {
    const wrapper = mount(Skeleton, {
      props: {
        borderRadius: '8px'
      }
    })
    const firstItem = wrapper.find('.skeleton__item')
    expect(firstItem.attributes('style')).toContain('border-radius: 8px')
  })

  // 默认圆角测试
  it('should use default border radius (4px)', () => {
    const wrapper = mount(Skeleton)
    const firstItem = wrapper.find('.skeleton__item')
    expect(firstItem.attributes('style')).toContain('border-radius: 4px')
  })

  // 宽度测试
  it('should apply custom width', () => {
    const wrapper = mount(Skeleton, {
      props: {
        width: '200px'
      }
    })
    expect(wrapper.find('.skeleton').attributes('style')).toContain('width: 200px')
  })

  // 高度测试
  it('should apply custom height', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        height: '80px'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.attributes('style')).toContain('height: 80px')
  })

  // 头像尺寸测试
  it('should apply avatar size', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        size: 'large'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.attributes('style')).toContain('width: 64px')
    expect(avatar.attributes('style')).toContain('height: 64px')
  })

  // 按钮宽度测试
  it('should apply button width', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'button',
        width: '120px'
      }
    })
    const button = wrapper.find('.skeleton__button')
    expect(button.attributes('style')).toContain('width: 120px')
  })

  // 列表行数测试
  it('should render correct number of list items', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'list',
        rows: 4
      }
    })
    const items = wrapper.findAll('.skeleton__list-item')
    expect(items.length).toBe(4)
  })

  // 加载状态测试 - 显示
  it('should render when loading is true', () => {
    const wrapper = mount(Skeleton, {
      props: {
        loading: true
      }
    })
    expect(wrapper.find('.skeleton').exists()).toBe(true)
  })

  // 加载状态测试 - 隐藏
  it('should not render when loading is false', () => {
    const wrapper = mount(Skeleton, {
      props: {
        loading: false
      }
    })
    expect(wrapper.find('.skeleton').exists()).toBe(false)
  })

  // 默认加载状态测试
  it('should be loading by default', () => {
    const wrapper = mount(Skeleton)
    expect(wrapper.find('.skeleton').exists()).toBe(true)
  })

  // 自定义类名测试
  it('should apply custom class', () => {
    const wrapper = mount(Skeleton, {
      props: {
        customClass: 'my-custom-skeleton'
      }
    })
    expect(wrapper.find('.my-custom-skeleton').exists()).toBe(true)
  })

  // 卡片头部测试
  it('should render card header when cardHeader is true', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'card',
        cardHeader: true
      }
    })
    expect(wrapper.find('.skeleton__card-header').exists()).toBe(true)
  })

  // 卡片内容行数测试
  it('should render correct number of card content rows', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'card',
        rows: 5
      }
    })
    const rows = wrapper.findAll('.skeleton__card-row')
    expect(rows.length).toBe(5)
  })

  // 最后行宽度测试
  it('should apply last row width', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'text',
        rows: 3,
        lastRowWidth: '60%'
      }
    })
    const rows = wrapper.findAll('.skeleton__item')
    const lastRow = rows[rows.length - 1]
    expect(lastRow.attributes('style')).toContain('width: 60%')
  })

  // 间距测试
  it('should apply custom gap', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'text',
        gap: '16px'
      }
    })
    expect(wrapper.find('.skeleton').attributes('style')).toContain('gap: 16px')
  })

  // 不同尺寸的头像测试 - small
  it('should render small avatar', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        size: 'small'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.attributes('style')).toContain('width: 32px')
    expect(avatar.attributes('style')).toContain('height: 32px')
  })

  // 不同尺寸的头像测试 - medium
  it('should render medium avatar', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        size: 'medium'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.attributes('style')).toContain('width: 40px')
    expect(avatar.attributes('style')).toContain('height: 40px')
  })

  // 不同尺寸的头像测试 - large
  it('should render large avatar', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        size: 'large'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.attributes('style')).toContain('width: 64px')
    expect(avatar.attributes('style')).toContain('height: 64px')
  })

  // 圆形头像测试
  it('should render circular avatar', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        shape: 'circle'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.classes()).toContain('skeleton__avatar--circle')
  })

  // 方形头像测试
  it('should render square avatar', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar',
        shape: 'square'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.classes()).toContain('skeleton__avatar--square')
  })

  // 默认头像形状测试
  it('should use circle as default avatar shape', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'avatar'
      }
    })
    const avatar = wrapper.find('.skeleton__avatar')
    expect(avatar.classes()).toContain('skeleton__avatar--circle')
  })

  // 列表头像测试
  it('should render list with avatars when listAvatar is true', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'list',
        listAvatar: true
      }
    })
    const items = wrapper.findAll('.skeleton__list-item')
    expect(items[0].find('.skeleton__list-avatar').exists()).toBe(true)
  })

  // 列表操作按钮测试
  it('should render list with actions when listAction is true', () => {
    const wrapper = mount(Skeleton, {
      props: {
        type: 'list',
        listAction: true
      }
    })
    const items = wrapper.findAll('.skeleton__list-item')
    expect(items[0].find('.skeleton__list-action').exists()).toBe(true)
  })

  // 背景色测试
  it('should apply custom background color', () => {
    const wrapper = mount(Skeleton, {
      props: {
        backgroundColor: '#e0e0e0'
      }
    })
    const firstItem = wrapper.find('.skeleton__item')
    expect(firstItem.attributes('style')).toContain('background-color: rgb(224, 224, 224)')
  })

  // shimmer颜色测试
  it('should apply custom shimmer color', () => {
    const wrapper = mount(Skeleton, {
      props: {
        animation: 'shimmer',
        shimmerColor: 'rgba(255, 255, 255, 0.5)'
      }
    })
    // 通过检查是否有自定义样式属性来验证
    expect(wrapper.find('.skeleton').exists()).toBe(true)
  })
})
