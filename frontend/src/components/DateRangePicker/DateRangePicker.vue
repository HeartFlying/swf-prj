<script setup lang="ts">
import { computed } from 'vue'
import { ElDatePicker, ElButton } from 'element-plus'

// 日期范围类型
export type DateRangeType = 'daterange' | 'datetimerange' | 'monthrange'

// 快捷选项类型
export interface DateRangeShortcut {
  text: string
  value: () => Date[]
}

// 组件属性
export interface DateRangePickerProps {
  /** 日期范围值 [开始日期, 结束日期] */
  modelValue?: Date[] | null
  /** 是否显示快捷选项 */
  shortcuts?: boolean
  /** 日期范围类型 */
  type?: DateRangeType
  /** 尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 是否禁用 */
  disabled?: boolean
  /** 开始日期占位文本 */
  startPlaceholder?: string
  /** 结束日期占位文本 */
  endPlaceholder?: string
  /** 日期格式 */
  format?: string
  /** 值格式 */
  valueFormat?: string
  /** 是否可清空 */
  clearable?: boolean
}

const props = withDefaults(defineProps<DateRangePickerProps>(), {
  modelValue: undefined,
  shortcuts: true,
  type: 'daterange',
  size: 'default',
  disabled: false,
  startPlaceholder: '开始日期',
  endPlaceholder: '结束日期',
  format: undefined,
  valueFormat: undefined,
  clearable: true,
})

const emit = defineEmits<{
  /** 更新日期范围值 */
  (e: 'update:modelValue', value: Date[] | null): void
  /** 日期范围变化事件 */
  (e: 'change', value: Date[] | null): void
  /** 聚焦事件 */
  (e: 'focus'): void
  /** 失焦事件 */
  (e: 'blur'): void
}>()

// 当前日期范围值
const currentValue = computed({
  get: () => props.modelValue ?? null,
  set: (val: Date[] | null) => {
    emit('update:modelValue', val)
    emit('change', val)
  },
})

// 检查快捷选项是否激活
const isActiveShortcut = (shortcut: typeof shortcutsList.value[0]): boolean => {
  const val = currentValue.value
  if (!val || val.length < 2) return false
  const start = val[0]
  const end = val[1]
  if (start == null || end == null) return false
  const handlerResult = shortcut.handler()
  // @ts-expect-error TypeScript doesn't recognize the null check above
  return handlerResult[0].getTime() === start.getTime() &&
         // @ts-expect-error TypeScript doesn't recognize the null check above
         handlerResult[1].getTime() === end.getTime()
}

// 获取今天的日期（重置时间部分）
const getToday = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

// 获取昨天的日期
const getYesterday = (): Date => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return yesterday
}

// 获取本周开始日期（周一）
const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

// 获取本周结束日期（周日）
const getWeekEnd = (date: Date = new Date()): Date => {
  const weekStart = getWeekStart(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return weekEnd
}

// 获取上周开始日期
const getLastWeekStart = (): Date => {
  const thisWeekStart = getWeekStart()
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  lastWeekStart.setHours(0, 0, 0, 0)
  return lastWeekStart
}

// 获取上周结束日期
const getLastWeekEnd = (): Date => {
  const lastWeekStart = getLastWeekStart()
  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6)
  lastWeekEnd.setHours(23, 59, 59, 999)
  return lastWeekEnd
}

// 获取本月开始日期
const getMonthStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// 获取本月结束日期
const getMonthEnd = (date: Date = new Date()): Date => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

// 获取上月开始日期
const getLastMonthStart = (): Date => {
  const today = new Date()
  today.setMonth(today.getMonth() - 1)
  today.setDate(1)
  today.setHours(0, 0, 0, 0)
  return today
}

// 获取上月结束日期
const getLastMonthEnd = (): Date => {
  const today = new Date()
  today.setDate(0)
  today.setHours(23, 59, 59, 999)
  return today
}

// 获取本季度开始日期
const getQuarterStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const quarter = Math.floor(d.getMonth() / 3)
  d.setMonth(quarter * 3)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// 获取本季度结束日期
const getQuarterEnd = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const quarter = Math.floor(d.getMonth() / 3)
  d.setMonth(quarter * 3 + 3)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

// 获取上季度开始日期
const getLastQuarterStart = (): Date => {
  const today = new Date()
  const quarter = Math.floor(today.getMonth() / 3)
  today.setMonth((quarter - 1) * 3)
  today.setDate(1)
  today.setHours(0, 0, 0, 0)
  return today
}

