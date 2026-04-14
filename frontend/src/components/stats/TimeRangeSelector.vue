<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TimeRange } from './types'

interface Props {
  modelValue?: TimeRange
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    preset: 'last7days',
    start: '',
    end: '',
  }),
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: TimeRange): void
  (e: 'change', value: TimeRange): void
}>()

// 预设选项
const presetOptions = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '最近7天', value: 'last7days' },
  { label: '最近30天', value: 'last30days' },
  { label: '本周', value: 'thisWeek' },
  { label: '上周', value: 'lastWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '自定义', value: 'custom' },
]

// 当前选中的预设
const selectedPreset = ref(props.modelValue.preset || 'last7days')

// 自定义日期范围
const customDateRange = ref<[string, string] | null>(
  props.modelValue.preset === 'custom' && props.modelValue.start && props.modelValue.end
    ? [props.modelValue.start, props.modelValue.end]
    : null
)

// 是否显示自定义日期选择器
const showCustomPicker = computed(() => selectedPreset.value === 'custom')

// 监听 props 变化
watch(
  () => props.modelValue,
  newValue => {
    selectedPreset.value = newValue.preset || 'last7days'
    if (newValue.preset === 'custom' && newValue.start && newValue.end) {
      customDateRange.value = [newValue.start, newValue.end]
    }
  },
  { deep: true }
)

// 格式化日期为 YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取日期范围
const getDateRange = (preset: string): { start: string; end: string } => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (preset) {
    case 'today': {
      const todayStr = formatDate(today)
      return { start: todayStr, end: todayStr }
    }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = formatDate(yesterday)
      return { start: yesterdayStr, end: yesterdayStr }
    }

    case 'last7days': {
      const end = formatDate(today)
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return { start: formatDate(start), end }
    }

    case 'last30days': {
      const end = formatDate(today)
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      return { start: formatDate(start), end }
    }

    case 'thisWeek': {
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为第一天
      const start = new Date(today)
      start.setDate(start.getDate() - diff)
      return { start: formatDate(start), end: formatDate(today) }
    }

    case 'lastWeek': {
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const end = new Date(today)
      end.setDate(end.getDate() - diff - 1)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      return { start: formatDate(start), end: formatDate(end) }
    }

    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: formatDate(start), end: formatDate(today) }
    }

    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(start), end: formatDate(end) }
    }

    default:
      return { start: '', end: '' }
  }
}

// 应用预设
const applyPreset = (preset: string) => {
  selectedPreset.value = preset

  if (preset === 'custom') {
    // 自定义模式，等待用户选择日期
    if (customDateRange.value && customDateRange.value[0] && customDateRange.value[1]) {
      const range: TimeRange = {
        preset,
        start: customDateRange.value[0],
        end: customDateRange.value[1],
      }
      emit('update:modelValue', range)
      emit('change', range)
    }
  } else {
    const { start, end } = getDateRange(preset)
    const range: TimeRange = {
      preset,
      start,
      end,
    }
    customDateRange.value = null
    emit('update:modelValue', range)
    emit('change', range)
  }
}

// 处理预设变化
const handlePresetChange = (value: string) => {
  applyPreset(value)
}

// 处理自定义日期变化
const handleCustomDateChange = (value: [string, string] | null) => {
  customDateRange.value = value
  if (value && value[0] && value[1]) {
    const range: TimeRange = {
      preset: 'custom',
      start: value[0],
      end: value[1],
    }
    emit('update:modelValue', range)
    emit('change', range)
  }
}

// 禁用未来日期
const disabledDate = (date: Date): boolean => {
  return date > new Date()
}

// 清除选择
const clear = () => {
  selectedPreset.value = ''
  customDateRange.value = null
  const range: TimeRange = {
    preset: null,
    start: '',
    end: '',
  }
  emit('update:modelValue', range)
  emit('change', range)
}

// 获取当前范围（暴露给父组件）
const getCurrentRange = (): TimeRange => ({
  preset: selectedPreset.value,
  start: customDateRange.value?.[0] || getDateRange(selectedPreset.value).start,
  end: customDateRange.value?.[1] || getDateRange(selectedPreset.value).end,
})

// 暴露方法给父组件
defineExpose({
  clear,
  getCurrentRange,
  applyPreset,
  formatDate,
  disabledDate,
})
</script>

<template>
  <div class="time-range-selector" data-testid="time-range-selector">
    <ElSelect
      v-model="selectedPreset"
      class="time-range-selector__preset"
      data-testid="time-range-selector-preset"
      placeholder="选择时间范围"
      @change="handlePresetChange"
    >
      <ElOption
        v-for="option in presetOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </ElSelect>

    <ElDatePicker
      v-if="showCustomPicker"
      v-model="customDateRange"
      type="daterange"
      class="time-range-selector__custom"
      data-testid="time-range-selector-custom"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      value-format="YYYY-MM-DD"
      :disabled-date="disabledDate"
      @change="handleCustomDateChange"
    />
  </div>
</template>

<style scoped lang="scss">
.time-range-selector {
  display: flex;
  align-items: center;
  gap: var(--tech-spacing-small, 12px);

  &__preset {
    width: 140px;

    :deep(.el-input__wrapper) {
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

  &__custom {
    width: 240px;

    :deep(.el-input__wrapper) {
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

@media (max-width: 768px) {
  .time-range-selector {
    flex-direction: column;
    align-items: stretch;

    &__preset,
    &__custom {
      width: 100%;
    }
  }
}
</style>
