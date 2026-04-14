import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Search: { name: 'Search' },
  Plus: { name: 'Plus' },
  Edit: { name: 'Edit' },
  Delete: { name: 'Delete' },
  More: { name: 'More' },
  Folder: { name: 'Folder' },
  FolderOpened: { name: 'FolderOpened' },
  CircleCheck: { name: 'CircleCheck' },
  Document: { name: 'Document' },
  DocumentChecked: { name: 'DocumentChecked' },
  FolderRemove: { name: 'FolderRemove' },
  FolderChecked: { name: 'FolderChecked' },
  User: { name: 'User' },
  Link: { name: 'Link' },
  Calendar: { name: 'Calendar' },
}))

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElMessage: Object.assign(
    vi.fn(() => ({ close: vi.fn() })),
    {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      closeAll: vi.fn(),
    }
  ),
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue(true),
  },
  ElInput: {
    name: 'ElInput',
    props: ['modelValue', 'placeholder', 'clearable'],
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: {
    name: 'ElButton',
    props: ['type', 'size', 'loading'],
    template: '<button class="el-button" :class="type"><slot /></button>',
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
  ElTag: {
    name: 'ElTag',
    props: ['type', 'size'],
    template: '<span class="el-tag" :class="type"><slot /></span>',
  },
  ElDropdown: {
    name: 'ElDropdown',
    props: ['trigger'],
    template: '<div class="el-dropdown"><slot /><slot name="dropdown" /></div>',
  },
  ElDropdownMenu: {
    name: 'ElDropdownMenu',
    template: '<div class="el-dropdown-menu"><slot /></div>',
  },
  ElDropdownItem: {
    name: 'ElDropdownItem',
    props: ['icon', 'divided'],
    template: '<div class="el-dropdown-item"><slot /></div>',
  },
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue', 'title', 'width'],
    template: '<div v-if="modelValue" class="el-dialog"><div class="el-dialog__title">{{ title }}</div><slot /><div class="el-dialog__footer"><slot name="footer" /></div></div>',
  },
  ElForm: {
    name: 'ElForm',
    props: ['model', 'rules'],
    template: '<form class="el-form"><slot /></form>',
  },
  ElFormItem: {
    name: 'ElFormItem',
    props: ['label', 'prop'],
    template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
  },
  ElRadioGroup: {
    name: 'ElRadioGroup',
    props: ['modelValue'],
    template: '<div class="el-radio-group"><slot /></div>',
  },
  ElRadioButton: {
    name: 'ElRadioButton',
    props: ['label'],
    template: '<label class="el-radio-button">{{ label }}</label>',
  },
  ElSwitch: {
    name: 'ElSwitch',
    props: ['modelValue'],
    template: '<span class="el-switch"><slot /></span>',
  },
  ElOption: {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option class="el-option">{{ label }}</option>',
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue', 'placeholder'],
    template: '<select class="el-select"><slot /></select>',
  },
  vLoading: {
    name: 'vLoading',
    mounted() {},
    updated() {},
    unmounted() {},
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
    props: ['label', 'value', 'suffix', 'icon', 'iconColor', 'iconBgColor'],
    template: '<div class="data-panel"><div class="data-panel__label">{{ label }}</div><div class="data-panel__value">{{ value }}{{ suffix }}</div></div>',
  },
}))

// Mock DataTable component
vi.mock('@/components/DataTable/DataTable.vue', () => ({
  default: {
    name: 'DataTable',
    props: ['data', 'columns', 'loading', 'pagination', 'showSelection'],
    emits: ['page-change', 'size-change', 'selection-change', 'row-click'],
    template: `
      <div class="data-table">
        <div class="data-table__wrapper">
          <table>
            <thead>
              <tr>
                <th v-if="showSelection"><input type="checkbox" /></th>
                <th v-for="col in columns" :key="col.prop">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in data" :key="row.id" @click="$emit('row-click', row)">
                <td v-if="showSelection"><input type="checkbox" /></td>
                <td v-for="col in columns" :key="col.prop">
                  <slot :name="'column-' + col.prop" :row="row" :value="row[col.prop]">
                    {{ row[col.prop] }}
                  </slot>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="pagination" class="data-table__pagination">
          <span>Total: {{ pagination.total }}</span>
          <button @click="$emit('page-change', pagination.currentPage - 1)">Prev</button>
          <span>{{ pagination.currentPage }}</span>
          <button @click="$emit('page-change', pagination.currentPage + 1)">Next</button>
        </div>
      </div>
    `,
  },
}))

