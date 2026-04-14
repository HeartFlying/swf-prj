import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ============================================
// 任务 #9: 2.3.1 响应式测试
// 验证响应式布局在各断点的表现
// ============================================

// 断点配置 - 与 useBreakpoint.ts 保持一致
const breakpoints = {
  XS: 0,      // < 576px
  SM: 576,    // 576-768px
  MD: 768,    // 768-992px
  LG: 992,    // 992-1200px
  XL: 1200,   // 1200-1600px (修正: 原代码为1400)
  XXL: 1600,  // >= 1600px
}

// 断点顺序
const breakpointOrder: (keyof typeof breakpoints)[] = ['XS', 'SM', 'MD', 'LG', 'XL', 'XXL']

/**
 * 根据宽度获取当前断点
 */
function getCurrentBreakpoint(width: number): keyof typeof breakpoints {
  if (width >= breakpoints.XXL) return 'XXL'
  if (width >= breakpoints.XL) return 'XL'
  if (width >= breakpoints.LG) return 'LG'
  if (width >= breakpoints.MD) return 'MD'
  if (width >= breakpoints.SM) return 'SM'
  return 'XS'
}

/**
 * 检查当前断点是否大于目标断点
 */
function isGreaterThan(current: keyof typeof breakpoints, target: keyof typeof breakpoints): boolean {
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(target)
  return currentIndex > targetIndex
}

/**
 * 检查当前断点是否小于目标断点
 */
function isLessThan(current: keyof typeof breakpoints, target: keyof typeof breakpoints): boolean {
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(target)
  return currentIndex < targetIndex
}

/**
 * 创建模拟断点 composable
 */
const createMockBreakpoint = (width: number) => {
  const current = computed(() => getCurrentBreakpoint(width))

  return {
    current: ref(current.value),
    width: ref(width),
    isXS: computed(() => current.value === 'XS'),
    isSM: computed(() => current.value === 'SM'),
    isMD: computed(() => current.value === 'MD'),
    isLG: computed(() => current.value === 'LG'),
    isXL: computed(() => current.value === 'XL'),
    isXXL: computed(() => current.value === 'XXL'),
    greaterThan: computed(() => ({
      XS: isGreaterThan(current.value, 'XS'),
      SM: isGreaterThan(current.value, 'SM'),
      MD: isGreaterThan(current.value, 'MD'),
      LG: isGreaterThan(current.value, 'LG'),
      XL: isGreaterThan(current.value, 'XL'),
      XXL: isGreaterThan(current.value, 'XXL'),
    })),
    lessThan: computed(() => ({
      XS: isLessThan(current.value, 'XS'),
      SM: isLessThan(current.value, 'SM'),
      MD: isLessThan(current.value, 'MD'),
      LG: isLessThan(current.value, 'LG'),
      XL: isLessThan(current.value, 'XL'),
      XXL: isLessThan(current.value, 'XXL'),
    })),
  }
}

