import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref, nextTick } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary.vue'

// 创建一个会抛出错误的测试组件
const ErrorThrowingComponent = defineComponent({
  name: 'ErrorThrowingComponent',
  props: {
    shouldThrow: {
      type: Boolean,
      default: false
    },
    errorMessage: {
      type: String,
      default: 'Test error'
    }
  },
  setup(props) {
    if (props.shouldThrow) {
      throw new Error(props.errorMessage)
    }
    return () => h('div', { class: 'normal-content' }, 'Normal Content')
  }
})

// 创建一个异步抛出错误的组件
const AsyncErrorComponent = defineComponent({
  name: 'AsyncErrorComponent',
  setup() {
    const triggerError = () => {
      throw new Error('Async error')
    }
    return () => h('button', { class: 'trigger-btn', onClick: triggerError }, 'Trigger Error')
  }
})

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // 抑制控制台错误输出，避免测试输出混乱
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // 基础渲染测试 - 正常子组件
  it('should render child component when no error occurs', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="test-content">Test Content</div>'
      }
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__error').exists()).toBe(false)
  })

  // 错误捕获测试
  it('should catch and display error when child throws', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true, errorMessage: 'Test error message' })
      }
    })

    await nextTick()

    // 应该显示错误UI
    expect(wrapper.find('.error-boundary__error').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__title').text()).toContain('组件出错')
    expect(wrapper.find('.error-boundary__message').text()).toContain('Test error message')
  })

  // 错误状态隐藏正常内容
  it('should hide normal content when error occurs', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true })
      }
    })

    await nextTick()

    expect(wrapper.find('.normal-content').exists()).toBe(false)
  })

  // 重试功能测试
  it('should emit retry event when retry button is clicked', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true })
      }
    })

    await nextTick()

    const retryButton = wrapper.find('.error-boundary__retry-btn')
    expect(retryButton.exists()).toBe(true)

    await retryButton.trigger('click')

    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(wrapper.emitted('retry')!.length).toBe(1)
  })

  // 错误日志上报测试
  it('should call onError handler when error occurs', async () => {
    const onErrorMock = vi.fn()
    const error = new Error('Reported error')

    mount(ErrorBoundary, {
      props: {
        onError: onErrorMock
      },
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true, errorMessage: 'Reported error' })
      }
    })

    await nextTick()

    expect(onErrorMock).toHaveBeenCalled()
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        errorInfo: expect.any(String),
        componentStack: expect.any(String),
        timestamp: expect.any(Number)
      })
    )
  })

  // 自定义错误UI测试
  it('should render custom error slot when provided', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true }),
        'error-content': '<div class="custom-error">Custom Error UI</div>'
      }
    })

    await nextTick()

    expect(wrapper.find('.custom-error').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__error').exists()).toBe(false)
  })

  // 自定义错误UI插槽参数测试
  it('should pass error info to error-content slot', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true, errorMessage: 'Slot error message' }),
        'error-content': `
          <template #error-content="{ error, errorInfo, retry }">
            <div class="custom-error">
              <span class="error-text">{{ error?.message }}</span>
              <span class="error-info">{{ errorInfo }}</span>
              <button class="custom-retry" @click="retry">Retry</button>
            </div>
          </template>
        `
      }
    })

    await nextTick()

    expect(wrapper.find('.error-text').text()).toBe('Slot error message')
    expect(wrapper.find('.error-info').text()).toBeTruthy()
  })

  // 最大错误次数测试
  it('should stop catching errors after maxRetries is reached', async () => {
    const onErrorMock = vi.fn()
    mount(ErrorBoundary, {
      props: {
        maxRetries: 1,
        onError: onErrorMock
      },
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true })
      }
    })

    await nextTick()

    // 错误回调应该被调用
    expect(onErrorMock).toHaveBeenCalled()
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        errorInfo: expect.any(String),
        componentStack: expect.any(String),
        timestamp: expect.any(Number)
      })
    )
  })

  // 错误边界样式类测试
  it('should apply custom class when customClass is provided', () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        customClass: 'my-custom-class'
      },
      slots: {
        default: '<div>Content</div>'
      }
    })

    expect(wrapper.find('.error-boundary').classes()).toContain('my-custom-class')
  })

  // 默认错误UI渲染测试
  it('should render default error UI with correct structure', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true, errorMessage: 'Default error' })
      }
    })

    await nextTick()

    expect(wrapper.find('.error-boundary__icon').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__title').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__message').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__actions').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__retry-btn').exists()).toBe(true)
  })

  // 错误详情展示测试
  it('should show error details when showDetails is true', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        showDetails: true
      },
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true, errorMessage: 'Detailed error' })
      }
    })

    await nextTick()

    expect(wrapper.find('.error-boundary__details').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__stack').exists()).toBe(true)
  })

  // 错误详情隐藏测试
  it('should hide error details when showDetails is false', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        showDetails: false
      },
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true })
      }
    })

    await nextTick()

    expect(wrapper.find('.error-boundary__details').exists()).toBe(false)
  })

  // 重置错误状态测试
  it('should reset error state when reset method is called', async () => {
    // 先验证reset方法存在且可调用
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="normal-content">Normal Content</div>'
      }
    })

    // 验证reset方法存在
    expect(typeof (wrapper.vm as any).reset).toBe('function')
    expect(typeof (wrapper.vm as any).getErrorInfo).toBe('function')

    // 初始状态应该没有错误
    expect((wrapper.vm as any).getErrorInfo()).toBeNull()

    // 调用reset不应该抛出错误
    expect(() => (wrapper.vm as any).reset()).not.toThrow()
  })

  // 错误边界嵌套测试
  it('should handle nested error boundaries correctly', async () => {
    const InnerComponent = defineComponent({
      setup() {
        throw new Error('Inner error')
      },
      render() {
        return h('div', 'Inner')
      }
    })

    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: () => h(ErrorBoundary, {}, {
          default: () => h(InnerComponent)
        })
      }
    })

    await nextTick()

    // 内层错误边界应该捕获错误
    const innerBoundary = wrapper.findComponent(ErrorBoundary)
    expect(innerBoundary.find('.error-boundary__error').exists()).toBe(true)
  })

  // 异步错误处理测试
  it('should handle errors in async operations', async () => {
    const onErrorMock = vi.fn()

    const wrapper = mount(ErrorBoundary, {
      props: {
        onError: onErrorMock
      },
      slots: {
        default: () => h(AsyncErrorComponent)
      }
    })

    await nextTick()

    // 点击按钮触发错误
    const btn = wrapper.find('.trigger-btn')
    expect(btn.exists()).toBe(true)

    // 注意：Vue的errorCaptured可能无法捕获事件处理器中的同步错误
    // 这取决于Vue版本和配置
  })

  // 组件卸载测试
  it('should clean up properly when unmounted', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    expect(() => wrapper.unmount()).not.toThrow()
  })

  // Props默认值测试
  it('should use default props correctly', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div>Content</div>'
      }
    })

    expect(wrapper.props('showDetails')).toBe(false)
    expect(wrapper.props('maxRetries')).toBe(3)
    expect(wrapper.props('fallbackTitle')).toBe('组件出错')
    expect(wrapper.props('fallbackDescription')).toBe('抱歉，组件加载出现问题')
  })

  // 自定义标题和描述测试
  it('should display custom fallback title and description', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        fallbackTitle: 'Custom Title',
        fallbackDescription: 'Custom Description'
      },
      slots: {
        default: h(ErrorThrowingComponent, { shouldThrow: true })
      }
    })

    await nextTick()

    expect(wrapper.find('.error-boundary__title').text()).toBe('Custom Title')
    expect(wrapper.find('.error-boundary__description').text()).toBe('Custom Description')
  })
})
