<!--
  Sync Page Component
  数据同步页面组件

  @description 数据同步管理页面，提供同步状态查看、手动同步触发和自动同步设置功能
  @author DevMetrics Team

  @example
  <SyncPage />
-->
<script setup lang="ts">
/**
 * Sync Page Logic
 * 数据同步页面逻辑
 *
 * @description 处理数据同步状态管理、同步任务执行和日志记录
 */
import { ref, computed, nextTick, watch, onMounted, type Component } from 'vue'
import {
  Refresh,
  RefreshRight,
  List,
  Timer,
  DocumentChecked,
  Coin,
  Monitor,
  Folder,
  View,
  VideoPlay,
} from '@element-plus/icons-vue'
import StatsLayout from '@/components/stats/StatsLayout.vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import StatusTag from '@/components/StatusTag/StatusTag.vue'
import SyncLogViewer from '@/components/SyncLogViewer/SyncLogViewer.vue'
import type { DataTableColumn } from '@/components/DataTable/DataTable.vue'
import type { SyncTask, SyncLog } from '@/types/api'
import type { SyncLogEntry } from '@/components/SyncLogViewer/SyncLogViewer.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useMessage } from '@/composables/useMessage'
import { getSyncTasks, getSyncStatus, triggerSync, getSyncLogs, syncGitLab, syncTrae, syncZendao } from '@/api/sync'

// 快捷警告消息方法
const { warning: showWarning } = useMessage()

/** 是否正在全量同步中 */
const isSyncing = ref(false)
/** 是否正在加载 */
const isLoading = ref(false)
/** 是否启用自动同步 */
const autoSyncEnabled = ref(true)
/** 同步间隔（分钟） */
const syncInterval = ref(60)
/** 终端日志容器引用 */
const terminalRef = ref<HTMLElement>()

// 初始化 composables
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useMessage()

// 手动触发任务加载状态
const triggeringTaskIds = ref<Set<number>>(new Set())

// 日志查看器状态
const logViewerVisible = ref(false)
const currentTaskId = ref<number | undefined>(undefined)
const currentTaskName = ref<string>('')
const taskLogs = ref<SyncLogEntry[]>([])
const logViewerLoading = ref(false)

/**
 * 同步状态类型
 * @typedef {'success' | 'warning' | 'error' | 'syncing'} SyncStatus
 */
type SyncStatus = 'success' | 'warning' | 'error' | 'syncing'

/**
 * 同步状态项接口
 * @interface SyncStatusItem
 */
interface SyncStatusItem {
  /** 同步类型 */
  type: string
  /** 同步名称 */
  name: string
  /** 图标组件 */
  icon: Component
  /** 上次同步时间 */
  lastSync: string
  /** 同步状态 */
  status: SyncStatus
  /** 是否正在同步 */
  syncing: boolean
}

const syncStatuses = ref<SyncStatusItem[]>([
  {
    type: 'code',
    name: '代码统计',
    icon: DocumentChecked,
    lastSync: '-',
    status: 'success',
    syncing: false,
  },
  {
    type: 'token',
    name: 'Token使用',
    icon: Coin,
    lastSync: '-',
    status: 'success',
    syncing: false,
  },
  {
    type: 'session',
    name: '会话数据',
    icon: Monitor,
    lastSync: '-',
    status: 'warning',
    syncing: false,
  },
  {
    type: 'project',
    name: '项目信息',
    icon: Folder,
    lastSync: '-',
    status: 'success',
    syncing: false,
  },
])

const statusText: Record<SyncStatus, string> = {
  success: '已同步',
  warning: '需同步',
  error: '同步失败',
  syncing: '同步中',
}

/**
 * 日志条目接口
 * @interface LogEntry
 */
interface LogEntry {
  /** 日志时间 */
  time: string
  /** 日志级别 */
  level: 'info' | 'success' | 'warning' | 'error'
  /** 日志消息 */
  message: string
}

const syncLogs = ref<LogEntry[]>([])

const currentTime = computed(() => {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
})

// 同步任务列表数据
const syncTaskList = ref<SyncTask[]>([])

// 分页配置
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

// 状态筛选
const statusFilter = ref<string>('')

// 同步类型映射
const sourceTypeNames: Record<string, string> = {
  gitlab: 'GitLab',
  trae: 'Trae',
  zendao: '禅道',
}

// 任务类型映射
const taskTypeNames: Record<string, string> = {
  full_sync: '全量同步',
  code_sync: '代码同步',
  token_sync: 'Token同步',
  bug_sync: 'Bug同步',
  project_sync: '项目同步',
  session_sync: '会话同步',
}

