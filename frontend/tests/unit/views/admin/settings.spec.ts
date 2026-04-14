/**
 * Admin Settings View Tests
 * 系统设置页面单元测试
 *
 * @description 测试settings.vue页面，验证保存操作调用真实API而非setTimeout模拟
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Check: { name: 'Check' },
  Refresh: { name: 'Refresh' },
  User: { name: 'User' },
  Cpu: { name: 'Cpu' },
  Bell: { name: 'Bell' },
  InfoFilled: { name: 'InfoFilled' },
  Download: { name: 'Download' },
  Warning: { name: 'Warning' },
}))

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue(true),
  },
  ElSwitch: {
    name: 'ElSwitch',
    props: ['modelValue'],
    template: '<input type="checkbox" class="el-switch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue'],
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option :value="value">{{ label }}</option>',
  },
  ElSlider: {
    name: 'ElSlider',
    props: ['modelValue', 'min', 'max', 'step'],
    template: '<input type="range" class="el-slider" :value="modelValue" @input="$emit(\'update:modelValue\', parseInt($event.target.value))" />',
  },
  ElInputNumber: {
    name: 'ElInputNumber',
    props: ['modelValue', 'min', 'max', 'step'],
    template: '<input type="number" class="el-input-number" :value="modelValue" @input="$emit(\'update:modelValue\', parseInt($event.target.value))" />',
  },
  ElCheckboxGroup: {
    name: 'ElCheckboxGroup',
    props: ['modelValue'],
    template: '<div class="el-checkbox-group"><slot /></div>',
  },
  ElCheckbox: {
    name: 'ElCheckbox',
    props: ['label'],
    template: '<label class="el-checkbox"><input type="checkbox" :value="label" />{{ label }}</label>',
  },
  ElTag: {
    name: 'ElTag',
    props: ['type', 'size'],
    template: '<span class="el-tag" :class="type"><slot /></span>',
  },
  ElForm: {
    name: 'ElForm',
    props: ['model'],
    template: '<form class="el-form"><slot /></form>',
  },
  ElFormItem: {
    name: 'ElFormItem',
    props: ['label'],
    template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
  },
}))

// Mock TechButton component
vi.mock('@/components/tech/TechButton.vue', () => ({
  default: {
    name: 'TechButton',
    props: ['variant', 'icon', 'loading'],
    template: '<button class="tech-button" :class="variant" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
  },
}))

// Mock TechCard component
vi.mock('@/components/tech/TechCard.vue', () => ({
  default: {
    name: 'TechCard',
    props: ['title', 'icon'],
    template: '<div class="tech-card"><h3>{{ title }}</h3><slot /></div>',
  },
}))

// Mock settings API
const mockUpdateSettings = vi.fn()
vi.mock('@/api/settings', () => ({
  updateSettings: mockUpdateSettings,
}))

// Mock cache API
vi.mock('@/api/cache', () => ({
  clearAllCache: vi.fn().mockResolvedValue({ clearedKeys: 10 }),
}))

describe('Admin Settings View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should render page with correct title', async () => {
    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: true,
          TechCard: true,
        },
      },
    })

    expect(wrapper.find('.page-title').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toBe('系统设置')
    expect(wrapper.find('.page-subtitle').text()).toContain('配置系统参数')
  })

  it('should render save settings button', async () => {
    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: {
            name: 'TechButton',
            props: ['variant', 'loading'],
            template: '<button class="tech-button" :class="variant" :disabled="loading"><slot /></button>',
          },
          TechCard: true,
        },
      },
    })

    const saveButton = wrapper.find('.tech-button.primary')
    expect(saveButton.exists()).toBe(true)
    expect(saveButton.text()).toContain('保存设置')
  })

  it('should call updateSettings API when saving (NOT use setTimeout mock)', async () => {
    // 模拟API调用成功
    mockUpdateSettings.mockResolvedValue({
      syncEnabled: true,
      autoSyncInterval: 60,
      retentionDays: 90,
      maxProjectsPerUser: 10,
      allowedModels: ['gpt-4', 'gpt-3.5-turbo'],
    })

    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: {
            name: 'TechButton',
            props: ['variant', 'icon', 'loading'],
            emits: ['click'],
            template: '<button class="tech-button" :class="variant" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
          },
          TechCard: true,
        },
      },
    })

    // 找到并点击保存按钮
    const saveButton = wrapper.find('.tech-button.primary')
    expect(saveButton.exists()).toBe(true)

    // 触发点击事件
    await saveButton.trigger('click')
    await flushPromises()

    // 验证调用了真实的updateSettings API，而不是setTimeout模拟
    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)
    expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
      syncEnabled: expect.any(Boolean),
      autoSyncInterval: expect.any(Number),
      retentionDays: expect.any(Number),
      maxProjectsPerUser: expect.any(Number),
      allowedModels: expect.any(Array),
    }))
  })

  it('should show loading state while saving', async () => {
    // 创建一个延迟解析的Promise来测试loading状态
    let resolvePromise: (value: unknown) => void
    mockUpdateSettings.mockImplementation(() => new Promise((resolve) => {
      resolvePromise = resolve
    }))

    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: {
            name: 'TechButton',
            props: ['variant', 'icon', 'loading'],
            template: '<button class="tech-button" :class="variant" :disabled="loading" :data-loading="loading"><slot /></button>',
          },
          TechCard: true,
        },
      },
    })

    const saveButton = wrapper.find('.tech-button.primary')

    // 点击保存按钮
    await saveButton.trigger('click')
    await nextTick()

    // 验证按钮处于loading状态（通过data-loading属性）
    expect(saveButton.attributes('data-loading')).toBe('true')
    expect(saveButton.attributes('disabled')).toBeDefined()

    // 完成API调用
    resolvePromise({
      syncEnabled: true,
      autoSyncInterval: 60,
      retentionDays: 90,
      maxProjectsPerUser: 10,
      allowedModels: ['gpt-4'],
    })
    await flushPromises()

    // 验证loading状态已解除
    expect(saveButton.attributes('data-loading')).toBe('false')
  })

  it('should handle API error when saving fails', async () => {
    const { ElMessage } = await import('element-plus')

    // 模拟API调用失败
    mockUpdateSettings.mockRejectedValue(new Error('Network error'))

    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: {
            name: 'TechButton',
            props: ['variant', 'icon', 'loading'],
            emits: ['click'],
            template: '<button class="tech-button" :class="variant" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
          },
          TechCard: true,
        },
      },
    })

    const saveButton = wrapper.find('.tech-button.primary')
    await saveButton.trigger('click')
    await flushPromises()

    // 验证调用了API（即使失败了也是真实调用）
    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)

    // 验证显示了错误消息
    expect(ElMessage.error).toHaveBeenCalledWith('保存设置失败')
  })

  it('should NOT use setTimeout to simulate save operation', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    mockUpdateSettings.mockResolvedValue({
      syncEnabled: true,
      autoSyncInterval: 60,
      retentionDays: 90,
      maxProjectsPerUser: 10,
      allowedModels: ['gpt-4'],
    })

    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: {
            name: 'TechButton',
            props: ['variant', 'icon', 'loading'],
            emits: ['click'],
            template: '<button class="tech-button" :class="variant" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
          },
          TechCard: true,
        },
      },
    })

    const saveButton = wrapper.find('.tech-button.primary')
    await saveButton.trigger('click')
    await flushPromises()

    // 验证调用了updateSettings API
    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)

    // 验证没有使用setTimeout模拟（或者setTimeout不是用于模拟保存）
    // 注意：可能有一些合法的setTimeout使用，但我们主要验证API被调用了
    const saveRelatedTimeouts = setTimeoutSpy.mock.calls.filter(call =>
      call[1] === 1000 // 原来的模拟使用了1000ms的setTimeout
    )
    expect(saveRelatedTimeouts.length).toBe(0)
  })

  it('should render all settings cards', async () => {
    const SettingsView = await import('@/views/admin/settings.vue')
    const wrapper = mount(SettingsView.default, {
      global: {
        stubs: {
          TechButton: true,
          TechCard: {
            name: 'TechCard',
            props: ['title', 'icon'],
            template: '<div class="tech-card" :data-title="title"><h3>{{ title }}</h3><slot /></div>',
          },
        },
      },
    })

    const cards = wrapper.findAll('.tech-card')
    expect(cards.length).toBeGreaterThanOrEqual(5)

    const titles = cards.map(card => card.attributes('data-title'))
    expect(titles).toContain('同步设置')
    expect(titles).toContain('用户限制')
    expect(titles).toContain('AI模型设置')
    expect(titles).toContain('通知设置')
    expect(titles).toContain('系统信息')
  })
})
