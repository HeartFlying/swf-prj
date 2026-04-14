import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Loading } from '@/components/Loading'
import { CircleCheck } from '@element-plus/icons-vue'

describe('Loading', () => {
  // 基础渲染测试
  it('should render with default props', () => {
    const wrapper = mount(Loading)
    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  // 全屏模式测试
  it('should apply fullscreen mode when fullscreen is true', () => {
    const wrapper = mount(Loading, {
      props: {
        fullscreen: true,
        loading: true
      }
    })
    // 全屏模式使用 Teleport，需要在 document.body 中查找
    expect(document.querySelector('.loading--fullscreen')).toBeTruthy()
    wrapper.unmount()
  })

  // 局部模式测试（默认）
  it('should use local mode by default', () => {
    const wrapper = mount(Loading)
    expect(wrapper.find('.loading--local').exists()).toBe(true)
    expect(wrapper.find('.loading--fullscreen').exists()).toBe(false)
  })

  // 行内模式测试
  it('should apply inline mode when inline is true', () => {
    const wrapper = mount(Loading, {
      props: {
        inline: true,
        loading: true
      }
    })
    expect(wrapper.find('.loading--inline').exists()).toBe(true)
  })

  // 行内模式无遮罩测试
  it('should not have mask in inline mode', () => {
    const wrapper = mount(Loading, {
      props: {
        inline: true,
        loading: true
      }
    })
    expect(wrapper.find('.loading__mask').exists()).toBe(false)
  })

  // 自定义提示文字测试
  it('should display custom text when provided', () => {
    const wrapper = mount(Loading, {
      props: {
        text: '加载中...',
        loading: true
      }
    })
    expect(wrapper.find('.loading__text').text()).toBe('加载中...')
  })

  // 无提示文字测试
  it('should not display text when not provided', () => {
    const wrapper = mount(Loading)
    expect(wrapper.find('.loading__text').exists()).toBe(false)
  })

  // 遮罩层透明度测试
  it('should apply custom opacity', () => {
    const wrapper = mount(Loading, {
      props: {
        opacity: 0.5,
        loading: true
      }
    })
    const mask = wrapper.find('.loading__mask')
    expect(mask.exists()).toBe(true)
    expect(mask.attributes('style')).toContain('opacity: 0.5')
  })

  // 默认遮罩层透明度测试
  it('should use default opacity', () => {
    const wrapper = mount(Loading)
    const mask = wrapper.find('.loading__mask')
    expect(mask.exists()).toBe(true)
    expect(mask.attributes('style')).toContain('opacity: 0.7')
  })

  // 显示/隐藏测试 - loading prop
  it('should be visible when loading is true', () => {
    const wrapper = mount(Loading, {
      props: {
        loading: true
      }
    })
    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  // 隐藏状态测试
  it('should not render when loading is false', () => {
    const wrapper = mount(Loading, {
      props: {
        loading: false
      }
    })
    expect(wrapper.find('.loading').exists()).toBe(false)
  })

  // 默认显示状态测试
  it('should be visible by default (loading=true)', () => {
    const wrapper = mount(Loading)
    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  // 自定义背景色测试
  it('should apply custom background color', () => {
    const wrapper = mount(Loading, {
      props: {
        background: '#f5f5f5',
        loading: true
      }
    })
    const mask = wrapper.find('.loading__mask')
    expect(mask.attributes('style')).toContain('background-color: rgb(245, 245, 245)')
  })

  // 自定义z-index测试
  it('should apply custom z-index', () => {
    const wrapper = mount(Loading, {
      props: {
        zIndex: 9999,
        loading: true
      }
    })
    const loading = wrapper.find('.loading')
    expect(loading.attributes('style')).toContain('z-index: 9999')
  })

  // 锁定滚动测试 - 全屏模式
  it('should lock body scroll in fullscreen mode', () => {
    const wrapper = mount(Loading, {
      props: {
        fullscreen: true,
        lock: true,
        loading: true
      }
    })
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
  })

  // 点击遮罩关闭测试
  it('should emit close event when clicking mask if closeOnClickMask is true', async () => {
    const wrapper = mount(Loading, {
      props: {
        closeOnClickMask: true,
        loading: true
      }
    })
    await wrapper.find('.loading__mask').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // 点击遮罩不关闭测试
  it('should not emit close event when clicking mask if closeOnClickMask is false', async () => {
    const wrapper = mount(Loading, {
      props: {
        closeOnClickMask: false,
        loading: true
      }
    })
    await wrapper.find('.loading__mask').trigger('click')
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  // 尺寸测试 - small
  it('should apply small size', () => {
    const wrapper = mount(Loading, {
      props: {
        size: 'small',
        loading: true
      }
    })
    expect(wrapper.find('.loading__content--small').exists()).toBe(true)
  })

  // 尺寸测试 - large
  it('should apply large size', () => {
    const wrapper = mount(Loading, {
      props: {
        size: 'large',
        loading: true
      }
    })
    expect(wrapper.find('.loading__content--large').exists()).toBe(true)
  })

  // 默认尺寸测试
  it('should use default size when not specified', () => {
    const wrapper = mount(Loading)
    expect(wrapper.find('.loading__content--medium').exists()).toBe(true)
  })

  // 自定义颜色测试 - spinner
  it('should apply custom color to spinner', () => {
    const wrapper = mount(Loading, {
      props: {
        color: '#ff0000',
        loading: true
      }
    })
    const spinner = wrapper.find('.loading__spinner')
    expect(spinner.attributes('style')).toContain('color: rgb(255, 0, 0)')
  })

  // 自定义图标测试
  it('should render custom icon when provided', () => {
    const wrapper = mount(Loading, {
      props: {
        icon: CircleCheck,
        loading: true
      }
    })
    expect(wrapper.find('.loading__custom-icon').exists()).toBe(true)
  })

  // 行内模式尺寸测试
  it('should apply correct size class in inline mode', () => {
    const wrapper = mount(Loading, {
      props: {
        inline: true,
        size: 'small',
        loading: true
      }
    })
    expect(wrapper.find('.loading--inline').classes()).toContain('loading__content--small')
  })

  // 延迟显示测试
  it('should delay showing when delay is provided', async () => {
    const wrapper = mount(Loading, {
      props: {
        delay: 100,
        loading: true
      }
    })
    // 初始状态应该隐藏
    expect(wrapper.find('.loading').exists()).toBe(false)
    wrapper.unmount()
  })

  // 全屏模式下的body类名测试
  it('should add loading-active class to body in fullscreen mode', () => {
    const wrapper = mount(Loading, {
      props: {
        fullscreen: true,
        loading: true
      }
    })
    expect(document.body.classList.contains('loading-active')).toBe(true)
    wrapper.unmount()
  })

  // 组件卸载时清理测试
  it('should clean up body styles when unmounted', () => {
    const wrapper = mount(Loading, {
      props: {
        fullscreen: true,
        lock: true,
        loading: true
      }
    })
    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
    expect(document.body.classList.contains('loading-active')).toBe(false)
  })

  // Props 类型检查
  it('should accept all required props', () => {
    const wrapper = mount(Loading, {
      props: {
        loading: true,
        fullscreen: false,
        inline: false,
        text: '加载中',
        size: 'medium',
        color: '#409eff',
        opacity: 0.8,
        background: '#ffffff',
        zIndex: 2000,
        lock: true,
        closeOnClickMask: false,
        delay: 0
      }
    })
    expect(wrapper.find('.loading').exists()).toBe(true)
  })
})
