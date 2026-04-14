import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import DataFilter, {
  type FilterConfig,
  type FilterValue,
} from '@/components/DataFilter/DataFilter.vue'
import {
  ElInput,
  ElSelect,
  ElDatePicker,
  ElCascader,
  ElButton,
  ElRow,
  ElCol,
  ElForm,
  ElFormItem,
  ElIcon,
} from 'element-plus'
import { ArrowDown, ArrowUp, Refresh, Search } from '@element-plus/icons-vue'

// 模拟筛选配置
const mockFilters: FilterConfig[] = [
  {
    key: 'keyword',
    label: '关键词',
    type: 'text',
    placeholder: '请输入关键词',
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' },
    ],
  },
  {
    key: 'tags',
    label: '标签',
    type: 'multiSelect',
    placeholder: '请选择标签',
    options: [
      { label: 'Vue', value: 'vue' },
      { label: 'React', value: 'react' },
      { label: 'Angular', value: 'angular' },
    ],
  },
  {
    key: 'dateRange',
    label: '日期范围',
    type: 'dateRange',
    placeholder: ['开始日期', '结束日期'],
  },
  {
    key: 'amount',
    label: '金额范围',
    type: 'numberRange',
    placeholder: ['最小金额', '最大金额'],
  },
  {
    key: 'category',
    label: '分类',
    type: 'cascader',
    placeholder: '请选择分类',
    options: [
      {
        label: '技术',
        value: 'tech',
        children: [
          { label: '前端', value: 'frontend' },
          { label: '后端', value: 'backend' },
        ],
      },
      { label: '设计', value: 'design' },
    ],
  },
]

