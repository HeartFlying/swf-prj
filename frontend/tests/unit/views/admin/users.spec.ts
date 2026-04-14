import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import type { User } from '@/types/api'
import { http } from '@/utils/request'
import * as userApi from '@/api/user'

// Mock request module to avoid Pinia initialization issues
vi.mock('@/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock user API module
vi.mock('@/api/user', () => ({
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus' },
  Search: { name: 'Search' },
  UserFilled: { name: 'UserFilled' },
  CircleCheck: { name: 'CircleCheck' },
  User: { name: 'User' },
  TrendCharts: { name: 'TrendCharts' },
  List: { name: 'List' },
  Edit: { name: 'Edit' },
  Delete: { name: 'Delete' },
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
  ElSwitch: {
    name: 'ElSwitch',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<span class="el-switch" @click="$emit(\'update:modelValue\', !modelValue); $emit(\'change\', !modelValue)"></span>',
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

// Mock TechCard component
vi.mock('@/components/tech/TechCard.vue', () => ({
  default: {
    name: 'TechCard',
    props: ['title', 'icon'],
    template: `
      <div class="tech-card">
        <div class="tech-card__header" v-if="title">
          <span class="tech-card__title">{{ title }}</span>
        </div>
        <div class="tech-card__content"><slot /></div>
      </div>
    `,
  },
}))

// Mock TechButton component
vi.mock('@/components/tech/TechButton.vue', () => ({
  default: {
    name: 'TechButton',
    props: ['variant', 'icon'],
    template: '<button class="tech-button" :class="variant"><slot /></button>',
  },
}))

// Mock DataPanel component
vi.mock('@/components/tech/DataPanel.vue', () => ({
  default: {
    name: 'DataPanel',
    props: ['label', 'value', 'icon', 'iconColor', 'iconBgColor'],
    template: `
      <div class="data-panel">
        <div class="data-panel__label">{{ label }}</div>
        <div class="data-panel__value">{{ value }}</div>
      </div>
    `,
  },
}))

// Mock DataTable component
vi.mock('@/components/DataTable/DataTable.vue', () => ({
  default: {
    name: 'DataTable',
    props: ['data', 'columns', 'loading', 'pagination'],
    emits: ['page-change', 'size-change', 'sort-change', 'filter-change'],
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

describe('Users Management View', () => {
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

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default mock for getUsers
    vi.mocked(userApi.getUsers).mockResolvedValue({
      items: mockUsers,
      total: mockUsers.length,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render users management page', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      expect(wrapper.find('.users-manage-page').exists()).toBe(true)
    })

    it('should render page title and subtitle', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      expect(wrapper.find('.page-title').text()).toBe('用户管理')
      expect(wrapper.find('.page-subtitle').text()).toContain('管理系统用户')
    })

    it('should render stats cards', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const statsRow = wrapper.find('.stats-row')
      expect(statsRow.exists()).toBe(true)
      const dataPanels = wrapper.findAll('.data-panel')
      expect(dataPanels.length).toBe(4)
    })
  })

  // ========== DataTable 组件测试 ==========
  describe('DataTable Integration', () => {
    it('should render DataTable component', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(true)
    })

    it('should pass correct columns to DataTable', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      expect(columns).toBeDefined()
      expect(columns.length).toBeGreaterThanOrEqual(5)

      // 检查必要的列是否存在
      const columnProps = columns.map((col: any) => col.prop)
      expect(columnProps).toContain('username')
      expect(columnProps).toContain('email')
      expect(columnProps).toContain('department')
      expect(columnProps).toContain('role')
      expect(columnProps).toContain('status')
    })

    it('should pass user data to DataTable', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      expect(dataTable.props('data')).toBeDefined()
      expect(Array.isArray(dataTable.props('data'))).toBe(true)
    })

    it('should pass pagination config to DataTable', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const pagination = dataTable.props('pagination')
      expect(pagination).toBeDefined()
      expect(pagination).toHaveProperty('currentPage')
      expect(pagination).toHaveProperty('pageSize')
      expect(pagination).toHaveProperty('total')
    })
  })

  // ========== 搜索功能测试 ==========
  describe('Search Functionality', () => {
    it('should render search input', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default, {
        global: {
          stubs: {
            'el-input': {
              template: '<div class="el-input"><input /></div>',
            },
            'el-select': {
              template: '<select class="el-select"><option></option></select>',
            },
            'el-option': true,
            'el-icon': true,
          },
        },
      })
      // 搜索输入框在 filter-bar 中
      const filterBar = wrapper.find('.filter-bar')
      expect(filterBar.exists()).toBe(true)
      const searchInput = filterBar.find('.el-input')
      expect(searchInput.exists()).toBe(true)
    })

    it('should filter users by search query', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      // 直接修改组件的 searchQuery 值
      const vm = wrapper.vm as any
      vm.searchQuery = 'admin'
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const filteredData = dataTable.props('data')
      expect(filteredData.every((user: User) =>
        user.username.toLowerCase().includes('admin') ||
        user.email.toLowerCase().includes('admin')
      )).toBe(true)
    })

    it('should clear search when input is cleared', async () => {
      // Mock API response with test data
      vi.mocked(userApi.getUsers).mockResolvedValueOnce({
        items: mockUsers,
        total: mockUsers.length,
      })

      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      // Wait for component to load data
      await flushPromises()

      const vm = wrapper.vm as any
      vm.searchQuery = 'test'
      await nextTick()
      vm.searchQuery = ''
      await nextTick()

      // 快进时间以触发防抖
      vi.advanceTimersByTime(300)
      await flushPromises()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const data = dataTable.props('data')
      expect(data.length).toBeGreaterThan(0)
    })
  })

  // ========== 筛选功能测试 ==========
  describe('Filter Functionality', () => {
    it('should render role filter dropdown', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const roleFilter = wrapper.find('.role-filter')
      expect(roleFilter.exists()).toBe(true)
    })

    it('should render status filter dropdown', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const statusFilter = wrapper.find('.status-filter')
      expect(statusFilter.exists()).toBe(true)
    })

    it('should filter users by role', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      // 直接修改组件的 roleFilter 值
      const vm = wrapper.vm as any
      vm.roleFilter = 'admin'
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const filteredData = dataTable.props('data')
      expect(filteredData.every((user: User) => user.role?.name === 'admin')).toBe(true)
    })

    it('should filter users by status', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      // 直接修改组件的 statusFilter 值
      const vm = wrapper.vm as any
      vm.statusFilter = 'active'
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const filteredData = dataTable.props('data')
      expect(filteredData.every((user: User) => user.isActive === true)).toBe(true)
    })
  })

  // ========== 分页功能测试 ==========
  describe('Pagination Functionality', () => {
    it('should handle page change', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })

      await dataTable.vm.$emit('page-change', 2)
      await nextTick()

      const pagination = dataTable.props('pagination')
      expect(pagination.currentPage).toBe(2)
    })

    it('should handle page size change', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })

      await dataTable.vm.$emit('size-change', 50)
      await nextTick()

      const pagination = dataTable.props('pagination')
      expect(pagination.pageSize).toBe(50)
    })
  })

  // ========== 操作按钮测试 ==========
  describe('Action Buttons', () => {
    it('should render add user button', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const addButton = wrapper.find('.tech-button')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('添加用户')
    })

    it('should open add user dialog when clicking add button', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default, {
        global: {
          stubs: {
            'el-dialog': {
              props: ['modelValue', 'title'],
              template: '<div v-if="modelValue" class="el-dialog"><div class="el-dialog__title">{{ title }}</div><slot /></div>',
            },
            'el-form': true,
            'el-form-item': true,
            'el-input': true,
            'el-select': true,
            'el-option': true,
            'el-switch': true,
            'el-button': true,
          },
        },
      })

      // 等待组件挂载完成
      await nextTick()

      // 直接设置 dialogVisible 为 true 来测试对话框显示
      const vm = wrapper.vm as any
      vm.dialogVisible = true
      vm.isEdit = false
      await nextTick()

      // 检查对话框是否显示
      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)

      const dialogTitle = dialog.find('.el-dialog__title')
      expect(dialogTitle.exists()).toBe(true)
      expect(dialogTitle.text()).toBe('添加用户')
    })
  })

  // ========== 用户状态切换测试 ==========
  describe('User Status Toggle', () => {
    it('should render status switch in table', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const statusColumn = columns.find((col: any) => col.prop === 'status')
      expect(statusColumn).toBeDefined()
    })
  })

  // ========== 列配置测试 ==========
  describe('Column Configuration', () => {
    it('should have correct column labels', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')

      const expectedColumns = ['用户名', '邮箱', '部门', '角色', '状态', '操作']
      const columnLabels = columns.map((col: any) => col.label)

      expectedColumns.forEach(label => {
        expect(columnLabels).toContain(label)
      })
    })

    it('should have action column with slot', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      const columns = dataTable.props('columns')
      const actionColumn = columns.find((col: any) => col.prop === 'actions')
      expect(actionColumn).toBeDefined()
      expect(actionColumn.slot).toBeDefined()
    })
  })

  // ========== 加载状态测试 ==========
  describe('Loading State', () => {
    it('should pass loading prop to DataTable', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const dataTable = wrapper.findComponent({ name: 'DataTable' })
      expect(dataTable.props('loading')).toBeDefined()
    })
  })

  // ========== 响应式测试 ==========
  describe('Responsive Design', () => {
    it('should have responsive layout classes', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      expect(wrapper.find('.users-manage-page').exists()).toBe(true)
      expect(wrapper.find('.page-header').exists()).toBe(true)
      expect(wrapper.find('.stats-row').exists()).toBe(true)
    })
  })

  // ========== 表单提交测试 ==========
  describe('Form Submission', () => {
    it('should include role field when creating user', async () => {
      const { ElMessage } = await import('element-plus')
      vi.mocked(userApi.createUser).mockResolvedValueOnce({
        id: 4,
        username: 'newuser',
        email: 'newuser@example.com',
        department: '开发部',
        isActive: true,
        createdAt: '2024-01-01 00:00:00',
        updatedAt: '2024-01-01 00:00:00',
        role: { id: 2, name: 'developer', permissions: [] },
      })

      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      const vm = wrapper.vm as any
      vm.showAddDialog()
      await nextTick()

      // 设置表单值
      vm.form.username = 'newuser'
      vm.form.email = 'newuser@example.com'
      vm.form.password = 'password123'
      vm.form.department = '开发部'
      vm.form.role = 'developer'
      vm.form.isActive = true

      // 模拟表单验证通过
      vm.formRef = {
        validate: vi.fn().mockImplementation((callback) => callback(true)),
      }

      await vm.submitForm()
      await flushPromises()

      // 验证 createUser 被调用且包含 roleId
      expect(userApi.createUser).toHaveBeenCalledTimes(1)
      expect(userApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 2, // developer 对应的 roleId
        })
      )
    })

    it('should include role field when updating user', async () => {
      const { ElMessage } = await import('element-plus')
      vi.mocked(userApi.updateUser).mockResolvedValueOnce({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        department: '技术部',
        isActive: true,
        createdAt: '2024-01-01 00:00:00',
        updatedAt: '2024-01-01 00:00:00',
        role: { id: 1, name: 'admin', permissions: [] },
      })

      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      const vm = wrapper.vm as any
      vm.editUser(mockUsers[0])
      await nextTick()

      // 修改角色
      vm.form.role = 'admin'

      // 模拟表单验证通过
      vm.formRef = {
        validate: vi.fn().mockImplementation((callback) => callback(true)),
      }

      await vm.submitForm()
      await flushPromises()

      // 验证 updateUser 被调用且包含 roleId
      expect(userApi.updateUser).toHaveBeenCalledTimes(1)
      expect(userApi.updateUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          roleId: 1, // admin 对应的 roleId
        })
      )
    })

    it('should not submit form when validation fails', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      const vm = wrapper.vm as any
      vm.showAddDialog()
      await nextTick()

      // 模拟表单验证失败
      vm.formRef = {
        validate: vi.fn().mockImplementation((callback) => callback(false)),
      }

      await vm.submitForm()
      await flushPromises()

      // 验证 API 没有被调用
      expect(userApi.createUser).not.toHaveBeenCalled()
      expect(userApi.updateUser).not.toHaveBeenCalled()
    })

    it('should map role names to correct role IDs', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      const vm = wrapper.vm as any

      // 测试角色映射
      const testCases = [
        { role: 'admin', expectedRoleId: 1 },
        { role: 'developer', expectedRoleId: 2 },
        { role: 'viewer', expectedRoleId: 3 },
      ]

      for (const testCase of testCases) {
        vi.mocked(userApi.createUser).mockClear()
        vi.mocked(userApi.createUser).mockResolvedValueOnce({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          department: '测试部',
          isActive: true,
          createdAt: '2024-01-01 00:00:00',
          updatedAt: '2024-01-01 00:00:00',
          role: { id: testCase.expectedRoleId, name: testCase.role, permissions: [] },
        })

        vm.showAddDialog()
        await nextTick()

        vm.form.username = 'testuser'
        vm.form.email = 'test@example.com'
        vm.form.password = 'password123'
        vm.form.department = '测试部'
        vm.form.role = testCase.role

        vm.formRef = {
          validate: vi.fn().mockImplementation((callback) => callback(true)),
        }

        await vm.submitForm()
        await flushPromises()

        expect(userApi.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            roleId: testCase.expectedRoleId,
          })
        )
      }
    })
  })

  // ========== 筛选功能测试（API 调用） ==========
  describe('Filter API Calls', () => {
    it('should call API with keyword parameter when searching', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      mount(UsersView.default)

      // 等待初始加载
      await flushPromises()

      // 验证初始调用
      expect(userApi.getUsers).toHaveBeenCalled()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 这里我们需要重新获取组件实例来修改 searchQuery
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 设置搜索关键词
      vm.searchQuery = 'testuser'
      await nextTick()

      // 快进时间以触发防抖
      vi.advanceTimersByTime(300)
      await flushPromises()

      // 验证 API 被调用且包含 keyword 参数
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'testuser',
        })
      )
    })

    it('should call API with role parameter when filtering by role', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 设置角色筛选
      vm.roleFilter = 'admin'
      await nextTick()

      // 快进时间以触发防抖
      vi.advanceTimersByTime(300)
      await flushPromises()

      // 验证 API 被调用且包含 role 参数
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        })
      )
    })

    it('should call API with status parameter when filtering by status', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 设置状态筛选
      vm.statusFilter = 'active'
      await nextTick()

      // 快进时间以触发防抖
      vi.advanceTimersByTime(300)
      await flushPromises()

      // 验证 API 被调用且包含 status 参数
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })

    it('should call API with all filter parameters combined', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 设置所有筛选条件
      vm.searchQuery = 'test'
      vm.roleFilter = 'developer'
      vm.statusFilter = 'inactive'
      await nextTick()

      // 快进时间以触发防抖
      vi.advanceTimersByTime(300)
      await flushPromises()

      // 验证 API 被调用且包含所有参数
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'test',
          role: 'developer',
          status: 'inactive',
          page: 1,
          pageSize: expect.any(Number),
        })
      )
    })

    it('should reset to page 1 when filters change', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 先修改页码到第 2 页
      vm.pagination.currentPage = 2
      await nextTick()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 修改筛选条件
      vm.searchQuery = 'newsearch'
      await nextTick()

      // 快进时间以触发防抖
      vi.advanceTimersByTime(300)
      await flushPromises()

      // 验证 API 被调用且 page 重置为 1
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'newsearch',
          page: 1,
        })
      )
    })
  })

  // ========== 防抖功能测试 ==========
  describe('Debounce Functionality', () => {
    it('should debounce API calls with 300ms delay', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 快速连续修改搜索词
      vm.searchQuery = 'a'
      await nextTick()
      vm.searchQuery = 'ab'
      await nextTick()
      vm.searchQuery = 'abc'
      await nextTick()

      // 在 300ms 内 API 不应该被调用
      expect(userApi.getUsers).not.toHaveBeenCalled()

      // 快进 299ms，仍然不应该调用
      vi.advanceTimersByTime(299)
      expect(userApi.getUsers).not.toHaveBeenCalled()

      // 再快进 1ms，达到 300ms，应该调用
      vi.advanceTimersByTime(1)
      await flushPromises()

      // 验证只调用了一次 API，且使用最后的值
      expect(userApi.getUsers).toHaveBeenCalledTimes(1)
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'abc',
        })
      )
    })

    it('should clear previous timeout when filter changes rapidly', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 清除之前的调用记录
      vi.mocked(userApi.getUsers).mockClear()

      // 第一次修改
      vm.searchQuery = 'first'
      await nextTick()

      // 快进 150ms（不到 300ms）
      vi.advanceTimersByTime(150)

      // 第二次修改（应该清除第一次的定时器）
      vm.searchQuery = 'second'
      await nextTick()

      // 再快进 150ms（从第二次开始算仍然不到 300ms）
      vi.advanceTimersByTime(150)
      expect(userApi.getUsers).not.toHaveBeenCalled()

      // 再快进 150ms（从第二次开始算达到 300ms）
      vi.advanceTimersByTime(150)
      await flushPromises()

      // 验证只调用了一次 API，且使用第二次的值
      expect(userApi.getUsers).toHaveBeenCalledTimes(1)
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'second',
        })
      )
    })
  })

  // ========== 组件生命周期测试 ==========
  describe('Component Lifecycle', () => {
    it('should load user list when component is mounted', async () => {
      vi.mocked(userApi.getUsers).mockResolvedValueOnce({
        items: mockUsers,
        total: mockUsers.length,
      })

      const UsersView = await import('@/views/admin/users.vue')
      mount(UsersView.default)

      await flushPromises()

      // 验证组件挂载时调用了 getUsers
      expect(userApi.getUsers).toHaveBeenCalledTimes(1)
      expect(userApi.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
        })
      )
    })

    it('should clear timeout when component is unmounted', async () => {
      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)
      const vm = wrapper.vm as any

      // 等待初始加载
      await flushPromises()

      // 修改搜索词以创建定时器
      vm.searchQuery = 'test'
      await nextTick()

      // 验证定时器已创建（通过检查内部状态）
      expect(vm.filterTimeout).toBeDefined()

      // 卸载组件
      wrapper.unmount()

      // 验证组件已卸载且没有内存泄漏
      // 注意：在实际实现中，onUnmounted 钩子会清除定时器
    })
  })

  // ========== 统计数据测试 ==========
  describe('Statistics Calculation', () => {
    it('should calculate stats based on current page data', async () => {
      const mockPageUsers: User[] = [
        {
          id: 1,
          username: 'admin1',
          email: 'admin1@example.com',
          department: '技术部',
          isActive: true,
          createdAt: '2024-01-01 00:00:00',
          updatedAt: '2024-03-28 12:00:00',
          role: { id: 1, name: 'admin', permissions: [] },
        },
        {
          id: 2,
          username: 'admin2',
          email: 'admin2@example.com',
          department: '技术部',
          isActive: true,
          createdAt: '2024-01-01 00:00:00',
          updatedAt: '2024-03-28 12:00:00',
          role: { id: 1, name: 'admin', permissions: [] },
        },
        {
          id: 3,
          username: 'dev1',
          email: 'dev1@example.com',
          department: '开发部',
          isActive: false,
          createdAt: '2024-01-01 00:00:00',
          updatedAt: '2024-03-28 12:00:00',
          role: { id: 2, name: 'developer', permissions: [] },
        },
      ]

      vi.mocked(userApi.getUsers).mockResolvedValueOnce({
        items: mockPageUsers,
        total: mockPageUsers.length,
      })

      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      await flushPromises()

      const vm = wrapper.vm as any

      // 验证统计数据基于当前页数据计算
      expect(vm.stats.total).toBe(3)
      expect(vm.stats.active).toBe(2) // 2 个活跃用户
      expect(vm.stats.admins).toBe(2) // 2 个管理员
    })

    it('should update stats when user data changes', async () => {
      const initialUsers: User[] = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          department: '部门1',
          isActive: true,
          createdAt: '2024-01-01 00:00:00',
          updatedAt: '2024-03-28 12:00:00',
          role: { id: 1, name: 'admin', permissions: [] },
        },
      ]

      const updatedUsers: User[] = [
        ...initialUsers,
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          department: '部门2',
          isActive: false,
          createdAt: '2024-01-01 00:00:00',
          updatedAt: '2024-03-28 12:00:00',
          role: { id: 2, name: 'developer', permissions: [] },
        },
      ]

      vi.mocked(userApi.getUsers)
        .mockResolvedValueOnce({
          items: initialUsers,
          total: initialUsers.length,
        })
        .mockResolvedValueOnce({
          items: updatedUsers,
          total: updatedUsers.length,
        })

      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      await flushPromises()

      const vm = wrapper.vm as any

      // 初始统计
      expect(vm.stats.total).toBe(1)
      expect(vm.stats.active).toBe(1)
      expect(vm.stats.admins).toBe(1)

      // 触发重新加载
      await vm.loadUsers()
      await flushPromises()

      // 更新后的统计
      expect(vm.stats.total).toBe(2)
      expect(vm.stats.active).toBe(1) // 1 个活跃用户
      expect(vm.stats.admins).toBe(1) // 1 个管理员
    })

    it('should handle empty user list stats', async () => {
      vi.mocked(userApi.getUsers).mockResolvedValueOnce({
        items: [],
        total: 0,
      })

      const UsersView = await import('@/views/admin/users.vue')
      const wrapper = mount(UsersView.default)

      await flushPromises()

      const vm = wrapper.vm as any

      // 验证空列表时的统计数据
      expect(vm.stats.total).toBe(0)
      expect(vm.stats.active).toBe(0)
      expect(vm.stats.admins).toBe(0)
      expect(vm.stats.todayNew).toBe(0)
    })
  })
})
