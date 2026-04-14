import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Project, PaginatedResponse } from '@/types/api'

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus' },
  Search: { name: 'Search' },
  Edit: { name: 'Edit' },
  Delete: { name: 'Delete' },
  User: { name: 'User' },
  Setting: { name: 'Setting' },
}))

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElTable: {
    name: 'ElTable',
    props: ['data', 'loading'],
    template: `
      <div class="el-table" :class="{ 'is-loading': loading }">
        <slot />
        <div v-if="!data || data.length === 0" class="el-empty">暂无数据</div>
      </div>
    `,
  },
  ElTableColumn: {
    name: 'ElTableColumn',
    props: ['prop', 'label', 'width', 'minWidth', 'align', 'fixed', 'type'],
    template: '<div class="el-table-column"><slot :row="{}" /></div>',
  },
  ElPagination: {
    name: 'ElPagination',
    props: ['currentPage', 'pageSize', 'total', 'pageSizes'],
    template: '<div class="el-pagination"></div>',
  },
  ElInput: {
    name: 'ElInput',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue'],
    template: '<div class="el-input"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option class="el-option" :value="value">{{ label }}</option>',
  },
  ElTag: {
    name: 'ElTag',
    props: ['type'],
    template: '<span class="el-tag" :class="\'el-tag--\' + type"><slot /></span>',
  },
  ElButton: {
    name: 'ElButton',
    props: ['type', 'link', 'icon', 'loading'],
    template: '<button class="el-button" :class="[type, { \'is-link\': link }]"><slot /></button>',
  },
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue', 'title', 'width'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="el-dialog"><div class="el-dialog__title">{{ title }}</div><slot /><slot name="footer" /></div>',
  },
  ElForm: {
    name: 'ElForm',
    props: ['model', 'rules'],
    template: '<form class="el-form"><slot /></form>',
  },
  ElFormItem: {
    name: 'ElFormItem',
    props: ['label', 'prop'],
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
  ElEmpty: {
    name: 'ElEmpty',
    props: ['description'],
    template: '<div class="el-empty">{{ description }}</div>',
  },
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue(true),
  },
  vLoading: {
    mounted: vi.fn(),
    updated: vi.fn(),
    unmounted: vi.fn(),
  },
}))

// Mock FilterBar component
vi.mock('@/components/FilterBar/FilterBar.vue', () => ({
  default: {
    name: 'FilterBar',
    props: ['filters', 'loading', 'showReset', 'showSearch'],
    emits: ['search', 'reset', 'change'],
    template: `
      <div class="filter-bar">
        <div v-for="filter in filters" :key="filter.key" class="filter-item">
          <label>{{ filter.label }}</label>
          <input :data-test="'filter-' + filter.key" />
        </div>
        <button v-if="showSearch" data-test="search-btn" @click="$emit('search')">查询</button>
        <button v-if="showReset" data-test="reset-btn" @click="$emit('reset')">重置</button>
      </div>
    `,
  },
}))

// Mock DataTable component
vi.mock('@/components/DataTable/DataTable.vue', () => ({
  default: {
    name: 'DataTable',
    props: ['data', 'columns', 'loading', 'pagination'],
    emits: ['page-change', 'size-change', 'sort-change'],
    template: `
      <div class="data-table">
        <div class="data-table__table">
          <table>
            <thead>
              <tr>
                <th v-for="col in columns" :key="col.prop">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in data" :key="index">
                <td v-for="col in columns" :key="col.prop">
                  <slot :name="col.slot || \`column-\${col.prop}\`" :row="row" :value="row[col.prop]">
                    {{ row[col.prop] }}
                  </slot>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="pagination" class="data-table__pagination">
          <div class="pagination-info">
            第 {{ pagination.currentPage }} 页，每页 {{ pagination.pageSize }} 条，共 {{ pagination.total }} 条
          </div>
        </div>
      </div>
    `,
  },
}))

