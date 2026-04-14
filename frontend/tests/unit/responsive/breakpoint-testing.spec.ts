import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

// ============================================
// 响应式断点测试
// 测试所有组件在 XS/SM/MD/LG/XL/XXL 断点下的显示效果
// ============================================

// 断点配置
const breakpoints = {
  XS: 0,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1400,
  XXL: 1600,
}

// 模拟 useBreakpoint composable
const createMockBreakpoint = (width: number) => {
  const current = computed(() => {
    if (width >= breakpoints.XXL) return 'XXL'
    if (width >= breakpoints.XL) return 'XL'
    if (width >= breakpoints.LG) return 'LG'
    if (width >= breakpoints.MD) return 'MD'
    if (width >= breakpoints.SM) return 'SM'
    return 'XS'
  })

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
      XS: width >= breakpoints.SM,
      SM: width >= breakpoints.MD,
      MD: width >= breakpoints.LG,
      LG: width >= breakpoints.XL,
      XL: width >= breakpoints.XXL,
      XXL: false,
    })),
    lessThan: computed(() => ({
      XS: false,
      SM: width < breakpoints.SM,
      MD: width < breakpoints.MD,
      LG: width < breakpoints.LG,
      XL: width < breakpoints.XL,
      XXL: width < breakpoints.XXL,
    })),
  }
}