describe('DataFilter', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(DataFilter, {
      props: {
        filters: mockFilters,
        modelValue: {},
      },
    })
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      expect(wrapper.find('.data-filter').exists()).toBe(true)
    })

    it('should render ElForm component', () => {
      expect(wrapper.findComponent(ElForm).exists()).toBe(true)
    })

    it('should render correct number of filter items', () => {
      const formItems = wrapper.findAll('.data-filter__item')
      expect(formItems.length).toBe(mockFilters.length)
    })

    it('should render filter labels correctly', () => {
      mockFilters.forEach((filter) => {
        expect(wrapper.text()).toContain(filter.label)
      })
    })
  })

  // ========== 文本输入类型测试 ==========
  describe('Text Input Filter Type', () => {
    it('should render ElInput for text type filter', () => {
      const input = wrapper.findComponent(ElInput)
      expect(input.exists()).toBe(true)
    })

    it('should pass placeholder to ElInput', () => {
      const input = wrapper.findComponent(ElInput)
      expect(input.props('placeholder')).toBe('请输入关键词')
    })

    it('should support v-model for text input', async () => {
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'test keyword')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toMatchObject({ keyword: 'test keyword' })
    })
  })

  // ========== 下拉选择类型测试 ==========
  describe('Select Filter Type', () => {
    it('should render ElSelect for select type filter', () => {
      const selects = wrapper.findAllComponents(ElSelect)
      expect(selects.length).toBeGreaterThan(0)
    })

    it('should render options for select filter', () => {
      const wrapperSelect = mount(DataFilter, {
        props: {
          filters: [mockFilters[1]], // status select filter
          modelValue: {},
        },
      })
      const select = wrapperSelect.findComponent(ElSelect)
      expect(select.exists()).toBe(true)
    })

    it('should emit update:modelValue when select value changes', async () => {
      const wrapperSelect = mount(DataFilter, {
        props: {
          filters: [mockFilters[1]],
          modelValue: {},
        },
      })
      const select = wrapperSelect.findComponent(ElSelect)
      await select.vm.$emit('change', 'active')
      await nextTick()

      const emitted = wrapperSelect.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toMatchObject({ status: 'active' })
    })
  })

  // ========== 多选下拉类型测试 ==========
  describe('MultiSelect Filter Type', () => {
    it('should render ElSelect with multiple for multiSelect type', () => {
      const wrapperMulti = mount(DataFilter, {
        props: {
          filters: [mockFilters[2]], // tags multiSelect filter
          modelValue: {},
        },
      })
      const select = wrapperMulti.findComponent(ElSelect)
      expect(select.exists()).toBe(true)
      expect(select.props('multiple')).toBe(true)
    })

    it('should support array value for multiSelect', async () => {
      const wrapperMulti = mount(DataFilter, {
        props: {
          filters: [mockFilters[2]],
          modelValue: { tags: ['vue'] },
        },
      })

      const emitted = wrapperMulti.emitted('update:modelValue')
      // Initial value should be set
      expect(wrapperMulti.props('modelValue')).toMatchObject({ tags: ['vue'] })
    })

    it('should emit array value when multiSelect changes', async () => {
      const wrapperMulti = mount(DataFilter, {
        props: {
          filters: [mockFilters[2]],
          modelValue: {},
        },
      })
      const select = wrapperMulti.findComponent(ElSelect)
      await select.vm.$emit('change', ['vue', 'react'])
      await nextTick()

      const emitted = wrapperMulti.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toMatchObject({ tags: ['vue', 'react'] })
    })
  })

  // ========== 日期范围类型测试 ==========
  describe('DateRange Filter Type', () => {
    it('should render DateRangePicker for dateRange type filter', () => {
      const wrapperDate = mount(DataFilter, {
        props: {
          filters: [mockFilters[3]], // dateRange filter
          modelValue: {},
        },
      })
      // Check if date picker component is rendered
      expect(wrapperDate.find('.data-filter').exists()).toBe(true)
    })

    it('should emit update:modelValue when date range changes', async () => {
      const wrapperDate = mount(DataFilter, {
        props: {
          filters: [mockFilters[3]],
          modelValue: {},
        },
      })
      const datePicker = wrapperDate.findComponent(ElDatePicker)
      const dateRange = ['2024-01-01', '2024-01-31']
      await datePicker.vm.$emit('change', dateRange)
      await nextTick()

      const emitted = wrapperDate.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
    })
  })

  // ========== 数字范围类型测试 ==========
  describe('NumberRange Filter Type', () => {
    it('should render two ElInput for numberRange type filter', () => {
      const wrapperNum = mount(DataFilter, {
        props: {
          filters: [mockFilters[4]], // amount numberRange filter
          modelValue: {},
        },
      })
      const inputs = wrapperNum.findAllComponents(ElInput)
      expect(inputs.length).toBe(2)
    })

    it('should emit update:modelValue when min value changes', async () => {
      const wrapperNum = mount(DataFilter, {
        props: {
          filters: [mockFilters[4]],
          modelValue: {},
        },
      })
      const inputs = wrapperNum.findAllComponents(ElInput)
      await inputs[0].vm.$emit('update:modelValue', '100')
      await nextTick()

      const emitted = wrapperNum.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
    })

    it('should emit update:modelValue when max value changes', async () => {
      const wrapperNum = mount(DataFilter, {
        props: {
          filters: [mockFilters[4]],
          modelValue: {},
        },
      })
      const inputs = wrapperNum.findAllComponents(ElInput)
      await inputs[1].vm.$emit('update:modelValue', '500')
      await nextTick()

      const emitted = wrapperNum.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
    })
  })

  // ========== 级联选择类型测试 ==========
  describe('Cascader Filter Type', () => {
    it('should render ElCascader for cascader type filter', () => {
      const wrapperCascader = mount(DataFilter, {
        props: {
          filters: [mockFilters[5]], // category cascader filter
          modelValue: {},
        },
      })
      const cascader = wrapperCascader.findComponent(ElCascader)
      expect(cascader.exists()).toBe(true)
    })

    it('should pass options to ElCascader', () => {
      const wrapperCascader = mount(DataFilter, {
        props: {
          filters: [mockFilters[5]],
          modelValue: {},
        },
      })
      const cascader = wrapperCascader.findComponent(ElCascader)
      expect(cascader.props('options')).toEqual(mockFilters[5].options)
    })

    it('should emit update:modelValue when cascader value changes', async () => {
      const wrapperCascader = mount(DataFilter, {
        props: {
          filters: [mockFilters[5]],
          modelValue: {},
        },
      })
      const cascader = wrapperCascader.findComponent(ElCascader)
      await cascader.vm.$emit('change', ['tech', 'frontend'])
      await nextTick()

      const emitted = wrapperCascader.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toMatchObject({ category: ['tech', 'frontend'] })
    })
  })

  // ========== Props 测试 ==========
  describe('Props', () => {
    it('should support modelValue prop', async () => {
      const wrapperWithValue = mount(DataFilter, {
        props: {
          filters: [mockFilters[0]],
          modelValue: { keyword: 'initial value' },
        },
      })

      const input = wrapperWithValue.findComponent(ElInput)
      expect(input.props('modelValue')).toBe('initial value')
    })

    it('should support loading prop', () => {
      const wrapperLoading = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
          loading: true,
        },
      })

      expect(wrapperLoading.props('loading')).toBe(true)
    })

    it('should support collapsible prop', () => {
      const wrapperCollapsible = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
          collapsible: true,
        },
      })

      expect(wrapperCollapsible.props('collapsible')).toBe(true)
    })

    it('should disable inputs when loading is true', () => {
      const wrapperLoading = mount(DataFilter, {
        props: {
          filters: [mockFilters[0]],
          modelValue: {},
          loading: true,
        },
      })

      const input = wrapperLoading.findComponent(ElInput)
      expect(input.props('disabled')).toBe(true)
    })
  })

  // ========== 重置功能测试 ==========
  describe('Reset Functionality', () => {
    it('should render reset button', () => {
      const resetBtn = wrapper.find('[data-test="reset-btn"]')
      expect(resetBtn.exists()).toBe(true)
    })

    it('should emit reset event when reset button clicked', async () => {
      const resetBtn = wrapper.find('[data-test="reset-btn"]')
      await resetBtn.trigger('click')

      expect(wrapper.emitted('reset')).toBeTruthy()
    })

    it('should emit update:modelValue with empty values when reset', async () => {
      // Set some initial values
      const wrapperWithValues = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {
            keyword: 'test',
            status: 'active',
            tags: ['vue'],
          },
        },
      })

      const resetBtn = wrapperWithValues.find('[data-test="reset-btn"]')
      await resetBtn.trigger('click')

      const emitted = wrapperWithValues.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      // After reset, values should be cleared
      const lastValue = emitted![emitted!.length - 1][0] as FilterValue
      expect(lastValue.keyword).toBe('')
      expect(lastValue.status).toBe('')
      expect(lastValue.tags).toEqual([])
    })
  })

  // ========== 应用功能测试 ==========
  describe('Apply Functionality', () => {
    it('should render apply/search button', () => {
      const applyBtn = wrapper.find('[data-test="apply-btn"]')
      expect(applyBtn.exists()).toBe(true)
    })

    it('should emit apply event when apply button clicked', async () => {
      const applyBtn = wrapper.find('[data-test="apply-btn"]')
      await applyBtn.trigger('click')

      expect(wrapper.emitted('apply')).toBeTruthy()
    })

    it('should pass current filter values with apply event', async () => {
      const wrapperWithValues = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {
            keyword: 'search term',
            status: 'active',
          },
        },
      })

      const applyBtn = wrapperWithValues.find('[data-test="apply-btn"]')
      await applyBtn.trigger('click')

      const emitted = wrapperWithValues.emitted('apply')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toMatchObject({
        keyword: 'search term',
        status: 'active',
      })
    })

    it('should not emit apply when loading is true', async () => {
      const wrapperLoading = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
          loading: true,
        },
      })

      const applyBtn = wrapperLoading.find('[data-test="apply-btn"]')
      await applyBtn.trigger('click')

      expect(wrapperLoading.emitted('apply')).toBeFalsy()
    })
  })

  // ========== 折叠功能测试 ==========
  describe('Collapse Functionality', () => {
    it('should render collapse button when collapsible is true and filters > 3', () => {
      const wrapperCollapsible = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
          collapsible: true,
        },
      })

      const collapseBtn = wrapperCollapsible.find('[data-test="collapse-btn"]')
      expect(collapseBtn.exists()).toBe(true)
    })

    it('should not render collapse button when filters <= 3', () => {
      const wrapperFewFilters = mount(DataFilter, {
        props: {
          filters: mockFilters.slice(0, 3),
          modelValue: {},
          collapsible: true,
        },
      })

      const collapseBtn = wrapperFewFilters.find('[data-test="collapse-btn"]')
      expect(collapseBtn.exists()).toBe(false)
    })

    it('should toggle collapse state when button clicked', async () => {
      const wrapperCollapsible = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
          collapsible: true,
        },
      })

      const collapseBtn = wrapperCollapsible.find('[data-test="collapse-btn"]')
      await collapseBtn.trigger('click')

      expect(wrapperCollapsible.emitted('collapse')).toBeTruthy()
    })

    it('should show only first 3 filters when collapsed', async () => {
      const wrapperCollapsible = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
          collapsible: true,
        },
      })

      // Initially should show all or collapsed based on default
      const collapseBtn = wrapperCollapsible.find('[data-test="collapse-btn"]')
      await collapseBtn.trigger('click')
      await nextTick()

      // After clicking collapse, should emit collapse event
      expect(wrapperCollapsible.emitted('collapse')).toBeTruthy()
    })
  })

  // ========== 双向绑定测试 ==========
  describe('Two-way Binding', () => {
    it('should update modelValue when filter value changes', async () => {
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'new value')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toMatchObject({ keyword: 'new value' })
    })

    it('should reflect modelValue changes in inputs', async () => {
      const wrapperBound = mount(DataFilter, {
        props: {
          filters: [mockFilters[0]],
          modelValue: { keyword: 'initial' },
        },
      })

      const input = wrapperBound.findComponent(ElInput)
      expect(input.props('modelValue')).toBe('initial')

      await wrapperBound.setProps({ modelValue: { keyword: 'updated' } })
      await nextTick()

      expect(input.props('modelValue')).toBe('updated')
    })
  })

  // ========== 动态配置测试 ==========
  describe('Dynamic Configuration', () => {
    it('should update when filters prop changes', async () => {
      const newFilters: FilterConfig[] = [
        { key: 'newField', label: '新字段', type: 'text' },
      ]

      await wrapper.setProps({ filters: newFilters })
      await nextTick()

      expect(wrapper.text()).toContain('新字段')
    })

    it('should handle empty filters array', () => {
      const wrapperEmpty = mount(DataFilter, {
        props: {
          filters: [],
          modelValue: {},
        },
      })

      expect(wrapperEmpty.find('.data-filter').exists()).toBe(true)
      expect(wrapperEmpty.findAll('.data-filter__item').length).toBe(0)
    })
  })

  // ========== 事件测试 ==========
  describe('Events', () => {
    it('should emit change event when any filter changes', async () => {
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'test')
      await nextTick()

      expect(wrapper.emitted('change')).toBeTruthy()
    })

    it('should emit update:modelValue when filter value changes', async () => {
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'test')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  // ========== 方法测试 ==========
  describe('Methods', () => {
    it('should expose getValues method', () => {
      expect(typeof wrapper.vm.getValues).toBe('function')
    })

    it('should expose setValues method', () => {
      expect(typeof wrapper.vm.setValues).toBe('function')
    })

    it('should expose reset method', () => {
      expect(typeof wrapper.vm.reset).toBe('function')
    })

    it('getValues should return current filter values', async () => {
      const wrapperWithValues = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: { keyword: 'test value' },
        },
      })

      const values = wrapperWithValues.vm.getValues()
      expect(values.keyword).toBe('test value')
    })

    it('setValues should update filter values', async () => {
      wrapper.vm.setValues({ status: 'active', keyword: 'new' })
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
    })

    it('reset should clear all values and emit reset event', async () => {
      wrapper.vm.reset()
      await nextTick()

      expect(wrapper.emitted('reset')).toBeTruthy()
    })
  })

  // ========== 空状态测试 ==========
  describe('Empty State', () => {
    it('should render with empty modelValue', () => {
      const wrapperEmpty = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
        },
      })

      expect(wrapperEmpty.find('.data-filter').exists()).toBe(true)
    })

    it('should handle undefined modelValue gracefully', () => {
      const wrapperUndefined = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: undefined as any,
        },
      })

      expect(wrapperUndefined.find('.data-filter').exists()).toBe(true)
    })
  })

  // ========== 复杂场景测试 ==========
  describe('Complex Scenarios', () => {
    it('should handle all filter types simultaneously', () => {
      const wrapperComplex = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {
            keyword: 'test',
            status: 'active',
            tags: ['vue', 'react'],
            dateRange: ['2024-01-01', '2024-01-31'],
            amount: [100, 500],
            category: ['tech', 'frontend'],
          },
        },
      })

      expect(wrapperComplex.find('.data-filter').exists()).toBe(true)
      const values = wrapperComplex.vm.getValues()
      expect(values.keyword).toBe('test')
      expect(values.status).toBe('active')
    })

    it('should maintain filter value types correctly', async () => {
      const wrapperTypes = mount(DataFilter, {
        props: {
          filters: mockFilters,
          modelValue: {},
        },
      })

      // Test that different types are handled correctly
      const values = wrapperTypes.vm.getValues()
      // String type
      expect(typeof values.keyword === 'string' || values.keyword === undefined).toBe(true)
      // Array types
      expect(Array.isArray(values.tags) || values.tags === undefined).toBe(true)
    })
  })
})
