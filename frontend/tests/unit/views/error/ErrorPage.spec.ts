import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ErrorPage from '@/views/error/ErrorPage.vue'

// Mock vue-router
const mockPush = vi.fn()
const mockGo = vi.fn()
const mockReplace = vi.fn()

vi.mock('vue-router', async () => {
  return {
    useRoute: () => ({
      query: {},
      params: {},
    }),
    useRouter: () => ({
      push: mockPush,
      go: mockGo,
      replace: mockReplace,
    }),
  }
})

describe('ErrorPage', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // 基础渲染测试
  it('should render with default 404 error code', () => {
    wrapper = mount(ErrorPage)
    expect(wrapper.find('.error-code').text()).toContain('404')
    expect(wrapper.find('.error-message').text()).toContain('页面未找到')
  })

  // 支持不同错误码测试
  it('should render 500 error code when provided', async () => {
    wrapper = mount(ErrorPage, {
      props: {
        code: '500',
      },
    })
    expect(wrapper.find('.error-code').text()).toContain('500')
    expect(wrapper.find('.error-message').text()).toContain('服务器错误')
  })

  it('should render 403 error code when provided', async () => {
    wrapper = mount(ErrorPage, {
      props: {
        code: '403',
      },
    })
    expect(wrapper.find('.error-code').text()).toContain('403')
    expect(wrapper.find('.error-message').text()).toContain('访问被拒绝')
  })

  it('should render 401 error code when provided', async () => {
    wrapper = mount(ErrorPage, {
      props: {
        code: '401',
      },
    })
    expect(wrapper.find('.error-code').text()).toContain('401')
    expect(wrapper.find('.error-message').text()).toContain('未授权访问')
  })

  it('should render 503 error code when provided', async () => {
    wrapper = mount(ErrorPage, {
      props: {
        code: '503',
      },
    })
    expect(wrapper.find('.error-code').text()).toContain('503')
    expect(wrapper.find('.error-message').text()).toContain('服务不可用')
  })

  // 自定义错误消息测试
  it('should render custom error message when provided', () => {
    wrapper = mount(ErrorPage, {
      props: {
        code: '500',
        message: '自定义错误消息',
      },
    })
    expect(wrapper.find('.error-description').text()).toBe('自定义错误消息')
  })

  // 自动重试倒计时测试
  it('should show auto-retry countdown when autoRetry is enabled', () => {
    wrapper = mount(ErrorPage, {
      props: {
        autoRetry: true,
        retryDelay: 5,
      },
    })
    expect(wrapper.find('.retry-countdown').exists()).toBe(true)
    expect(wrapper.find('.retry-countdown').text()).toContain('5')
  })

  it('should countdown and trigger retry automatically', async () => {
    const onRetry = vi.fn()
    wrapper = mount(ErrorPage, {
      props: {
        autoRetry: true,
        retryDelay: 3,
        onRetry,
      },
    })

    expect(wrapper.find('.retry-countdown').text()).toContain('3')

    // 等待倒计时
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.find('.retry-countdown').text()).toContain('2')

    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.find('.retry-countdown').text()).toContain('1')

    vi.advanceTimersByTime(1000)
    await nextTick()

    // 等待 retry 的 setTimeout 完成（500ms）
    vi.advanceTimersByTime(500)
    await nextTick()

    expect(onRetry).toHaveBeenCalled()
  })

  it('should stop countdown when autoRetry is cancelled', async () => {
    const onRetry = vi.fn()
    wrapper = mount(ErrorPage, {
      props: {
        autoRetry: true,
        retryDelay: 5,
        onRetry,
      },
    })

    // 点击取消按钮
    const cancelBtn = wrapper.find('.cancel-auto-retry')
    await cancelBtn.trigger('click')

    // 前进时间，确认不会触发重试
    vi.advanceTimersByTime(5000)
    await nextTick()

    expect(onRetry).not.toHaveBeenCalled()
    expect(wrapper.find('.retry-countdown').exists()).toBe(false)
  })

  // 手动重试按钮测试
  it('should render manual retry button', () => {
    wrapper = mount(ErrorPage)
    const retryBtn = wrapper.find('.manual-retry-btn')
    expect(retryBtn.exists()).toBe(true)
  })

  it('should emit retry event when manual retry button is clicked', async () => {
    wrapper = mount(ErrorPage)

    const retryBtn = wrapper.find('.manual-retry-btn')
    await retryBtn.trigger('click')

    // 等待 setTimeout 完成
    vi.advanceTimersByTime(600)
    await nextTick()

    // 检查是否触发了 retry 事件
    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(wrapper.emitted('retry')!.length).toBe(1)
  })

  it('should show loading state during retry', async () => {
    wrapper = mount(ErrorPage)

    const retryBtn = wrapper.find('.manual-retry-btn')
    await retryBtn.trigger('click')

    expect(wrapper.find('.manual-retry-btn').classes()).toContain('loading')
  })

  // 返回首页测试
  it('should navigate to home when back to home button is clicked', async () => {
    wrapper = mount(ErrorPage)

    const homeBtn = wrapper.find('.back-home-btn')
    await homeBtn.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  // 返回上一页测试
  it('should navigate back when back button is clicked', async () => {
    wrapper = mount(ErrorPage)

    const backBtn = wrapper.find('.back-prev-btn')
    await backBtn.trigger('click')

    expect(mockGo).toHaveBeenCalledWith(-1)
  })

  // 最大重试次数测试
  it('should track retry count and disable after max retries', async () => {
    wrapper = mount(ErrorPage, {
      props: {
        maxRetries: 2,
      },
    })

    const retryBtn = wrapper.find('.manual-retry-btn')

    // 第一次重试
    await retryBtn.trigger('click')
    vi.advanceTimersByTime(600)
    await nextTick()
    expect(wrapper.emitted('retry')!.length).toBe(1)

    // 第二次重试 - 等待第一次完成
    await retryBtn.trigger('click')
    vi.advanceTimersByTime(600)
    await nextTick()
    expect(wrapper.emitted('retry')!.length).toBe(2)

    // 第三次应该显示已达最大重试次数 - 检查按钮文本
    await nextTick()
    const btnText = wrapper.find('.manual-retry-btn').text()
    expect(btnText).toContain('已达最大重试次数')
  })

  // Props 默认值测试
  it('should use default props correctly', () => {
    wrapper = mount(ErrorPage)

    expect(wrapper.props('code')).toBe('404')
    expect(wrapper.props('autoRetry')).toBe(false)
    expect(wrapper.props('retryDelay')).toBe(5)
    expect(wrapper.props('maxRetries')).toBe(3)
  })

  // 清理定时器测试
  it('should clear timer on unmount', () => {
    wrapper = mount(ErrorPage, {
      props: {
        autoRetry: true,
        retryDelay: 10,
      },
    })

    expect(() => wrapper.unmount()).not.toThrow()
  })

  // 错误码映射测试
  it('should use custom error code mapping when provided', () => {
    wrapper = mount(ErrorPage, {
      props: {
        code: '418',
        customMessages: {
          '418': '我是茶壶',
        },
      },
    })

    expect(wrapper.find('.error-message').text()).toContain('我是茶壶')
  })

  // 重试完成后重置状态测试
  it('should reset retry count when retry is successful', async () => {
    wrapper = mount(ErrorPage, {
      props: {
        maxRetries: 2,
      },
    })

    const retryBtn = wrapper.find('.manual-retry-btn')

    // 点击重试两次
    await retryBtn.trigger('click')
    vi.advanceTimersByTime(600)
    await nextTick()
    await retryBtn.trigger('click')
    vi.advanceTimersByTime(600)
    await nextTick()

    // 验证已达到最大重试次数
    const btn = wrapper.find('.manual-retry-btn')
    expect(btn.text()).toContain('已达最大重试次数')

    // 模拟成功回调
    await wrapper.setProps({ retrySuccess: true })
    await nextTick()

    // 重试次数应该重置 - 按钮应该恢复正常
    expect(wrapper.find('.manual-retry-btn').text()).toContain('立即重试')
  })
})
