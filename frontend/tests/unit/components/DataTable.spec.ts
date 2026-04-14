import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import type { DataTableColumn, DataTablePagination } from '@/components/DataTable/DataTable.vue'
import { ElTable, ElTableColumn, ElPagination } from 'element-plus'

// 模拟数据
interface TestData {
  id: number
  name: string
  age: number
  status: string
}

const mockData: TestData[] = [
  { id: 1, name: '张三', age: 25, status: 'active' },
  { id: 2, name: '李四', age: 30, status: 'inactive' },
  { id: 3, name: '王五', age: 28, status: 'active' },
]

const mockColumns: DataTableColumn<TestData>[] = [
  { prop: 'id', label: 'ID', width: 80, sortable: true },
  { prop: 'name', label: '姓名', minWidth: 120 },
  { prop: 'age', label: '年龄', width: 100, sortable: true },
  { prop: 'status', label: '状态', width: 120 },
]

const mockPagination: DataTablePagination = {
  currentPage: 1,
  pageSize: 10,
  total: 100,
}

describe('DataTable', () => {
  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      expect(wrapper.find('.data-table').exists()).toBe(true)
      expect(wrapper.findComponent(ElTable).exists()).toBe(true)
    })

    it('should render table with ElTableColumn components', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      // 检查 ElTable 组件是否存在
      const table = wrapper.findComponent(ElTable)
      expect(table.exists()).toBe(true)
      // 检查 ElTableColumn 组件数量（包括可见列）
      const columns = wrapper.findAllComponents(ElTableColumn)
      expect(columns.length).toBeGreaterThan(0)
    })

    it('should pass data to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('data')).toEqual(mockData)
    })

    it('should render empty text when data is empty', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: [],
          columns: mockColumns,
          emptyText: '暂无数据',
        },
      })
      expect(wrapper.find('.el-empty').exists()).toBe(true)
    })
  })

  // ========== 列配置测试 ==========
  describe('Column Configuration', () => {
    it('should pass column props to ElTableColumn', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{ prop: 'id', label: 'ID', width: 100 }],
        },
      })
      const column = wrapper.findComponent(ElTableColumn)
      expect(column.props('prop')).toBe('id')
      expect(column.props('label')).toBe('ID')
      expect(column.props('width')).toBe(100)
    })

    it('should pass min-width to ElTableColumn', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{ prop: 'name', label: '姓名', minWidth: 150 }],
        },
      })
      const column = wrapper.findComponent(ElTableColumn)
      expect(column.props('minWidth')).toBe(150)
    })

    it('should pass fixed prop to ElTableColumn', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{ prop: 'id', label: 'ID', fixed: 'left' }],
        },
      })
      const column = wrapper.findComponent(ElTableColumn)
      expect(column.props('fixed')).toBe('left')
    })

    it('should pass align prop to ElTableColumn', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{ prop: 'id', label: 'ID', align: 'center' }],
        },
      })
      const column = wrapper.findComponent(ElTableColumn)
      expect(column.props('align')).toBe('center')
    })

    it('should filter out hidden columns', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [
            { prop: 'id', label: 'ID' },
            { prop: 'name', label: '姓名', hidden: true },
          ],
        },
      })
      // 只有非 hidden 的列才会渲染
      const columns = wrapper.findAllComponents(ElTableColumn)
      expect(columns.length).toBe(1)
      expect(columns[0].props('prop')).toBe('id')
    })

    it('should support custom slot for column', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{ prop: 'name', label: '姓名', slot: 'customName' }],
        },
        slots: {
          customName: ({ row }: { row: TestData }) => h('span', { class: 'custom' }, row.name),
        },
      })
      await nextTick()
      expect(wrapper.find('.custom').exists()).toBe(true)
    })
  })

  // ========== 排序功能测试 ==========
  describe('Sorting', () => {
    it('should pass sortable prop to ElTableColumn', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{ prop: 'id', label: 'ID', sortable: true }],
        },
      })
      const column = wrapper.findComponent(ElTableColumn)
      expect(column.props('sortable')).toBe(true)
    })

    it('should emit sort-change event when sorting', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('sort-change', { prop: 'age', order: 'ascending' })
      expect(wrapper.emitted('sort-change')).toBeTruthy()
      expect(wrapper.emitted('sort-change')![0]).toEqual([{ prop: 'age', order: 'ascending' }])
    })

    it('should pass default-sort to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          defaultSort: { prop: 'id', order: 'descending' },
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('defaultSort')).toEqual({ prop: 'id', order: 'descending' })
    })
  })

  // ========== 筛选功能测试 ==========
  describe('Filtering', () => {
    it('should pass filters to ElTableColumn', () => {
      const filters = [
        { text: '激活', value: 'active' },
        { text: '未激活', value: 'inactive' },
      ]
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: [{
            prop: 'status',
            label: '状态',
            filters,
          }],
        },
      })
      const column = wrapper.findComponent(ElTableColumn)
      expect(column.props('filters')).toEqual(filters)
    })

    it('should emit filter-change event when filtering', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('filter-change', { status: ['active'] })
      expect(wrapper.emitted('filter-change')).toBeTruthy()
    })
  })

  // ========== 分页功能测试 ==========
  describe('Pagination', () => {
    it('should render pagination when pagination prop is provided', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pagination: mockPagination,
        },
      })
      expect(wrapper.find('.data-table__pagination').exists()).toBe(true)
      expect(wrapper.findComponent(ElPagination).exists()).toBe(true)
    })

    it('should not render pagination when pagination is null', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pagination: null,
        },
      })
      expect(wrapper.find('.data-table__pagination').exists()).toBe(false)
    })

    it('should pass pagination props to ElPagination', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pagination: mockPagination,
        },
      })
      const pagination = wrapper.findComponent(ElPagination)
      expect(pagination.props('total')).toBe(100)
      expect(pagination.props('pageSizes')).toEqual([10, 20, 50, 100])
    })

    it('should emit page-change event when page changes', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pagination: mockPagination,
        },
      })
      const pagination = wrapper.findComponent(ElPagination)
      await pagination.vm.$emit('current-change', 2)
      expect(wrapper.emitted('page-change')).toBeTruthy()
      expect(wrapper.emitted('page-change')![0]).toEqual([2])
    })

    it('should emit size-change event when page size changes', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pagination: mockPagination,
        },
      })
      const pagination = wrapper.findComponent(ElPagination)
      await pagination.vm.$emit('size-change', 20)
      expect(wrapper.emitted('size-change')).toBeTruthy()
      expect(wrapper.emitted('size-change')![0]).toEqual([20])
    })

    it('should support custom page sizes', () => {
      const customPageSizes = [5, 10, 20]
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pagination: mockPagination,
          pageSizes: customPageSizes,
        },
      })
      const pagination = wrapper.findComponent(ElPagination)
      expect(pagination.props('pageSizes')).toEqual(customPageSizes)
    })
  })

  // ========== 加载状态测试 ==========
  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          loading: true,
        },
      })
      // 检查表格是否渲染（v-loading 指令在 jsdom 中不会渲染出可见元素）
      const table = wrapper.find('.el-table')
      expect(table.exists()).toBe(true)
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should not show loading when loading is false', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          loading: false,
        },
      })
      const table = wrapper.find('.el-table')
      expect(table.exists()).toBe(true)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should accept loadingText prop', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          loading: true,
          loadingText: '数据加载中...',
        },
      })
      expect(wrapper.props('loadingText')).toBe('数据加载中...')
    })
  })

  // ========== 选择功能测试 ==========
  describe('Selection', () => {
    it('should render selection column when showSelection is true', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          showSelection: true,
        },
      })
      const columns = wrapper.findAllComponents(ElTableColumn)
      // 第一个列应该是选择列
      expect(columns[0].props('type')).toBe('selection')
    })

    it('should emit selection-change event when selection changes', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          showSelection: true,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('selection-change', [mockData[0]])
      expect(wrapper.emitted('selection-change')).toBeTruthy()
    })
  })

  // ========== 行操作测试 ==========
  describe('Row Operations', () => {
    it('should emit row-click event when row is clicked', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('row-click', mockData[0], {}, new Event('click'))
      expect(wrapper.emitted('row-click')).toBeTruthy()
    })

    it('should pass stripe prop to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          stripe: true,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('stripe')).toBe(true)
    })

    it('should pass border prop to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          border: true,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('border')).toBe(true)
    })

    it('should pass row-class-name to ElTable', () => {
      const rowClassName = 'custom-row'
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          rowClassName,
        },
      })
      const table = wrapper.findComponent(ElTable)
      // rowClassName 被包装为函数传递
      expect(table.props('rowClassName')).toBeDefined()
    })
  })

  // ========== 高度和布局测试 ==========
  describe('Height and Layout', () => {
    it('should pass height prop to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          height: 400,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('height')).toBe(400)
    })

    it('should pass max-height prop to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          maxHeight: 500,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('maxHeight')).toBe(500)
    })
  })

  // ========== 事件测试 ==========
  describe('Events', () => {
    it('should emit cell-click event', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('cell-click', mockData[0], {}, {}, new Event('click'))
      expect(wrapper.emitted('cell-click')).toBeTruthy()
    })

    it('should emit header-click event', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('header-click', {}, new Event('click'))
      expect(wrapper.emitted('header-click')).toBeTruthy()
    })

    it('should emit current-change event', async () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      const table = wrapper.findComponent(ElTable)
      await table.vm.$emit('current-change', mockData[0], null)
      expect(wrapper.emitted('current-change')).toBeTruthy()
    })
  })

  // ========== 方法测试 ==========
  describe('Methods', () => {
    it('should expose clearSelection method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          showSelection: true,
        },
      })
      expect(typeof wrapper.vm.clearSelection).toBe('function')
    })

    it('should expose toggleRowSelection method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          showSelection: true,
        },
      })
      expect(typeof wrapper.vm.toggleRowSelection).toBe('function')
    })

    it('should expose toggleAllSelection method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      expect(typeof wrapper.vm.toggleAllSelection).toBe('function')
    })

    it('should expose getSelectionRows method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      expect(typeof wrapper.vm.getSelectionRows).toBe('function')
    })

    it('should expose setCurrentRow method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      expect(typeof wrapper.vm.setCurrentRow).toBe('function')
    })

    it('should expose clearSort method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      expect(typeof wrapper.vm.clearSort).toBe('function')
    })

    it('should expose clearFilter method', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
        },
      })
      expect(typeof wrapper.vm.clearFilter).toBe('function')
    })
  })

  // ========== Props 传递测试 ==========
  describe('Props Passing', () => {
    it('should pass highlight-current-row to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          highlightCurrentRow: true,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('highlightCurrentRow')).toBe(true)
    })

    it('should pass row-key to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          rowKey: 'id',
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('rowKey')).toBe('id')
    })

    it('should pass show-header to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          showHeader: false,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('showHeader')).toBe(false)
    })

    it('should pass size to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          size: 'small',
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('size')).toBe('small')
    })

    it('should pass fit to ElTable', () => {
      const wrapper = mount(DataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          fit: false,
        },
      })
      const table = wrapper.findComponent(ElTable)
      expect(table.props('fit')).toBe(false)
    })
  })
})
