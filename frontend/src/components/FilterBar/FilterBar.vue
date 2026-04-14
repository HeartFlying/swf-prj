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
  ElTag,
  ElRow,
  ElCol,
  ElIcon,
} from 'element-plus'
import { Search, Refresh, ArrowDown, ArrowUp } from '@element-plus/icons-vue'

// 筛选选项类型
export interface FilterOption {
  label: string
  value: any
  disabled?: boolean
  children?: FilterOption[]
  [key: string]: any
}

// 筛选项类型
export type FilterType = 'input' | 'select' | 'multiSelect' | 'dateRange' | 'cascader'

export interface FilterItem {
  /** 筛选键名 */
  key: string
  /** 筛选标签 */
  label: string
  /** 筛选类型 */
  type: FilterType
  /** 占位文本 */
  placeholder?: string | string[]
  /** 选项（用于select/cascader） */
  options?: FilterOption[]
  /** 栅格占据的列数 */
  span?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义渲染函数 */
  render?: (value: any, onChange: (val: any) => void) => any
  /** 其他配置 */
  props?: Record<string, any>
}

// 快速筛选类型
export interface QuickFilter {
  /** 标签文本 */
  label: string
  /** 筛选值 */
  value: FilterValue
}

// 筛选值类型
export interface FilterValue {
  [key: string]: any
}

// 组件属性
export interface FilterBarProps {
  /** 筛选配置 */
  filters: FilterItem[]
  /** 快速筛选标签 */
  quickFilters?: QuickFilter[]
  /** 初始值 */
  initialValues?: FilterValue
  /** 是否行内模式 */
  inline?: boolean
  /** 标签位置 */
  labelPosition?: 'left' | 'right' | 'top'
  /** 标签宽度 */
  labelWidth?: string | number
  /** 是否加载中 */
  loading?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 栅格间隔 */
  gutter?: number
  /** 是否显示重置按钮 */
  showReset?: boolean
  /** 是否显示查询按钮 */
  showSearch?: boolean
  /** 重置按钮文本 */
  resetText?: string
  /** 查询按钮文本 */
  searchText?: string
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认折叠状态 */
  defaultCollapsed?: boolean
  /** 防抖延迟(ms) */
  debounce?: number
}

const props = withDefaults(defineProps<FilterBarProps>(), {
  filters: () => [],
  quickFilters: () => [],
  initialValues: () => ({}),
  inline: false,
  labelPosition: 'right',
  labelWidth: '100px',
  loading: false,
  disabled: false,
  size: 'default',
  gutter: 16,
  showReset: true,
  showSearch: true,
  resetText: '重置',
  searchText: '查询',
  collapsible: false,
  defaultCollapsed: false,
  debounce: 0,
})

const emit = defineEmits<{
  /** 筛选值变化 */
  (e: 'change', values: FilterValue): void
  /** 查询事件 */
  (e: 'search', values: FilterValue): void
  /** 重置事件 */
  (e: 'reset'): void
  /** 折叠状态变化 */
  (e: 'collapse', collapsed: boolean): void
}>()

// 筛选值
const filterValues = ref<FilterValue>({})

// 折叠状态
const isCollapsed = ref(props.defaultCollapsed)

// 当前激活的快速筛选
const activeQuickFilter = ref<string | null>(null)

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 初始化筛选值
const initValues = () => {
  const values: FilterValue = {}
  props.filters.forEach((filter) => {
    if (filter.type === 'dateRange' || filter.type === 'cascader' || filter.type === 'multiSelect') {
      values[filter.key] = props.initialValues?.[filter.key] || []
    } else {
      values[filter.key] = props.initialValues?.[filter.key] || ''
    }
  })
  filterValues.value = values
}

// 处理筛选值变化
const handleFilterChange = (key: string, value: any) => {
  filterValues.value[key] = value

  // 清除快速筛选激活状态
  activeQuickFilter.value = null

  // 防抖处理
  if (props.debounce > 0) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      emit('change', { ...filterValues.value })
    }, props.debounce)
  } else {
    emit('change', { ...filterValues.value })
  }
}

// 处理快速筛选点击
const handleQuickFilterClick = (quickFilter: QuickFilter) => {
  activeQuickFilter.value = quickFilter.label
  filterValues.value = { ...filterValues.value, ...quickFilter.value }
  emit('change', { ...filterValues.value })
}

// 处理查询
const handleSearch = () => {
  if (props.loading) return
  emit('search', { ...filterValues.value })
}

// 处理重置
const handleReset = () => {
  initValues()
  activeQuickFilter.value = null
  emit('reset')
  emit('change', { ...filterValues.value })
}

// 处理折叠切换
const handleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('collapse', isCollapsed.value)
}

// 获取输入框占位文本
const getPlaceholder = (filter: FilterItem): string => {
  if (typeof filter.placeholder === 'string') {
    return filter.placeholder
  }
  return `请输入${filter.label}`
}

// 获取日期范围占位文本
const getDateRangePlaceholder = (filter: FilterItem): [string, string] => {
  if (Array.isArray(filter.placeholder)) {
    return filter.placeholder as [string, string]
  }
  return ['开始日期', '结束日期']
}

// 计算显示的筛选器
const visibleFilters = computed(() => {
  if (!isCollapsed.value) return props.filters
  // 折叠时只显示前3个
  return props.filters.slice(0, 3)
})

// 是否有更多筛选器
const hasMoreFilters = computed(() => props.filters.length > 3)