// 状态映射
const statusMap: Record<string, { type: 'success' | 'warning' | 'error' | 'info' | 'processing' | 'default'; text: string }> = {
  pending: { type: 'info', text: '待执行' },
  running: { type: 'processing', text: '执行中' },
  completed: { type: 'success', text: '成功' },
  failed: { type: 'error', text: '失败' },
}

// 过滤后的任务列表
const filteredTaskList = computed(() => {
  if (!statusFilter.value) {
    return syncTaskList.value
  }
  return syncTaskList.value.filter(task => task.status === statusFilter.value)
})

// 表格列配置
const taskColumns: DataTableColumn<SyncTask>[] = [
  {
    prop: 'id',
    label: '任务ID',
    width: 80,
    align: 'center',
  },
  {
    prop: 'taskType',
    label: '任务名称',
    minWidth: 120,
    formatter: (row) => taskTypeNames[row.taskType] || row.taskType,
  },
  {
    prop: 'sourceType',
    label: '同步类型',
    width: 100,
    align: 'center',
    formatter: (row) => sourceTypeNames[row.sourceType] || row.sourceType,
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    slot: 'status',
  },
  {
    prop: 'completedAt',
    label: '上次执行时间',
    minWidth: 150,
    formatter: (row) => row.completedAt || '-',
  },
  {
    prop: 'nextRunTime',
    label: '下次执行时间',
    minWidth: 150,
    formatter: (row) => {
      if (row.status === 'running') return '执行中'
      // 从后端获取的下次执行时间，如果没有则显示'-'
      return row.nextRunTime || '-'
    },
  },
  {
    prop: 'action',
    label: '操作',
    width: 150,
    align: 'center',
    slot: 'action',
    fixed: 'right',
  },
]

// 处理页码变化
const handlePageChange = (page: number) => {
  pagination.value.currentPage = page
}

// 处理每页条数变化
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
}

/**
 * 日志级别映射：从小写API格式转为大写显示格式
 */
const levelMapping: Record<string, 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'> = {
  info: 'INFO',
  warning: 'WARN',
  error: 'ERROR',
  success: 'INFO', // success 映射为 INFO
}

/**
 * 获取任务日志
 * @param taskId - 任务ID
 */
const fetchTaskLogs = async (taskId: number): Promise<SyncLogEntry[]> => {
  try {
    const response = await getSyncLogs(taskId, { pageSize: 100 })
    return response.items.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      level: levelMapping[log.level] || 'INFO',
      message: log.message,
    }))
  } catch (error) {
    showError('加载同步日志失败')
    return []
  }
}

/**
 * 查看日志
 * @param task - 同步任务
 */
const handleViewLog = async (task: SyncTask) => {
  currentTaskId.value = task.id
  currentTaskName.value = taskTypeNames[task.taskType] || task.taskType
  logViewerVisible.value = true
  logViewerLoading.value = true

  try {
    const logs = await fetchTaskLogs(task.id)
    taskLogs.value = logs
  } catch (error) {
    showError('获取日志失败')
    taskLogs.value = []
  } finally {
    logViewerLoading.value = false
  }
}

/**
 * 加载同步任务列表
 */
const loadTasks = async () => {
  isLoading.value = true
  try {
    const response = await getSyncTasks({
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      status: statusFilter.value || undefined
    })
    syncTaskList.value = response.items
    pagination.value.total = response.total
  } catch (error) {
    showError('加载同步任务失败')
  } finally {
    isLoading.value = false
  }
}

/**
 * 加载同步状态
 */
const loadSyncStatus = async () => {
  try {
    const status = await getSyncStatus()
    // 更新同步状态显示
    if (status.isRunning) {
      syncStatuses.value.forEach(s => {
        s.status = 'syncing'
        s.syncing = true
      })
    }
  } catch (error) {
    console.error('加载同步状态失败', error)
  }
}

/**
 * 调用API触发同步任务
 * @param taskId 任务ID
 */
const triggerSyncApi = async (taskId: number): Promise<void> => {
  // 调用后端API触发同步任务
  await triggerSync(taskId)
}

/**
 * 检查任务是否在触发中
 * @param taskId 任务ID
 */
const isTaskTriggering = (taskId: number): boolean => {
  return triggeringTaskIds.value.has(taskId)
}

