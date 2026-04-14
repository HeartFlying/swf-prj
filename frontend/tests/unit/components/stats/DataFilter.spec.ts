import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DataFilter from '@/components/stats/DataFilter.vue'

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElSelect: {
    name: 'ElSelect',
    template: '<select class="el-select" @change="$emit(\'change\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'multiple', 'clearable', 'collapseTags'],
    emits: ['update:modelValue', 'change'],
  },
  ElOption: {
    name: 'ElOption',
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  ElCascader: {
    name: 'ElCascader',
    template: '<input type="text" class="el-cascader" @input="$emit(\'change\', $event.target.value)" />',
    props: ['modelValue', 'options', 'placeholder', 'props', 'clearable'],
    emits: ['update:modelValue', 'change'],
  },
  ElInput: {
    name: 'ElInput',
    template: '<input type="text" class="el-input" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue', 'input'],
  },
  ElButton: {
    name: 'ElButton',
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'size', 'icon'],
    emits: ['click'],
  },
  ElTag: {
    name: 'ElTag',
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'closable', 'size'],
    emits: ['close'],
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span class="el-icon"><slot /></span>',
  },
}))

describe('DataFilter', () => {
  const mockFilters = [
    {
      key: 'projectId',
      label: '项目',
      type: 'select' as const,
      options: [
        { label: '项目A', value: 1 },
        { label: '项目B', value: 2 },
      ],
    },
    {
      key: 'department',
      label: '部门',
      type: 'select' as const,
      options: [
        { label: '研发部', value: 'dev' },
        { label: '测试部', value: 'qa' },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default props', () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
      },
    })

    expect(wrapper.find('.data-filter').exists()).toBe(true)
  })

  it('should render all filter fields', () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
      },
    })

    const filterItems = wrapper.findAll('.data-filter__item')
    expect(filterItems.length).toBe(2)
  })

  it('should emit change event when filter value changes', async () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
      },
      global: {
        stubs: ['ElSelect', 'ElOption', 'ElCascader', 'ElInput', 'ElButton', 'ElTag', 'ElIcon'],
      },
    })

    // Use the component method directly
    await wrapper.vm.updateFilter('projectId', 1)
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0][0]).toHaveProperty('projectId')
  })

  it('should emit change event with all filter values', async () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {
          projectId: 1,
          department: 'dev',
        },
      },
    })

    // Trigger a change
    await wrapper.vm.updateFilter('projectId', 2)
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as Record<string, unknown>
    expect(lastCall).toHaveProperty('projectId', 2)
    expect(lastCall).toHaveProperty('department', 'dev')
  })

  it('should update modelValue when filter changes', async () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {},
      },
    })

    await wrapper.vm.updateFilter('projectId', 1)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should clear all filters when clear is called', async () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {
          projectId: 1,
          department: 'dev',
        },
      },
    })

    await wrapper.vm.clearFilters()
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as Record<string, unknown>
    expect(Object.keys(lastCall).length).toBe(0)
  })

  it('should clear single filter when clearFilter is called', async () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {
          projectId: 1,
          department: 'dev',
        },
      },
    })

    await wrapper.vm.clearFilter('projectId')
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as Record<string, unknown>
    expect(lastCall).not.toHaveProperty('projectId')
    expect(lastCall).toHaveProperty('department', 'dev')
  })

  it('should show active filters count', () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {
          projectId: 1,
          department: 'dev',
        },
      },
    })

    const activeCount = wrapper.vm.activeFiltersCount
    expect(activeCount).toBe(2)
  })

  it('should render cascader filter type', () => {
    const cascaderFilter = [
      {
        key: 'category',
        label: '分类',
        type: 'cascader' as const,
        options: [
          {
            label: '技术',
            value: 'tech',
            children: [
              { label: '前端', value: 'frontend' },
              { label: '后端', value: 'backend' },
            ],
          },
        ],
      },
    ]

    const wrapper = mount(DataFilter, {
      props: {
        filters: cascaderFilter,
      },
    })

    expect(wrapper.find('.data-filter__item').exists()).toBe(true)
  })

  it('should render input filter type', () => {
    const inputFilter = [
      {
        key: 'keyword',
        label: '关键词',
        type: 'input' as const,
        placeholder: '请输入关键词',
      },
    ]

    const wrapper = mount(DataFilter, {
      props: {
        filters: inputFilter,
      },
    })

    expect(wrapper.find('.data-filter__item').exists()).toBe(true)
  })

  it('should support multiple select', async () => {
    const multiSelectFilter = [
      {
        key: 'status',
        label: '状态',
        type: 'select' as const,
        multiple: true,
        options: [
          { label: '活跃', value: 'active' },
          { label: '归档', value: 'archived' },
        ],
      },
    ]

    const wrapper = mount(DataFilter, {
      props: {
        filters: multiSelectFilter,
      },
    })

    await wrapper.vm.updateFilter('status', ['active', 'archived'])
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as Record<string, string[]>
    expect(lastCall.status).toEqual(['active', 'archived'])
  })

  it('should expose getFilterValues method', () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {
          projectId: 1,
        },
      },
    })

    const values = wrapper.vm.getFilterValues()
    expect(values).toEqual({ projectId: 1 })
  })

  it('should render quick filters when provided', () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        quickFilters: [
          { label: '我的项目', value: { projectId: 1 } },
          { label: '全部项目', value: {} },
        ],
      },
    })

    expect(wrapper.find('.data-filter__quick').exists()).toBe(true)
  })

  it('should apply quick filter when clicked', async () => {
    const wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        quickFilters: [
          { label: '我的项目', value: { projectId: 1 } },
          { label: '全部项目', value: {} },
        ],
      },
    })

    const quickBtn = wrapper.find('.data-filter__quick-item:first-child')
    await quickBtn.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    const lastCall = wrapper.emitted('change')!.at(-1)![0] as Record<string, unknown>
    expect(lastCall).toHaveProperty('projectId', 1)
  })
})