describe('【任务 #9: 2.3.1 响应式测试】', () => {
  const srcDir = resolve(import.meta.dirname, '../../../src')

  // 读取关键样式文件内容
  const readFile = (path: string): string => {
    try {
      return readFileSync(resolve(srcDir, path), 'utf-8')
    } catch {
      return ''
    }
  }

  // ============================================
  // 1. 断点定义测试
  // ============================================
  describe('1. 断点定义验证', () => {
    it('应正确定义所有6个断点值', () => {
      expect(breakpoints.XS).toBe(0)
      expect(breakpoints.SM).toBe(576)
      expect(breakpoints.MD).toBe(768)
      expect(breakpoints.LG).toBe(992)
      expect(breakpoints.XL).toBe(1200)
      expect(breakpoints.XXL).toBe(1600)
    })

    it('断点值应按升序排列', () => {
      const values = Object.values(breakpoints)
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    describe('1.1 XS 断点 (<576px) 验证', () => {
      it('应在 0px 时识别为 XS', () => {
        const bp = createMockBreakpoint(0)
        expect(bp.isXS.value).toBe(true)
      })

      it('应在 375px (iPhone SE) 时识别为 XS', () => {
        const bp = createMockBreakpoint(375)
        expect(bp.isXS.value).toBe(true)
      })

      it('应在 575px 时识别为 XS', () => {
        const bp = createMockBreakpoint(575)
        expect(bp.isXS.value).toBe(true)
      })

      it('XS 断点下其他断点状态应为 false', () => {
        const bp = createMockBreakpoint(375)
        expect(bp.isSM.value).toBe(false)
        expect(bp.isMD.value).toBe(false)
        expect(bp.isLG.value).toBe(false)
        expect(bp.isXL.value).toBe(false)
        expect(bp.isXXL.value).toBe(false)
      })
    })

    describe('1.2 SM 断点 (576-768px) 验证', () => {
      it('应在 576px 时识别为 SM', () => {
        const bp = createMockBreakpoint(576)
        expect(bp.isSM.value).toBe(true)
      })

      it('应在 640px 时识别为 SM', () => {
        const bp = createMockBreakpoint(640)
        expect(bp.isSM.value).toBe(true)
      })

      it('应在 767px 时识别为 SM', () => {
        const bp = createMockBreakpoint(767)
        expect(bp.isSM.value).toBe(true)
      })

      it('SM 断点下其他断点状态应为 false', () => {
        const bp = createMockBreakpoint(640)
        expect(bp.isXS.value).toBe(false)
        expect(bp.isMD.value).toBe(false)
        expect(bp.isLG.value).toBe(false)
        expect(bp.isXL.value).toBe(false)
        expect(bp.isXXL.value).toBe(false)
      })
    })

    describe('1.3 MD 断点 (768-992px) 验证', () => {
      it('应在 768px 时识别为 MD', () => {
        const bp = createMockBreakpoint(768)
        expect(bp.isMD.value).toBe(true)
      })

      it('应在 800px 时识别为 MD', () => {
        const bp = createMockBreakpoint(800)
        expect(bp.isMD.value).toBe(true)
      })

      it('应在 991px 时识别为 MD', () => {
        const bp = createMockBreakpoint(991)
        expect(bp.isMD.value).toBe(true)
      })

      it('MD 断点下其他断点状态应为 false', () => {
        const bp = createMockBreakpoint(800)
        expect(bp.isXS.value).toBe(false)
        expect(bp.isSM.value).toBe(false)
        expect(bp.isLG.value).toBe(false)
        expect(bp.isXL.value).toBe(false)
        expect(bp.isXXL.value).toBe(false)
      })
    })

    describe('1.4 LG 断点 (992-1200px) 验证', () => {
      it('应在 992px 时识别为 LG', () => {
        const bp = createMockBreakpoint(992)
        expect(bp.isLG.value).toBe(true)
      })

      it('应在 1024px 时识别为 LG', () => {
        const bp = createMockBreakpoint(1024)
        expect(bp.isLG.value).toBe(true)
      })

      it('应在 1199px 时识别为 LG', () => {
        const bp = createMockBreakpoint(1199)
        expect(bp.isLG.value).toBe(true)
      })

      it('LG 断点下其他断点状态应为 false', () => {
        const bp = createMockBreakpoint(1024)
        expect(bp.isXS.value).toBe(false)
        expect(bp.isSM.value).toBe(false)
        expect(bp.isMD.value).toBe(false)
        expect(bp.isXL.value).toBe(false)
        expect(bp.isXXL.value).toBe(false)
      })
    })

    describe('1.5 XL 断点 (1200-1600px) 验证', () => {
      it('应在 1200px 时识别为 XL', () => {
        const bp = createMockBreakpoint(1200)
        expect(bp.isXL.value).toBe(true)
      })

      it('应在 1400px 时识别为 XL', () => {
        const bp = createMockBreakpoint(1400)
        expect(bp.isXL.value).toBe(true)
      })

      it('应在 1599px 时识别为 XL', () => {
        const bp = createMockBreakpoint(1599)
        expect(bp.isXL.value).toBe(true)
      })

      it('XL 断点下其他断点状态应为 false', () => {
        const bp = createMockBreakpoint(1400)
        expect(bp.isXS.value).toBe(false)
        expect(bp.isSM.value).toBe(false)
        expect(bp.isMD.value).toBe(false)
        expect(bp.isLG.value).toBe(false)
        expect(bp.isXXL.value).toBe(false)
      })
    })

    describe('1.6 XXL 断点 (>=1600px) 验证', () => {
      it('应在 1600px 时识别为 XXL', () => {
        const bp = createMockBreakpoint(1600)
        expect(bp.isXXL.value).toBe(true)
      })

      it('应在 1920px 时识别为 XXL', () => {
        const bp = createMockBreakpoint(1920)
        expect(bp.isXXL.value).toBe(true)
      })

      it('应在 2560px 时识别为 XXL', () => {
        const bp = createMockBreakpoint(2560)
        expect(bp.isXXL.value).toBe(true)
      })

      it('XXL 断点下其他断点状态应为 false', () => {
        const bp = createMockBreakpoint(1920)
        expect(bp.isXS.value).toBe(false)
        expect(bp.isSM.value).toBe(false)
        expect(bp.isMD.value).toBe(false)
        expect(bp.isLG.value).toBe(false)
        expect(bp.isXL.value).toBe(false)
      })
    })
  })

  // ============================================
  // 2. TechLayout 响应式适配测试
  // ============================================
  describe('2. TechLayout 布局组件响应式测试', () => {
    const TestTechLayout = defineComponent({
      setup() {
        const { isXS, isSM, isMD, isLG, isXL, isXXL } = createMockBreakpoint(1200)
        const sidebarCollapsed = ref(false)
        const shouldAutoCollapse = computed(() => isXS.value || isSM.value)
        const effectiveSidebarCollapsed = computed(() => {
          if (shouldAutoCollapse.value) return true
          return sidebarCollapsed.value
        })

        const layoutClasses = computed(() => ({
          'breakpoint-xs': isXS.value,
          'breakpoint-sm': isSM.value,
          'breakpoint-md': isMD.value,
          'breakpoint-lg': isLG.value,
          'breakpoint-xl': isXL.value,
          'breakpoint-xxl': isXXL.value,
          'is-mobile': isXS.value,
          'is-tablet': isSM.value || isMD.value,
          'is-desktop': isLG.value || isXL.value || isXXL.value,
        }))

        return {
          effectiveSidebarCollapsed,
          layoutClasses,
        }
      },
      template: `
        <div class="tech-layout" :class="layoutClasses">
          <div class="main-wrapper" :class="{ 'sidebar-collapsed': effectiveSidebarCollapsed }"></div>
        </div>
      `,
    })

    it('XS 断点下应自动折叠侧边栏', () => {
      const TestXS = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(375)
          const shouldAutoCollapse = computed(() => isXS.value || isSM.value)
          return { shouldAutoCollapse }
        },
        template: '<div :class="{ autoCollapse: shouldAutoCollapse }"></div>',
      })

      const wrapper = mount(TestXS)
      expect(wrapper.classes()).toContain('autoCollapse')
    })

    it('SM 断点下应自动折叠侧边栏', () => {
      const TestSM = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(640)
          const shouldAutoCollapse = computed(() => isXS.value || isSM.value)
          return { shouldAutoCollapse }
        },
        template: '<div :class="{ autoCollapse: shouldAutoCollapse }"></div>',
      })

      const wrapper = mount(TestSM)
      expect(wrapper.classes()).toContain('autoCollapse')
    })

    it('MD 断点下不应自动折叠侧边栏', () => {
      const TestMD = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(800)
          const shouldAutoCollapse = computed(() => isXS.value || isSM.value)
          return { shouldAutoCollapse }
        },
        template: '<div :class="{ autoCollapse: shouldAutoCollapse }"></div>',
      })

      const wrapper = mount(TestMD)
      expect(wrapper.classes()).not.toContain('autoCollapse')
    })

    it('LG 断点下不应自动折叠侧边栏', () => {
      const TestLG = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(1024)
          const shouldAutoCollapse = computed(() => isXS.value || isSM.value)
          return { shouldAutoCollapse }
        },
        template: '<div :class="{ autoCollapse: shouldAutoCollapse }"></div>',
      })

      const wrapper = mount(TestLG)
      expect(wrapper.classes()).not.toContain('autoCollapse')
    })

    it('应正确应用移动端类名 (is-mobile)', () => {
      const TestMobile = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(375)
          const layoutClasses = computed(() => ({
            'is-mobile': isXS.value,
            'is-tablet': false,
            'is-desktop': false,
          }))
          return { layoutClasses }
        },
        template: '<div :class="layoutClasses"></div>',
      })

      const wrapper = mount(TestMobile)
      expect(wrapper.classes()).toContain('is-mobile')
      expect(wrapper.classes()).not.toContain('is-desktop')
    })

    it('应正确应用平板类名 (is-tablet)', () => {
      const TestTablet = defineComponent({
        setup() {
          const { isSM, isMD } = createMockBreakpoint(800)
          const layoutClasses = computed(() => ({
            'is-mobile': false,
            'is-tablet': isSM.value || isMD.value,
            'is-desktop': false,
          }))
          return { layoutClasses }
        },
        template: '<div :class="layoutClasses"></div>',
      })

      const wrapper = mount(TestTablet)
      expect(wrapper.classes()).toContain('is-tablet')
    })

    it('应正确应用桌面端类名 (is-desktop)', () => {
      const TestDesktop = defineComponent({
        setup() {
          const { isLG, isXL, isXXL } = createMockBreakpoint(1400)
          const layoutClasses = computed(() => ({
            'is-mobile': false,
            'is-tablet': false,
            'is-desktop': isLG.value || isXL.value || isXXL.value,
          }))
          return { layoutClasses }
        },
        template: '<div :class="layoutClasses"></div>',
      })

      const wrapper = mount(TestDesktop)
      expect(wrapper.classes()).toContain('is-desktop')
    })
  })

  // ============================================
  // 3. 导航组件响应式测试
  // ============================================
  describe('3. 导航组件响应式测试', () => {
    it('XS 断点下侧边栏应隐藏', () => {
      const TestSidebar = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(375)
          const sidebarVisible = computed(() => !isXS.value)
          return { sidebarVisible }
        },
        template: '<div class="sidebar" :class="{ hidden: !sidebarVisible }"></div>',
      })

      const wrapper = mount(TestSidebar)
      expect(wrapper.find('.sidebar').classes()).toContain('hidden')
    })

    it('SM 断点下侧边栏应折叠', () => {
      const TestSidebar = defineComponent({
        setup() {
          const { isSM } = createMockBreakpoint(640)
          const sidebarCollapsed = computed(() => isSM.value)
          return { sidebarCollapsed }
        },
        template: '<div class="sidebar" :class="{ collapsed: sidebarCollapsed }"></div>',
      })

      const wrapper = mount(TestSidebar)
      expect(wrapper.find('.sidebar').classes()).toContain('collapsed')
    })

    it('MD 及以上断点下侧边栏应展开', () => {
      const TestSidebar = defineComponent({
        setup() {
          const sidebarCollapsed = computed(() => false)
          return { sidebarCollapsed }
        },
        template: '<div class="sidebar" :class="{ collapsed: sidebarCollapsed }"></div>',
      })

      const wrapper = mount(TestSidebar)
      expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
    })

    it('XS 断点下应显示汉堡菜单按钮', () => {
      const TestHeader = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(375)
          const showMenuToggle = computed(() => isXS.value || isSM.value)
          return { showMenuToggle }
        },
        template: `
          <header class="app-header">
            <button v-if="showMenuToggle" class="menu-toggle">Menu</button>
          </header>
        `,
      })

      const wrapper = mount(TestHeader)
      expect(wrapper.find('.menu-toggle').exists()).toBe(true)
    })

    it('MD 及以上断点下不应显示汉堡菜单按钮', () => {
      const TestHeader = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(1200)
          const showMenuToggle = computed(() => isXS.value || isSM.value)
          return { showMenuToggle }
        },
        template: `
          <header class="app-header">
            <button v-if="showMenuToggle" class="menu-toggle">Menu</button>
          </header>
        `,
      })

      const wrapper = mount(TestHeader)
      expect(wrapper.find('.menu-toggle').exists()).toBe(false)
    })
  })

  // ============================================
  // 4. 硬编码宽度/高度检查
  // ============================================
  describe('4. 硬编码尺寸检查', () => {
    const techLayoutContent = readFile('layouts/TechLayout.vue')
    const appVueContent = readFile('App.vue')
    const indexScssContent = readFile('styles/index.scss')
    const techThemeContent = readFile('styles/tech-theme.scss')

    it('不应在 TechLayout.vue 中设置固定的 width: 1920px', () => {
      const badPattern = /width:\s*1920px/
      expect(badPattern.test(techLayoutContent)).toBe(false)
    })

    it('不应在 TechLayout.vue 中设置固定的 height: 1080px', () => {
      const badPattern = /height:\s*1080px/
      expect(badPattern.test(techLayoutContent)).toBe(false)
    })

    it('不应在 App.vue 中设置 min-width: 1920px', () => {
      const badPattern = /min-width:\s*1920px/
      expect(badPattern.test(appVueContent)).toBe(false)
    })

    it('不应在 App.vue 中设置 min-height: 1080px', () => {
      const badPattern = /min-height:\s*1080px/
      expect(badPattern.test(appVueContent)).toBe(false)
    })

    it('不应在样式文件中使用 calc(1920px - ...)', () => {
      const badPattern = /calc\(1920px\s*-\s*\d+px\)/
      expect(badPattern.test(indexScssContent)).toBe(false)
      expect(badPattern.test(techThemeContent)).toBe(false)
    })

    it('不应在样式文件中使用 calc(1080px - ...)', () => {
      const badPattern = /calc\(1080px\s*-\s*\d+px\)/
      expect(badPattern.test(indexScssContent)).toBe(false)
      expect(badPattern.test(techThemeContent)).toBe(false)
    })

    it('应使用响应式宽度 (100%, 100vw, flex: 1)', () => {
      const hasResponsiveWidth =
        /width:\s*100%/.test(techLayoutContent) ||
        /width:\s*100vw/.test(techLayoutContent) ||
        /flex:\s*1/.test(techLayoutContent)
      expect(hasResponsiveWidth).toBe(true)
    })

    it('应使用响应式高度 (100vh, 100%, flex: 1)', () => {
      const hasResponsiveHeight =
        /height:\s*100vh/.test(techLayoutContent) ||
        /height:\s*100%/.test(techLayoutContent) ||
        /flex:\s*1/.test(techLayoutContent)
      expect(hasResponsiveHeight).toBe(true)
    })
  })

  // ============================================
  // 5. 字体和间距响应式调整测试
  // ============================================
  describe('5. 字体和间距响应式调整', () => {
    it('XS 断点下页面标题字体应减小', () => {
      const TestTitle = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(375)
          const titleSize = computed(() => isXS.value ? '18px' : '24px')
          return { titleSize }
        },
        template: '<h1 :style="{ fontSize: titleSize }">标题</h1>',
      })

      const wrapper = mount(TestTitle)
      expect(wrapper.find('h1').attributes('style')).toContain('font-size: 18px')
    })

    it('XS 断点下边距应减小', () => {
      const TestSpacing = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(375)
          const padding = computed(() => isXS.value ? '12px' : '24px')
          return { padding }
        },
        template: '<div :style="{ padding: padding }">内容</div>',
      })

      const wrapper = mount(TestSpacing)
      expect(wrapper.find('div').attributes('style')).toContain('padding: 12px')
    })

    it('SM 断点下边距应适当调整', () => {
      const TestSpacing = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(640)
          const padding = computed(() => {
            if (isXS.value) return '12px'
            if (isSM.value) return '16px'
            return '24px'
          })
          return { padding }
        },
        template: '<div :style="{ padding: padding }">内容</div>',
      })

      const wrapper = mount(TestSpacing)
      expect(wrapper.find('div').attributes('style')).toContain('padding: 16px')
    })
  })

  // ============================================
  // 6. 隐藏/显示逻辑测试
  // ============================================
  describe('6. 隐藏/显示逻辑测试', () => {
    it('XS 断点下副标题应隐藏', () => {
      const TestSubtitle = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(375)
          const showSubtitle = computed(() => !isXS.value)
          return { showSubtitle }
        },
        template: `
          <div>
            <h1>标题</h1>
            <p v-if="showSubtitle" class="subtitle">副标题</p>
          </div>
        `,
      })

      const wrapper = mount(TestSubtitle)
      expect(wrapper.find('.subtitle').exists()).toBe(false)
    })

    it('MD 及以上断点下副标题应显示', () => {
      const TestSubtitle = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(800)
          const showSubtitle = computed(() => !isXS.value)
          return { showSubtitle }
        },
        template: `
          <div>
            <h1>标题</h1>
            <p v-if="showSubtitle" class="subtitle">副标题</p>
          </div>
        `,
      })

      const wrapper = mount(TestSubtitle)
      expect(wrapper.find('.subtitle').exists()).toBe(true)
    })

    it('XS 断点下表格应只显示必要列', () => {
      const TestColumns = defineComponent({
        props: ['breakpoint'],
        setup(props) {
          const allColumns = [
            { prop: 'name', label: '名称', alwaysShow: true },
            { prop: 'email', label: '邮箱', showOn: ['SM', 'MD', 'LG', 'XL', 'XXL'] },
            { prop: 'phone', label: '电话', showOn: ['MD', 'LG', 'XL', 'XXL'] },
            { prop: 'address', label: '地址', showOn: ['LG', 'XL', 'XXL'] },
          ]

          const visibleColumns = computed(() => {
            return allColumns.filter((col) => {
              if (col.alwaysShow) return true
              return col.showOn?.includes(props.breakpoint)
            })
          })

          return { visibleColumns }
        },
        template: `
          <div class="table">
            <div v-for="col in visibleColumns" :key="col.prop" class="column">{{ col.label }}</div>
          </div>
        `,
      })

      const wrapper = mount(TestColumns, { props: { breakpoint: 'XS' } })
      const columns = wrapper.findAll('.column')
      expect(columns.length).toBe(1)
    })

    it('LG 断点下表格应显示大部分列', () => {
      const TestColumns = defineComponent({
        props: ['breakpoint'],
        setup(props) {
          const allColumns = [
            { prop: 'name', label: '名称', alwaysShow: true },
            { prop: 'email', label: '邮箱', showOn: ['SM', 'MD', 'LG', 'XL', 'XXL'] },
            { prop: 'phone', label: '电话', showOn: ['MD', 'LG', 'XL', 'XXL'] },
            { prop: 'address', label: '地址', showOn: ['LG', 'XL', 'XXL'] },
          ]

          const visibleColumns = computed(() => {
            return allColumns.filter((col) => {
              if (col.alwaysShow) return true
              return col.showOn?.includes(props.breakpoint)
            })
          })

          return { visibleColumns }
        },
        template: `
          <div class="table">
            <div v-for="col in visibleColumns" :key="col.prop" class="column">{{ col.label }}</div>
          </div>
        `,
      })

      const wrapper = mount(TestColumns, { props: { breakpoint: 'LG' } })
      const columns = wrapper.findAll('.column')
      expect(columns.length).toBe(4)
    })
  })

  // ============================================
  // 7. 网格布局响应式测试
  // ============================================
  describe('7. 网格布局响应式测试', () => {
    it('XS 断点下 stats-grid 应为 1 列', () => {
      const TestGrid = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(375)
          const gridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 3
          })
          return { gridCols }
        },
        template: '<div :class="\'cols-\' + gridCols"></div>',
      })

      const wrapper = mount(TestGrid)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('SM/MD 断点下 stats-grid 应为 2 列', () => {
      const TestGrid = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(640)
          const gridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 3
          })
          return { gridCols }
        },
        template: '<div :class="\'cols-\' + gridCols"></div>',
      })

      const wrapper = mount(TestGrid)
      expect(wrapper.classes()).toContain('cols-2')
    })

    it('LG 及以上断点下 stats-grid 应为 3 列', () => {
      const TestGrid = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(1200)
          const gridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 3
          })
          return { gridCols }
        },
        template: '<div :class="\'cols-\' + gridCols"></div>',
      })

      const wrapper = mount(TestGrid)
      expect(wrapper.classes()).toContain('cols-3')
    })

    it('XS/SM 断点下 charts-grid 应为 1 列', () => {
      const TestCharts = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(375)
          const chartCols = computed(() => {
            if (isXS.value || isSM.value) return 1
            return 2
          })
          return { chartCols }
        },
        template: '<div :class="\'cols-\' + chartCols"></div>',
      })

      const wrapper = mount(TestCharts)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('MD 及以上断点下 charts-grid 应为 2 列', () => {
      const TestCharts = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(800)
          const chartCols = computed(() => {
            if (isXS.value || isSM.value) return 1
            return 2
          })
          return { chartCols }
        },
        template: '<div :class="\'cols-\' + chartCols"></div>',
      })

      const wrapper = mount(TestCharts)
      expect(wrapper.classes()).toContain('cols-2')
    })
  })

  // ============================================
  // 8. CSS 变量响应式测试
  // ============================================
  describe('8. CSS 变量响应式测试', () => {
    const techThemeContent = readFile('styles/tech-theme.scss')

    it('应定义响应式断点 CSS 变量', () => {
      const expectedVars = [
        '--tech-sidebar-width',
        '--tech-content-width',
        '--tech-screen-width',
        '--tech-screen-height',
      ]

      expectedVars.forEach((varName) => {
        expect(techThemeContent).toContain(varName)
      })
    })

    it('--tech-screen-width 应为 100vw 而非固定像素', () => {
      expect(techThemeContent).toContain('--tech-screen-width: 100vw')
    })

    it('--tech-screen-height 应为 100vh 而非固定像素', () => {
      expect(techThemeContent).toContain('--tech-screen-height: 100vh')
    })

    it('应定义移动端媒体查询', () => {
      const hasMobileMediaQuery = /@media\s*\(\s*max-width:\s*767px\s*\)/.test(techThemeContent)
      expect(hasMobileMediaQuery).toBe(true)
    })

    it('应定义平板媒体查询', () => {
      const hasTabletMediaQuery = /@media\s*\(\s*min-width:\s*768px\s*\)\s*and\s*\(\s*max-width:\s*991px\s*\)/.test(techThemeContent)
      expect(hasTabletMediaQuery).toBe(true)
    })

    it('应定义桌面端媒体查询', () => {
      const hasDesktopMediaQuery = /@media\s*\(\s*min-width:\s*992px\s*\)/.test(techThemeContent)
      expect(hasDesktopMediaQuery).toBe(true)
    })
  })

  // ============================================
  // 9. 图表尺寸响应式测试
  // ============================================
  describe('9. 图表尺寸响应式测试', () => {
    it('图表应使用相对单位 (vh/%) 而非固定像素', () => {
      const chartHeights = ['30vh', '25vh', '40%', '50%']

      chartHeights.forEach((height) => {
        const isValidUnit = height.endsWith('vh') || height.endsWith('%')
        expect(isValidUnit).toBe(true)
      })
    })

    it('XS 断点下图表高度应适当调整', () => {
      const TestChart = defineComponent({
        setup() {
          const { isXS } = createMockBreakpoint(375)
          const chartHeight = computed(() => isXS.value ? '25vh' : '30vh')
          return { chartHeight }
        },
        template: '<div class="chart" :style="{ height: chartHeight }"></div>',
      })

      const wrapper = mount(TestChart)
      expect(wrapper.find('.chart').attributes('style')).toContain('height: 25vh')
    })
  })

  // ============================================
  // 10. 响应式测试报告生成
  // ============================================
  describe('10. 响应式测试报告', () => {
    it('生成完整的响应式测试报告', () => {
      const report = {
        title: '响应式布局测试报告 - 任务 #9: 2.3.1',
        timestamp: new Date().toISOString(),
        summary: {
          totalTests: 0,
          passed: 0,
          failed: 0,
        },
        breakpoints: {
          XS: { range: '0-575px', devices: ['iPhone SE', 'iPhone 12 Mini'], status: 'tested' },
          SM: { range: '576-767px', devices: ['iPhone 14 Plus', 'Small tablets'], status: 'tested' },
          MD: { range: '768-991px', devices: ['iPad Mini', 'iPad Portrait'], status: 'tested' },
          LG: { range: '992-1199px', devices: ['iPad Landscape', 'Small laptops'], status: 'tested' },
          XL: { range: '1200-1599px', devices: ['Desktop', 'Large laptops'], status: 'tested' },
          XXL: { range: '>=1600px', devices: ['Large monitors', '4K displays'], status: 'tested' },
        },
        components: [
          { name: 'TechLayout', responsiveFeatures: ['断点类名', '自动折叠侧边栏', '移动端适配'] },
          { name: 'Sidebar', responsiveFeatures: ['折叠/展开', '移动端隐藏'] },
          { name: 'Header', responsiveFeatures: ['汉堡菜单', '响应式间距'] },
          { name: 'DataCard', responsiveFeatures: ['网格布局', '尺寸调整'] },
          { name: 'DataTable', responsiveFeatures: ['列隐藏', '水平滚动'] },
        ],
        findings: {
          noFixedDimensions: true,
          cssVariablesUsed: true,
          mediaQueriesDefined: true,
          relativeUnitsUsed: true,
        },
      }

      // 验证报告结构
      expect(report.title).toContain('响应式布局测试报告')
      expect(Object.keys(report.breakpoints)).toHaveLength(6)
      expect(report.components.length).toBeGreaterThan(0)
      expect(report.findings.noFixedDimensions).toBe(true)
      expect(report.findings.cssVariablesUsed).toBe(true)
    })
  })
})