// 手动触发任务
const handleTriggerTask = async (task: SyncTask) => {
  // 检查任务是否正在运行或触发中
  if (task.status === 'running') {
    showWarning('该任务正在执行中，请稍后再试')
    return
  }

  if (isTaskTriggering(task.id)) {
    showWarning('该任务正在触发中，请稍后再试')
    return
  }

  // 获取任务类型和来源的显示名称
  const taskTypeName = taskTypeNames[task.taskType] || task.taskType
  const sourceTypeName = sourceTypeNames[task.sourceType] || task.sourceType

  // 显示确认弹窗
  const confirmed = await confirm({
    title: '确认手动触发同步',
    message: `确定要立即执行 "${taskTypeName}" 任务吗？\n\n同步来源：${sourceTypeName}\n任务ID：#${task.id}`,
    type: 'warning',
    confirmButtonText: '确认触发',
    cancelButtonText: '取消',
    confirmButtonType: 'primary',
  })

  if (!confirmed) {
    return
  }

  // 添加到触发中集合
  triggeringTaskIds.value.add(task.id)
  addLog('info', `正在手动触发任务 #${task.id} (${taskTypeName})...`)

  try {
    // 调用API触发同步
    await triggerSyncApi(task.id)

    // 触发成功
    showSuccess(`任务 #${task.id} 已成功触发，正在执行同步`, {
      duration: 5000,
    })
    addLog('success', `任务 #${task.id} 触发成功，同步已开始`)

    // 更新任务状态为运行中（乐观更新）
    const taskIndex = syncTaskList.value.findIndex(t => t.id === task.id)
    if (taskIndex !== -1) {
      const currentTask = syncTaskList.value[taskIndex]
      syncTaskList.value[taskIndex] = {
        ...currentTask,
        status: 'running',
        progress: 0,
        startedAt: new Date().toLocaleString('zh-CN'),
        message: '手动触发执行中...',
      } as SyncTask
    }
  } catch (error) {
    // 触发失败
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    showError(`任务 #${task.id} 触发失败：${errorMessage}`, {
      duration: 5000,
    })
    addLog('error', `任务 #${task.id} 触发失败：${errorMessage}`)
  } finally {
    // 从触发中集合移除
    triggeringTaskIds.value.delete(task.id)
  }
}

/**
 * 添加同步日志
 * @param {LogEntry['level']} level - 日志级别
 * @param {string} message - 日志消息
 */
const addLog = (level: LogEntry['level'], message: string) => {
  syncLogs.value.push({
    time: currentTime.value,
    level,
    message,
  })
  nextTick(() => {
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight
    }
  })
}

/**
 * 同步类型到API的映射
 */
const syncTypeToApi: Record<string, (data: { syncType: 'full_sync' | 'incremental_sync' }) => Promise<SyncTask>> = {
  code: syncGitLab,
  token: syncTrae,
  session: syncTrae,
  project: syncZendao,
}

/**
 * 开始单项同步
 * @param {string} type - 同步类型
 * @returns {Promise<void>}
 */
const startSync = async (type: string) => {
  const status = syncStatuses.value.find(s => s.type === type)
  if (!status) return

  status.syncing = true
  status.status = 'syncing'
  addLog('info', `开始同步 ${status.name}...`)

  try {
    const syncApi = syncTypeToApi[type]
    if (!syncApi) {
      throw new Error(`未知的同步类型: ${type}`)
    }

    // 调用真实API执行同步
    await syncApi({ syncType: 'full_sync' })

    status.syncing = false
    status.status = 'success'
    status.lastSync = new Date().toLocaleString('zh-CN')
    addLog('success', `${status.name}同步完成`)
  } catch (error) {
    status.syncing = false
    status.status = 'error'
    const errorMessage = error instanceof Error ? error.message : '同步失败'
    addLog('error', `${status.name}同步失败: ${errorMessage}`)
    showError(`${status.name}同步失败: ${errorMessage}`)
  }
}

/**
 * 开始全量同步
 * @returns {Promise<void>}
 */
const startFullSync = async () => {
  isSyncing.value = true
  addLog('info', '开始执行全量同步任务...')

  for (const status of syncStatuses.value) {
    await startSync(status.type)
  }

  addLog('info', '全量同步任务执行完毕')
  isSyncing.value = false
}

/**
 * 处理刷新事件
 */
const handleRefresh = async () => {
  await loadTasks()
  await loadSyncStatus()
}

/**
 * 自动滚动日志到底部
 */
watch(
  syncLogs,
  () => {
    nextTick(() => {
      const terminal = document.querySelector('.terminal-body')
      if (terminal) {
        terminal.scrollTop = terminal.scrollHeight
      }
    })
  },
  { deep: true }
)

