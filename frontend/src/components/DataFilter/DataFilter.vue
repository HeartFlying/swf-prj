<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElCascader,
  ElButton,
  ElRow,
  ElCol,
  ElIcon,
} from 'element-plus'
import { Refresh, Search, ArrowDown, ArrowUp } from '@element-plus/icons-vue'

// 筛选选项类型
export interface FilterOption {
  label: string
  value: any
  disabled?: boolean
  children?: FilterOption[]
  [key: string]: any
}

// 筛选条件类型
export type FilterType = 'text' | 'select' | 'multiSelect' | 'dateRange' | 'numberRange' | 'cascader'

// 筛选配置接口
export interface FilterConfig {
  /** 筛选键名 */
  key: string
  /** 筛选标签 */
  label: string
  /** 筛选类型 */
  type: FilterType
  /** 占位文本 */
  placeholder?: string | string[]
  /** 选项（用于select/multiSelect/cascader） */
  options?: FilterOption[]
  /** 栅格占据的列数 */
  span?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 其他配置 */
  props?: Record<string, any>
}

// 筛选值类型
export interface FilterValue {
  [key: string]: any
}

// 组件属性
export interface DataFilterProps {
  /** 筛选配置数组 */
  filters: FilterConfig[]
  /** 筛选值（支持v-model） */
  modelValue: Record<string, any>
  /** 加载状态 */
  loading?: boolean
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认折叠状态 */
  defaultCollapsed?: boolean
  /** 尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 栅格间隔 */
  gutter?: number
  /** 标签宽度 */
  labelWidth?: string | number
}

const props = withDefaults(defineProps<DataFilterProps>(), {
  filters: () => [],
  modelValue: () => ({}),
  loading: false,
  collapsible: false,
  defaultCollapsed: false,
  size: 'default',
  gutter: 16,
  labelWidth: '100px',
})

const emit = defineEmits<{
  /** 更新筛选值 */
  (e: 'update:modelValue', value: FilterValue): void
  /** 筛选值变化事件 */
  (e: 'change', value: FilterValue): void
  /** 重置事件 */
  (e: 'reset'): void
  /** 应用事件 */
  (e: 'apply', value: FilterValue): void
  /** 折叠状态变化 */
  (e: 'collapse', collapsed: boolean): void
}>()

// 获取筛选默认值
const getDefaultValue = (type: FilterType): any => {
  switch (type) {
    case 'multiSelect':
    case 'dateRange':
    case 'cascader':
    case 'numberRange':
      return []
    default:
      return ''
  }
}

// 初始化筛选值
const createInitialValues = (): FilterValue => {
  const values: FilterValue = {}
  props.filters.forEach((filter) => {
    const existingValue = props.modelValue?.[filter.key]
    values[filter.key] = existingValue !== undefined ? existingValue : getDefaultValue(filter.type)
  })
  return values
}

// 内部筛选值 - 立即初始化
const internalValues = ref<FilterValue>(createInitialValues())

// 折叠状态
const isCollapsed = ref(props.defaultCollapsed)

// 是否已挂载
const isMounted = ref(false)

// 初始化筛选值（用于重置和重新初始化）
const initValues = () => {
  const values: FilterValue = {}
  props.filters.forEach((filter) => {
    values[filter.key] = getDefaultValue(filter.type)
  })
  internalValues.value = values
}

// 获取输入框占位文本
const getPlaceholder = (filter: FilterConfig): string => {
  if (typeof filter.placeholder === 'string') {
    return filter.placeholder
  }
  return `请输入${filter.label}`
}

// 获取日期范围占位文本
const getDateRangePlaceholder = (filter: FilterConfig): [string, string] => {
  if (Array.isArray(filter.placeholder) && filter.placeholder.length >= 2) {
    return [filter.placeholder[0] ?? '开始日期', filter.placeholder[1] ?? '结束日期']
  }
  return ['开始日期', '结束日期']
}

// 获取数字范围占位文本
const getNumberRangePlaceholder = (filter: FilterConfig, index: 0 | 1): string => {
  if (Array.isArray(filter.placeholder) && filter.placeholder.length >= 2) {
    return filter.placeholder[index] ?? (index === 0 ? '最小值' : '最大值')
  }
  return index === 0 ? '最小值' : '最大值'
}

