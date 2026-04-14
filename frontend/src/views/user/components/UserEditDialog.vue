<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FormDialog } from '@/components'
import type { FormField } from '@/components'
import type { FormRules } from 'element-plus'
import type { User } from '@/types/api'

// ========== Props 定义 ==========
interface Props {
  /** 是否显示弹窗 */
  visible: boolean
  /** 用户数据（null表示新增） */
  userData: User | null
  /** 提交加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

// ========== Emits 定义 ==========
const emit = defineEmits<{
  /** 更新visible状态 */
  (e: 'update:visible', value: boolean): void
  /** 提交表单 */
  (e: 'submit', data: UserFormData): void
  /** 取消操作 */
  (e: 'cancel'): void
}>()

// ========== 类型定义 ==========
/** 用户表单数据 */
interface UserFormData {
  username: string
  email: string
  role: string
  isActive: boolean
}

// ========== 表单数据 ==========
const defaultFormData: UserFormData = {
  username: '',
  email: '',
  role: '',
  isActive: true,
}

const formData = ref<UserFormData>({ ...defaultFormData })

// ========== 计算属性 ==========
/** 弹窗标题 */
const dialogTitle = computed(() => {
  return props.userData ? '编辑用户' : '新增用户'
})

/** 表单字段配置 */
const fieldConfigs = computed<FormField[]>(() => [
  {
    prop: 'username',
    label: '用户名',
    type: 'input',
    required: true,
    placeholder: '请输入用户名',
  },
  {
    prop: 'email',
    label: '邮箱',
    type: 'input',
    required: true,
    placeholder: '请输入邮箱',
  },
  {
    prop: 'role',
    label: '角色',
    type: 'select',
    required: true,
    placeholder: '请选择角色',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '开发者', value: 'developer' },
      { label: '访客', value: 'viewer' },
    ],
  },
  {
    prop: 'isActive',
    label: '状态',
    type: 'custom',
    slot: 'status-switch',
  },
])

/** 表单验证规则 */
const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度应在2-50个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' },
  ],
}

// ========== 方法 ==========
/** 重置表单数据 */
const resetForm = () => {
  formData.value = { ...defaultFormData }
}

/** 填充表单数据 */
const fillForm = (user: User) => {
  formData.value = {
    username: user.username || '',
    email: user.email || '',
    role: user.role?.name || '',
    isActive: user.isActive ?? true,
  }
}

/** 处理弹窗关闭 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 处理表单提交 */
const handleSubmit = (data: Record<string, any>) => {
  emit('submit', data as UserFormData)
}

/** 处理取消 */
const handleCancel = () => {
  emit('cancel')
  handleClose()
}

/** 处理状态开关变化 */
const handleStatusChange = (value: boolean) => {
  formData.value.isActive = value
}

// ========== 监听器 ==========
/** 监听userData变化，自动填充表单 */
watch(
  () => props.userData,
  (newUser) => {
    if (newUser) {
      fillForm(newUser)
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

/** 监听visible变化，关闭时重置表单 */
watch(
  () => props.visible,
  (newVisible) => {
    if (!newVisible && !props.userData) {
      resetForm()
    }
  }
)

// ========== 暴露方法 ==========
defineExpose({
  formData,
  resetForm,
  fillForm,
})
</script>

<template>
  <FormDialog
    :model-value="visible"
    :title="dialogTitle"
    :fields="fieldConfigs"
    :form-data="formData"
    :rules="formRules"
    :loading="loading"
    width="500px"
    submit-text="保存"
    cancel-text="取消"
    @update:model-value="handleClose"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <!-- 状态开关自定义插槽 -->
    <template #status-switch="{ field, value, updateValue }">
      <el-switch
        :model-value="value"
        :active-text="'启用'"
        :inactive-text="'禁用'"
        @update:model-value="updateValue"
      />
    </template>
  </FormDialog>
</template>

<style scoped lang="scss">
// 组件样式
.user-edit-dialog {
  // 可以在这里添加自定义样式
}
</style>
