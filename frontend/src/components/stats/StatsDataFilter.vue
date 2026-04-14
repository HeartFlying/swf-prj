<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FilterConfig, FilterValue, QuickFilter } from './types'

interface Props {
  filters: FilterConfig[]
  modelValue?: FilterValue
  quickFilters?: QuickFilter[]
  showClear?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  quickFilters: () => [],
  showClear: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterValue): void
  (e: 'change', value: FilterValue): void
}>()

// 当前筛选值
const filterValues = ref<FilterValue>({ ...props.modelValue })

// 监听 props 变化
watch(
  () => props.modelValue,
  newValue => {
    filterValues.value = { ...newValue }
  },
  { deep: true }
)

// 活跃的筛选器数量
const activeFiltersCount = computed(() => {
  return Object.values(filterValues.value).filter(
    value => value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)
  ).length
})

// 是否有活跃的筛选器
const hasActiveFilters = computed(() => activeFiltersCount.value > 0)

// 更新单个筛选器
const updateFilter = (key: string, value: string | number | string[] | number[] | undefined) => {
  if (value === '' || (Array.isArray(value) && value.length === 0)) {
    delete filterValues.value[key]
  } else {
    filterValues.value[key] = value
  }

  emit('update:modelValue', { ...filterValues.value })
  emit('change', { ...filterValues.value })
}

// 清除所有筛选器
const clearFilters = () => {
  filterValues.value = {}
  emit('update:modelValue', {})
  emit('change', {})
}

// 清除单个筛选器
const clearFilter = (key: string) => {
  delete filterValues.value[key]
  emit('update:modelValue', { ...filterValues.value })
  emit('change', { ...filterValues.value })
}

// 获取筛选值（暴露给父组件）
const getFilterValues = (): FilterValue => ({ ...filterValues.value })

// 应用快速筛选
const applyQuickFilter = (quickFilter: QuickFilter) => {
  filterValues.value = { ...quickFilter.value }
  emit('update:modelValue', { ...filterValues.value })
  emit('change', { ...filterValues.value })
}

// 暴露方法给父组件
defineExpose({
  clearFilters,
  clearFilter,
  getFilterValues,
  updateFilter,
})
</script>

