import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { User } from '@/types/api'

// Mock FormDialog component
vi.mock('@/components/FormDialog/FormDialog.vue', () => ({
  default: {
    name: 'FormDialog',
    props: ['modelValue', 'title', 'fields', 'formData', 'rules', 'loading', 'submitText', 'cancelText'],
    emits: ['update:modelValue', 'submit', 'cancel'],
    template: `
      <div v-if="modelValue" class="form-dialog-mock">
        <div class="dialog-title">{{ title }}</div>
        <div class="dialog-fields">
          <div v-for="field in fields" :key="field.prop" class="field-item" :data-prop="field.prop">
            <label>{{ field.label }}</label>
            <span class="field-type">{{ field.type }}</span>
            <span v-if="field.required" class="field-required">required</span>
          </div>
        </div>
        <div class="dialog-data">{{ JSON.stringify(formData) }}</div>
        <button class="submit-btn" @click="$emit('submit', formData)">{{ submitText || '确定' }}</button>
        <button class="cancel-btn" @click="$emit('cancel')">{{ cancelText || '取消' }}</button>
      </div>
    `,
  },
}))

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElSwitch: {
    name: 'ElSwitch',
    props: ['modelValue', 'activeText', 'inactiveText'],
    emits: ['update:modelValue'],
    template: '<div class="el-switch" :class="{ \'is-checked\': modelValue }" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></div>',
  },
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// 模拟用户数据
const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  department: '技术部',
  isActive: true,
  role: { id: 1, name: 'admin', permissions: [] },
  createdAt: '2024-01-01 00:00:00',
  updatedAt: '2024-03-28 12:00:00',
}

