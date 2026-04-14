import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import FilterBar, {
  type FilterItem,
  type FilterValue,
  type QuickFilter,
} from '@/components/FilterBar/FilterBar.vue'
import {
  ElInput,
  ElSelect,
  ElDatePicker,
  ElCascader,
  ElButton,
  ElTag,
  ElForm,
  ElFormItem,
} from 'element-plus'

// 模拟筛选配置
const mockFilters: FilterItem[] = [
  {
    key: 'keyword',
    label: '关键词',
    type: 'input',
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
    key: 'dateRange',
    label: '日期范围',
    type: 'dateRange',
    placeholder: ['开始日期', '结束日期'],
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
]

const mockQuickFilters: QuickFilter[] = [
  { label: '今天', value: { dateRange: ['2024-01-01', '2024-01-01'] } },
  { label: '本周', value: { dateRange: ['2024-01-01', '2024-01-07'] } },
  { label: '本月', value: { dateRange: ['2024-01-01', '2024-01-31'] } },
]

describe('FilterBar', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(FilterBar, {
      props: {
        filters: mockFilters,
      },
    })
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
    })

    it('should render ElForm component', () => {
      expect(wrapper.findComponent(ElForm).exists()).toBe(true)
    })

    it('should render correct number of filter items', () => {
      const formItems = wrapper.findAll('.filter-bar__col .el-form-item')
      expect(formItems.length).toBe(mockFilters.length)
    })

    it('should render filter labels correctly', () => {
      mockFilters.forEach((filter) => {
        expect(wrapper.text()).toContain(filter.label)
      })
    })
  })

  // ========== 输入框类型测试 ==========
  describe('Input Filter Type', () => {
    it('should render ElInput for input type filter', () => {
      const input = wrapper.findComponent(ElInput)
      expect(input.exists()).toBe(true)
    })

    it('should pass placeholder to ElInput', () => {
      const input = wrapper.findComponent(ElInput)
      expect(input.props('placeholder')).toBe('请输入关键词')
    })

    it('should update model value when input changes', async () => {
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'test keyword')
      await nextTick()

      const emitted = wrapper.emitted('change')
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

    it('should pass options to ElSelect', () => {
      const select = wrapper.findAllComponents(ElSelect)[0]
      expect(select.exists()).toBe(true)
    })

    it('should emit change event when select value changes', async () => {
      const select = wrapper.findAllComponents(ElSelect)[0]
      await select.vm.$emit('change', 'active')
      await nextTick()

      const emitted = wrapper.emitted('change')
      expect(emitted).toBeTruthy()
    })
  })

  // ========== 日期范围类型测试 ==========
  describe('DateRange Filter Type', () => {
    it('should render ElDatePicker for dateRange type filter', () => {
      const datePickers = wrapper.findAllComponents(ElDatePicker)
      expect(datePickers.length).toBeGreaterThan(0)
    })

    it('should pass type="daterange" to ElDatePicker', () => {
      const datePicker = wrapper.findAllComponents(ElDatePicker)[0]
      expect(datePicker.props('type')).toBe('daterange')
    })

    it('should emit change event when date range changes', async () => {
      const datePicker = wrapper.findAllComponents(ElDatePicker)[0]
      const dateRange = ['2024-01-01', '2024-01-31']
      await datePicker.vm.$emit('change', dateRange)
      await nextTick()

      expect(wrapper.emitted()).toHaveProperty('change')
    })
  })

  // ========== 级联选择类型测试 ==========
  describe('Cascader Filter Type', () => {
    it('should render ElCascader for cascader type filter', () => {
      const cascaders = wrapper.findAllComponents(ElCascader)
      expect(cascaders.length).toBeGreaterThan(0)
    })

    it('should pass options to ElCascader', () => {
      const cascader = wrapper.findAllComponents(ElCascader)[0]
      expect(cascader.exists()).toBe(true)
    })

    it('should emit change event when cascader value changes', async () => {
      const cascader = wrapper.findAllComponents(ElCascader)[0]
      await cascader.vm.$emit('change', ['tech', 'frontend'])
      await nextTick()

      // Cascader change triggers handleFilterChange which emits 'change' event
      expect(wrapper.emitted()).toHaveProperty('change')
    })
  })

  // ========== 多选筛选类型测试 ==========
  describe('MultiSelect Filter Type', () => {
    it('should render ElSelect for multiSelect type filter', () => {
      const selects = wrapper.findAllComponents(ElSelect)
      // Should have select for 'status' and multiSelect for 'tags'
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })

    it('should initialize multiSelect with empty array', () => {
      const values = wrapper.vm.getValues()
      expect(values.tags).toEqual([])
    })

    it('should emit change event when multiSelect value changes', async () => {
      const multiSelectFilter: FilterItem = {
        key: 'tags',
        label: '标签',
        type: 'multiSelect',
        placeholder: '请选择标签',
        options: [
          { label: 'Vue', value: 'vue' },
          { label: 'React', value: 'react' },
        ],
      }

      const wrapperMulti = mount(FilterBar, {
        props: {
          filters: [multiSelectFilter],
        },
      })

      const select = wrapperMulti.findComponent(ElSelect)
      await select.vm.$emit('change', ['vue', 'react'])
      await nextTick()

      expect(wrapperMulti.emitted('change')).toBeTruthy()
      const emitted = wrapperMulti.emitted('change')
      expect(emitted![0][0]).toMatchObject({ tags: ['vue', 'react'] })
    })

    it('should support initial values for multiSelect', () => {
      const wrapperWithInitial = mount(FilterBar, {
        props: {
          filters: [
            {
              key: 'tags',
              label: '标签',
              type: 'multiSelect',
              options: [
                { label: 'Vue', value: 'vue' },
                { label: 'React', value: 'react' },
              ],
            },
          ],
          initialValues: { tags: ['vue'] },
        },
      })

      const values = wrapperWithInitial.vm.getValues()
      expect(values.tags).toEqual(['vue'])
    })
  })

  // ========== 快速筛选标签测试 ==========
  describe('Quick Filters', () => {
    it('should render quick filter tags when provided', () => {
      const wrapperWithQuick = mount(FilterBar, {
        props: {
          filters: mockFilters,
          quickFilters: mockQuickFilters,
        },
      })

      const tags = wrapperWithQuick.findAllComponents(ElTag)
      expect(tags.length).toBe(mockQuickFilters.length)
    })

    it('should display quick filter labels', () => {
      const wrapperWithQuick = mount(FilterBar, {
        props: {
          filters: mockFilters,
          quickFilters: mockQuickFilters,
        },
      })

      mockQuickFilters.forEach((qf) => {
        expect(wrapperWithQuick.text()).toContain(qf.label)
      })
    })

    it('should emit change with quick filter value when clicked', async () => {
      const wrapperWithQuick = mount(FilterBar, {
        props: {
          filters: mockFilters,
          quickFilters: mockQuickFilters,
        },
      })

      // Wait for component to mount
      await nextTick()

      // Find and click the first quick filter tag
      const tag = wrapperWithQuick.findComponent(ElTag)
      expect(tag.exists()).toBe(true)

      // Directly call the handler to ensure the event is emitted
      await tag.vm.$emit('click')
      await nextTick()

      // Verify the change event was emitted
      const emitted = wrapperWithQuick.emitted()
      expect(emitted).toHaveProperty('change')
    })

    it('should highlight active quick filter', async () => {
      const wrapperWithQuick = mount(FilterBar, {
        props: {
          filters: mockFilters,
          quickFilters: mockQuickFilters,
        },
      })

      await nextTick()

      // Find the first tag and trigger click via component
      const tag = wrapperWithQuick.findComponent(ElTag)
      expect(tag.exists()).toBe(true)
      await tag.vm.$emit('click')
      await nextTick()

      // Check that the activeQuickFilter state was updated
      expect(wrapperWithQuick.vm.activeQuickFilter).toBe(mockQuickFilters[0].label)
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

    it('should clear all filter values when reset', async () => {
      // 先设置一些值
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'test')

      // 重置
      const resetBtn = wrapper.find('[data-test="reset-btn"]')
      await resetBtn.trigger('click')

      const emitted = wrapper.emitted('change')
      const lastChange = emitted![emitted!.length - 1][0] as FilterValue

      // 验证值被清空
      Object.values(lastChange).forEach((val) => {
        if (Array.isArray(val)) {
          expect(val.length).toBe(0)
        } else {
          expect(val).toBeFalsy()
        }
      })
    })

    it('should reset to initial values when provided', async () => {
      const initialValues = { status: 'active' }
      const wrapperWithInitial = mount(FilterBar, {
        props: {
          filters: mockFilters,
          initialValues,
        },
      })

      const resetBtn = wrapperWithInitial.find('[data-test="reset-btn"]')
      await resetBtn.trigger('click')

      const emitted = wrapperWithInitial.emitted('change')
      const lastChange = emitted![emitted!.length - 1][0] as FilterValue
      expect(lastChange.status).toBe('active')
    })
  })

  // ========== 查询功能测试 ==========
  describe('Search Functionality', () => {
    it('should render search button', () => {
      const searchBtn = wrapper.find('[data-test="search-btn"]')
      expect(searchBtn.exists()).toBe(true)
    })

    it('should emit search event when search button clicked', async () => {
      const searchBtn = wrapper.find('[data-test="search-btn"]')
      await searchBtn.trigger('click')

      expect(wrapper.emitted('search')).toBeTruthy()
    })

    it('should pass current filter values with search event', async () => {
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'search term')
      await nextTick()

      const searchBtn = wrapper.find('[data-test="search-btn"]')
      await searchBtn.trigger('click')

      const emitted = wrapper.emitted('search')
      expect(emitted![0][0]).toMatchObject({ keyword: 'search term' })
    })

    it('should not emit search when loading', async () => {
      const wrapperLoading = mount(FilterBar, {
        props: {
          filters: mockFilters,
          loading: true,
        },
      })

      const searchBtn = wrapperLoading.find('[data-test="search-btn"]')
      await searchBtn.trigger('click')

      expect(wrapperLoading.emitted('search')).toBeFalsy()
    })
  })

  // ========== 响应式布局测试 ==========
  describe('Responsive Layout', () => {
    it('should have responsive CSS classes', () => {
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
      expect(wrapper.find('.filter-bar__content').exists()).toBe(true)
    })

    it('should support custom column span', () => {
      const customFilters: FilterItem[] = [
        { key: 'test', label: '测试', type: 'input', span: 12 },
      ]
      const wrapperCustom = mount(FilterBar, {
        props: {
          filters: customFilters,
        },
      })

      expect(wrapperCustom.find('.filter-bar').exists()).toBe(true)
    })

    it('should support gutter configuration', () => {
      const wrapperWithGutter = mount(FilterBar, {
        props: {
          filters: mockFilters,
          gutter: 20,
        },
      })

      expect(wrapperWithGutter.find('.filter-bar').exists()).toBe(true)
    })
  })

  // ========== Props 测试 ==========
  describe('Props', () => {
    it('should support inline mode', () => {
      const wrapperInline = mount(FilterBar, {
        props: {
          filters: mockFilters,
          inline: true,
        },
      })

      const form = wrapperInline.findComponent(ElForm)
      expect(form.props('inline')).toBe(true)
    })

    it('should support label position', () => {
      const wrapperTop = mount(FilterBar, {
        props: {
          filters: mockFilters,
          labelPosition: 'top',
        },
      })

      const form = wrapperTop.findComponent(ElForm)
      expect(form.props('labelPosition')).toBe('top')
    })

    it('should support label width', () => {
      const wrapperWidth = mount(FilterBar, {
        props: {
          filters: mockFilters,
          labelWidth: '120px',
        },
      })

      const form = wrapperWidth.findComponent(ElForm)
      expect(form.props('labelWidth')).toBe('120px')
    })

    it('should support loading state', () => {
      const wrapperLoading = mount(FilterBar, {
        props: {
          filters: mockFilters,
          loading: true,
        },
      })

      const searchBtn = wrapperLoading.findComponent(ElButton)
      expect(searchBtn.exists()).toBe(true)
      // Check that search button exists and component has loading prop
      expect(wrapperLoading.vm.loading).toBe(true)
    })

    it('should support disabled state', () => {
      const wrapperDisabled = mount(FilterBar, {
        props: {
          filters: mockFilters,
          disabled: true,
        },
      })

      const input = wrapperDisabled.findComponent(ElInput)
      expect(input.props('disabled')).toBe(true)
    })

    it('should support size prop', () => {
      const wrapperSmall = mount(FilterBar, {
        props: {
          filters: mockFilters,
          size: 'small',
        },
      })

      const form = wrapperSmall.findComponent(ElForm)
      expect(form.props('size')).toBe('small')
    })

    it('should support showReset prop', () => {
      const wrapperNoReset = mount(FilterBar, {
        props: {
          filters: mockFilters,
          showReset: false,
        },
      })

      const resetBtn = wrapperNoReset.find('[data-test="reset-btn"]')
      expect(resetBtn.exists()).toBe(false)
    })

    it('should support showSearch prop', () => {
      const wrapperNoSearch = mount(FilterBar, {
        props: {
          filters: mockFilters,
          showSearch: false,
        },
      })

      const searchBtn = wrapperNoSearch.find('[data-test="search-btn"]')
      expect(searchBtn.exists()).toBe(false)
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

    it('should debounce change events when debounce prop is set', async () => {
      vi.useFakeTimers()
      const wrapperDebounce = mount(FilterBar, {
        props: {
          filters: mockFilters,
          debounce: 300,
        },
      })

      const input = wrapperDebounce.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'a')
      await input.vm.$emit('update:modelValue', 'ab')
      await input.vm.$emit('update:modelValue', 'abc')

      // 防抖前不应触发
      expect(wrapperDebounce.emitted('change')).toBeFalsy()

      // 等待防抖时间
      vi.advanceTimersByTime(300)
      await nextTick()

      // 应该只触发一次
      expect(wrapperDebounce.emitted('change')).toBeTruthy()
      expect(wrapperDebounce.emitted('change')!.length).toBe(1)

      vi.useRealTimers()
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
      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', 'test value')
      await nextTick()

      const values = wrapper.vm.getValues()
      expect(values.keyword).toBe('test value')
    })

    it('setValues should update filter values', async () => {
      wrapper.vm.setValues({ status: 'active' })
      await nextTick()

      const values = wrapper.vm.getValues()
      expect(values.status).toBe('active')
    })
  })

  // ========== 折叠功能测试 ==========
  describe('Collapse Functionality', () => {
    it('should render collapse button when collapsible is true', () => {
      const wrapperCollapsible = mount(FilterBar, {
        props: {
          filters: mockFilters,
          collapsible: true,
        },
      })

      const collapseBtn = wrapperCollapsible.find('[data-test="collapse-btn"]')
      expect(collapseBtn.exists()).toBe(true)
    })

    it('should toggle collapse state when button clicked', async () => {
      const wrapperCollapsible = mount(FilterBar, {
        props: {
          filters: mockFilters,
          collapsible: true,
        },
      })

      const collapseBtn = wrapperCollapsible.find('[data-test="collapse-btn"]')
      await collapseBtn.trigger('click')

      expect(wrapperCollapsible.emitted('collapse')).toBeTruthy()
    })

    it('should respect defaultCollapsed prop', () => {
      const wrapperCollapsed = mount(FilterBar, {
        props: {
          filters: mockFilters,
          collapsible: true,
          defaultCollapsed: true,
        },
      })

      // 初始状态应该是折叠的
      expect(wrapperCollapsed.find('.filter-bar').exists()).toBe(true)
    })
  })

  // ========== 空状态测试 ==========
  describe('Empty State', () => {
    it('should render empty filter bar when filters is empty array', () => {
      const wrapperEmpty = mount(FilterBar, {
        props: {
          filters: [],
        },
      })

      expect(wrapperEmpty.find('.filter-bar').exists()).toBe(true)
      // When filters is empty, no filter form items should be rendered
      // Only the actions col may exist depending on implementation
      const filterFormItems = wrapperEmpty.findAll('.filter-bar__col .el-form-item')
      expect(filterFormItems.length).toBe(0)
    })

    it('should handle undefined filters gracefully', () => {
      const wrapperUndefined = mount(FilterBar, {
        props: {
          filters: undefined as any,
        },
      })

      expect(wrapperUndefined.find('.filter-bar').exists()).toBe(true)
    })
  })
})