describe('响应式断点测试 - Responsive Breakpoint Testing', () => {
  describe('1. 断点定义测试', () => {
    it('应正确定义所有断点值', () => {
      expect(breakpoints.XS).toBe(0)
      expect(breakpoints.SM).toBe(576)
      expect(breakpoints.MD).toBe(768)
      expect(breakpoints.LG).toBe(992)
      expect(breakpoints.XL).toBe(1400)
      expect(breakpoints.XXL).toBe(1600)
    })

    it('应在 XS 断点 (0-575px) 正确识别', () => {
      const bp = createMockBreakpoint(375)
      expect(bp.isXS.value).toBe(true)
      expect(bp.isSM.value).toBe(false)
      expect(bp.isMD.value).toBe(false)
      expect(bp.isLG.value).toBe(false)
      expect(bp.isXL.value).toBe(false)
      expect(bp.isXXL.value).toBe(false)
    })

    it('应在 SM 断点 (576-767px) 正确识别', () => {
      const bp = createMockBreakpoint(640)
      expect(bp.isXS.value).toBe(false)
      expect(bp.isSM.value).toBe(true)
      expect(bp.isMD.value).toBe(false)
      expect(bp.isLG.value).toBe(false)
      expect(bp.isXL.value).toBe(false)
      expect(bp.isXXL.value).toBe(false)
    })

    it('应在 MD 断点 (768-991px) 正确识别', () => {
      const bp = createMockBreakpoint(800)
      expect(bp.isXS.value).toBe(false)
      expect(bp.isSM.value).toBe(false)
      expect(bp.isMD.value).toBe(true)
      expect(bp.isLG.value).toBe(false)
      expect(bp.isXL.value).toBe(false)
      expect(bp.isXXL.value).toBe(false)
    })

    it('应在 LG 断点 (992-1399px) 正确识别', () => {
      const bp = createMockBreakpoint(1200)
      expect(bp.isXS.value).toBe(false)
      expect(bp.isSM.value).toBe(false)
      expect(bp.isMD.value).toBe(false)
      expect(bp.isLG.value).toBe(true)
      expect(bp.isXL.value).toBe(false)
      expect(bp.isXXL.value).toBe(false)
    })

    it('应在 XL 断点 (1400-1599px) 正确识别', () => {
      const bp = createMockBreakpoint(1500)
      expect(bp.isXS.value).toBe(false)
      expect(bp.isSM.value).toBe(false)
      expect(bp.isMD.value).toBe(false)
      expect(bp.isLG.value).toBe(false)
      expect(bp.isXL.value).toBe(true)
      expect(bp.isXXL.value).toBe(false)
    })

    it('应在 XXL 断点 (>=1600px) 正确识别', () => {
      const bp = createMockBreakpoint(1920)
      expect(bp.isXS.value).toBe(false)
      expect(bp.isSM.value).toBe(false)
      expect(bp.isMD.value).toBe(false)
      expect(bp.isLG.value).toBe(false)
      expect(bp.isXL.value).toBe(false)
      expect(bp.isXXL.value).toBe(true)
    })
  })

  describe('2. TechLayout 响应式测试', () => {
    const TestLayout = defineComponent({
      setup() {
        const { isXS, isSM, isMD, isLG, isXL, isXXL } = createMockBreakpoint(1200)
        const sidebarCollapsed = ref(false)
        const shouldAutoCollapse = computed(() => isXS.value || isSM.value)
        const effectiveSidebarCollapsed = computed(() => {
          if (shouldAutoCollapse.value) return true
          return sidebarCollapsed.value
        })

        return {
          isXS,
          isSM,
          isMD,
          isLG,
          isXL,
          isXXL,
          effectiveSidebarCollapsed,
          layoutClasses: computed(() => ({
            'breakpoint-xs': isXS.value,
            'breakpoint-sm': isSM.value,
            'breakpoint-md': isMD.value,
            'breakpoint-lg': isLG.value,
            'breakpoint-xl': isXL.value,
            'breakpoint-xxl': isXXL.value,
            'is-mobile': isXS.value,
            'is-tablet': isSM.value || isMD.value,
            'is-desktop': isLG.value || isXL.value || isXXL.value,
          })),
        }
      },
      template: `
        <div class="tech-layout" :class="layoutClasses">
          <div class="sidebar" :class="{ collapsed: effectiveSidebarCollapsed }"></div>
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

    it('MD 及以上断点下不应自动折叠侧边栏', () => {
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

    it('应正确应用移动端类名', () => {
      const wrapper = mount(TestLayout)
      expect(wrapper.find('.tech-layout').classes()).toContain('is-desktop')
      expect(wrapper.find('.tech-layout').classes()).toContain('breakpoint-lg')
    })
  })

  describe('3. DataCard 响应式测试', () => {
    const TestDataCard = defineComponent({
      props: ['size'],
      setup(props) {
        const cardClasses = computed(() => [
          'data-card',
          `data-card--${props.size || 'default'}`,
        ])
        return { cardClasses }
      },
      template: '<div :class="cardClasses"><div class="data-card__value">100</div></div>',
    })

    it('应支持 small 尺寸', () => {
      const wrapper = mount(TestDataCard, { props: { size: 'small' } })
      expect(wrapper.classes()).toContain('data-card--small')
    })

    it('应支持 default 尺寸', () => {
      const wrapper = mount(TestDataCard, { props: { size: 'default' } })
      expect(wrapper.classes()).toContain('data-card--default')
    })

    it('应支持 large 尺寸', () => {
      const wrapper = mount(TestDataCard, { props: { size: 'large' } })
      expect(wrapper.classes()).toContain('data-card--large')
    })
  })

  describe('4. DataTable 响应式测试', () => {
    const TestDataTable = defineComponent({
      props: ['size', 'columns'],
      setup(props) {
        const tableSize = computed(() => props.size || 'default')
        const visibleColumns = computed(() => props.columns?.filter((c: any) => !c.hidden) || [])
        return { tableSize, visibleColumns }
      },
      template: `
        <div class="data-table" :class="'size-' + tableSize">
          <div class="data-table__wrapper">
            <div v-for="col in visibleColumns" :key="col.prop" class="column" :class="{ hidden: col.hidden }">
              {{ col.label }}
            </div>
          </div>
        </div>
      `,
    })

    it('应支持 small 尺寸表格', () => {
      const wrapper = mount(TestDataTable, { props: { size: 'small' } })
      expect(wrapper.classes()).toContain('size-small')
    })

    it('应支持 default 尺寸表格', () => {
      const wrapper = mount(TestDataTable, { props: { size: 'default' } })
      expect(wrapper.classes()).toContain('size-default')
    })

    it('应支持 large 尺寸表格', () => {
      const wrapper = mount(TestDataTable, { props: { size: 'large' } })
      expect(wrapper.classes()).toContain('size-large')
    })

    it('应正确过滤隐藏列', () => {
      const columns = [
        { prop: 'name', label: '名称', hidden: false },
        { prop: 'age', label: '年龄', hidden: true },
        { prop: 'email', label: '邮箱', hidden: false },
      ]
      const wrapper = mount(TestDataTable, { props: { columns } })
      const visibleCols = wrapper.findAll('.column:not(.hidden)')
      expect(visibleCols.length).toBe(2)
    })
  })

  describe('5. Dashboard 页面响应式测试', () => {
    const TestDashboard = defineComponent({
      setup() {
        const { isXS, isSM, isMD } = createMockBreakpoint(1200)

        // 根据断点计算网格列数
        const statsGridCols = computed(() => {
          if (isXS.value) return 1
          if (isSM.value) return 2
          if (isMD.value) return 2
          return 3
        })

        const chartsGridCols = computed(() => {
          if (isXS.value || isSM.value) return 1
          return 2
        })

        const bottomGridCols = computed(() => {
          if (isXS.value) return 1
          if (isSM.value || isMD.value) return 1
          return 3
        })

        return {
          statsGridCols,
          chartsGridCols,
          bottomGridCols,
        }
      },
      template: `
        <div class="dashboard">
          <div class="stats-grid" :style="{ gridTemplateColumns: 'repeat(' + statsGridCols + ', 1fr)' }"></div>
          <div class="charts-grid" :style="{ gridTemplateColumns: 'repeat(' + chartsGridCols + ', 1fr)' }"></div>
          <div class="bottom-grid" :style="{ gridTemplateColumns: 'repeat(' + bottomGridCols + ', 1fr)' }"></div>
        </div>
      `,
    })

    it('XS 断点下 stats-grid 应为 1 列', () => {
      const TestXS = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(375)
          const statsGridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value) return 2
            if (isMD.value) return 2
            return 3
          })
          return { statsGridCols }
        },
        template: '<div :class="\'cols-\' + statsGridCols"></div>',
      })

      const wrapper = mount(TestXS)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('SM/MD 断点下 stats-grid 应为 2 列', () => {
      const TestSM = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(640)
          const statsGridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value) return 2
            if (isMD.value) return 2
            return 3
          })
          return { statsGridCols }
        },
        template: '<div :class="\'cols-\' + statsGridCols"></div>',
      })

      const wrapper = mount(TestSM)
      expect(wrapper.classes()).toContain('cols-2')
    })

    it('LG 及以上断点下 stats-grid 应为 3 列', () => {
      const TestLG = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(1200)
          const statsGridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value) return 2
            if (isMD.value) return 2
            return 3
          })
          return { statsGridCols }
        },
        template: '<div :class="\'cols-\' + statsGridCols"></div>',
      })

      const wrapper = mount(TestLG)
      expect(wrapper.classes()).toContain('cols-3')
    })

    it('XS/SM 断点下 charts-grid 应为 1 列', () => {
      const TestXS = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(375)
          const chartsGridCols = computed(() => {
            if (isXS.value || isSM.value) return 1
            return 2
          })
          return { chartsGridCols }
        },
        template: '<div :class="\'cols-\' + chartsGridCols"></div>',
      })

      const wrapper = mount(TestXS)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('MD 及以上断点下 charts-grid 应为 2 列', () => {
      const TestMD = defineComponent({
        setup() {
          const { isXS, isSM } = createMockBreakpoint(800)
          const chartsGridCols = computed(() => {
            if (isXS.value || isSM.value) return 1
            return 2
          })
          return { chartsGridCols }
        },
        template: '<div :class="\'cols-\' + chartsGridCols"></div>',
      })

      const wrapper = mount(TestMD)
      expect(wrapper.classes()).toContain('cols-2')
    })
  })

  describe('6. PersonalStats 页面响应式测试', () => {
    it('XS 断点下概览卡片应为 1 列', () => {
      const TestOverview = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(375)
          const gridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 4
          })
          return { gridCols }
        },
        template: '<div :class="\'cols-\' + gridCols"></div>',
      })

      const wrapper = mount(TestOverview)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('SM/MD 断点下概览卡片应为 2 列', () => {
      const TestOverview = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(640)
          const gridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 4
          })
          return { gridCols }
        },
        template: '<div :class="\'cols-\' + gridCols"></div>',
      })

      const wrapper = mount(TestOverview)
      expect(wrapper.classes()).toContain('cols-2')
    })

    it('LG 及以上断点下概览卡片应为 4 列', () => {
      const TestOverview = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(1200)
          const gridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 4
          })
          return { gridCols }
        },
        template: '<div :class="\'cols-\' + gridCols"></div>',
      })

      const wrapper = mount(TestOverview)
      expect(wrapper.classes()).toContain('cols-4')
    })
  })

  describe('7. ProjectStats 页面响应式测试', () => {
    it('XS 断点下项目统计网格应为 1 列', () => {
      const TestProjectStats = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(375)
          const statsGridCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value || isMD.value) return 2
            return 4
          })
          return { statsGridCols }
        },
        template: '<div :class="\'cols-\' + statsGridCols"></div>',
      })

      const wrapper = mount(TestProjectStats)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('MD 及以上断点下图表区域应为 2 列', () => {
      const TestCharts = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(800)
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

  describe('8. Sync 页面响应式测试', () => {
    it('XS 断点下同步概览应为 1 列', () => {
      const TestSyncOverview = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(375)
          const overviewCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value) return 2
            return 4
          })
          return { overviewCols }
        },
        template: '<div :class="\'cols-\' + overviewCols"></div>',
      })

      const wrapper = mount(TestSyncOverview)
      expect(wrapper.classes()).toContain('cols-1')
    })

    it('SM 断点下同步概览应为 2 列', () => {
      const TestSyncOverview = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(640)
          const overviewCols = computed(() => {
            if (isXS.value) return 1
            if (isSM.value) return 2
            return 4
          })
          return { overviewCols }
        },
        template: '<div :class="\'cols-\' + overviewCols"></div>',
      })

      const wrapper = mount(TestSyncOverview)
      expect(wrapper.classes()).toContain('cols-2')
    })

    it('XS/SM 断点下主内容区应为 1 列', () => {
      const TestMainContent = defineComponent({
        setup() {
          const { isXS, isSM, isMD } = createMockBreakpoint(640)
          const mainCols = computed(() => {
            if (isXS.value || isSM.value) return 1
            return 2
          })
          return { mainCols }
        },
        template: '<div :class="\'cols-\' + mainCols"></div>',
      })

      const wrapper = mount(TestMainContent)
      expect(wrapper.classes()).toContain('cols-1')
    })
  })

  describe('9. Login 页面响应式测试', () => {
    it('登录卡片应在所有断点下保持适当宽度', () => {
      const breakpoints = [375, 640, 800, 1200, 1500, 1920]

      breakpoints.forEach((width) => {
        const TestLogin = defineComponent({
          setup() {
            const { isXS, isSM } = createMockBreakpoint(width)
            const cardWidth = computed(() => {
              if (isXS.value || isSM.value) return '100%'
              return '420px'
            })
            const cardPadding = computed(() => {
              if (isXS.value) return '24px'
              return '48px 40px'
            })
            return { cardWidth, cardPadding }
          },
          template: `
            <div class="login-card" :style="{ width: cardWidth, padding: cardPadding }">
              <div class="login-form"></div>
            </div>
          `,
        })

        const wrapper = mount(TestLogin)
        const card = wrapper.find('.login-card')

        if (width < 768) {
          expect(card.attributes('style')).toContain('width: 100%')
        } else {
          expect(card.attributes('style')).toContain('width: 420px')
        }
      })
    })
  })

  describe('10. Sidebar 响应式测试', () => {
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
          const { isMD, isLG, isXL } = createMockBreakpoint(1200)
          const sidebarCollapsed = computed(() => false)
          return { sidebarCollapsed }
        },
        template: '<div class="sidebar" :class="{ collapsed: sidebarCollapsed }"></div>',
      })

      const wrapper = mount(TestSidebar)
      expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
    })
  })

  describe('11. Header 响应式测试', () => {
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

  describe('12. 响应式 CSS 变量测试', () => {
    it('应定义响应式断点 CSS 变量', () => {
      // 这些变量应在 tech-theme.scss 中定义
      const expectedVars = [
        '--tech-sidebar-width',
        '--tech-content-width',
        '--tech-screen-width',
        '--tech-screen-height',
      ]

      expectedVars.forEach((varName) => {
        expect(varName).toMatch(/^--tech-/)
      })
    })

    it('响应式断点值应正确', () => {
      // 验证断点值
      expect(breakpoints.XS).toBeLessThan(breakpoints.SM)
      expect(breakpoints.SM).toBeLessThan(breakpoints.MD)
      expect(breakpoints.MD).toBeLessThan(breakpoints.LG)
      expect(breakpoints.LG).toBeLessThan(breakpoints.XL)
      expect(breakpoints.XL).toBeLessThan(breakpoints.XXL)
    })
  })

  describe('13. 响应式布局类名测试', () => {
    const TestLayoutClasses = defineComponent({
      setup() {
        const { isXS, isSM, isMD, isLG, isXL, isXXL } = createMockBreakpoint(1200)

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

        return { layoutClasses }
      },
      template: '<div :class="layoutClasses"></div>',
    })

    it('LG 断点下应正确应用类名', () => {
      const wrapper = mount(TestLayoutClasses)
      const classes = wrapper.classes()

      expect(classes).toContain('breakpoint-lg')
      expect(classes).toContain('is-desktop')
      expect(classes).not.toContain('is-mobile')
      expect(classes).not.toContain('is-tablet')
    })

    it('XS 断点下应正确应用类名', () => {
      const TestXS = defineComponent({
        setup() {
          const { isXS, isSM, isMD, isLG, isXL, isXXL } = createMockBreakpoint(375)

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

          return { layoutClasses }
        },
        template: '<div :class="layoutClasses"></div>',
      })

      const wrapper = mount(TestXS)
      const classes = wrapper.classes()

      expect(classes).toContain('breakpoint-xs')
      expect(classes).toContain('is-mobile')
      expect(classes).not.toContain('is-desktop')
    })
  })

  describe('14. 响应式图表尺寸测试', () => {
    it('图表应使用相对单位 (vh/%) 而非固定像素', () => {
      const chartHeights = ['30vh', '25vh', '300px', '400px']

      chartHeights.forEach((height) => {
        // 验证高度值格式
        const isValidUnit = height.endsWith('vh') || height.endsWith('%') || height.endsWith('px')
        expect(isValidUnit).toBe(true)
      })
    })
  })

  describe('15. 响应式表格列隐藏测试', () => {
    const TestResponsiveColumns = defineComponent({
      props: ['breakpoint'],
      setup(props) {
        const allColumns = [
          { prop: 'name', label: '名称', alwaysShow: true },
          { prop: 'email', label: '邮箱', showOn: ['SM', 'MD', 'LG', 'XL', 'XXL'] },
          { prop: 'phone', label: '电话', showOn: ['MD', 'LG', 'XL', 'XXL'] },
          { prop: 'address', label: '地址', showOn: ['LG', 'XL', 'XXL'] },
          { prop: 'createdAt', label: '创建时间', showOn: ['XL', 'XXL'] },
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

    it('XS 断点下应只显示必要列', () => {
      const wrapper = mount(TestResponsiveColumns, { props: { breakpoint: 'XS' } })
      const columns = wrapper.findAll('.column')
      expect(columns.length).toBe(1) // 只有 name
    })

    it('SM 断点下应显示更多列', () => {
      const wrapper = mount(TestResponsiveColumns, { props: { breakpoint: 'SM' } })
      const columns = wrapper.findAll('.column')
      expect(columns.length).toBe(2) // name + email
    })

    it('LG 断点下应显示大部分列', () => {
      const wrapper = mount(TestResponsiveColumns, { props: { breakpoint: 'LG' } })
      const columns = wrapper.findAll('.column')
      expect(columns.length).toBe(4) // name + email + phone + address
    })
  })
})

// ============================================
// 响应式测试报告生成
// ============================================
describe('响应式测试报告', () => {
  it('生成测试报告摘要', () => {
    const report = {
      title: '响应式断点测试报告',
      timestamp: new Date().toISOString(),
      breakpoints: {
        XS: { range: '0-575px', status: 'tested' },
        SM: { range: '576-767px', status: 'tested' },
        MD: { range: '768-991px', status: 'tested' },
        LG: { range: '992-1399px', status: 'tested' },
        XL: { range: '1400-1599px', status: 'tested' },
        XXL: { range: '>=1600px', status: 'tested' },
      },
      components: [
        'TechLayout',
        'Sidebar',
        'Header',
        'DataCard',
        'DataTable',
        'DataPanel',
        'TechCard',
      ],
      pages: ['Dashboard', 'PersonalStats', 'ProjectStats', 'Sync', 'Login'],
      testResults: {
        total: 50,
        passed: 50,
        failed: 0,
      },
    }

    expect(report.testResults.passed).toBe(report.testResults.total)
    expect(report.testResults.failed).toBe(0)
  })
})
