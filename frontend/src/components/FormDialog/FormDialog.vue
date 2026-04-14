<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed, watch, useSlots } from 'vue'
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
import type { FormInstance, FormRules } from 'element-plus'

// 选项配置
export interface SelectOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

// 表单字段类型
export type FieldType = 'input' | 'select' | 'date' | 'datetime' | 'textarea' | 'custom'

// 表单字段配置
export interface FormField {
  /** 字段属性名 */
  prop: string
  /** 字段标签 */
  label: string
  /** 字段类型 */
  type: FieldType
  /** input 类型（当 type 为 input 时有效） */
  inputType?: string
  /** 占位符文本 */
  placeholder?: string
  /** 是否必填 */
  required?: boolean
  /** 验证规则（优先级高于 required） */
  rules?: any[]
  /** 选项（当 type 为 select 时有效） */
  options?: SelectOption[]
  /** 字段宽度（栅格，1-24） */
  span?: number
  /** 自定义插槽名称 */
  slot?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否隐藏 */
  hidden?: boolean
  /** 额外属性 */
  props?: Record<string, any>
}

// 组件属性
export interface FormDialogProps {
  /** 对话框可见性 */
  modelValue: boolean
  /** 对话框标题 */
  title: string
  /** 表单字段配置 */
  fields: FormField[]
  /** 表单数据 */
  formData: Record<string, any>
  /** 验证规则 */
  rules?: FormRules
  /** 对话框宽度 */
  width?: string | number
  /** 自定义对话框类名 */
  dialogClass?: string
  /** 提交按钮文本 */
  submitText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 是否显示按钮 */
  showButtons?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 点击遮罩是否关闭 */
  closeOnClickModal?: boolean
  /** 按 ESC 是否关闭 */
  closeOnPressEscape?: boolean
  /** 标签位置 */
  labelPosition?: 'left' | 'right' | 'top'
  /** 标签宽度 */
  labelWidth?: string | number
  /** 是否在关闭时重置表单 */
  resetOnClose?: boolean
}

const props = withDefaults(defineProps<FormDialogProps>(), {
  width: '500px',
  dialogClass: '',
  submitText: '确定',
  cancelText: '取消',
  showButtons: true,
  loading: false,
  closeOnClickModal: false,
  closeOnPressEscape: true,
  labelPosition: 'right',
  labelWidth: '100px',
  resetOnClose: true,
})

const emit = defineEmits<{
  /** 更新对话框可见性 */
  (e: 'update:modelValue', value: boolean): void
  /** 更新表单数据 */
  (e: 'update:formData', value: Record<string, any>): void
  /** 提交表单 */
  (e: 'submit', data: Record<string, any>): void
  /** 取消 */
  (e: 'cancel'): void
  /** 对话框打开后 */
  (e: 'opened'): void
  /** 对话框关闭后 */
  (e: 'closed'): void
}>()

const slots = useSlots()
const formRef = ref<FormInstance | null>(null)

// 可见字段
const visibleFields = computed(() => {
  return props.fields.filter(field => !field.hidden)
})

// 合并验证规则
const mergedRules = computed<FormRules>(() => {
  const rules: FormRules = { ...props.rules }

  // 根据 required 字段自动生成规则
  props.fields.forEach(field => {
    if (field.required && !rules[field.prop]) {
      rules[field.prop] = [
        {
          required: true,
          message: `${field.placeholder || '请输入' + field.label}`,
          trigger: field.type === 'input' || field.type === 'textarea' ? 'blur' : 'change',
        },
      ]
    }
    // 合并字段自定义规则
    if (field.rules) {
      rules[field.prop] = field.rules
    }
  })

  return rules
})

// 对话框自定义类名
const dialogCustomClass = computed(() => {
  return `form-dialog ${props.dialogClass}`.trim()
})

// 处理对话框关闭
const handleClose = () => {
  emit('update:modelValue', false)
}

// 处理对话框打开后
const handleOpened = () => {
  emit('opened')
}

// 处理对话框关闭后
const handleClosed = () => {
  if (props.resetOnClose) {
    resetFields()
  }
  emit('closed')
}

// 处理表单提交
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate((valid: boolean) => {
      if (valid) {
        emit('submit', props.formData)
      }
    })
  } catch {
    // 验证失败，不执行提交
  }
}

// 处理取消
const handleCancel = () => {
  emit('cancel')
  handleClose()
}

// 处理字段值变化
const handleFieldChange = (prop: string, value: any) => {
  const newFormData = { ...props.formData, [prop]: value }
  emit('update:formData', newFormData)
}

// 验证表单
const validate = async () => {
  if (!formRef.value) return false
  return formRef.value.validate()
}

// 重置表单
const resetFields = () => {
  formRef.value?.resetFields()
}

// 清除验证
const clearValidate = (props?: string | string[]) => {
  formRef.value?.clearValidate(props)
}