<template>
  <div class="data-filter" data-testid="data-filter">
    <!-- 快速筛选 -->
    <div v-if="quickFilters.length > 0" class="data-filter__quick">
      <span class="data-filter__quick-label">快速筛选:</span>
      <div class="data-filter__quick-list">
        <ElButton
          v-for="(item, index) in quickFilters"
          :key="index"
          class="data-filter__quick-item"
          size="small"
          @click="applyQuickFilter(item)"
        >
          {{ item.label }}
        </ElButton>
      </div>
    </div>

    <!-- 筛选器列表 -->
    <div class="data-filter__list">
      <div
        v-for="filter in filters"
        :key="filter.key"
        class="data-filter__item"
        data-testid="data-filter-item"
      >
        <!-- 下拉选择 -->
        <ElSelect
          v-if="filter.type === 'select'"
          :model-value="filterValues[filter.key]"
          :placeholder="filter.placeholder || `选择${filter.label}`"
          :multiple="filter.multiple"
          :clearable="filter.clearable !== false"
          :collapse-tags="filter.multiple"
          @change="(value: string | number | string[]) => updateFilter(filter.key, value)"
        >
          <ElOption
            v-for="option in filter.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 级联选择 -->
        <ElCascader
          v-else-if="filter.type === 'cascader'"
          :model-value="filterValues[filter.key]"
          :options="filter.options || []"
          :placeholder="filter.placeholder || `选择${filter.label}`"
          :props="{ checkStrictly: true, emitPath: false }"
          :clearable="filter.clearable !== false"
          @change="(value: string | number) => updateFilter(filter.key, value)"
        />

        <!-- 输入框 -->
        <ElInput
          v-else-if="filter.type === 'input'"
          :model-value="filterValues[filter.key]"
          :placeholder="filter.placeholder || `输入${filter.label}`"
          clearable
          @input="(value: string) => updateFilter(filter.key, value)"
          @clear="() => clearFilter(filter.key)"
        />
      </div>

      <!-- 清除按钮 -->
      <ElButton
        v-if="showClear && hasActiveFilters"
        class="data-filter__clear"
        type="info"
        size="small"
        @click="clearFilters"
      >
        清除筛选
        <ElTag v-if="activeFiltersCount > 0" size="small" type="info">
          {{ activeFiltersCount }}
        </ElTag>
      </ElButton>
    </div>

    <!-- 已选筛选标签 -->
    <div v-if="hasActiveFilters" class="data-filter__tags" data-testid="data-filter-tags">
      <ElTag
        v-for="filter in filters"
        v-show="
          filterValues[filter.key] !== undefined &&
          filterValues[filter.key] !== '' &&
          !(
            Array.isArray(filterValues[filter.key]) &&
            (filterValues[filter.key] as unknown[]).length === 0
          )
        "
        :key="filter.key"
        closable
        size="small"
        @close="clearFilter(filter.key)"
      >
        {{ filter.label }}:
        <template v-if="filter.type === 'select'">
          <template v-if="Array.isArray(filterValues[filter.key])">
            {{ (filterValues[filter.key] as string[]).length }}项已选
          </template>
          <template v-else>
            {{
              filter.options?.find(opt => opt.value === filterValues[filter.key])?.label ||
              filterValues[filter.key]
            }}
          </template>
        </template>
        <template v-else>
          {{ filterValues[filter.key] }}
        </template>
      </ElTag>
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-filter {
  display: flex;
  flex-direction: column;
  gap: var(--tech-spacing-small, 12px);

  &__quick {
    display: flex;
    align-items: center;
    gap: var(--tech-spacing-small, 12px);
    flex-wrap: wrap;
    padding-bottom: var(--tech-spacing-small, 12px);
    border-bottom: 1px dashed var(--tech-border-secondary, rgba(0, 212, 255, 0.1));
  }

  &__quick-label {
    font-size: var(--tech-font-size-small, 13px);
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
  }

  &__quick-list {
    display: flex;
    gap: var(--tech-spacing-small, 8px);
    flex-wrap: wrap;
  }

  &__quick-item {
    font-size: var(--tech-font-size-small, 13px);
    background-color: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
    border-color: var(--tech-border-primary, rgba(0, 212, 255, 0.3));
    color: var(--tech-text-primary, #ffffff);

    &:hover {
      background-color: var(--tech-cyan, #00d4ff);
      border-color: var(--tech-cyan, #00d4ff);
      color: var(--tech-bg-primary, #0a1929);
    }
  }

  &__list {
    display: flex;
    align-items: center;
    gap: var(--tech-spacing-small, 12px);
    flex-wrap: wrap;
  }

  &__item {
    min-width: 120px;

    :deep(.el-select),
    :deep(.el-cascader),
    :deep(.el-input) {
      width: 100%;

      .el-input__wrapper {
        background-color: var(--tech-bg-input, rgba(13, 33, 55, 0.8));
        border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.3));
        box-shadow: none;

        .el-input__inner {
          color: var(--tech-text-primary, #ffffff);
        }

        .el-input__suffix {
          color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
        }

        &:hover,
        &.is-focus {
          border-color: var(--tech-cyan, #00d4ff);
        }
      }
    }
  }

  &__clear {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--tech-bg-secondary, rgba(255, 255, 255, 0.1));
    border-color: var(--tech-border-primary, rgba(0, 212, 255, 0.3));
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));

    &:hover {
      background-color: var(--tech-bg-hover, rgba(0, 212, 255, 0.2));
      border-color: var(--tech-cyan, #00d4ff);
      color: var(--tech-text-primary, #ffffff);
    }
  }

  &__tags {
    display: flex;
    gap: var(--tech-spacing-small, 8px);
    flex-wrap: wrap;
    padding-top: var(--tech-spacing-small, 12px);

    :deep(.el-tag) {
      background-color: var(--tech-bg-secondary, rgba(0, 212, 255, 0.1));
      border-color: var(--tech-border-primary, rgba(0, 212, 255, 0.3));
      color: var(--tech-text-primary, #ffffff);

      .el-tag__close {
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));

        &:hover {
          background-color: var(--tech-cyan, #00d4ff);
          color: var(--tech-bg-primary, #0a1929);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .data-filter {
    &__list {
      flex-direction: column;
      align-items: stretch;
    }

    &__item {
      width: 100%;
      min-width: auto;
    }

    &__clear {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