// 处理筛选值变化
const handleFilterChange = (key: string, value: any) => {
  internalValues.value[key] = value
  emitUpdate()
}

// 处理数字范围最小值变化
const handleNumberRangeMinChange = (key: string, value: string) => {
  const currentRange = internalValues.value[key] || ['', '']
  currentRange[0] = value
  internalValues.value[key] = [...currentRange]
  emitUpdate()
}

// 处理数字范围最大值变化
const handleNumberRangeMaxChange = (key: string, value: string) => {
  const currentRange = internalValues.value[key] || ['', '']
  currentRange[1] = value
  internalValues.value[key] = [...currentRange]
  emitUpdate()
}

// 发送更新事件
const emitUpdate = () => {
  const values = { ...internalValues.value }
  emit('update:modelValue', values)
  emit('change', values)
}

// 处理重置
const handleReset = () => {
  initValues()
  emit('reset')
  emitUpdate()
}

// 处理应用
const handleApply = () => {
  if (props.loading) return
  emit('apply', { ...internalValues.value })
}

// 处理折叠切换
const handleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('collapse', isCollapsed.value)
}

// 计算显示的筛选器
const visibleFilters = computed(() => {
  if (!props.collapsible || !isCollapsed.value) return props.filters
  // 折叠时只显示前3个
  return props.filters.slice(0, 3)
})

// 是否有更多筛选器
const hasMoreFilters = computed(() => props.filters.length > 3)

// 获取列宽
const getColSpan = (filter: FilterConfig): number => {
  return filter.span || 6
}

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    // 合并外部值到内部值
    Object.keys(newValue).forEach((key) => {
      if (internalValues.value[key] !== newValue[key]) {
        internalValues.value[key] = newValue[key]
      }
    })
  },
  { deep: true, immediate: true }
)

// 监听 filters 变化
watch(
  () => props.filters,
  () => {
    // 重新初始化，保留已有值
    const newValues: FilterValue = { ...internalValues.value }
    props.filters.forEach((filter) => {
      if (!(filter.key in newValues)) {
        newValues[filter.key] = getDefaultValue(filter.type)
      }
    })
    internalValues.value = newValues
  },
  { deep: true }
)

// 组件挂载时标记
onMounted(() => {
  isMounted.value = true
})

// 暴露方法
defineExpose({
  /** 获取当前筛选值 */
  getValues: () => ({ ...internalValues.value }),
  /** 设置筛选值 */
  setValues: (values: FilterValue) => {
    Object.keys(values).forEach((key) => {
      internalValues.value[key] = values[key]
    })
    emitUpdate()
  },
  /** 重置筛选 */
  reset: handleReset,
})
</script>