// 获取列宽
const getColSpan = (filter: FilterItem): number => {
  if (props.inline) return undefined as any
  return filter.span || 6
}

// 暴露方法
defineExpose({
  /** 获取当前筛选值 */
  getValues: () => ({ ...filterValues.value }),
  /** 设置筛选值 */
  setValues: (values: FilterValue) => {
    filterValues.value = { ...filterValues.value, ...values }
  },
  /** 重置筛选 */
  reset: handleReset,
})

// 监听初始值变化
watch(
  () => props.initialValues,
  () => initValues(),
  { deep: true }
)

// 组件挂载时初始化
onMounted(() => {
  initValues()
})
</script>

<template>
  <div class="filter-bar filter-bar__content" :class="{ 'is-inline': inline }">
    <!-- 快速筛选标签 -->
    <div v-if="quickFilters.length > 0" class="filter-bar__quick-filters">
      <span class="filter-bar__quick-label">快速筛选:</span>
      <el-tag
        v-for="qf in quickFilters"
        :key="qf.label"
        class="filter-bar__quick-tag"
        :class="{ 'is-active': activeQuickFilter === qf.label, 'el-tag--primary': activeQuickFilter === qf.label }"
        :type="activeQuickFilter === qf.label ? 'primary' : 'info'"
        :effect="activeQuickFilter === qf.label ? 'dark' : 'plain'"
        size="small"
        @click="handleQuickFilterClick(qf)"
      >
        {{ qf.label }}
      </el-tag>
    </div>

    <!-- 筛选表单 -->
    <el-form
      class="filter-bar__form"
      :inline="inline"
      :label-position="labelPosition"
      :label-width="labelWidth"
      :size="size"
    >
      <el-row :gutter="gutter">
        <el-col
          v-for="filter in visibleFilters"
          :key="filter.key"
          :span="getColSpan(filter)"
          class="filter-bar__col"
        >
          <el-form-item :label="filter.label" class="filter-bar__item">
            <!-- 输入框 -->
            <el-input
              v-if="filter.type === 'input'"
              v-model="filterValues[filter.key]"
              :placeholder="getPlaceholder(filter)"
              :disabled="disabled || filter.disabled"
              clearable
              @update:model-value="(val) => handleFilterChange(filter.key, val)"
            />

            <!-- 下拉选择 -->
            <el-select
              v-else-if="filter.type === 'select'"
              v-model="filterValues[filter.key]"
              :placeholder="getPlaceholder(filter)"
              :disabled="disabled || filter.disabled"
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
              v-model="filterValues[filter.key]"
              :placeholder="getPlaceholder(filter)"
              :disabled="disabled || filter.disabled"
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
              v-model="filterValues[filter.key]"
              type="daterange"
              :start-placeholder="getDateRangePlaceholder(filter)[0]"
              :end-placeholder="getDateRangePlaceholder(filter)[1]"
              :disabled="disabled || filter.disabled"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              @change="(val: any) => handleFilterChange(filter.key, val)"
            />

            <!-- 级联选择 -->
            <el-cascader
              v-else-if="filter.type === 'cascader'"
              v-model="filterValues[filter.key]"
              :options="filter.options"
              :placeholder="getPlaceholder(filter)"
              :disabled="disabled || filter.disabled"
              clearable
              style="width: 100%"
              @change="(val) => handleFilterChange(filter.key, val)"
            />

            <!-- 自定义渲染 -->
            <component
              :is="filter.render"
              v-else-if="filter.render"
              :value="filterValues[filter.key]"
              :on-change="(val: any) => handleFilterChange(filter.key, val)"
            />
          </el-form-item>
        </el-col>

        <!-- 操作按钮 -->
        <el-col v-if="filters.length > 0" :span="inline ? undefined : 6" class="filter-bar__actions-col">
          <el-form-item class="filter-bar__actions">
            <!-- 查询按钮 -->
            <el-button
              v-if="showSearch"
              data-test="search-btn"
              type="primary"
              :loading="loading"
              :disabled="disabled"
              @click="handleSearch"
            >
              <el-icon><Search /></el-icon>
              {{ searchText }}
            </el-button>

            <!-- 重置按钮 -->
            <el-button
              v-if="showReset"
              data-test="reset-btn"
              :disabled="loading || disabled"
              @click="handleReset"
            >
              <el-icon><Refresh /></el-icon>
              {{ resetText }}
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
.filter-bar {
  padding: 16px;
  background-color: var(--tech-bg-card) !important;
  border-radius: 8px;
  border: 1px solid var(--tech-border-secondary) !important;
  backdrop-filter: blur(10px);

  &__quick-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--tech-border-secondary) !important;
  }

  &__quick-label {
    font-size: 14px;
    color: var(--tech-text-secondary) !important;
    margin-right: 4px;
  }

  &__quick-tag {
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
    }

    &.is-active {
      font-weight: 500;
    }
  }

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

  // 行内模式样式
  &.is-inline {
    .filter-bar {
      &__quick-filters {
        margin-bottom: 12px;
        padding-bottom: 8px;
      }

      &__actions {
        margin-left: auto;
      }
    }
  }
}

// 响应式布局
@media screen and (max-width: 1200px) {
  .filter-bar {
    &__actions-col {
      justify-content: flex-start;
    }
  }
}

@media screen and (max-width: 768px) {
  .filter-bar {
    padding: 12px;

    &__quick-filters {
      flex-wrap: wrap;
    }

    &__actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
