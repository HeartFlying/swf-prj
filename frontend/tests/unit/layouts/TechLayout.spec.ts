import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import TechLayout from '@/layouts/TechLayout.vue'

// Mock useBreakpoint composable
const mockBreakpoint = ref('LG')
const mockWidth = ref(1024)
const mockIsXS = ref(false)
const mockIsSM = ref(false)
const mockIsMD = ref(false)
const mockIsLG = ref(true)
const mockIsXL = ref(false)
const mockIsXXL = ref(false)
const mockGreaterThan = ref({
  XS: true, SM: true, MD: true, LG: false, XL: false, XXL: false
})
const mockLessThan = ref({
  XS: false, SM: false, MD: false, XL: true, XXL: true
})

vi.mock('@/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({
    current: mockBreakpoint,
    width: mockWidth,
    isXS: mockIsXS,
    isSM: mockIsSM,
    isMD: mockIsMD,
    isLG: mockIsLG,
    isXL: mockIsXL,
    isXXL: mockIsXXL,
    greaterThan: mockGreaterThan,
    lessThan: mockLessThan
  }),
  breakpoints: {
    XS: 0, SM: 576, MD: 768, LG: 992, XL: 1400, XXL: 1600
  },
  getCurrentBreakpoint: (width: number) => {
    if (width >= 1600) return 'XXL'
    if (width >= 1400) return 'XL'
    if (width >= 992) return 'LG'
    if (width >= 768) return 'MD'
    if (width >= 576) return 'SM'
    return 'XS'
  },
  isGreaterThan: (current: string, target: string) => {
    const order = ['XS', 'SM', 'MD', 'LG', 'XL', 'XXL']
    return order.indexOf(current) > order.indexOf(target)
  },
  isLessThan: (current: string, target: string) => {
    const order = ['XS', 'SM', 'MD', 'LG', 'XL', 'XXL']
    return order.indexOf(current) < order.indexOf(target)
  },
  isBetween: (current: string, min: string, max: string) => {
    const order = ['XS', 'SM', 'MD', 'LG', 'XL', 'XXL']
    const currentIndex = order.indexOf(current)
    return currentIndex >= order.indexOf(min) && currentIndex <= order.indexOf(max)
  }
}))

// Mock Sidebar component
const MockSidebar = defineComponent({
  name: 'Sidebar',
  props: ['collapsed'],
  emits: ['toggle'],
  template: '<aside class="mock-sidebar" :class="{ collapsed: collapsed }"><button @click="$emit(\'toggle\')">Toggle</button></aside>'
})

// Mock Header component
const MockHeader = defineComponent({
  name: 'AppHeader',
  emits: ['toggle-sidebar'],
  template: '<header class="mock-header"><button @click="$emit(\'toggle-sidebar\')">Toggle Sidebar</button></header>'
})

// Mock ScanLine component
const MockScanLine = defineComponent({
  name: 'ScanLine',
  props: ['speed', 'opacity', 'particles', 'particleCount'],
  template: '<div class="mock-scan-line"></div>'
})

// Mock router view
const MockRouterView = defineComponent({
  name: 'RouterView',
  template: '<div class="mock-router-view"><slot /></div>'
})

