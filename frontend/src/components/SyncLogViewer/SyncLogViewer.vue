<script setup lang="ts">
/**
 * SyncLogViewer Component
 * 同步日志查看组件
 *
 * @description 用于查看同步任务的详细日志，支持级别筛选、复制等功能
 * @author DevMetrics Team
 *
 * @example
 * <SyncLogViewer
 *   v-model="visible"
 *   :task-id="taskId"
 *   :logs="logs"
 * />
 */
import { ref, computed, watch } from 'vue'
import {
  ElDialog,
  ElButton,
  ElTag,
  ElRadioGroup,
  ElRadioButton,
  ElTooltip,
  ElEmpty,
} from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

/**
 * 日志级别类型
 */
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

/**
 * 同步日志条目接口
 * @interface SyncLogEntry
 */
export interface SyncLogEntry {
  /** 日志ID */
  id: number
  /** 时间戳 */
  timestamp: string
  /** 日志级别 */
  level: LogLevel
  /** 日志内容 */
  message: string
  /** 执行耗时（毫秒） */
  duration?: number
}

/**
 * 组件属性定义
 */
interface Props {
  /** 弹窗可见性 */
  modelValue: boolean
  /** 任务ID */
  taskId?: number
  /** 任务名称 */
  taskName?: string
  /** 日志数据 */
  logs: SyncLogEntry[]
  /** 弹窗宽度 */
  width?: string | number
  /** 是否加载中 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '800px',
  loading: false,
})

const emit = defineEmits<{
  /** 更新弹窗可见性 */
  (e: 'update:modelValue', value: boolean): void
  /** 弹窗关闭后 */
  (e: 'closed'): void
}>()

/** 级别筛选值 */
const levelFilter = ref<LogLevel | ''>('')

/** 日志级别选项 */
const levelOptions: { label: string; value: LogLevel | ''; type: '' | 'info' | 'warning' | 'danger' | 'success' }[] = [
  { label: '全部', value: '', type: '' },
  { label: 'INFO', value: 'INFO', type: 'info' },
  { label: 'WARN', value: 'WARN', type: 'warning' },
  { label: 'ERROR', value: 'ERROR', type: 'danger' },
  { label: 'DEBUG', value: 'DEBUG', type: 'success' },
]

/** 过滤后的日志列表 */
const filteredLogs = computed(() => {
  if (!levelFilter.value) {
    return props.logs
  }
  return props.logs.filter(log => log.level === levelFilter.value)
})

/** 各级别日志数量统计 */
const levelCounts = computed(() => {
  const counts: Record<LogLevel | 'total', number> = {
    total: props.logs.length,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    DEBUG: 0,
  }
  props.logs.forEach(log => {
    counts[log.level]++
  })
  return counts
})

/** 弹窗标题 */
const dialogTitle = computed(() => {
  if (props.taskName) {
    return `同步日志 - ${props.taskName}${props.taskId ? ` (#${props.taskId})` : ''}`
  }
  return `同步日志${props.taskId ? ` - #${props.taskId}` : ''}`
})

/**
 * 获取日志级别对应的标签类型
 * @param level - 日志级别
 * @returns 标签类型
 */
const getLevelType = (level: LogLevel): 'info' | 'warning' | 'danger' | 'success' => {
  const typeMap: Record<LogLevel, 'info' | 'warning' | 'danger' | 'success'> = {
    INFO: 'info',
    WARN: 'warning',
    ERROR: 'danger',
    DEBUG: 'success',
  }
  return typeMap[level]
}

/**
 * 格式化耗时显示
 * @param duration - 耗时（毫秒）
 * @returns 格式化后的字符串
 */
const formatDuration = (duration?: number): string => {
  if (duration === undefined || duration === null) return '-'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

/**
 * 格式化时间戳
 * @param timestamp - ISO格式时间戳
 * @returns 格式化后的时间字符串
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * 复制单条日志
 * @param log - 日志条目
 */
const copyLog = (log: SyncLogEntry) => {
  const text = `[${formatTimestamp(log.timestamp)}] [${log.level}] ${log.message}${log.duration ? ` (${formatDuration(log.duration)})` : ''}`
  copyToClipboard(text)
}

/**
 * 复制所有日志
 */
const copyAllLogs = () => {
  const text = filteredLogs.value
    .map(log => `[${formatTimestamp(log.timestamp)}] [${log.level}] ${log.message}${log.duration ? ` (${formatDuration(log.duration)})` : ''}`)
    .join('\n')
  copyToClipboard(text, '全部日志已复制')
}

/**
 * 复制到剪贴板
 * @param text - 要复制的文本
 * @param successMessage - 成功提示消息
 */
const copyToClipboard = async (text: string, successMessage = '已复制到剪贴板') => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(successMessage)
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success(successMessage)
    } catch {
      ElMessage.error('复制失败')
    }
    document.body.removeChild(textarea)
  }
}

/**
 * 处理弹窗关闭
 */
const handleClose = () => {
  emit('update:modelValue', false)
}

/**
 * 处理弹窗关闭后
 */
const handleClosed = () => {
  levelFilter.value = ''
  emit('closed')
}

