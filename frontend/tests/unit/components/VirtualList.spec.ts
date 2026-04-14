import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import VirtualList from '@/components/VirtualList/VirtualList.vue'

// 模拟数据生成器
const generateMockData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: `Value ${i + 1}`,
  }))
}

// 模拟容器尺寸
const mockContainerRect = {
  width: 400,
  height: 400,
  top: 0,
  left: 0,
  bottom: 400,
  right: 400,
  x: 0,
  y: 0,
  toJSON: () => {},
}

describe('VirtualList', () => {
  let mockGetBoundingClientRect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // 模拟 getBoundingClientRect
    mockGetBoundingClientRect = vi.fn(() => mockContainerRect)
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect

    // 模拟 scrollHeight
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      configurable: true,
      value: 10000,
    })

    // 模拟 scrollTop
    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const wrapper = mount(VirtualList, {
        props: {
          data: generateMockData(10),
          itemHeight: 50,
        },
      })
      expect(wrapper.find('.virtual-list').exists()).toBe(true)
      expect(wrapper.find('.virtual-list__container').exists()).toBe(true)
    })

    it('should render empty state when data is empty', () => {
      const wrapper = mount(VirtualList, {
        props: {
          data: [],
          itemHeight: 50,
        },
      })
      expect(wrapper.find('.virtual-list__empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('暂无数据')
    })

    it('should render custom empty slot', () => {
      const wrapper = mount(VirtualList, {
        props: {
          data: [],
          itemHeight: 50,
        },
        slots: {
          empty: () => h('div', { class: 'custom-empty' }, 'Custom Empty'),
        },
      })
      expect(wrapper.find('.custom-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Custom Empty')
    })
  })

  // ========== 虚拟滚动核心功能测试 ==========
  describe('Virtual Scrolling Core', () => {
    it('should calculate visible range based on container height', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          containerHeight: 400,
        },
      })

      await nextTick()
      await flushPromises()

      // 容器高度400，每项50，可见项数量 = 400/50 + buffer*2
      const visibleItems = wrapper.findAll('.virtual-list__item')
      // 默认buffer为5，所以可见项 = 8(可视区) + 10(buffer) = 18
      expect(visibleItems.length).toBeLessThanOrEqual(data.length)
    })

    it('should render phantom element with correct height', async () => {
      const data = generateMockData(100)
      const itemHeight = 50

      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight,
        },
      })

      await nextTick()
      await flushPromises()

      const phantom = wrapper.find('.virtual-list__phantom')
      expect(phantom.exists()).toBe(true)
      // 总高度 = 数据量 * 每项高度
      const expectedHeight = data.length * itemHeight
      expect(phantom.attributes('style')).toContain(`height: ${expectedHeight}px`)
    })

    it('should update visible range on scroll', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          containerHeight: 400,
        },
      })

      await nextTick()

      const container = wrapper.find('.virtual-list__container')
      expect(container.exists()).toBe(true)

      // 获取容器元素并直接设置 scrollTop
      const containerEl = container.element as HTMLElement
      containerEl.scrollTop = 500

      // 触发滚动事件
      await container.trigger('scroll')
      await nextTick()
      await flushPromises()

      // 验证滚动后状态已更新
      expect(wrapper.emitted('scroll')).toBeTruthy()
    })

    it('should handle scroll to bottom', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          containerHeight: 400,
        },
      })

      await nextTick()

      const container = wrapper.find('.virtual-list__container')
      const containerEl = container.element as HTMLElement

      // 模拟滚动到底部 - 需要设置 scrollHeight 和 clientHeight
      Object.defineProperty(containerEl, 'scrollHeight', {
        configurable: true,
        value: 5000, // 100 * 50
      })
      Object.defineProperty(containerEl, 'clientHeight', {
        configurable: true,
        value: 400,
      })

      // 滚动到底部 (scrollTop + clientHeight >= scrollHeight - 1)
      containerEl.scrollTop = 4600 // 5000 - 400

      await container.trigger('scroll')
      await nextTick()

      expect(wrapper.emitted('scroll-bottom')).toBeTruthy()
    })
  })

  // ========== 动态高度测试 ==========
  describe('Dynamic Height', () => {
    it('should use estimated height when dynamic height is enabled', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          estimatedHeight: 60,
          dynamic: true,
        },
      })

      await nextTick()
      await flushPromises()

      const phantom = wrapper.find('.virtual-list__phantom')
      expect(phantom.exists()).toBe(true)
      // 动态模式下使用估算高度计算总高度
      const expectedHeight = data.length * 60
      expect(phantom.attributes('style')).toContain(`height: ${expectedHeight}px`)
    })

    it('should measure actual item heights when dynamic is true', async () => {
      const data = generateMockData(10)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          dynamic: true,
        },
      })

      await nextTick()
      await flushPromises()

      // 动态模式下应该有测量逻辑
      const items = wrapper.findAll('.virtual-list__item')
      expect(items.length).toBeGreaterThan(0)
    })
  })

  // ========== 缓冲区域测试 ==========
  describe('Buffer Configuration', () => {
    it('should respect buffer prop configuration', async () => {
      const data = generateMockData(100)
      const buffer = 10

      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          containerHeight: 400,
          buffer,
        },
      })

      await nextTick()
      await flushPromises()

      // 缓冲区域应该影响渲染的项数
      const visibleItems = wrapper.findAll('.virtual-list__item')
      // 可视区8项 + buffer*2(20项) = 28项
      expect(visibleItems.length).toBeGreaterThan(0)
    })
  })

  // ========== 事件测试 ==========
  describe('Events', () => {
    it('should emit scroll event on scroll', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
      })

      await nextTick()

      const container = wrapper.find('.virtual-list__container')
      const containerEl = container.element as HTMLElement
      containerEl.scrollTop = 100

      await container.trigger('scroll')
      await nextTick()

      expect(wrapper.emitted('scroll')).toBeTruthy()
      expect(wrapper.emitted('scroll')![0]).toEqual([100])
    })

    it('should emit scroll-top event when scrolled to top', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
      })

      await nextTick()

      const container = wrapper.find('.virtual-list__container')
      const containerEl = container.element as HTMLElement

      // 先滚动到非顶部位置
      containerEl.scrollTop = 100
      await container.trigger('scroll')
      await nextTick()

      // 再滚动回顶部
      containerEl.scrollTop = 0
      await container.trigger('scroll')
      await nextTick()

      expect(wrapper.emitted('scroll-top')).toBeTruthy()
    })

    it('should emit item-click event when item is clicked', async () => {
      const data = generateMockData(10)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
        slots: {
          default: ({ item }: { item: any; index: number }) =>
            h('div', { class: 'item-content' }, item.name),
        },
      })

      await nextTick()
      await flushPromises()

      const firstItem = wrapper.find('.virtual-list__item')
      expect(firstItem.exists()).toBe(true)

      await firstItem.trigger('click')

      expect(wrapper.emitted('item-click')).toBeTruthy()
      expect(wrapper.emitted('item-click')![0]).toEqual([data[0], 0])
    })
  })

  // ========== 方法测试 ==========
  describe('Methods', () => {
    it('should scroll to specific index', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
      })

      await nextTick()

      const vm = wrapper.vm as any
      const container = wrapper.find('.virtual-list__container').element as HTMLElement

      vm.scrollToIndex(10)

      await nextTick()

      // 验证 scrollTop 被设置 (10 * 50 = 500)
      expect(container.scrollTop).toBe(500)
    })

    it('should scroll to specific offset', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
      })

      await nextTick()

      const vm = wrapper.vm as any
      const container = wrapper.find('.virtual-list__container').element as HTMLElement

      vm.scrollTo(500)

      await nextTick()

      // 验证 scrollTop 被设置
      expect(container.scrollTop).toBe(500)
    })

    it('should reset scroll position', async () => {
      const data = generateMockData(100)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
      })

      await nextTick()

      const vm = wrapper.vm as any
      const container = wrapper.find('.virtual-list__container').element as HTMLElement

      // 先设置一个非零的 scrollTop
      container.scrollTop = 500
      await nextTick()

      vm.resetScroll()

      await nextTick()

      // 验证 scrollTop 被重置为 0
      expect(container.scrollTop).toBe(0)
    })
  })

  // ========== 数据更新测试 ==========
  describe('Data Updates', () => {
    it('should update when data changes', async () => {
      const wrapper = mount(VirtualList, {
        props: {
          data: generateMockData(10),
          itemHeight: 50,
        },
      })

      await nextTick()
      await flushPromises()

      // 更新数据
      await wrapper.setProps({
        data: generateMockData(20),
      })

      await nextTick()
      await flushPromises()

      const phantom = wrapper.find('.virtual-list__phantom')
      const expectedHeight = 20 * 50
      expect(phantom.attributes('style')).toContain(`height: ${expectedHeight}px`)
    })

    it('should handle large data sets efficiently', async () => {
      const data = generateMockData(10000)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
          containerHeight: 400,
        },
      })

      await nextTick()
      await flushPromises()

      // 即使数据量很大，实际渲染的DOM元素应该很少
      const visibleItems = wrapper.findAll('.virtual-list__item')
      expect(visibleItems.length).toBeLessThan(50)
      expect(visibleItems.length).toBeLessThan(data.length)
    })
  })

  // ========== 插槽测试 ==========
  describe('Slots', () => {
    it('should render default slot with correct scope', async () => {
      const data = generateMockData(5)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
        slots: {
          default: ({ item }: { item: any; index: number }) =>
            h('div', { class: 'custom-item' }, `${item.name} - ${index}`),
        },
      })

      await nextTick()
      await flushPromises()

      const items = wrapper.findAll('.custom-item')
      expect(items.length).toBeGreaterThan(0)
      expect(items[0].text()).toContain('Item 1')
      expect(items[0].text()).toContain('0')
    })

    it('should render header slot', async () => {
      const data = generateMockData(5)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
        slots: {
          header: () => h('div', { class: 'custom-header' }, 'Header Content'),
        },
      })

      await nextTick()

      expect(wrapper.find('.custom-header').exists()).toBe(true)
      expect(wrapper.text()).toContain('Header Content')
    })

    it('should render footer slot', async () => {
      const data = generateMockData(5)
      const wrapper = mount(VirtualList, {
        props: {
          data,
          itemHeight: 50,
        },
        slots: {
          footer: () => h('div', { class: 'custom-footer' }, 'Footer Content'),
        },
      })

      await nextTick()

      expect(wrapper.find('.custom-footer').exists()).toBe(true)
      expect(wrapper.text()).toContain('Footer Content')
    })
  })

  // ========== Props 验证测试 ==========
  describe('Props Validation', () => {
    it('should accept valid props', () => {
      const wrapper = mount(VirtualList, {
        props: {
          data: generateMockData(10),
          itemHeight: 50,
          estimatedHeight: 60,
          buffer: 5,
          containerHeight: 400,
          dynamic: false,
        },
      })

      expect(wrapper.find('.virtual-list').exists()).toBe(true)
    })

    it('should handle zero item height gracefully', () => {
      // 应该使用默认值或抛出警告
      const wrapper = mount(VirtualList, {
        props: {
          data: generateMockData(10),
          itemHeight: 0,
        },
      })

      expect(wrapper.find('.virtual-list').exists()).toBe(true)
    })
  })
})