describe('UserEditDialog Component', () => {
  let wrapper: VueWrapper

  const createWrapper = async (props = {}) => {
    const UserEditDialog = await import('@/views/user/components/UserEditDialog.vue')
    const mounted = mount(UserEditDialog.default, {
      props: {
        visible: false,
        userData: null,
        loading: false,
        ...props,
      },
    })
    await nextTick()
    await flushPromises()
    return mounted
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // ========== Props 设计测试 ==========
  describe('Props Design', () => {
    it('should accept visible prop to control dialog visibility', async () => {
      wrapper = await createWrapper({ visible: true })
      expect(wrapper.find('.form-dialog-mock').exists()).toBe(true)
    })

    it('should accept userData prop for editing user', async () => {
      wrapper = await createWrapper({ visible: true, userData: mockUser })
      const vm = wrapper.vm as any
      expect(vm.formData.username).toBe(mockUser.username)
      expect(vm.formData.email).toBe(mockUser.email)
    })

    it('should accept null userData for creating new user', async () => {
      wrapper = await createWrapper({ visible: true, userData: null })
      const vm = wrapper.vm as any
      expect(vm.formData.username).toBe('')
      expect(vm.formData.email).toBe('')
    })

    it('should accept loading prop for submit button state', async () => {
      wrapper = await createWrapper({ visible: true, loading: true })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })
      expect(formDialog.props('loading')).toBe(true)
    })
  })

  // ========== 表单字段测试 ==========
  describe('Form Fields', () => {
    it('should render username field (required)', async () => {
      wrapper = await createWrapper({ visible: true })
      const usernameField = wrapper.find('.field-item[data-prop="username"]')
      expect(usernameField.exists()).toBe(true)
      expect(usernameField.text()).toContain('用户名')
      expect(usernameField.find('.field-required').exists()).toBe(true)
    })

    it('should render email field (required)', async () => {
      wrapper = await createWrapper({ visible: true })
      const emailField = wrapper.find('.field-item[data-prop="email"]')
      expect(emailField.exists()).toBe(true)
      expect(emailField.text()).toContain('邮箱')
      expect(emailField.find('.field-required').exists()).toBe(true)
    })

    it('should render role field (select type)', async () => {
      wrapper = await createWrapper({ visible: true })
      const roleField = wrapper.find('.field-item[data-prop="role"]')
      expect(roleField.exists()).toBe(true)
      expect(roleField.text()).toContain('角色')
      expect(roleField.find('.field-type').text()).toBe('select')
    })

    it('should render status field (custom type with switch)', async () => {
      wrapper = await createWrapper({ visible: true })
      const statusField = wrapper.find('.field-item[data-prop="isActive"]')
      expect(statusField.exists()).toBe(true)
      expect(statusField.text()).toContain('状态')
    })

    it('should have correct role options (admin/developer/viewer)', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      const roleField = vm.fieldConfigs.find((f: any) => f.prop === 'role')
      expect(roleField).toBeDefined()
      expect(roleField.options).toHaveLength(3)
      const optionValues = roleField.options.map((o: any) => o.value)
      expect(optionValues).toContain('admin')
      expect(optionValues).toContain('developer')
      expect(optionValues).toContain('viewer')
    })
  })

  // ========== 表单验证测试 ==========
  describe('Form Validation', () => {
    it('should have validation rules for username', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      expect(vm.formRules.username).toBeDefined()
      expect(vm.formRules.username[0].required).toBe(true)
    })

    it('should have validation rules for email', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      expect(vm.formRules.email).toBeDefined()
      expect(vm.formRules.email[0].required).toBe(true)
    })

    it('should validate email format', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      const emailRules = vm.formRules.email
      const emailValidator = emailRules.find((r: any) => r.type === 'email')
      expect(emailValidator).toBeDefined()
      expect(emailValidator.message).toContain('正确的邮箱格式')
    })

    it('should have validation rules for role', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      expect(vm.formRules.role).toBeDefined()
      expect(vm.formRules.role[0].required).toBe(true)
    })
  })

  // ========== 数据回显测试 ==========
  describe('Data Echo (Edit Mode)', () => {
    it('should populate form with user data when editing', async () => {
      wrapper = await createWrapper({ visible: true, userData: mockUser })
      const vm = wrapper.vm as any
      expect(vm.formData.username).toBe(mockUser.username)
      expect(vm.formData.email).toBe(mockUser.email)
      expect(vm.formData.role).toBe(mockUser.role?.name)
      expect(vm.formData.isActive).toBe(mockUser.isActive)
    })

    it('should reset form when dialog is closed', async () => {
      wrapper = await createWrapper({ visible: true, userData: mockUser })
      const vm = wrapper.vm as any

      // 关闭对话框
      await wrapper.setProps({ visible: false })
      await nextTick()

      // 重新打开应该重置
      await wrapper.setProps({ visible: true, userData: null })
      await nextTick()

      expect(vm.formData.username).toBe('')
      expect(vm.formData.email).toBe('')
    })

    it('should update form when userData changes', async () => {
      wrapper = await createWrapper({ visible: true, userData: null })
      const vm = wrapper.vm as any

      expect(vm.formData.username).toBe('')

      await wrapper.setProps({ userData: mockUser })
      await nextTick()

      expect(vm.formData.username).toBe(mockUser.username)
    })
  })

  // ========== 事件测试 ==========
  describe('Events', () => {
    it('should emit submit event with form data', async () => {
      wrapper = await createWrapper({ visible: true, userData: mockUser })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })

      await formDialog.vm.$emit('submit', { ...mockUser })

      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')![0][0]).toMatchObject({
        username: mockUser.username,
        email: mockUser.email,
      })
    })

    it('should emit cancel event when cancel button clicked', async () => {
      wrapper = await createWrapper({ visible: true })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })

      await formDialog.vm.$emit('cancel')

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('should update visible prop via v-model', async () => {
      wrapper = await createWrapper({ visible: true })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })

      await formDialog.vm.$emit('update:modelValue', false)

      expect(wrapper.emitted('update:visible')).toBeTruthy()
      expect(wrapper.emitted('update:visible')![0]).toEqual([false])
    })
  })

  // ========== 对话框标题测试 ==========
  describe('Dialog Title', () => {
    it('should show "新增用户" title when creating new user', async () => {
      wrapper = await createWrapper({ visible: true, userData: null })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })
      expect(formDialog.props('title')).toBe('新增用户')
    })

    it('should show "编辑用户" title when editing user', async () => {
      wrapper = await createWrapper({ visible: true, userData: mockUser })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })
      expect(formDialog.props('title')).toBe('编辑用户')
    })
  })

  // ========== 提交按钮加载状态测试 ==========
  describe('Submit Button Loading State', () => {
    it('should pass loading prop to FormDialog', async () => {
      wrapper = await createWrapper({ visible: true, loading: true })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })
      expect(formDialog.props('loading')).toBe(true)
    })

    it('should disable submit when loading is true', async () => {
      wrapper = await createWrapper({ visible: true, loading: true })
      const formDialog = wrapper.findComponent({ name: 'FormDialog' })
      expect(formDialog.props('loading')).toBe(true)
    })
  })

  // ========== 表单数据结构测试 ==========
  describe('Form Data Structure', () => {
    it('should have correct initial form data structure', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      expect(vm.formData).toHaveProperty('username')
      expect(vm.formData).toHaveProperty('email')
      expect(vm.formData).toHaveProperty('role')
      expect(vm.formData).toHaveProperty('isActive')
    })

    it('should initialize with empty values for new user', async () => {
      wrapper = await createWrapper({ visible: true, userData: null })
      const vm = wrapper.vm as any
      expect(vm.formData.username).toBe('')
      expect(vm.formData.email).toBe('')
      expect(vm.formData.role).toBe('')
      expect(vm.formData.isActive).toBe(true)
    })
  })

  // ========== 角色选项映射测试 ==========
  describe('Role Options Mapping', () => {
    it('should map admin role correctly', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      const roleField = vm.fieldConfigs.find((f: any) => f.prop === 'role')
      const adminOption = roleField.options.find((o: any) => o.value === 'admin')
      expect(adminOption.label).toBe('管理员')
    })

    it('should map developer role correctly', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      const roleField = vm.fieldConfigs.find((f: any) => f.prop === 'role')
      const devOption = roleField.options.find((o: any) => o.value === 'developer')
      expect(devOption.label).toBe('开发者')
    })

    it('should map viewer role correctly', async () => {
      wrapper = await createWrapper({ visible: true })
      const vm = wrapper.vm as any
      const roleField = vm.fieldConfigs.find((f: any) => f.prop === 'role')
      const viewerOption = roleField.options.find((o: any) => o.value === 'viewer')
      expect(viewerOption.label).toBe('访客')
    })
  })

  // ========== 状态开关测试 ==========
  describe('Status Switch', () => {
    it('should default status to true for new user', async () => {
      wrapper = await createWrapper({ visible: true, userData: null })
      const vm = wrapper.vm as any
      expect(vm.formData.isActive).toBe(true)
    })

    it('should reflect user status when editing', async () => {
      const inactiveUser = { ...mockUser, isActive: false }
      wrapper = await createWrapper({ visible: true, userData: inactiveUser })
      const vm = wrapper.vm as any
      expect(vm.formData.isActive).toBe(false)
    })
  })
})