/**
 * 监听弹窗打开，重置筛选
 */
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      levelFilter.value = ''
    }
  }
)
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    :width="width"
    :close-on-click-modal="false"
    destroy-on-close
    class="sync-log-viewer"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
    @closed="handleClosed"
  >
    <!-- 头部工具栏 -->
    <div class="log-viewer-header">
      <!-- 级别筛选 -->
      <div class="filter-section">
        <span class="filter-label">级别筛选:</span>
        <el-radio-group v-model="levelFilter" size="small">
          <el-radio-button
            v-for="option in levelOptions"
            :key="option.value"
            :label="option.value"
          >
            {{ option.label }}
            <span v-if="option.value && levelCounts[option.value] > 0" class="count-badge">
              ({{ levelCounts[option.value] }})
            </span>
            <span v-else-if="!option.value && levelCounts.total > 0" class="count-badge">
              ({{ levelCounts.total }})
            </span>
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <el-tooltip content="复制全部日志" placement="top">
          <el-button
            type="primary"
            size="small"
            :icon="DocumentCopy"
            :disabled="filteredLogs.length === 0"
            @click="copyAllLogs"
          >
            复制全部
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="log-list-container" v-loading="loading">
      <div v-if="filteredLogs.length > 0" class="log-list">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="log-item"
          :class="{ 'is-error': log.level === 'ERROR' }"
        >
          <!-- 时间戳 -->
          <div class="log-timestamp">
            {{ formatTimestamp(log.timestamp) }}
          </div>

          <!-- 日志级别 -->
          <div class="log-level">
            <el-tag
              :type="getLevelType(log.level)"
              size="small"
              effect="light"
              class="level-tag"
            >
              {{ log.level }}
            </el-tag>
          </div>

          <!-- 日志内容 -->
          <div class="log-message" :title="log.message">
            {{ log.message }}
          </div>

          <!-- 执行耗时 -->
          <div v-if="log.duration !== undefined" class="log-duration">
            {{ formatDuration(log.duration) }}
          </div>

          <!-- 复制按钮 -->
          <div class="log-action">
            <el-tooltip content="复制" placement="top">
              <el-button
                link
                type="primary"
                size="small"
                :icon="DocumentCopy"
                @click="copyLog(log)"
              />
            </el-tooltip>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-else
        description="暂无日志数据"
        :image-size="80"
      />
    </div>

    <!-- 底部统计 -->
    <div v-if="filteredLogs.length > 0" class="log-viewer-footer">
      <div class="footer-stats">
        <span class="stat-item">
          总计: <strong>{{ levelCounts.total }}</strong> 条
        </span>
        <span v-if="levelCounts.ERROR > 0" class="stat-item error">
          错误: <strong>{{ levelCounts.ERROR }}</strong> 条
        </span>
        <span v-if="levelCounts.WARN > 0" class="stat-item warning">
          警告: <strong>{{ levelCounts.WARN }}</strong> 条
        </span>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.sync-log-viewer {
  :deep(.el-dialog__body) {
    padding: 16px 20px;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
  }

  .log-viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--tech-border-secondary) !important;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;

    .filter-section {
      display: flex;
      align-items: center;
      gap: 8px;

      .filter-label {
        font-size: 13px;
        color: var(--tech-text-secondary) !important;
        white-space: nowrap;
      }

      .count-badge {
        font-size: 11px;
        color: var(--tech-text-muted) !important;
        margin-left: 2px;
      }
    }

    .action-section {
      display: flex;
      gap: 8px;
    }
  }

  .log-list-container {
    flex: 1;
    overflow: hidden;
    min-height: 200px;

    .log-list {
      max-height: 400px;
      overflow-y: auto;
      padding-right: 8px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--tech-border-primary) !important;
        border-radius: 3px;

        &:hover {
          background: var(--tech-cyan) !important;
        }
      }
    }

    .log-item {
      display: grid;
      grid-template-columns: 130px 70px 1fr 80px 40px;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      transition: background-color 0.2s;
      font-size: 13px;

      &:hover {
        background-color: var(--tech-bg-secondary) !important;
      }

      &.is-error {
        background-color: rgba(244, 67, 54, 0.1) !important;
        border-left: 3px solid var(--tech-red) !important;

        &:hover {
          background-color: rgba(244, 67, 54, 0.2) !important;
        }
      }

      .log-timestamp {
        color: var(--tech-text-muted) !important;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 12px;
        white-space: nowrap;
      }

      .log-level {
        .level-tag {
          font-weight: 600;
          font-size: 11px;
        }
      }

      .log-message {
        color: var(--tech-text-primary) !important;
        word-break: break-all;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .log-duration {
        color: var(--tech-text-muted) !important;
        font-size: 12px;
        text-align: right;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }

      .log-action {
        display: flex;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
      }

      &:hover .log-action {
        opacity: 1;
      }
    }
  }

  .log-viewer-footer {
    padding-top: 16px;
    border-top: 1px solid var(--tech-border-secondary) !important;
    margin-top: 16px;

    .footer-stats {
      display: flex;
      gap: 20px;
      font-size: 13px;
      color: var(--tech-text-secondary) !important;

      .stat-item {
        &.error {
          color: var(--tech-red) !important;
        }

        &.warning {
          color: var(--tech-orange) !important;
        }

        strong {
          font-weight: 600;
        }
      }
    }
  }
}

// 响应式适配
@media (max-width: 768px) {
  .sync-log-viewer {
    .log-item {
      grid-template-columns: 100px 60px 1fr !important;
      grid-template-rows: auto auto;
      gap: 8px !important;

      .log-timestamp {
        grid-column: 1;
        grid-row: 1;
      }

      .log-level {
        grid-column: 2;
        grid-row: 1;
      }

      .log-message {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      .log-duration {
        grid-column: 3;
        grid-row: 1;
        text-align: right;
      }

      .log-action {
        display: none !important;
      }
    }

    .log-viewer-header {
      flex-direction: column;
      align-items: flex-start;

      .filter-section {
        width: 100%;
        overflow-x: auto;
      }
    }
  }
}
</style>