// 组件挂载时加载数据
onMounted(() => {
  loadTasks()
  loadSyncStatus()
})
</script>

<template>
  <StatsLayout
    title="数据同步"
    :loading="isLoading"
    :show-time-range="false"
    :show-filter="false"
    :show-refresh="true"
    @refresh="handleRefresh"
  >
    <div class="sync-page">
      <!-- 同步状态概览 -->
      <div class="sync-overview">
        <div
          v-for="status in syncStatuses"
          :key="status.type"
          class="status-card"
          :class="status.status"
          data-testid="status-card"
        >
          <div class="status-icon">
            <el-icon><component :is="status.icon" /></el-icon>
          </div>
          <div class="status-content">
            <div class="status-title" data-testid="status-title">{{ status.name }}</div>
            <div class="status-time" data-testid="status-time">上次同步: {{ status.lastSync }}</div>
            <div class="status-badge" :class="status.status" data-testid="status-badge">
              {{ statusText[status.status] }}
            </div>
          </div>
          <div class="status-action">
            <el-button
              size="small"
              :icon="RefreshRight"
              :loading="status.syncing"
              @click="startSync(status.type)"
            >
              同步
            </el-button>
          </div>
        </div>
      </div>

      <!-- 主要内容区 -->
      <div class="main-content">
        <!-- 左侧：同步日志 -->
        <div class="logs-section">
          <div class="section-header">
            <el-icon><List /></el-icon>
            <span>同步日志</span>
          </div>
          <div ref="terminalRef" class="terminal" data-testid="terminal">
            <div class="terminal-header">
              <div class="terminal-dots">
                <span class="dot red" />
                <span class="dot yellow" />
                <span class="dot green" />
              </div>
              <div class="terminal-title">sync_log.txt</div>
            </div>
            <div class="terminal-body">
              <div v-for="(log, index) in syncLogs" :key="index" class="log-line" :class="log.level" data-testid="log-line">
                <span class="log-time">[{{ log.time }}]</span>
                <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
              <div v-if="isSyncing" class="log-line info">
                <span class="log-time">[{{ currentTime }}]</span>
                <span class="log-level">[INFO]</span>
                <span class="log-message">
                  同步进行中
                  <span class="loading-dots">...</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：同步任务 -->
        <div class="tasks-section">
          <div class="section-header">
            <el-icon><Timer /></el-icon>
            <span>同步任务</span>
          </div>

          <!-- 状态筛选 -->
          <div class="filter-bar">
            <el-radio-group v-model="statusFilter" size="small">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="pending">待执行</el-radio-button>
              <el-radio-button label="running">执行中</el-radio-button>
              <el-radio-button label="completed">成功</el-radio-button>
              <el-radio-button label="failed">失败</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 同步任务列表 -->
          <DataTable
            :data="filteredTaskList"
            :columns="taskColumns"
            :pagination="pagination"
            :loading="isLoading"
            size="small"
            @page-change="handlePageChange"
            @size-change="handleSizeChange"
          >
            <!-- 状态列自定义 -->
            <template #status="{ row }">
              <StatusTag
                v-if="row.status && statusMap[row.status]"
                :status="statusMap[row.status]!.type"
                :text="statusMap[row.status]!.text"
                size="small"
              />
            </template>

            <!-- 操作列自定义 -->
            <template #action="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                :icon="View"
                @click="handleViewLog(row)"
              >
                日志
              </el-button>
              <el-button
                link
                type="success"
                size="small"
                :icon="VideoPlay"
                :disabled="row.status === 'running' || isTaskTriggering(row.id)"
                :loading="isTaskTriggering(row.id)"
                @click="handleTriggerTask(row)"
              >
                {{ isTaskTriggering(row.id) ? '触发中' : '触发' }}
              </el-button>
            </template>
          </DataTable>

          <div class="sync-settings" data-testid="sync-settings">
            <h4>自动同步设置</h4>
            <div class="setting-item">
              <span>启用自动同步</span>
              <el-switch v-model="autoSyncEnabled" />
            </div>
            <div class="setting-item">
              <span>同步间隔</span>
              <el-select v-model="syncInterval" size="small" style="width: 120px">
                <el-option label="15分钟" :value="15" />
                <el-option label="30分钟" :value="30" />
                <el-option label="1小时" :value="60" />
                <el-option label="6小时" :value="360" />
                <el-option label="12小时" :value="720" />
                <el-option label="24小时" :value="1440" />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: 手动触发同步按钮 -->
    <template #footer>
      <div class="sync-footer">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="isSyncing"
          @click="startFullSync"
        >
          全量同步
        </el-button>
      </div>
    </template>
  </StatsLayout>

  <!-- 同步日志查看器 -->
  <SyncLogViewer
    v-model="logViewerVisible"
    :task-id="currentTaskId"
    :task-name="currentTaskName"
    :logs="taskLogs"
    :loading="logViewerLoading"
    data-testid="sync-log-viewer"
  />
