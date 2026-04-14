<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FormDialog } from '@/components'
import type { FormField } from '@/components'
import type { FormRules } from 'element-plus'
import type { Project } from '@/types/api'
import { PROJECT_STATUS } from '../constants/projects'

// ========== Props 定义 ==========
interface Props {
  /** 是否显示弹窗 */
  visible: boolean
  /** 项目数据（null表示新增） */
  projectData: Project | null
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
  (e: 'submit', data: ProjectFormData): void
  /** 取消操作 */
  (e: 'cancel'): void
}>()

// ========== 类型定义 ==========
/** 项目表单数据 */
interface ProjectFormData {
  name: string
  description: string
  status: 'active' | 'archived'
  gitlabRepoUrl: string
  zentaoProductId: string
}

// ========== 表单数据 ==========
const defaultFormData: ProjectFormData = {
  name: '',
  description: '',
  status: PROJECT_STATUS.ACTIVE,
  gitlabRepoUrl: '',
  zentaoProductId: '',
}

const formData = ref<ProjectFormData>({ ...defaultFormData })

// ========== 计算属性 ==========
/** 弹窗标题 */
const dialogTitle = computed(() => {
  return props.projectData ? '编辑项目' : '新增项目'
})

/** 表单字段配置 */
const fieldConfigs = computed<FormField[]>(() => [
  {
    prop: 'name',
    label: '项目名称',
    type: 'input',
    required: true,
    placeholder: '请输入项目名称',
  },
  {
    prop: 'description',
    label: '项目描述',
    type: 'textarea',
    placeholder: '请输入项目描述',
    props: {
      rows: 3,
    },
  },
  {
    prop: 'status',
    label: '项目状态',
    type: 'custom',
    slot: 'status-switch',
  },
  {
    prop: 'gitlabRepoUrl',
    label: 'GitLab仓库地址',
    type: 'input',
    placeholder: 'https://gitlab.com/...',
  },
  {
    prop: 'zentaoProductId',
    label: '禅道产品ID',
    type: 'input',
    placeholder: '请输入关联的禅道产品ID',
  },
])

/** 表单验证规则 */
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '项目名称长度应在2-50个字符之间', trigger: 'blur' },
  ],
  gitlabRepoUrl: [
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' },
  ],
  zentaoProductId: [
    { pattern: /^\d*$/, message: '禅道产品ID必须为数字', trigger: 'blur' },
  ],
}

// ========== 方法 ==========
/** 重置表单数据 */
const resetForm = () => {
  formData.value = { ...defaultFormData }
}

/** 填充表单数据 */
const fillForm = (project: Project) => {
  formData.value = {
    name: project.name || '',
    description: project.description || '',
    status: (project.status === PROJECT_STATUS.ACTIVE ? PROJECT_STATUS.ACTIVE : PROJECT_STATUS.ARCHIVED),
    gitlabRepoUrl: (project as any).gitlabRepoUrl || '',
    zentaoProductId: (project as any).zentaoProductId || '',
  }
}

/** 处理弹窗关闭 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 处理表单提交 */
const handleSubmit = (data: Record<string, any>) => {
  emit('submit', data as ProjectFormData)
}

/** 处理取消 */
const handleCancel = () => {
  emit('cancel')
  handleClose()
}

/** 处理状态开关变化 */
const handleStatusChange = (value: boolean) => {
  formData.value.status = value ? PROJECT_STATUS.ACTIVE : PROJECT_STATUS.ARCHIVED
}

// ========== 监听器 ==========
/** 监听projectData变化，自动填充表单 */
watch(
  () => props.projectData,
  (newProject) => {
    if (newProject) {
      fillForm(newProject)
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
    if (!newVisible && !props.projectData) {
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
    width="560px"
    submit-text="保存"
    cancel-text="取消"
    @update:model-value="handleClose"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <!-- 状态开关自定义插槽 -->
    <template #status-switch="{ field, value, updateValue }">
      <el-switch
        :model-value="value === PROJECT_STATUS.ACTIVE"
        :active-text="'启用'"
        :inactive-text="'禁用'"
        @update:model-value="(val: boolean) => {
          updateValue(val ? PROJECT_STATUS.ACTIVE : PROJECT_STATUS.ARCHIVED)
        }"
      />
    </template>
  </FormDialog>
</template>

<style scoped lang="scss">
// 组件样式
.project-edit-dialog {
  // 可以在这里添加自定义样式
}
</style>
