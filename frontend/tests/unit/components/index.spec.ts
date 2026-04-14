import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Component } from 'vue'
import { ElForm, ElDialog } from 'element-plus'

// 测试组件库入口导出
describe('Components Index - Library Entry', () => {
  // 测试1: 检查所有基础组件是否可从入口导入
  it('should export all base components from index', async () => {
    const indexModule = await import('@/components/index')

    // 验证所有基础组件都已导出
    expect(indexModule.DataCard).toBeDefined()
    expect(indexModule.DataTable).toBeDefined()
    expect(indexModule.FilterBar).toBeDefined()
    expect(indexModule.FormDialog).toBeDefined()
    expect(indexModule.StatusTag).toBeDefined()
    expect(indexModule.EmptyState).toBeDefined()
    expect(indexModule.Loading).toBeDefined()
    expect(indexModule.Skeleton).toBeDefined()
    expect(indexModule.ErrorBoundary).toBeDefined()
    expect(indexModule.VirtualList).toBeDefined()
    expect(indexModule.PageTransition).toBeDefined()
  })

  // 测试2: 检查所有图表组件是否可从入口导入
  it('should export all chart components from index', async () => {
    const indexModule = await import('@/components/index')

    // 验证所有图表组件都已导出
    expect(indexModule.BarChart).toBeDefined()
    expect(indexModule.LineChart).toBeDefined()
    expect(indexModule.PieChart).toBeDefined()
    expect(indexModule.BaseChart).toBeDefined()
    expect(indexModule.TrendChart).toBeDefined()
    expect(indexModule.DistributionChart).toBeDefined()
    expect(indexModule.ComparisonChart).toBeDefined()
    expect(indexModule.RankingChart).toBeDefined()
    expect(indexModule.HeatmapChart).toBeDefined()
  })

  // 测试3: 检查所有类型定义是否已导出 (TypeScript 编译时检查)
  it('should export all component type definitions', async () => {
    const indexModule = await import('@/components/index')

    // 类型导出在运行时是 undefined（TypeScript 类型擦除）
    // 但我们需要验证它们被正确导出，模块加载不会报错
    // 实际类型检查在 TypeScript 编译时进行

    // 验证所有主要组件都存在
    expect(indexModule).toHaveProperty('DataCard')
    expect(indexModule).toHaveProperty('DataTable')
    expect(indexModule).toHaveProperty('FilterBar')
    expect(indexModule).toHaveProperty('FormDialog')
    expect(indexModule).toHaveProperty('StatusTag')
    expect(indexModule).toHaveProperty('EmptyState')
    expect(indexModule).toHaveProperty('Loading')
    expect(indexModule).toHaveProperty('Skeleton')
    expect(indexModule).toHaveProperty('ErrorBoundary')
    expect(indexModule).toHaveProperty('VirtualList')
    expect(indexModule).toHaveProperty('PageTransition')

    // 验证默认导出存在
    expect(indexModule).toHaveProperty('default')
    expect(indexModule.default).toHaveProperty('DataCard')
    expect(indexModule.default).toHaveProperty('DataTable')
    expect(indexModule.default).toHaveProperty('FilterBar')
    expect(indexModule.default).toHaveProperty('FormDialog')
    expect(indexModule.default).toHaveProperty('StatusTag')
    expect(indexModule.default).toHaveProperty('EmptyState')
    expect(indexModule.default).toHaveProperty('Loading')
    expect(indexModule.default).toHaveProperty('Skeleton')
    expect(indexModule.default).toHaveProperty('ErrorBoundary')
    expect(indexModule.default).toHaveProperty('VirtualList')
    expect(indexModule.default).toHaveProperty('PageTransition')
  })

  // 测试4: 验证导出的组件是有效的 Vue 组件
  it('should export valid Vue components', async () => {
    const { DataCard, DataTable, FilterBar, FormDialog, StatusTag, EmptyState, Loading, Skeleton, ErrorBoundary, VirtualList } = await import('@/components/index')

    // 检查组件是否有 render 函数或 setup 函数
    const components = [
      { name: 'DataCard', component: DataCard },
      { name: 'DataTable', component: DataTable },
      { name: 'FilterBar', component: FilterBar },
      { name: 'FormDialog', component: FormDialog },
      { name: 'StatusTag', component: StatusTag },
      { name: 'EmptyState', component: EmptyState },
      { name: 'Loading', component: Loading },
      { name: 'Skeleton', component: Skeleton },
      { name: 'ErrorBoundary', component: ErrorBoundary },
      { name: 'VirtualList', component: VirtualList },
    ]

    for (const { name, component } of components) {
      expect(component, `${name} should be defined`).toBeDefined()
      // Vue SFC 组件会有 render 函数
      expect(
        typeof component === 'object' || typeof component === 'function',
        `${name} should be a valid component`
      ).toBe(true)
    }
  })

  // 测试5: 验证组件可以正确挂载
  it('should mount DataCard component from index export', async () => {
    const { DataCard } = await import('@/components/index')
    const wrapper = mount(DataCard as Component)
    expect(wrapper.find('.data-card').exists()).toBe(true)
  })

  // 测试6: 验证 DataTable 组件可以正确挂载
  it('should mount DataTable component from index export', async () => {
    const { DataTable } = await import('@/components/index')
    const wrapper = mount(DataTable as Component, {
      props: {
        data: [],
        columns: [],
      },
    })
    expect(wrapper.find('.data-table').exists()).toBe(true)
  })

  // 测试7: 验证 FilterBar 组件可以正确挂载
  it('should mount FilterBar component from index export', async () => {
    const { FilterBar } = await import('@/components/index')
    const wrapper = mount(FilterBar as Component, {
      props: {
        filters: [],
      },
    })
    expect(wrapper.find('.filter-bar').exists()).toBe(true)
  })

  // 测试8: 验证 FormDialog 组件可以正确挂载
  it('should mount FormDialog component from index export', async () => {
    const { FormDialog } = await import('@/components/index')
    const wrapper = mount(FormDialog as Component, {
      props: {
        modelValue: true, // 设置为 true 以显示对话框
        title: 'Test Dialog',
        fields: [],
        formData: {},
      },
      attachTo: document.body,
    })
    await nextTick()
    await flushPromises()

    // FormDialog 使用 el-dialog，检查组件是否正确渲染
    expect(wrapper.findComponent(FormDialog).exists()).toBe(true)
    // 检查 ElForm 组件是否存在
    expect(wrapper.findComponent(ElForm).exists()).toBe(true)

    wrapper.unmount()
    document.body.innerHTML = ''
  })

  // 测试9: 验证 StatusTag 组件可以正确挂载
  it('should mount StatusTag component from index export', async () => {
    const { StatusTag } = await import('@/components/index')
    const wrapper = mount(StatusTag as Component, {
      props: {
        status: 'success',
      },
    })
    expect(wrapper.find('.status-tag').exists()).toBe(true)
  })

  // 测试10: 验证 EmptyState 组件可以正确挂载
  it('should mount EmptyState component from index export', async () => {
    const { EmptyState } = await import('@/components/index')
    const wrapper = mount(EmptyState as Component, {
      props: {
        type: 'no-data',
      },
    })
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  // 测试11: 验证 Loading 组件可以正确挂载
  it('should mount Loading component from index export', async () => {
    const { Loading } = await import('@/components/index')
    const wrapper = mount(Loading as Component, {
      props: {
        visible: true,
      },
    })
    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  // 测试12: 验证 Skeleton 组件可以正确挂载
  it('should mount Skeleton component from index export', async () => {
    const { Skeleton } = await import('@/components/index')
    const wrapper = mount(Skeleton as Component, {
      props: {
        loading: true,
        type: 'text',
      },
    })
    expect(wrapper.find('.skeleton').exists()).toBe(true)
  })

  // 测试13: 验证 ErrorBoundary 组件可以正确挂载
  it('should mount ErrorBoundary component from index export', async () => {
    const { ErrorBoundary } = await import('@/components/index')
    const wrapper = mount(ErrorBoundary as Component, {
      slots: {
        default: '<div class="test-content">Test Content</div>',
      },
    })
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
  })

  // 测试14: 验证 VirtualList 组件可以正确挂载
  it('should mount VirtualList component from index export', async () => {
    const { VirtualList } = await import('@/components/index')
    const wrapper = mount(VirtualList as Component, {
      props: {
        data: [],
        itemHeight: 50,
      },
    })
    expect(wrapper.find('.virtual-list').exists()).toBe(true)
  })

  // 测试15: 验证类型是 TypeScript 类型（编译时存在）
  it('should have correct TypeScript types exported', async () => {
    // 这个测试验证类型导出不会导致运行时错误
    const indexModule = await import('@/components/index')

    // 类型导出在运行时会是 undefined（因为是 TypeScript 类型）
    // 但我们能验证模块加载没有错误
    expect(indexModule).toBeDefined()
    expect(typeof indexModule).toBe('object')
  })

  // 测试16: 验证与 Element Plus 的兼容性
  it('should be compatible with Element Plus components', async () => {
    const { DataCard, StatusTag, EmptyState, Skeleton } = await import('@/components/index')

    // 验证组件使用了 Element Plus 的组件
    const dataCardWrapper = mount(DataCard as Component, {
      props: { loading: true },
    })
    // Element Plus 的 Skeleton 组件应该在加载状态渲染
    expect(dataCardWrapper.find('.el-skeleton').exists()).toBe(true)

    const statusTagWrapper = mount(StatusTag as Component, {
      props: { status: 'success' },
    })
    // StatusTag 组件应该渲染自定义标签结构
    expect(statusTagWrapper.find('.status-tag').exists()).toBe(true)
    expect(statusTagWrapper.find('.status-tag__text').exists()).toBe(true)

    const emptyStateWrapper = mount(EmptyState as Component, {
      props: { type: 'no-data' },
    })
    // Element Plus 的 Empty 组件应该被渲染
    expect(emptyStateWrapper.find('.el-empty').exists()).toBe(true)

    const skeletonWrapper = mount(Skeleton as Component, {
      props: { loading: true, type: 'text' },
    })
    // Skeleton 组件应该渲染骨架屏结构
    expect(skeletonWrapper.find('.skeleton').exists()).toBe(true)
  })

  // 测试17: 验证命名导出的一致性
  it('should have consistent naming convention for exports', async () => {
    const indexModule = await import('@/components/index')
    const exportNames = Object.keys(indexModule)

    // 组件名应该是 PascalCase
    const componentNames = ['DataCard', 'DataTable', 'FilterBar', 'FormDialog', 'StatusTag', 'EmptyState', 'Loading', 'Skeleton', 'ErrorBoundary', 'VirtualList', 'PageTransition']
    for (const name of componentNames) {
      expect(exportNames).toContain(name)
    }
  })

  // 测试18: 验证图表组件命名导出
  it('should have consistent naming convention for chart exports', async () => {
    const indexModule = await import('@/components/index')
    const exportNames = Object.keys(indexModule)

    // 图表组件名应该是 PascalCase
    const chartComponentNames = ['BarChart', 'LineChart', 'PieChart', 'BaseChart', 'TrendChart', 'DistributionChart', 'ComparisonChart', 'RankingChart', 'HeatmapChart']
    for (const name of chartComponentNames) {
      expect(exportNames).toContain(name)
    }
  })

  // 测试19: 验证组件默认 props 正常工作
  it('should have working default props for all components', async () => {
    const { DataCard, StatusTag, Loading, Skeleton } = await import('@/components/index')

    // DataCard 默认主题
    const dataCardWrapper = mount(DataCard as Component)
    expect(dataCardWrapper.find('.data-card--default').exists()).toBe(true)

    // StatusTag 默认状态
    const statusTagWrapper = mount(StatusTag as Component, {
      props: { status: 'info' },
    })
    expect(statusTagWrapper.find('.status-tag--info').exists()).toBe(true)

    // Loading 默认显示
    const loadingWrapper = mount(Loading as Component, {
      props: { visible: true },
    })
    expect(loadingWrapper.find('.loading').exists()).toBe(true)

    // Skeleton 默认类型
    const skeletonWrapper = mount(Skeleton as Component, {
      props: { loading: true },
    })
    expect(skeletonWrapper.find('.skeleton--text').exists()).toBe(true)
  })

  // 测试20: 验证按需导入路径正确
  it('should support按需导入 from component directories', async () => {
    // 测试从各个组件目录导入
    const { DataCard: DataCardFromDir } = await import('@/components/DataCard')
    const { DataTable: DataTableFromDir } = await import('@/components/DataTable')
    const { FilterBar: FilterBarFromDir } = await import('@/components/FilterBar')
    const { FormDialog: FormDialogFromDir } = await import('@/components/FormDialog')
    const { StatusTag: StatusTagFromDir } = await import('@/components/StatusTag')

    // 验证从目录导入的组件与主入口导入的是同一个
    const { DataCard, DataTable, FilterBar, FormDialog, StatusTag } = await import('@/components/index')

    expect(DataCardFromDir).toBe(DataCard)
    expect(DataTableFromDir).toBe(DataTable)
    expect(FilterBarFromDir).toBe(FilterBar)
    expect(FormDialogFromDir).toBe(FormDialog)
    expect(StatusTagFromDir).toBe(StatusTag)
  })
})