</template>

<style scoped lang="scss">
.sync-page {
  .sync-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;

    // XS 断点: 1 列
    @media (max-width: 575px) {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    // SM 断点: 2 列
    @media (min-width: 576px) and (max-width: 767px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    // MD 断点: 2 列
    @media (min-width: 768px) and (max-width: 991px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--tech-bg-card, #fff);
      border: 1px solid var(--tech-border-secondary, #e4e7ed);
      border-radius: 8px;
      transition: all 0.3s ease;

      &.success {
        border-color: rgba(0, 255, 136, 0.3);
        .status-icon {
          color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
        }
      }

      &.warning {
        border-color: rgba(255, 149, 0, 0.3);
        .status-icon {
          color: #ff9500;
          background: rgba(255, 149, 0, 0.1);
        }
      }

      &.error {
        border-color: rgba(255, 0, 110, 0.3);
        .status-icon {
          color: #ff006e;
          background: rgba(255, 0, 110, 0.1);
        }
      }

      &.syncing {
        border-color: rgba(0, 212, 255, 0.3);
        .status-icon {
          color: #00d4ff;
          background: rgba(0, 212, 255, 0.1);
          animation: pulse 1.5s ease-in-out infinite;
        }
      }

      .status-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        font-size: 24px;
      }

      .status-content {
        flex: 1;

        .status-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--tech-text-primary, #303133);
          margin-bottom: 4px;
        }

        .status-time {
          font-size: 12px;
          color: var(--tech-text-muted, #909399);
          margin-bottom: 6px;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;

          &.success {
            background: rgba(0, 255, 136, 0.1);
            color: #00ff88;
          }

          &.warning {
            background: rgba(255, 149, 0, 0.1);
            color: #ff9500;
          }

          &.error {
            background: rgba(255, 0, 110, 0.1);
            color: #ff006e;
          }

          &.syncing {
            background: rgba(0, 212, 255, 0.1);
            color: #00d4ff;
          }
        }
      }
    }
  }

  .main-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;

    // XS/SM/MD 断点: 1 列堆叠
    @media (max-width: 991px) {
      grid-template-columns: 1fr;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
      color: var(--tech-text-primary, #ffffff);
    }

    .logs-section {
      .terminal {
        background: #0d1117;
        border-radius: 8px;
        overflow: hidden;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #161b22;
          border-bottom: 1px solid #30363d;

          .terminal-dots {
            display: flex;
            gap: 8px;

            .dot {
              width: 12px;
              height: 12px;
              border-radius: 50%;

              &.red {
                background: #ff5f56;
              }
              &.yellow {
                background: #ffbd2e;
              }
              &.green {
                background: #27c93f;
              }
            }
          }

          .terminal-title {
            font-size: 13px;
            color: #8b949e;
          }
        }

        .terminal-body {
          height: 400px;
          padding: 16px;
          overflow-y: auto;

          .log-line {
            display: flex;
            gap: 8px;
            margin-bottom: 6px;
            font-size: 13px;
            line-height: 1.6;

            .log-time {
              color: #6e7681;
              flex-shrink: 0;
            }

            .log-level {
              flex-shrink: 0;
              font-weight: 600;
            }

            .log-message {
              color: #c9d1d9;
            }

            &.info .log-level {
              color: #58a6ff;
            }
            &.success .log-level {
              color: #3fb950;
            }
            &.warning .log-level {
              color: #d29922;
            }
            &.error .log-level {
              color: #f85149;
            }

            .loading-dots {
              animation: blink 1s step-end infinite;
            }
          }
        }
      }
    }

    .tasks-section {
      .filter-bar {
        margin-bottom: 16px;
        display: flex;
        justify-content: flex-start;
      }

      .sync-settings {
        padding-top: 20px;
        border-top: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));

        h4 {
          font-size: 14px;
          color: var(--tech-text-primary, #ffffff);
          margin: 0 0 16px;
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
        }
      }
    }
  }
}

.sync-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
</style>