<template>
  <div class="data-filter">
    <el-form
      class="data-filter__form"
      :label-width="labelWidth"
      :size="size"
    >
      <el-row :gutter="gutter">
        <el-col
          v-for="filter in visibleFilters"
          :key="filter.key"
          :span="getColSpan(filter)"
          class="data-filter__col"
        >
          <el-form-item :label="filter.label" class="data-filter__item">
            <!-- 文本输入 -->
            <el-input
              v-if="filter.type === 'text'"
              v-model="internalValues[filter.key]"
              :placeholder="getPlaceholder(filter)"
              :disabled="loading || filter.disabled"
              clearable
              @update:model-value="(val) => handleFilterChange(filter.key, val)"
            />

            <!-- 下拉选择 -->
            <el-select
              v-else-if="filter.type === 'select'"
              v-model="internalValues[filter.key]"
              :placeholder="getPlaceholder(filter)"
              :disabled="loading || filter.disabled"
              clearable
              style="width: 100%"
              @change="(val) => handleFilterChange(filter.key, val)"
            >
              <el-option
                v-for="opt in filter.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
                :disabled="opt.disabled"
              />
            </el-select>

            <!-- 多选下拉 -->
            <el-select
              v-else-if="filter.type === 'multiSelect'"
              v-model="internalValues[filter.key]"
              :placeholder="getPlaceholder(filter)"
              :disabled="loading || filter.disabled"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              style="width: 100%"
              @change="(val) => handleFilterChange(filter.key, val)"
            >
              <el-option
                v-for="opt in filter.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
                :disabled="opt.disabled"
              />
            </el-select>

            <!-- 日期范围 -->
            <el-date-picker
              v-else-if="filter.type === 'dateRange'"
              v-model="internalValues[filter.key]"
              type="daterange"
              :start-placeholder="getDateRangePlaceholder(filter)[0]"
              :end-placeholder="getDateRangePlaceholder(filter)[1]"
              :disabled="loading || filter.disabled"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              @change="(val: any) => handleFilterChange(filter.key, val)"
            />

            <!-- 数字范围 -->
            <div
              v-else-if="filter.type === 'numberRange'"
              class="data-filter__number-range"
            >
              <el-input
                :model-value="internalValues[filter.key]?.[0] || ''"
                :placeholder="getNumberRangePlaceholder(filter, 0)"
                :disabled="loading || filter.disabled"
                @update:model-value="(val) => handleNumberRangeMinChange(filter.key, val)"
              />
              <span class="data-filter__number-range-separator">-</span>
              <el-input
                :model-value="internalValues[filter.key]?.[1] || ''"
                :placeholder="getNumberRangePlaceholder(filter, 1)"
                :disabled="loading || filter.disabled"
                @update:model-value="(val) => handleNumberRangeMaxChange(filter.key, val)"
              />
            </div>

            <!-- 级联选择 -->
            <el-cascader
              v-else-if="filter.type === 'cascader'"
              v-model="internalValues[filter.key]"
              :options="filter.options"
              :placeholder="getPlaceholder(filter)"
              :disabled="loading || filter.disabled"
              clearable
              style="width: 100%"
              @change="(val) => handleFilterChange(filter.key, val)"
            />
          </el-form-item>
        </el-col>

        <!-- 操作按钮 -->
        <el-col
          v-if="filters.length > 0"
          :span="6"
          class="data-filter__actions-col"
        >
          <el-form-item class="data-filter__actions">
            <!-- 应用按钮 -->
            <el-button
              data-test="apply-btn"
              type="primary"
              :loading="loading"
              :disabled="loading"
              @click="handleApply"
            >
              <el-icon><Search /></el-icon>
              应用
            </el-button>

            <!-- 重置按钮 -->
            <el-button
              data-test="reset-btn"
              :disabled="loading"
              @click="handleReset"
            >
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>

            <!-- 折叠按钮 -->
            <el-button
              v-if="collapsible && hasMoreFilters"
              data-test="collapse-btn"
              link
              type="primary"
              @click="handleCollapse"
            >
              <el-icon>
                <ArrowUp v-if="!isCollapsed" />
                <ArrowDown v-else />
              </el-icon>
              {{ isCollapsed ? '展开' : '收起' }}
            </el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.data-filter {
  padding: 16px;
  background-color: var(--tech-bg-card) !important;
  border-radius: 8px;
  border: 1px solid var(--tech-border-secondary) !important;
  backdrop-filter: blur(10px);

  &__form {
    width: 100%;
  }

  &__col {
    margin-bottom: 8px;
  }

  &__item {
    width: 100%;
    margin-bottom: 0;

    :deep(.el-form-item__label) {
      font-weight: 500;
      color: var(--tech-text-secondary) !important;
    }
  }

  &__number-range {
    display: flex;
    align-items: center;
    gap: 8px;

    .el-input {
      flex: 1;
    }
  }

  &__number-range-separator {
    color: var(--tech-text-muted) !important;
    font-weight: 500;
  }

  &__actions-col {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-bottom: 0;

    .el-button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }
}

// 响应式布局
@media screen and (max-width: 1200px) {
  .data-filter {
    &__actions-col {
      justify-content: flex-start;
    }
  }
}

@media screen and (max-width: 768px) {
  .data-filter {
    padding: 12px;

    &__actions {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    &__number-range {
      flex-direction: column;
      gap: 4px;

      .el-input {
        width: 100%;
      }
    }

    &__number-range-separator {
      display: none;
    }
  }
}
</style>
