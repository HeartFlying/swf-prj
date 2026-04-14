import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { User, PaginatedResponse } from '@/types/api'

// Mock user API
const mockGetUsers = vi.fn()
const mockDeleteUser = vi.fn()

vi.mock('@/api/user', () => ({
  getUsers: (params?: { page?: number; pageSize?: number; keyword?: string }) => mockGetUsers(params),
  deleteUser: (id: number) => mockDeleteUser(id),
}))

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus' },
  Search: { name: 'Search' },
  Edit: { name: 'Edit' },
  Delete: { name: 'Delete' },
  User: { name: 'User' },
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

describe('UserList View', () => {
  let wrapper: VueWrapper

  const mockUsers: User[] = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      department: '技术部',
      isActive: true,
      createdAt: '2024-01-01 00:00:00',
      updatedAt: '2024-03-28 12:00:00',
      role: { id: 1, name: 'admin', permissions: [] },
    },
    {
      id: 2,
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      department: '开发部',
      isActive: true,
      createdAt: '2024-01-15 10:30:00',
      updatedAt: '2024-03-28 12:00:00',
      role: { id: 2, name: 'developer', permissions: [] },
    },
    {
      id: 3,
      username: 'lisi',
      email: 'lisi@example.com',
      department: '测试部',
      isActive: false,
      createdAt: '2024-02-01 14:20:00',
      updatedAt: '2024-03-28 12:00:00',
      role: { id: 3, name: 'viewer', permissions: [] },
    },
  ]

  const mockPaginatedResponse: PaginatedResponse<User> = {
    items: mockUsers,
    total: 3,
    page: 1,
    pageSize: 20,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockGetUsers.mockResolvedValue(mockPaginatedResponse)
    mockDeleteUser.mockResolvedValue(undefined)
  })

  // ========== API Integration Tests ==========
  describe('API Integration', () => {
    it('should call getUsers API on mount', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Verify API was called
      expect(mockGetUsers).toHaveBeenCalled()
    })

    it('should pass correct pagination params to getUsers', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Verify API was called with default params
      expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({
        page: expect.any(Number),
        pageSize: expect.any(Number),
      }))
    })

    it('should pass keyword param when searching by username', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls
      mockGetUsers.mockClear()

      const vm = wrapper.vm as any
      vm.filterParams.username = 'admin'
      await nextTick()

      // Trigger search
      await vm.handleSearch()
      await nextTick()

      // Verify API was called with keyword
      expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({
        keyword: 'admin',
      }))
    })

    it('should update users data after API response', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      const vm = wrapper.vm as any
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vm.users).toEqual(mockUsers)
    })

    it('should update pagination total after API response', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 0))

      const vm = wrapper.vm as any
      expect(vm.pagination.total).toBe(3)
    })

    it('should call deleteUser API when deleting a user', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleDelete(mockUsers[0])

      expect(mockDeleteUser).toHaveBeenCalledWith(1)
    })

    it('should refresh user list after successful delete', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls from mount
      mockGetUsers.mockClear()

      const vm = wrapper.vm as any
      await vm.handleDelete(mockUsers[0])

      // Wait for delete and refresh
      await new Promise(resolve => setTimeout(resolve, 0))

      // Should call getUsers again to refresh list
      expect(mockGetUsers).toHaveBeenCalled()
    })

    it('should handle API error gracefully', async () => {
      mockGetUsers.mockRejectedValue(new Error('API Error'))

      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Wait for API call to reject
      await new Promise(resolve => setTimeout(resolve, 0))

      const vm = wrapper.vm as any
      // Loading should be false even on error
      expect(vm.loading).toBe(false)
    })

    it('should pass page param when changing page', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls
      mockGetUsers.mockClear()

      const vm = wrapper.vm as any
      await vm.handlePageChange(2)
      await nextTick()

      // Verify API was called with page 2
      expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
      }))
    })

    it('should pass pageSize param when changing page size', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls
      mockGetUsers.mockClear()

      const vm = wrapper.vm as any
      await vm.handleSizeChange(50)
      await nextTick()

      // Verify API was called with pageSize 50
      expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({
        pageSize: 50,
        page: 1, // Should reset to page 1
      }))
    })
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render user list page', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      expect(wrapper.find('.user-list-page').exists()).toBe(true)
    })

    it('should render page header with title', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      expect(wrapper.find('.page-header').exists()).toBe(true)
      expect(wrapper.find('.page-title').text()).toBe('用户管理')
    })

    it('should render add user button in header', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const addButton = wrapper.find('[data-test="add-user-btn"]')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('新增用户')
    })
  })

  // ========== FilterBar 集成测试 ==========
  describe('FilterBar Integration', () => {
    it('should render FilterBar component', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      expect(wrapper.findComponent({ name: 'FilterBar' }).exists()).toBe(true)
    })

    it('should pass correct filter config to FilterBar', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const filterBar = wrapper.findComponent({ name: 'FilterBar' })
      const filters = filterBar.props('filters')
      expect(filters).toBeDefined()
      expect(filters.length).toBeGreaterThanOrEqual(3)

      // 检查必要的筛选器是否存在
      const filterKeys = filters.map((f: any) => f.key)
      expect(filterKeys).toContain('username')
      expect(filterKeys).toContain('role')
      expect(filterKeys).toContain('status')
    })

    it('should handle filter search event', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls from mount
      mockGetUsers.mockClear()

      const filterBar = wrapper.findComponent({ name: 'FilterBar' })
      const vm = wrapper.vm as any

      // 设置筛选条件
      vm.filterParams.username = 'admin'
      await nextTick()

      // 触发搜索
      await filterBar.vm.$emit('search', { username: 'admin', role: '', status: '' })
      await nextTick()

      // 验证搜索调用了API
      expect(mockGetUsers).toHaveBeenCalled()
    })

    it('should handle filter reset event', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls
      mockGetUsers.mockClear()

      const filterBar = wrapper.findComponent({ name: 'FilterBar' })

      await filterBar.vm.$emit('reset')
      await nextTick()

      // 重置后应该清空筛选条件并重新加载
      const vm = wrapper.vm as any
      expect(vm.filterParams.username).toBe('')
      expect(vm.filterParams.role).toBe('')
      expect(vm.filterParams.status).toBe('')

      // Should reload data after reset
      expect(mockGetUsers).toHaveBeenCalled()
    })
  })

  // ========== DataTable 集成测试 ==========
  describe('DataTable Integration', () => {
    it('should render DataTable component', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(true)
    })

    it('should pass correct columns to DataTable', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      expect(columns).toBeDefined()
      expect(columns.length).toBeGreaterThanOrEqual(6)

      // 检查必要的列是否存在
      const columnProps = columns.map((col: any) => col.prop)
      expect(columnProps).toContain('username')
      expect(columnProps).toContain('email')
      expect(columnProps).toContain('role')
      expect(columnProps).toContain('status')
      expect(columnProps).toContain('createdAt')
      expect(columnProps).toContain('actions')
    })

    it('should pass user data from API to DataTable', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 0))

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      expect(dataTable.props('data')).toEqual(mockUsers)
    })

    it('should pass pagination config to DataTable', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
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
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')

      const expectedLabels = ['用户名', '邮箱', '角色', '状态', '创建时间', '操作']
      const columnLabels = columns.map((col: any) => col.label)

      expectedLabels.forEach(label => {
        expect(columnLabels).toContain(label)
      })
    })

    it('should have username column with slot', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const usernameColumn = columns.find((col: any) => col.prop === 'username')
      expect(usernameColumn).toBeDefined()
    })

    it('should have role column with slot', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const roleColumn = columns.find((col: any) => col.prop === 'role')
      expect(roleColumn).toBeDefined()
    })

    it('should have status column with slot', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const statusColumn = columns.find((col: any) => col.prop === 'status')
      expect(statusColumn).toBeDefined()
    })

    it('should have action column with fixed right', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const actionColumn = columns.find((col: any) => col.prop === 'actions')
      expect(actionColumn).toBeDefined()
      expect(actionColumn.fixed).toBe('right')
    })
  })

  // ========== 分页功能测试 ==========
  describe('Pagination Functionality', () => {
    it('should handle page change and call API', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls
      mockGetUsers.mockClear()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      await dataTable.vm.$emit('page-change', 2)
      await nextTick()

      expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
      }))
    })

    it('should handle page size change and call API', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      await nextTick()

      // Clear previous calls
      mockGetUsers.mockClear()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      await dataTable.vm.$emit('size-change', 50)
      await nextTick()

      expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({
        pageSize: 50,
        page: 1,
      }))
    })
  })

  // ========== 排序功能测试 ==========
  describe('Sorting Functionality', () => {
    it('should handle sort change', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })

      await dataTable.vm.$emit('sort-change', { prop: 'createdAt', order: 'descending' })
      await nextTick()

      // 排序后应该更新排序参数
      const vm = wrapper.vm as any
      expect(vm.sortParams.prop).toBe('createdAt')
      expect(vm.sortParams.order).toBe('descending')
    })
  })

  // ========== 操作按钮测试 ==========
  describe('Action Buttons', () => {
    it('should render edit button placeholder', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const actionColumn = columns.find((col: any) => col.prop === 'actions')
      expect(actionColumn).toBeDefined()
      expect(actionColumn.slot).toBeDefined()
    })

    it('should render delete button placeholder', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const actionColumn = columns.find((col: any) => col.prop === 'actions')
      expect(actionColumn).toBeDefined()
    })
  })

  // ========== 编辑弹窗预留位置测试 ==========
  describe('Edit Dialog Placeholder (#36)', () => {
    it('should have edit dialog placeholder', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      // 检查是否有编辑弹窗相关的数据或方法
      const vm = wrapper.vm as any
      expect(vm.editDialogVisible).toBeDefined()
      expect(typeof vm.openEditDialog).toBe('function')
    })

    it('should open edit dialog when clicking edit button', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      vm.openEditDialog(mockUsers[0])
      await nextTick()

      expect(vm.editDialogVisible).toBe(true)
      expect(vm.currentUser).toEqual(mockUsers[0])
    })
  })

  // ========== 权限管理预留位置测试 ==========
  describe('Permission Management Placeholder (#37)', () => {
    it('should have permission management placeholder', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any
      expect(typeof vm.openPermissionDialog).toBe('function')
    })

    it('should track permission dialog visibility', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      expect(vm.permissionDialogVisible).toBeDefined()
      expect(vm.permissionDialogVisible).toBe(false)
    })
  })

  // ========== 加载状态测试 ==========
  describe('Loading State', () => {
    it('should pass loading prop to DataTable', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      expect(dataTable.props('loading')).toBeDefined()
    })

    it('should pass loading prop to FilterBar', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const filterBar = wrapper.findComponent({ name: 'FilterBar' })
      expect(filterBar.props('loading')).toBeDefined()
    })

    it('should set loading true during API call', async () => {
      // Create a delayed promise to check loading state
      let resolvePromise: (value: PaginatedResponse<User>) => void
      mockGetUsers.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve
      }))

      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      // Loading should be true while API is pending
      expect(vm.loading).toBe(true)

      // Resolve the promise
      resolvePromise!(mockPaginatedResponse)
      await nextTick()

      // Loading should be false after API resolves
      expect(vm.loading).toBe(false)
    })
  })

  // ========== 响应式布局测试 ==========
  describe('Responsive Design', () => {
    it('should have responsive layout classes', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      expect(wrapper.find('.user-list-page').exists()).toBe(true)
      expect(wrapper.find('.page-header').exists()).toBe(true)
      expect(wrapper.find('.filter-section').exists()).toBe(true)
      expect(wrapper.find('.table-section').exists()).toBe(true)
    })
  })

  // ========== 角色映射测试 ==========
  describe('Role Mapping', () => {
    it('should have role name mapping', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      expect(vm.roleNames).toBeDefined()
      expect(vm.roleNames.admin).toBe('管理员')
      expect(vm.roleNames.developer).toBe('开发者')
      expect(vm.roleNames.viewer).toBe('访客')
    })

    it('should have role type mapping for tags', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      expect(vm.roleTypes).toBeDefined()
      expect(vm.roleTypes.admin).toBeDefined()
      expect(vm.roleTypes.developer).toBeDefined()
      expect(vm.roleTypes.viewer).toBeDefined()
    })
  })

  // ========== 状态映射测试 ==========
  describe('Status Mapping', () => {
    it('should have status type mapping', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      expect(vm.statusTypes).toBeDefined()
      expect(vm.statusTypes.active).toBeDefined()
      expect(vm.statusTypes.inactive).toBeDefined()
    })

    it('should have status text mapping', async () => {
      const UserList = await import('@/views/user/UserList.vue')
      wrapper = mount(UserList.default)
      const vm = wrapper.vm as any

      expect(vm.statusText).toBeDefined()
      expect(vm.statusText.active).toBe('启用')
      expect(vm.statusText.inactive).toBe('禁用')
    })
  })
})