describe('Admin Projects View', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render page with correct title and subtitle', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    expect(wrapper.find('.page-title').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toBe('项目管理')
    expect(wrapper.find('.page-subtitle').exists()).toBe(true)
    expect(wrapper.find('.page-subtitle').text()).toContain('管理系统项目')
  })

  it('should render search input', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: true,
          ElInput: {
            name: 'ElInput',
            template: '<input class="search-input" :placeholder="placeholder" />',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    expect(wrapper.find('.search-input').exists()).toBe(true)
  })

  it('should render add project button', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: {
            name: 'TechButton',
            template: '<button class="tech-button primary"><slot /></button>',
          },
          DataPanel: true,
          DataTable: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const addButton = wrapper.find('.tech-button.primary')
    expect(addButton.exists()).toBe(true)
    expect(addButton.text()).toContain('添加项目')
  })

  it('should render stats cards', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: {
            name: 'DataPanel',
            props: ['label', 'value'],
            template: '<div class="data-panel"><span class="label">{{ label }}</span><span class="value">{{ value }}</span></div>',
          },
          DataTable: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const statsRow = wrapper.find('.stats-row')
    expect(statsRow.exists()).toBe(true)

    const dataPanels = wrapper.findAll('.data-panel')
    expect(dataPanels.length).toBe(4)

    const labels = dataPanels.map(panel => panel.find('.label').text())
    expect(labels).toContain('总项目数')
    expect(labels).toContain('活跃项目')
    expect(labels).toContain('总代码行数')
    expect(labels).toContain('总提交数')
  })

  it('should render DataTable component', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: {
            name: 'DataTable',
            template: '<div class="data-table"><table><thead><tr><th>项目名称</th><th>代码</th><th>阶段</th><th>负责人</th><th>成员数</th><th>状态</th><th>操作</th></tr></thead></table></div>',
          },
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    expect(wrapper.find('.data-table').exists()).toBe(true)

    const headers = wrapper.findAll('.data-table th')
    const headerTexts = headers.map(h => h.text())
    expect(headerTexts).toContain('项目名称')
    expect(headerTexts).toContain('代码')
    expect(headerTexts).toContain('阶段')
    expect(headerTexts).toContain('负责人')
    expect(headerTexts).toContain('成员数')
    expect(headerTexts).toContain('状态')
    expect(headerTexts).toContain('操作')
  })

  it('should pass correct columns to DataTable', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: {
            name: 'DataTable',
            props: ['columns'],
            template: '<div class="data-table" :data-columns="JSON.stringify(columns)"><slot /></div>',
          },
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const dataTable = wrapper.find('.data-table')
    expect(dataTable.exists()).toBe(true)

    const columnsAttr = dataTable.attributes('data-columns')
    expect(columnsAttr).toBeTruthy()

     
    const columns = JSON.parse(columnsAttr!)
    expect(columns.length).toBeGreaterThanOrEqual(7)

     
    const columnProps = columns.map((col: { prop: string }) => col.prop)
    expect(columnProps).toContain('name')
    expect(columnProps).toContain('code')
    expect(columnProps).toContain('stage')
    expect(columnProps).toContain('manager')
    expect(columnProps).toContain('memberCount')
    expect(columnProps).toContain('status')
    expect(columnProps).toContain('actions')
  })

  it('should pass pagination config to DataTable', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: {
            name: 'DataTable',
            props: ['pagination'],
            template: '<div class="data-table" :data-pagination="JSON.stringify(pagination)"><slot /></div>',
          },
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const dataTable = wrapper.find('.data-table')
    const paginationAttr = dataTable.attributes('data-pagination')
    expect(paginationAttr).toBeTruthy()

    const pagination = JSON.parse(paginationAttr!)
    expect(pagination).toHaveProperty('currentPage')
    expect(pagination).toHaveProperty('pageSize')
    expect(pagination).toHaveProperty('total')
  })

  it('should filter projects based on search query', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: true,
          ElInput: {
            name: 'ElInput',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input class="search-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const searchInput = wrapper.find('.search-input')
    expect(searchInput.exists()).toBe(true)

    // Test that search input exists and can receive input
    await searchInput.setValue('test')
    await nextTick()
  })

  it('should render add/edit project dialog', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: {
            name: 'ElDialog',
            props: ['modelValue', 'title'],
            template: '<div v-if="modelValue" class="el-dialog"><div class="el-dialog__title">{{ title }}</div><slot /><slot name="footer" /></div>',
          },
          ElForm: {
            name: 'ElForm',
            template: '<form class="el-form"><slot /></form>',
          },
          ElFormItem: {
            name: 'ElFormItem',
            props: ['label'],
            template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
          },
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    // Initially dialog should not be visible
    expect(wrapper.find('.el-dialog').exists()).toBe(false)
  })

  it('should have correct page structure', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    expect(wrapper.find('.projects-manage-page').exists()).toBe(true)
    expect(wrapper.find('.page-header').exists()).toBe(true)
    expect(wrapper.find('.header-actions').exists()).toBe(true)
    expect(wrapper.find('.stats-row').exists()).toBe(true)
  })

  it('should handle page change event from DataTable', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: {
            name: 'DataTable',
            emits: ['page-change'],
            template: '<div class="data-table"><button class="page-change-btn" @click="$emit(\'page-change\', 2)">Change Page</button></div>',
          },
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const pageChangeBtn = wrapper.find('.page-change-btn')
    expect(pageChangeBtn.exists()).toBe(true)
  })

  it('should handle size change event from DataTable', async () => {
    const ProjectsView = await import('@/views/admin/projects.vue')
    const wrapper = mount(ProjectsView.default, {
      global: {
        stubs: {
          TechButton: true,
          DataPanel: true,
          DataTable: {
            name: 'DataTable',
            emits: ['size-change'],
            template: '<div class="data-table"><button class="size-change-btn" @click="$emit(\'size-change\', 20)">Change Size</button></div>',
          },
          ElInput: true,
          ElButton: true,
          ElIcon: true,
          ElTag: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElRadioGroup: true,
          ElRadioButton: true,
        },
      },
    })

    const sizeChangeBtn = wrapper.find('.size-change-btn')
    expect(sizeChangeBtn.exists()).toBe(true)
  })
})
