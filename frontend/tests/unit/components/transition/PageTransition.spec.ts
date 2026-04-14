import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import PageTransition from '@/components/transition/PageTransition.vue'

describe('PageTransition', () => {
  // 基础渲染测试
  it('should render with default props', () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div class="test-content">Test Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').exists()).toBe(true)
    expect(wrapper.find('.test-content').exists()).toBe(true)
  })

  // 动画名称测试 - fade
  it('should apply fade animation name', () => {
    const wrapper = mount(PageTransition, {
      props: {
        name: 'fade'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--fade')
  })

  // 动画名称测试 - zoom
  it('should apply zoom animation name', () => {
    const wrapper = mount(PageTransition, {
      props: {
        name: 'zoom'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--zoom')
  })

  // 动画名称测试 - slide-left
  it('should apply slide-left animation name', () => {
    const wrapper = mount(PageTransition, {
      props: {
        name: 'slide-left'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--slide')
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--slide-left')
  })

  // 动画名称测试 - slide-right
  it('should apply slide-right animation name', () => {
    const wrapper = mount(PageTransition, {
      props: {
        name: 'slide-right'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--slide')
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--slide-right')
  })

  // 动画名称测试 - slide-up
  it('should apply slide-up animation name', () => {
    const wrapper = mount(PageTransition, {
      props: {
        name: 'slide-up'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--slide')
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--slide-up')
  })

  // 默认动画名称测试
  it('should use default animation name fade', () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--fade')
  })

  // 自定义时长测试
  it('should apply custom duration', () => {
    const wrapper = mount(PageTransition, {
      props: {
        duration: 500
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.find('.page-transition')
    expect(transition.attributes('style')).toContain('--transition-duration: 500ms')
  })

  // 默认时长测试
  it('should use default duration of 300ms', () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.find('.page-transition')
    expect(transition.attributes('style')).toContain('--transition-duration: 300ms')
  })

  // 延迟测试
  it('should apply custom delay', () => {
    const wrapper = mount(PageTransition, {
      props: {
        delay: 100
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.find('.page-transition')
    expect(transition.attributes('style')).toContain('--transition-delay: 100ms')
  })

  // 禁用动画测试
  it('should disable animation when disabled is true', () => {
    const wrapper = mount(PageTransition, {
      props: {
        disabled: true
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--disabled')
  })

  // 模式测试 - in-out
  it('should support in-out mode', () => {
    const wrapper = mount(PageTransition, {
      props: {
        mode: 'in-out'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.findComponent({ name: 'Transition' }).props('mode')).toBe('in-out')
  })

  // 模式测试 - out-in
  it('should support out-in mode', () => {
    const wrapper = mount(PageTransition, {
      props: {
        mode: 'out-in'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.findComponent({ name: 'Transition' }).props('mode')).toBe('out-in')
  })

  // 模式测试 - default
  it('should support default mode', () => {
    const wrapper = mount(PageTransition, {
      props: {
        mode: 'default'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.findComponent({ name: 'Transition' }).props('mode')).toBe('default')
  })

  // 默认模式测试
  it('should use default mode out-in', () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.findComponent({ name: 'Transition' }).props('mode')).toBe('out-in')
  })

  // 事件测试 - before-enter
  it('should emit before-enter event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('before-enter')
    expect(wrapper.emitted('before-enter')).toBeTruthy()
  })

  // 事件测试 - after-enter
  it('should emit after-enter event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('after-enter')
    expect(wrapper.emitted('after-enter')).toBeTruthy()
  })

  // 事件测试 - before-leave
  it('should emit before-leave event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('before-leave')
    expect(wrapper.emitted('before-leave')).toBeTruthy()
  })

  // 事件测试 - after-leave
  it('should emit after-leave event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('after-leave')
    expect(wrapper.emitted('after-leave')).toBeTruthy()
  })

  // 组子元素测试
  it('should render multiple children', () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div class="child-1">Child 1</div><div class="child-2">Child 2</div>'
      }
    })
    expect(wrapper.find('.child-1').exists()).toBe(true)
    expect(wrapper.find('.child-2').exists()).toBe(true)
  })

  // appear属性测试
  it('should support appear prop', () => {
    const wrapper = mount(PageTransition, {
      props: {
        appear: true
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.findComponent({ name: 'Transition' }).props('appear')).toBe(true)
  })

  // 自定义类名测试
  it('should apply custom class', () => {
    const wrapper = mount(PageTransition, {
      props: {
        customClass: 'my-custom-class'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('my-custom-class')
  })

  // 缓动函数测试
  it('should apply custom easing', () => {
    const wrapper = mount(PageTransition, {
      props: {
        easing: 'ease-in-out'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.find('.page-transition')
    expect(transition.attributes('style')).toContain('--transition-easing: ease-in-out')
  })

  // 默认缓动测试
  it('should use default easing ease-out', () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.find('.page-transition')
    expect(transition.attributes('style')).toContain('--transition-easing: ease-out')
  })

  // 组合样式测试
  it('should combine all style properties', () => {
    const wrapper = mount(PageTransition, {
      props: {
        duration: 500,
        delay: 100,
        easing: 'ease-in'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    const style = wrapper.find('.page-transition').attributes('style')
    expect(style).toContain('--transition-duration: 500ms')
    expect(style).toContain('--transition-delay: 100ms')
    expect(style).toContain('--transition-easing: ease-in')
  })

  // prefers-reduced-motion 支持测试
  it('should support disabled prop for reduced motion preference', () => {
    const wrapper = mount(PageTransition, {
      props: {
        disabled: true,
        name: 'slide-left'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    expect(wrapper.find('.page-transition').classes()).toContain('page-transition--disabled')
  })

  // 禁用动画时 Transition 组件应无 name 属性
  it('should not have transition name when disabled', () => {
    const wrapper = mount(PageTransition, {
      props: {
        disabled: true,
        name: 'fade'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    expect(transition.props('name')).toBeUndefined()
  })

  // 事件测试 - enter
  it('should emit enter event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('enter')
    expect(wrapper.emitted('enter')).toBeTruthy()
  })

  // 事件测试 - leave
  it('should emit leave event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('leave')
    expect(wrapper.emitted('leave')).toBeTruthy()
  })

  // 事件测试 - enter-cancelled
  it('should emit enter-cancelled event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('enter-cancelled')
    expect(wrapper.emitted('enter-cancelled')).toBeTruthy()
  })

  // 事件测试 - leave-cancelled
  it('should emit leave-cancelled event', async () => {
    const wrapper = mount(PageTransition, {
      slots: {
        default: '<div>Content</div>'
      }
    })
    const transition = wrapper.findComponent({ name: 'Transition' })
    await transition.vm.$emit('leave-cancelled')
    expect(wrapper.emitted('leave-cancelled')).toBeTruthy()
  })
})