// Mock StatusTag component
vi.mock('@/components/StatusTag/StatusTag.vue', () => ({
  default: {
    name: 'StatusTag',
    props: ['status', 'text'],
    template: '<span class="status-tag" :class="\'status-tag--\' + status">{{ text }}</span>',
  },
}))

// Mock project API
const mockGetProjects = vi.fn()
const mockDeleteProject = vi.fn()

vi.mock('@/api/project', () => ({
  getProjects: mockGetProjects,
  deleteProject: mockDeleteProject,
}))

describe('ProjectList View', () => {
  let wrapper: VueWrapper

  const mockProjects: Project[] = [
    {
      id: 1,
      name: '项目管理系统',
      code: 'PMS',
      description: '用于管理项目和任务的系统',
      stage: 'development',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      managerId: 1,
      createdAt: '2024-01-01 00:00:00',
      updatedAt: '2024-03-28 12:00:00',
      members: [
        { id: 1, projectId: 1, userId: 1, role: 'owner', joinedAt: '2024-01-01', username: 'admin' },
        { id: 2, projectId: 1, userId: 2, role: 'developer', joinedAt: '2024-01-15', username: 'zhangsan' },
      ],
    },
    {
      id: 2,
      name: '数据分析平台',
      code: 'DAP',
      description: '数据可视化和分析平台',
      stage: 'production',
      status: 'active',
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      managerId: 2,
      createdAt: '2024-02-01 10:00:00',
      updatedAt: '2024-03-28 12:00:00',
      members: [
        { id: 3, projectId: 2, userId: 2, role: 'owner', joinedAt: '2024-02-01', username: 'zhangsan' },
        { id: 4, projectId: 2, userId: 3, role: 'developer', joinedAt: '2024-02-15', username: 'lisi' },
      ],
    },
  ]

  const mockPaginatedResponse: PaginatedResponse<Project> = {
    items: mockProjects,
    total: 2,
    page: 1,
    pageSize: 20,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    mockGetProjects.mockResolvedValue(mockPaginatedResponse)
    mockDeleteProject.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========== API Integration Tests ==========
  describe('API Integration', () => {
    it('should call getProjects on mount', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      // Verify getProjects was called on mount
      expect(mockGetProjects).toHaveBeenCalledTimes(1)
    })

    it('should pass correct pagination params to getProjects', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      // Verify default params
      expect(mockGetProjects).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        keyword: '',
        status: '',
      })
    })

    it('should update projects data after API call', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()
      await nextTick() // Wait for async data update

      const vm = wrapper.vm as any
      expect(vm.projects).toEqual(mockProjects)
    })

    it('should update pagination total after API call', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()
      await nextTick()

      const vm = wrapper.vm as any
      expect(vm.pagination.total).toBe(2)
    })

    it('should call getProjects with search params when handleSearch is called', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      // Clear initial call
      mockGetProjects.mockClear()

      const vm = wrapper.vm as any
      vm.filterParams.name = '测试项目'
      vm.filterParams.status = 'active'

      await vm.handleSearch()
      await nextTick()

      expect(mockGetProjects).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        keyword: '测试项目',
        status: 'active',
      })
    })

    it('should reset to page 1 when searching', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      const vm = wrapper.vm as any
      vm.pagination.currentPage = 3

      mockGetProjects.mockClear()
      await vm.handleSearch()

      expect(vm.pagination.currentPage).toBe(1)
    })

    it('should call getProjects when page changes', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      mockGetProjects.mockClear()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      await dataTable.vm.$emit('page-change', 2)
      await nextTick()

      expect(mockGetProjects).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
      }))
    })

    it('should call getProjects when page size changes', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      mockGetProjects.mockClear()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      await dataTable.vm.$emit('size-change', 50)
      await nextTick()

      expect(mockGetProjects).toHaveBeenCalledWith(expect.objectContaining({
        pageSize: 50,
        page: 1,
      }))
    })

    it('should handle API error gracefully', async () => {
      mockGetProjects.mockRejectedValue(new Error('API Error'))

      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()
      await nextTick()

      // Should not throw, loading should be false
      const vm = wrapper.vm as any
      expect(vm.loading).toBe(false)
    })
  })

  // ========== Delete API Tests ==========
  describe('Delete API Integration', () => {
    it('should call deleteProject when confirming delete', async () => {
      const { ElMessageBox } = await import('element-plus')
      ;(ElMessageBox.confirm as any).mockResolvedValueOnce()

      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleDelete(mockProjects[0])

      expect(mockDeleteProject).toHaveBeenCalledWith(1)
    })

    it('should refresh list after successful delete', async () => {
      const { ElMessageBox, ElMessage } = await import('element-plus')
      ;(ElMessageBox.confirm as any).mockResolvedValueOnce()

      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()
      await nextTick()

      // Clear calls from initial load
      mockGetProjects.mockClear()

      const vm = wrapper.vm as any
      await vm.handleDelete(mockProjects[0])
      await nextTick()

      // Should refresh the list
      expect(mockGetProjects).toHaveBeenCalledTimes(1)
      expect(ElMessage.success).toHaveBeenCalledWith('删除成功')
    })

    it('should not delete when user cancels', async () => {
      const { ElMessageBox } = await import('element-plus')
      ;(ElMessageBox.confirm as any).mockRejectedValueOnce('cancel')

      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleDelete(mockProjects[0])
      await nextTick()

      expect(mockDeleteProject).not.toHaveBeenCalled()
    })

    it('should handle delete API error', async () => {
      const { ElMessageBox, ElMessage } = await import('element-plus')
      ;(ElMessageBox.confirm as any).mockResolvedValueOnce()
      mockDeleteProject.mockRejectedValueOnce(new Error('Delete failed'))

      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleDelete(mockProjects[0])
      await nextTick()

      expect(ElMessage.error).toHaveBeenCalledWith('删除失败')
    })
  })

  // ========== Loading State Tests ==========
  describe('Loading State', () => {
    it('should set loading true during API call', async () => {
      // Create a delayed promise to check loading state
      let resolvePromise: (value: PaginatedResponse<Project>) => void
      mockGetProjects.mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve
      }))

      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)

      const vm = wrapper.vm as any
      expect(vm.loading).toBe(true)

      // Resolve the promise
      resolvePromise!(mockPaginatedResponse)
      await nextTick()
      await nextTick()

      expect(vm.loading).toBe(false)
    })

    it('should pass loading prop to DataTable', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      expect(dataTable.props('loading')).toBeDefined()
    })
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render project list page', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      expect(wrapper.find('.project-list-page').exists()).toBe(true)
    })

    it('should render page header with title', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      expect(wrapper.find('.page-header').exists()).toBe(true)
      expect(wrapper.find('.page-title').text()).toBe('项目管理')
    })

    it('should render add project button in header', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const addButton = wrapper.find('[data-test="add-project-btn"]')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('新增项目')
    })
  })

  // ========== FilterBar 集成测试 ==========
  describe('FilterBar Integration', () => {
    it('should render FilterBar component', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      expect(wrapper.findComponent({ name: 'FilterBar' }).exists()).toBe(true)
    })

    it('should pass correct filter config to FilterBar', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const filterBar = wrapper.findComponent({ name: 'FilterBar' })
      const filters = filterBar.props('filters')
      expect(filters).toBeDefined()
      expect(filters.length).toBeGreaterThanOrEqual(2)

      // 检查必要的筛选器是否存在
      const filterKeys = filters.map((f: any) => f.key)
      expect(filterKeys).toContain('name')
      expect(filterKeys).toContain('status')
    })

    it('should handle filter reset event', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const filterBar = wrapper.findComponent({ name: 'FilterBar' })

      await filterBar.vm.$emit('reset')
      await nextTick()

      // 重置后应该清空筛选条件
      const vm = wrapper.vm as any
      expect(vm.filterParams.name).toBe('')
      expect(vm.filterParams.status).toBe('')
    })
  })

  // ========== DataTable 集成测试 ==========
  describe('DataTable Integration', () => {
    it('should render DataTable component', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(true)
    })

    it('should pass correct columns to DataTable', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      expect(columns).toBeDefined()
      expect(columns.length).toBeGreaterThanOrEqual(6)

      // 检查必要的列是否存在
      const columnProps = columns.map((col: any) => col.prop)
      expect(columnProps).toContain('name')
      expect(columnProps).toContain('description')
      expect(columnProps).toContain('memberCount')
      expect(columnProps).toContain('status')
      expect(columnProps).toContain('createdAt')
      expect(columnProps).toContain('actions')
    })

    it('should pass project data to DataTable', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      await nextTick()
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      expect(dataTable.props('data')).toEqual(mockProjects)
    })

    it('should pass pagination config to DataTable', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const pagination = dataTable.props('pagination')
      expect(pagination).toBeDefined()
      expect(pagination).toHaveProperty('currentPage')
      expect(pagination).toHaveProperty('pageSize')
      expect(pagination).toHaveProperty('total')
    })
  })

  // ========== 表格列配置测试 ==========
  describe('Column Configuration', () => {
    it('should have correct column labels', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')

      const expectedLabels = ['项目名称', '描述', '成员数', '状态', '创建时间', '操作']
      const columnLabels = columns.map((col: any) => col.label)

      expectedLabels.forEach(label => {
        expect(columnLabels).toContain(label)
      })
    })

    it('should have action column with fixed right', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const actionColumn = columns.find((col: any) => col.prop === 'actions')
      expect(actionColumn).toBeDefined()
      expect(actionColumn.fixed).toBe('right')
    })
  })

  // ========== 编辑弹窗预留位置测试 (#41) ==========
  describe('Edit Dialog Placeholder (#41)', () => {
    it('should have edit dialog placeholder', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      // 检查是否有编辑弹窗相关的数据或方法
      const vm = wrapper.vm as any
      expect(vm.editDialogVisible).toBeDefined()
      expect(typeof vm.openEditDialog).toBe('function')
    })

    it('should open edit dialog when clicking edit button', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const vm = wrapper.vm as any

      vm.openEditDialog(mockProjects[0])
      await nextTick()

      expect(vm.editDialogVisible).toBe(true)
      expect(vm.currentProject).toEqual(mockProjects[0])
    })
  })

  // ========== 成员管理预留位置测试 (#42) ==========
  describe('Member Management Placeholder (#42)', () => {
    it('should have member management placeholder', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const vm = wrapper.vm as any
      expect(typeof vm.openMemberDialog).toBe('function')
    })

    it('should open member dialog when clicking member button', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const vm = wrapper.vm as any

      vm.openMemberDialog(mockProjects[0])
      await nextTick()

      expect(vm.memberDialogVisible).toBe(true)
      expect(vm.currentProject).toEqual(mockProjects[0])
    })
  })

  // ========== 状态映射测试 ==========
  describe('Status Mapping', () => {
    it('should have status type mapping', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const vm = wrapper.vm as any

      expect(vm.statusTypes).toBeDefined()
      expect(vm.statusTypes.active).toBeDefined()
      expect(vm.statusTypes.archived).toBeDefined()
      expect(vm.statusTypes.deleted).toBeDefined()
    })

    it('should have status text mapping', async () => {
      const ProjectList = await import('@/views/project/ProjectList.vue')
      wrapper = mount(ProjectList.default)
      const vm = wrapper.vm as any

      expect(vm.statusText).toBeDefined()
      expect(vm.statusText.active).toBe('进行中')
      expect(vm.statusText.archived).toBe('已归档')
      expect(vm.statusText.deleted).toBe('已删除')
    })
  })
})
