import { describe, it, expect } from 'vitest'

// 测试类型导入 - 这个测试主要验证 TypeScript 编译时类型正确
describe('Components Types Import', () => {
  it('should import all components and types without errors', async () => {
    // 验证所有导出都可以被导入
    const indexModule = await import('@/components/index')

    // 组件
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
    expect(indexModule.TrendChart).toBeDefined()

    // 验证模块结构
    expect(Object.keys(indexModule)).toContain('DataCard')
    expect(Object.keys(indexModule)).toContain('DataTable')
    expect(Object.keys(indexModule)).toContain('FilterBar')
    expect(Object.keys(indexModule)).toContain('FormDialog')
    expect(Object.keys(indexModule)).toContain('StatusTag')
    expect(Object.keys(indexModule)).toContain('EmptyState')
    expect(Object.keys(indexModule)).toContain('Loading')
    expect(Object.keys(indexModule)).toContain('Skeleton')
    expect(Object.keys(indexModule)).toContain('ErrorBoundary')
    expect(Object.keys(indexModule)).toContain('VirtualList')
    expect(Object.keys(indexModule)).toContain('PageTransition')
    expect(Object.keys(indexModule)).toContain('TrendChart')
  })

  it('should have default export with all components', async () => {
    const indexModule = await import('@/components/index')

    expect(indexModule.default).toBeDefined()
    expect(typeof indexModule.default).toBe('object')

    // 验证默认导出包含所有组件
    const defaultExport = indexModule.default
    expect(Object.keys(defaultExport)).toHaveLength(12)
    expect(defaultExport.DataCard).toBeDefined()
    expect(defaultExport.DataTable).toBeDefined()
    expect(defaultExport.FilterBar).toBeDefined()
    expect(defaultExport.FormDialog).toBeDefined()
    expect(defaultExport.StatusTag).toBeDefined()
    expect(defaultExport.EmptyState).toBeDefined()
    expect(defaultExport.Loading).toBeDefined()
    expect(defaultExport.Skeleton).toBeDefined()
    expect(defaultExport.ErrorBoundary).toBeDefined()
    expect(defaultExport.VirtualList).toBeDefined()
    expect(defaultExport.PageTransition).toBeDefined()
    expect(defaultExport.TrendChart).toBeDefined()
  })
})