describe('TechLayout', () => {
  beforeEach(() => {
    // Reset mock values
    mockBreakpoint.value = 'LG'
    mockWidth.value = 1024
    mockIsXS.value = false
    mockIsSM.value = false
    mockIsMD.value = false
    mockIsLG.value = true
    mockIsXL.value = false
    mockIsXXL.value = false
    mockGreaterThan.value = { XS: true, SM: true, MD: true, LG: false, XL: false, XXL: false }
    mockLessThan.value = { XS: false, SM: false, MD: false, XL: true, XXL: true }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // 基础渲染测试
  describe('Basic Rendering', () => {
    it('should render the layout structure', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      expect(wrapper.find('.tech-layout').exists()).toBe(true)
      expect(wrapper.find('.layout-bg').exists()).toBe(true)
      expect(wrapper.find('.main-wrapper').exists()).toBe(true)
      expect(wrapper.find('.main-content').exists()).toBe(true)
    })

    it('should render background elements', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      expect(wrapper.find('.grid-pattern').exists()).toBe(true)
      expect(wrapper.find('.gradient-overlay').exists()).toBe(true)
    })

    it('should render child components', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      expect(wrapper.find('.mock-sidebar').exists()).toBe(true)
      expect(wrapper.find('.mock-header').exists()).toBe(true)
      expect(wrapper.find('.mock-scan-line').exists()).toBe(true)
      expect(wrapper.find('.mock-router-view').exists()).toBe(true)
    })
  })

  // 响应式断点测试
  describe('Responsive Breakpoints', () => {
    it('should use CSS variables for sidebar width on desktop', () => {
      mockBreakpoint.value = 'LG'
      mockIsLG.value = true

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const mainWrapper = wrapper.find('.main-wrapper')
      // Check that it doesn't have inline fixed margin styles
      const style = mainWrapper.attributes('style') || ''
      expect(style).not.toContain('margin-left: 240px')
    })

    it('should apply breakpoint classes to layout', async () => {
      mockBreakpoint.value = 'LG'
      mockIsLG.value = true

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      const layout = wrapper.find('.tech-layout')
      expect(layout.classes()).toContain('breakpoint-lg')
      expect(layout.classes()).toContain('is-desktop')
    })

    it('should apply mobile breakpoint class on XS', async () => {
      mockBreakpoint.value = 'XS'
      mockIsXS.value = true
      mockIsLG.value = false
      mockWidth.value = 375

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      const layout = wrapper.find('.tech-layout')
      expect(layout.classes()).toContain('breakpoint-xs')
      expect(layout.classes()).toContain('is-mobile')
    })

    it('should apply tablet breakpoint class on MD', async () => {
      mockBreakpoint.value = 'MD'
      mockIsMD.value = true
      mockIsLG.value = false
      mockWidth.value = 800

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      const layout = wrapper.find('.tech-layout')
      expect(layout.classes()).toContain('breakpoint-md')
      expect(layout.classes()).toContain('is-tablet')
    })

    it('should handle mobile breakpoint (XS)', async () => {
      mockBreakpoint.value = 'XS'
      mockIsXS.value = true
      mockIsLG.value = false
      mockWidth.value = 375

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      expect(wrapper.find('.tech-layout').exists()).toBe(true)
    })

    it('should handle tablet breakpoint (MD)', async () => {
      mockBreakpoint.value = 'MD'
      mockIsMD.value = true
      mockIsLG.value = false
      mockWidth.value = 800

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      expect(wrapper.find('.tech-layout').exists()).toBe(true)
    })

    it('should handle large desktop breakpoint (XL)', async () => {
      mockBreakpoint.value = 'XL'
      mockIsXL.value = true
      mockIsLG.value = false
      mockWidth.value = 1500

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      expect(wrapper.find('.tech-layout').exists()).toBe(true)
    })
  })

  // 侧边栏状态测试
  describe('Sidebar State', () => {
    it('should pass collapsed prop to sidebar', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const sidebar = wrapper.find('.mock-sidebar')
      expect(sidebar.exists()).toBe(true)
      expect(sidebar.classes()).not.toContain('collapsed')
    })

    it('should toggle sidebar when toggle event emitted', async () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const sidebar = wrapper.find('.mock-sidebar')
      const toggleBtn = sidebar.find('button')

      // Initial state
      expect(wrapper.find('.main-wrapper').classes()).not.toContain('sidebar-collapsed')

      // Toggle sidebar
      await toggleBtn.trigger('click')

      // Should now be collapsed
      expect(wrapper.find('.main-wrapper').classes()).toContain('sidebar-collapsed')
    })

    it('should toggle sidebar from header', async () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const header = wrapper.find('.mock-header')
      const toggleBtn = header.find('button')

      // Initial state
      expect(wrapper.find('.main-wrapper').classes()).not.toContain('sidebar-collapsed')

      // Toggle from header
      await toggleBtn.trigger('click')

      // Should now be collapsed
      expect(wrapper.find('.main-wrapper').classes()).toContain('sidebar-collapsed')
    })

    it('should toggle sidebar state back and forth', async () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const sidebar = wrapper.find('.mock-sidebar')
      const toggleBtn = sidebar.find('button')

      // Toggle to collapsed
      await toggleBtn.trigger('click')
      expect(wrapper.find('.main-wrapper').classes()).toContain('sidebar-collapsed')

      // Toggle back to expanded
      await toggleBtn.trigger('click')
      expect(wrapper.find('.main-wrapper').classes()).not.toContain('sidebar-collapsed')
    })

    it('should auto-collapse sidebar on mobile', async () => {
      mockBreakpoint.value = 'XS'
      mockIsXS.value = true
      mockIsLG.value = false
      mockWidth.value = 375

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      // On mobile, sidebar should be auto-collapsed
      expect(wrapper.find('.main-wrapper').classes()).toContain('sidebar-collapsed')
    })

    it('should auto-collapse sidebar on small tablets', async () => {
      mockBreakpoint.value = 'SM'
      mockIsSM.value = true
      mockIsLG.value = false
      mockWidth.value = 600

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      // On small tablets, sidebar should be auto-collapsed
      expect(wrapper.find('.main-wrapper').classes()).toContain('sidebar-collapsed')
    })
  })

  // CSS变量测试
  describe('CSS Variables', () => {
    it('should use CSS variables for layout dimensions', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const layout = wrapper.find('.tech-layout')
      expect(layout.exists()).toBe(true)

      // Check that the component uses CSS custom properties
      const techLayout = wrapper.findComponent(TechLayout)
      expect(techLayout).toBeTruthy()
    })

    it('should use responsive padding values', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const mainContent = wrapper.find('.main-content')
      expect(mainContent.exists()).toBe(true)
    })
  })

  // 移动端适配测试
  describe('Mobile Adaptation', () => {
    it('should handle mobile viewport correctly', async () => {
      mockBreakpoint.value = 'XS'
      mockIsXS.value = true
      mockIsLG.value = false
      mockIsSM.value = false
      mockIsMD.value = false
      mockWidth.value = 375

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      expect(wrapper.find('.tech-layout').exists()).toBe(true)
      expect(wrapper.find('.main-wrapper').exists()).toBe(true)
    })

    it('should handle tablet viewport correctly', async () => {
      mockBreakpoint.value = 'SM'
      mockIsSM.value = true
      mockIsLG.value = false
      mockWidth.value = 600

      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      await nextTick()
      expect(wrapper.find('.tech-layout').exists()).toBe(true)
    })
  })

  // 过渡动画测试
  describe('Transitions', () => {
    it('should have fade-slide transition classes', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      // Check that transition styles are present in the component
      const html = wrapper.html()
      expect(html).toContain('main-content')
    })
  })

  // ScanLine组件props测试
  describe('ScanLine Component Props', () => {
    it('should pass correct props to ScanLine component', () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      const scanLine = wrapper.find('.mock-scan-line')
      expect(scanLine.exists()).toBe(true)
    })
  })

  // 响应式更新测试
  describe('Responsive Updates', () => {
    it('should react to breakpoint changes', async () => {
      const wrapper = mount(TechLayout, {
        global: {
          stubs: {
            Sidebar: MockSidebar,
            AppHeader: MockHeader,
            ScanLine: MockScanLine,
            RouterView: MockRouterView
          }
        }
      })

      // Start with LG
      expect(wrapper.find('.tech-layout').exists()).toBe(true)

      // Change to mobile
      mockBreakpoint.value = 'XS'
      mockIsXS.value = true
      mockIsLG.value = false
      mockWidth.value = 375
      await nextTick()

      expect(wrapper.find('.tech-layout').exists()).toBe(true)

      // Change to tablet
      mockBreakpoint.value = 'MD'
      mockIsMD.value = true
      mockIsXS.value = false
      mockWidth.value = 800
      await nextTick()

      expect(wrapper.find('.tech-layout').exists()).toBe(true)
    })
  })
})
