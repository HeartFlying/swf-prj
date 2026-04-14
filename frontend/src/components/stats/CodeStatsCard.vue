<script setup lang="ts">
import { computed } from 'vue'
import { Document, Plus, Minus, DocumentCopy } from '@element-plus/icons-vue'
import DataCard from '@/components/DataCard/DataCard.vue'
import type { CodeStatsType, CompareType } from './types'

export type { CodeStatsType, CompareType }

export interface CodeStatsCardProps {
  /** 统计类型 */
  type: CodeStatsType
  /** 数值 */
  value?: number
  /** 趋势值（正数表示上升，负数表示下降） */
  trend?: number
  /** 对比类型：mom(环比) 或 yoy(同比) */
  compareType?: CompareType
  /** 自定义描述文本，优先级高于 compareType */
  description?: string
  /** 是否加载中 */
  loading?: boolean
  /** 尺寸 */
  size?: 'small' | 'default' | 'large'
  /** 是否可悬停 */
  hoverable?: boolean
}

const props = withDefaults(defineProps<CodeStatsCardProps>(), {
  value: 0,
  compareType: 'mom',
  loading: false,
  size: 'default',
  hoverable: false,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

// 类型配置映射
const typeConfig = {
  commits: {
    title: '提交数',
    icon: 'Document',
    theme: 'primary' as const,
    iconComponent: Document,
  },
  additions: {
    title: '新增行数',
    icon: 'Plus',
    theme: 'success' as const,
    iconComponent: Plus,
  },
  deletions: {
    title: '删除行数',
    icon: 'Minus',
    theme: 'danger' as const,
    iconComponent: Minus,
  },
  files: {
    title: '文件变更数',
    icon: 'DocumentCopy',
    theme: 'warning' as const,
    iconComponent: DocumentCopy,
  },
}

// 当前类型配置
const currentConfig = computed(() => {
  return typeConfig[props.type] || typeConfig.commits
})

// 描述文本
const descriptionText = computed(() => {
  if (props.description) {
    return props.description
  }
  if (props.trend !== undefined && props.trend !== null) {
    return props.compareType === 'yoy' ? '较去年同期' : '较上月'
  }
  return undefined
})

// 是否显示趋势
const hasTrend = computed(() => {
  return props.trend !== undefined && props.trend !== null
})

// 处理点击事件
const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<template>
  <div class="code-stats-card" @click="handleClick">
    <DataCard
      :title="currentConfig.title"
      :value="value"
      :icon="currentConfig.icon"
      :theme="currentConfig.theme"
      :trend="trend"
      :show-trend-icon="hasTrend"
      :description="descriptionText"
      :loading="loading"
      :size="size"
      :hoverable="hoverable"
    />
  </div>
</template>

<style scoped lang="scss">
.code-stats-card {
  display: block;
  width: 100%;

  :deep(.data-card) {
    height: 100%;
  }
}
</style>