// 获取上季度结束日期
const getLastQuarterEnd = (): Date => {
  const today = new Date()
  const quarter = Math.floor(today.getMonth() / 3)
  today.setMonth(quarter * 3)
  today.setDate(0)
  today.setHours(23, 59, 59, 999)
  return today
}

// 获取本年开始日期
const getYearStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  d.setMonth(0)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// 获取本年结束日期
const getYearEnd = (date: Date = new Date()): Date => {
  const d = new Date(date)
  d.setMonth(11)
  d.setDate(31)
  d.setHours(23, 59, 59, 999)
  return d
}

// 获取去年开始日期
const getLastYearStart = (): Date => {
  const today = new Date()
  today.setFullYear(today.getFullYear() - 1)
  today.setMonth(0)
  today.setDate(1)
  today.setHours(0, 0, 0, 0)
  return today
}

// 获取去年结束日期
const getLastYearEnd = (): Date => {
  const today = new Date()
  today.setFullYear(today.getFullYear() - 1)
  today.setMonth(11)
  today.setDate(31)
  today.setHours(23, 59, 59, 999)
  return today
}

// 快捷选项定义
const shortcutsList = computed(() => [
  {
    key: 'today',
    label: '今天',
    handler: () => {
      const today = getToday()
      return [today, today]
    },
  },
  {
    key: 'yesterday',
    label: '昨天',
    handler: () => {
      const yesterday = getYesterday()
      return [yesterday, yesterday]
    },
  },
  {
    key: 'thisWeek',
    label: '本周',
    handler: () => [getWeekStart(), getWeekEnd()],
  },
  {
    key: 'lastWeek',
    label: '上周',
    handler: () => [getLastWeekStart(), getLastWeekEnd()],
  },
  {
    key: 'thisMonth',
    label: '本月',
    handler: () => [getMonthStart(), getMonthEnd()],
  },
  {
    key: 'lastMonth',
    label: '上月',
    handler: () => [getLastMonthStart(), getLastMonthEnd()],
  },
  {
    key: 'thisQuarter',
    label: '本季度',
    handler: () => [getQuarterStart(), getQuarterEnd()],
  },
  {
    key: 'lastQuarter',
    label: '上季度',
    handler: () => [getLastQuarterStart(), getLastQuarterEnd()],
  },
  {
    key: 'thisYear',
    label: '本年',
    handler: () => [getYearStart(), getYearEnd()],
  },
  {
    key: 'lastYear',
    label: '去年',
    handler: () => [getLastYearStart(), getLastYearEnd()],
  },
])

// 处理快捷选项点击
const handleShortcutClick = (shortcut: typeof shortcutsList.value[0]) => {
  const range = shortcut.handler()
  currentValue.value = range
}

// 处理日期变化
const handleChange = (val: Date[] | null) => {
  emit('update:modelValue', val)
  emit('change', val)
}

// 处理聚焦
const handleFocus = () => {
  emit('focus')
}

// 处理失焦
const handleBlur = () => {
  emit('blur')
}

// 清空日期范围
const clear = () => {
  emit('update:modelValue', null)
  emit('change', null)
}

// 获取当前日期范围
const getCurrentRange = (): Date[] | null => {
  return props.modelValue || null
}

// 暴露方法
defineExpose({
  /** 清空日期范围 */
  clear,
  /** 获取当前日期范围 */
  getCurrentRange,
})
</script>

<template>
  <div class="date-range-picker">
    <div class="date-range-picker__content">
      <!-- 快捷选项按钮组 -->
      <div v-if="shortcuts" class="date-range-picker__shortcuts">
        <el-button
          v-for="shortcut in shortcutsList"
          :key="shortcut.key"
          size="small"
          :type="isActiveShortcut(shortcut) ? 'primary' : 'default'"
          @click="handleShortcutClick(shortcut)"
        >
          {{ shortcut.label }}
        </el-button>
      </div>

      <!-- 日期选择器 -->
      <div class="date-range-picker__picker">
        <el-date-picker
          v-model="currentValue"
          :type="type"
          :size="size"
          :disabled="disabled"
          :start-placeholder="startPlaceholder"
          :end-placeholder="endPlaceholder"
          :format="format"
          :value-format="valueFormat"
          :clearable="clearable"
          style="width: 100%"
          @change="handleChange"
          @focus="handleFocus"
          @blur="handleBlur"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.date-range-picker {
  display: inline-block;
  width: 100%;

  &__content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    background-color: var(--tech-bg-secondary) !important;
    border-radius: 4px;

    .el-button {
      margin: 0;
      flex-shrink: 0;
    }
  }

  &__picker {
    width: 100%;

    :deep(.el-date-editor) {
      width: 100%;
    }
  }
}
</style>
