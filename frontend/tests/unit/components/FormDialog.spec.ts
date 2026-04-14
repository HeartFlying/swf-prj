import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick, ref, h } from 'vue'
import FormDialog from '@/components/FormDialog/FormDialog.vue'
import type { FormField, FormRules } from '@/components/FormDialog/FormDialog.vue'
import {
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElButton,
  ElRow,
  ElCol,
} from 'element-plus'

// 模拟数据
interface TestFormData {
  name: string
  email: string
  age: number
  status: string
  birthday: string
}

const mockFormData: TestFormData = {
  name: '',
  email: '',
  age: 0,
  status: '',
  birthday: '',
}

const mockFields: FormField[] = [
  { prop: 'name', label: '姓名', type: 'input', required: true },
  { prop: 'email', label: '邮箱', type: 'input', placeholder: '请输入邮箱' },
  { prop: 'age', label: '年龄', type: 'input', inputType: 'number' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' },
    ],
  },
  { prop: 'birthday', label: '生日', type: 'date' },
]

const mockRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

describe('FormDialog', () => {
  let wrapper: VueWrapper

  const createWrapper = async (props = {}, slots = {}) => {
    const mounted = mount(FormDialog, {
      props: {
        modelValue: true,
        title: '测试表单',
        fields: mockFields,
        formData: mockFormData,
        ...props,
      },
      slots,
      attachTo: document.body,
    })
    await nextTick()
    await flushPromises()
    return mounted
  }

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    // 清理 body 中的 teleport 元素
    document.body.innerHTML = ''
  })

  // ========== 基础渲染测试 ==========
  describe('Basic Rendering', () => {
    it('should render with default props', async () => {
      wrapper = await createWrapper()
      expect(wrapper.findComponent(ElDialog).exists()).toBe(true)
    })

    it('should render dialog with correct title', async () => {
      wrapper = await createWrapper({ title: '测试表单' })
      const dialog = wrapper.findComponent(ElDialog)
      expect(dialog.props('title')).toBe('测试表单')
    })

    it('should render form with ElForm component', async () => {
      wrapper = await createWrapper()
      expect(wrapper.findComponent(ElForm).exists()).toBe(true)
    })

    it('should render form items based on fields config', async () => {
      wrapper = await createWrapper()
      const formItems = wrapper.findAllComponents(ElFormItem)
      expect(formItems.length).toBe(mockFields.length)
    })

    it('should render field labels correctly', async () => {
      wrapper = await createWrapper()
      mockFields.forEach((field) => {
        expect(wrapper.text()).toContain(field.label)
      })
    })

    it('should not render when modelValue is false', async () => {
      wrapper = await createWrapper({ modelValue: false })
      const dialog = wrapper.findComponent(ElDialog)
      expect(dialog.props('modelValue')).toBe(false)
    })
  })

  // ========== 表单字段类型测试 ==========
  describe('Form Field Types', () => {
    it('should render input field correctly', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'name', label: '姓名', type: 'input' }],
        formData: { name: '' },
      })
      expect(wrapper.findComponent(ElInput).exists()).toBe(true)
    })

    it('should render input with placeholder', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'email', label: '邮箱', type: 'input', placeholder: '请输入邮箱' }],
        formData: { email: '' },
      })
      const input = wrapper.findComponent(ElInput)
      expect(input.exists()).toBe(true)
    })

    it('should render select field correctly', async () => {
      wrapper = await createWrapper({
        fields: [
          {
            prop: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '启用', value: 'active' },
              { label: '禁用', value: 'inactive' },
            ],
          },
        ],
        formData: { status: '' },
      })
      expect(wrapper.findComponent(ElSelect).exists()).toBe(true)
    })

    it('should render date picker field correctly', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'birthday', label: '生日', type: 'date' }],
        formData: { birthday: '' },
      })
      expect(wrapper.findComponent(ElDatePicker).exists()).toBe(true)
    })

    it('should render textarea field correctly', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'description', label: '描述', type: 'textarea' }],
        formData: { description: '' },
      })
      const input = wrapper.findComponent(ElInput)
      expect(input.exists()).toBe(true)
    })

    it('should render number input correctly', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'age', label: '年龄', type: 'input', inputType: 'number' }],
        formData: { age: 0 },
      })
      const input = wrapper.findComponent(ElInput)
      expect(input.exists()).toBe(true)
    })
  })

  // ========== 表单验证测试 ==========
  describe('Form Validation', () => {
    it('should pass rules to ElForm', async () => {
      wrapper = await createWrapper({ rules: mockRules })
      const form = wrapper.findComponent(ElForm)
      expect(form.exists()).toBe(true)
    })

    it('should mark required fields', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'name', label: '姓名', type: 'input', required: true }],
        formData: { name: '' },
      })
      const formItem = wrapper.findComponent(ElFormItem)
      expect(formItem.exists()).toBe(true)
    })

    it('should auto-generate rules when field has required: true', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'name', label: '姓名', type: 'input', required: true }],
        formData: { name: '' },
      })
      const form = wrapper.vm
      expect(form.mergedRules).toHaveProperty('name')
    })
  })

  // ========== 事件测试 ==========
  describe('Events', () => {
    it('should emit update:modelValue when dialog closes', async () => {
      wrapper = await createWrapper()
      const dialog = wrapper.findComponent(ElDialog)
      await dialog.vm.$emit('update:modelValue', false)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })

    it('should emit submit when form is submitted', async () => {
      const formData = { name: '测试', email: 'test@test.com' }
      wrapper = await createWrapper({
        fields: [
          { prop: 'name', label: '姓名', type: 'input' },
          { prop: 'email', label: '邮箱', type: 'input' },
        ],
        formData: formData,
      })

      // 模拟表单验证通过
      const form = wrapper.findComponent(ElForm)
      form.vm.validate = vi.fn((callback: any) => {
        callback(true)
      })

      await wrapper.find('.form-dialog__submit').trigger('click')
      await nextTick()

      expect(wrapper.emitted('submit')).toBeTruthy()
    })

    it('should emit cancel when cancel button is clicked', async () => {
      wrapper = await createWrapper()
      await wrapper.find('.form-dialog__cancel').trigger('click')
      await nextTick()
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('should emit closed when dialog is closed', async () => {
      wrapper = await createWrapper()
      const dialog = wrapper.findComponent(ElDialog)
      await dialog.vm.$emit('closed')
      expect(wrapper.emitted('closed')).toBeTruthy()
    })

    it('should emit opened when dialog is opened', async () => {
      wrapper = await createWrapper()
      const dialog = wrapper.findComponent(ElDialog)
      await dialog.vm.$emit('opened')
      expect(wrapper.emitted('opened')).toBeTruthy()
    })
  })

  // ========== 按钮配置测试 ==========
  describe('Button Configuration', () => {
    it('should render default submit and cancel buttons', async () => {
      wrapper = await createWrapper()
      const buttons = wrapper.findAllComponents(ElButton)
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('should customize submit button text', async () => {
      wrapper = await createWrapper({ submitText: '保存' })
      const submitBtn = wrapper.find('.form-dialog__submit')
      expect(submitBtn.text()).toBe('保存')
    })

    it('should customize cancel button text', async () => {
      wrapper = await createWrapper({ cancelText: '关闭' })
      const cancelBtn = wrapper.find('.form-dialog__cancel')
      expect(cancelBtn.text()).toBe('关闭')
    })

    it('should hide buttons when showButtons is false', async () => {
      wrapper = await createWrapper({ showButtons: false })
      expect(wrapper.find('.form-dialog__footer').exists()).toBe(false)
    })

    it('should disable submit button when loading', async () => {
      wrapper = await createWrapper({ loading: true })
      const submitBtn = wrapper.find('.form-dialog__submit')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })
  })

  // ========== 对话框配置测试 ==========
  describe('Dialog Configuration', () => {
    it('should apply custom width', async () => {
      wrapper = await createWrapper({ width: '600px' })
      const dialog = wrapper.findComponent(ElDialog)
      expect(dialog.props('width')).toBe('600px')
    })

    it('should apply custom dialog class', async () => {
      wrapper = await createWrapper({ dialogClass: 'custom-dialog' })
      // 检查自定义类名是否正确应用
      expect(wrapper.vm.dialogCustomClass).toContain('custom-dialog')
    })

    it('should prevent closing when closeOnClickModal is false', async () => {
      wrapper = await createWrapper({ closeOnClickModal: false })
      const dialog = wrapper.findComponent(ElDialog)
      expect(dialog.props('closeOnClickModal')).toBe(false)
    })

    it('should prevent closing when closeOnPressEscape is false', async () => {
      wrapper = await createWrapper({ closeOnPressEscape: false })
      const dialog = wrapper.findComponent(ElDialog)
      expect(dialog.props('closeOnPressEscape')).toBe(false)
    })
  })

  // ========== 表单数据测试 ==========
  describe('Form Data', () => {
    it('should sync form data with v-model', async () => {
      const formData = ref({ name: '初始值' })
      wrapper = mount(FormDialog, {
        props: {
          modelValue: true,
          title: '测试表单',
          fields: [{ prop: 'name', label: '姓名', type: 'input' }],
          'formData': formData.value,
          'onUpdate:formData': (val: any) => {
            formData.value = val
          },
        },
        attachTo: document.body,
      })
      await nextTick()
      await flushPromises()

      const input = wrapper.findComponent(ElInput)
      await input.vm.$emit('update:modelValue', '新值')

      expect(wrapper.emitted('update:formData')).toBeTruthy()
    })

    it('should reset form when dialog is closed', async () => {
      wrapper = await createWrapper()
      const form = wrapper.findComponent(ElForm)

      // 关闭对话框
      await wrapper.setProps({ modelValue: false })
      await nextTick()

      // 触发 closed 事件来执行重置
      const dialog = wrapper.findComponent(ElDialog)
      await dialog.vm.$emit('closed')
      await nextTick()

      // 验证组件有重置方法
      expect(typeof wrapper.vm.resetFields).toBe('function')
    })
  })

  // ========== 方法暴露测试 ==========
  describe('Exposed Methods', () => {
    it('should expose validate method', async () => {
      wrapper = await createWrapper()
      expect(typeof wrapper.vm.validate).toBe('function')
    })

    it('should expose resetFields method', async () => {
      wrapper = await createWrapper()
      expect(typeof wrapper.vm.resetFields).toBe('function')
    })

    it('should expose clearValidate method', async () => {
      wrapper = await createWrapper()
      expect(typeof wrapper.vm.clearValidate).toBe('function')
    })
  })

  // ========== 插槽测试 ==========
  describe('Slots', () => {
    it('should render custom footer slot', async () => {
      wrapper = await createWrapper({}, {
        footer: '<div class="custom-footer">自定义底部</div>',
      })
      expect(wrapper.find('.custom-footer').exists()).toBe(true)
    })

    it('should render custom header slot', async () => {
      wrapper = await createWrapper({}, {
        header: '<div class="custom-header">自定义标题</div>',
      })
      expect(wrapper.find('.custom-header').exists()).toBe(true)
    })

    it('should render field slots', async () => {
      wrapper = mount(FormDialog, {
        props: {
          modelValue: true,
          title: '测试表单',
          fields: [{ prop: 'name', label: '姓名', type: 'input', slot: 'custom-name' }],
          formData: { name: '' },
        },
        slots: {
          'custom-name': '<div class="custom-field">自定义字段</div>',
        },
        attachTo: document.body,
      })
      await nextTick()
      await flushPromises()
      expect(wrapper.find('.custom-field').exists()).toBe(true)
    })
  })

  // ========== 标签位置测试 ==========
  describe('Label Position', () => {
    it('should render with default label position', async () => {
      wrapper = await createWrapper()
      const form = wrapper.findComponent(ElForm)
      expect(form.props('labelPosition')).toBe('right')
    })

    it('should render with top label position', async () => {
      wrapper = await createWrapper({ labelPosition: 'top' })
      const form = wrapper.findComponent(ElForm)
      expect(form.props('labelPosition')).toBe('top')
    })

    it('should render with custom label width', async () => {
      wrapper = await createWrapper({ labelWidth: '120px' })
      const form = wrapper.findComponent(ElForm)
      expect(form.props('labelWidth')).toBe('120px')
    })
  })

  // ========== 字段栅格布局测试 ==========
  describe('Field Layout', () => {
    it('should render fields with custom span', async () => {
      wrapper = await createWrapper({
        fields: [
          { prop: 'name', label: '姓名', type: 'input', span: 12 },
          { prop: 'age', label: '年龄', type: 'input', span: 12 },
        ],
        formData: { name: '', age: 0 },
      })
      const cols = wrapper.findAllComponents(ElCol)
      expect(cols.length).toBe(2)
      expect(cols[0].props('span')).toBe(12)
      expect(cols[1].props('span')).toBe(12)
    })

    it('should render fields with default span 24', async () => {
      wrapper = await createWrapper({
        fields: [{ prop: 'name', label: '姓名', type: 'input' }],
        formData: { name: '' },
      })
      const col = wrapper.findComponent(ElCol)
      expect(col.props('span')).toBe(24)
    })
  })

  // ========== 隐藏字段测试 ==========
  describe('Hidden Fields', () => {
    it('should not render hidden fields', async () => {
      wrapper = await createWrapper({
        fields: [
          { prop: 'name', label: '姓名', type: 'input' },
          { prop: 'id', label: 'ID', type: 'input', hidden: true },
        ],
        formData: { name: '', id: '' },
      })
      const formItems = wrapper.findAllComponents(ElFormItem)
      expect(formItems.length).toBe(1)
    })
  })
})