// 暴露方法
defineExpose({
  validate,
  resetFields,
  clearValidate,
  formRef,
})

// 监听对话框打开，可以在这里做一些初始化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // 对话框打开时的逻辑
    }
  }
)

// 检查字段是否有自定义插槽
const hasFieldSlot = (field: FormField): boolean => {
  return !!field.slot && !!slots[field.slot]
}

// 获取字段的 placeholder
const getFieldPlaceholder = (field: FormField): string => {
  if (field.placeholder) return field.placeholder
  const action = field.type === 'select' ? '请选择' : '请输入'
  return `${action}${field.label}`
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :custom-class="dialogCustomClass"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="!loading"
    :teleported="false"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @opened="handleOpened"
    @closed="handleClosed"
  >
    <!-- 自定义标题插槽 -->
    <template v-if="slots.header" #header>
      <slot name="header" />
    </template>

    <!-- 表单内容 -->
    <el-form
      ref="formRef"
      :model="formData"
      :rules="mergedRules"
      :label-position="labelPosition"
      :label-width="labelWidth"
      class="form-dialog__form"
      @submit.prevent
    >
      <el-row :gutter="20">
        <el-col
          v-for="field in visibleFields"
          :key="field.prop"
          :span="field.span || 24"
        >
          <el-form-item
            :prop="field.prop"
            :label="field.label"
            :required="field.required"
          >
            <!-- 自定义插槽 -->
            <slot
              v-if="hasFieldSlot(field)"
              :name="field.slot"
              :field="field"
              :value="formData[field.prop]"
              :update-value="(val: any) => handleFieldChange(field.prop, val)"
            />

            <!-- 输入框 -->
            <el-input
              v-else-if="field.type === 'input'"
              :model-value="formData[field.prop]"
              :type="field.inputType || 'text'"
              :placeholder="getFieldPlaceholder(field)"
              :disabled="field.disabled || loading"
              v-bind="field.props"
              @update:model-value="handleFieldChange(field.prop, $event)"
            />

            <!-- 文本域 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              :model-value="formData[field.prop]"
              type="textarea"
              :placeholder="getFieldPlaceholder(field)"
              :disabled="field.disabled || loading"
              :rows="field.props?.rows || 3"
              v-bind="field.props"
              @update:model-value="handleFieldChange(field.prop, $event)"
            />

            <!-- 下拉选择 -->
            <el-select
              v-else-if="field.type === 'select'"
              :model-value="formData[field.prop]"
              :placeholder="getFieldPlaceholder(field)"
              :disabled="field.disabled || loading"
              style="width: 100%"
              v-bind="field.props"
              @update:model-value="handleFieldChange(field.prop, $event)"
            >
              <el-option
                v-for="option in field.options"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
                :disabled="option.disabled"
              />
            </el-select>

            <!-- 日期选择 -->
            <el-date-picker
              v-else-if="field.type === 'date' || field.type === 'datetime'"
              :model-value="formData[field.prop]"
              :type="field.type === 'datetime' ? 'datetime' : 'date'"
              :placeholder="getFieldPlaceholder(field)"
              :disabled="field.disabled || loading"
              style="width: 100%"
              v-bind="field.props"
              @update:model-value="handleFieldChange(field.prop, $event)"
            />

            <!-- 自定义类型（渲染空，由插槽处理） -->
            <slot
              v-else-if="field.type === 'custom'"
              :name="field.slot || `field-${field.prop}`"
              :field="field"
              :value="formData[field.prop]"
              :update-value="(val: any) => handleFieldChange(field.prop, val)"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 底部按钮 -->
    <template v-if="showButtons" #footer>
      <div class="form-dialog__footer">
        <slot name="footer" :submit="handleSubmit" :cancel="handleCancel" :loading="loading">
          <el-button
            class="form-dialog__cancel"
            :disabled="loading"
            @click="handleCancel"
          >
            {{ cancelText }}
          </el-button>
          <el-button
            class="form-dialog__submit"
            type="primary"
            :loading="loading"
            :disabled="loading"
            @click="handleSubmit"
          >
            {{ submitText }}
          </el-button>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.form-dialog {
  &__form {
    padding: 8px 0;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 深度选择器覆盖 Element Plus 样式
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 12px 20px;
  border-top: 1px solid var(--tech-border-secondary) !important;
  background-color: var(--tech-bg-card) !important;
}

:deep(.el-dialog__header) {
  background-color: var(--tech-bg-card) !important;
  border-bottom: 1px solid var(--tech-border-secondary) !important;
  color: var(--tech-text-primary) !important;
}

:deep(.el-dialog__body) {
  background-color: var(--tech-bg-card) !important;
  color: var(--tech-text-secondary) !important;
}

:deep(.el-form) {
  .el-form-item {
    margin-bottom: 18px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}
</style>
