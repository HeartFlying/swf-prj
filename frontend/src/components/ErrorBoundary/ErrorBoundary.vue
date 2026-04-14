<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue'
import { ElButton, ElIcon, ElCollapse, ElCollapseItem } from 'element-plus'
import { CircleCloseFilled, RefreshRight, WarningFilled } from '@element-plus/icons-vue'

export interface ErrorInfo {
  /** 错误对象 */
  error: Error
  /** Vue错误信息 */
  errorInfo: string
  /** 组件堆栈 */
  componentStack: string
  /** 时间戳 */
  timestamp: number
}

export interface ErrorBoundaryProps {
  /** 是否显示错误详情 */
  showDetails?: boolean
  /** 最大重试次数 */
  maxRetries?: number
  /** 自定义类名 */
  customClass?: string
  /** 错误回调函数 */
  onError?: (info: ErrorInfo) => void
  /** 错误标题 */
  fallbackTitle?: string
  /** 错误描述 */
  fallbackDescription?: string
}

const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
  showDetails: false,
  maxRetries: 3,
  customClass: '',
  fallbackTitle: '组件出错',
  fallbackDescription: '抱歉，组件加载出现问题'
})

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'error', info: ErrorInfo): void
}>()

// 错误状态
const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref('')
const componentStack = ref('')
const errorCount = ref(0)
const timestamp = ref(0)

// 计算是否还可以重试
const canRetry = computed(() => errorCount.value < props.maxRetries)

// 计算组件类名
const componentClasses = computed(() => [
  'error-boundary',
  props.customClass
])

// 计算错误消息
const errorMessage = computed(() => {
  return error.value?.message || '未知错误'
})

// 计算格式化后的堆栈信息
const formattedStack = computed(() => {
  if (!error.value?.stack) return ''
  return error.value.stack
})

/**
 * 错误捕获处理
 */
onErrorCaptured((err: unknown, instance, info) => {
  // 如果超过最大重试次数，不再捕获
  if (errorCount.value >= props.maxRetries) {
    return false
  }

  // 记录错误信息
  hasError.value = true
  error.value = err instanceof Error ? err : new Error(String(err))
  errorInfo.value = info
  timestamp.value = Date.now()

  // 构建组件堆栈
  const componentName = instance?.$options?.name || instance?.$?.type?.name || 'UnknownComponent'
  componentStack.value = `at ${componentName} (${info})`

  // 增加错误计数
  errorCount.value++

  // 构建错误信息对象
  const errorData: ErrorInfo = {
    error: error.value,
    errorInfo: info,
    componentStack: componentStack.value,
    timestamp: timestamp.value
  }

  // 调用错误回调
  if (props.onError) {
    props.onError(errorData)
  }

  // 触发错误事件
  emit('error', errorData)

  // 阻止错误继续传播
  return false
})

/**
 * 重试处理
 */
const handleRetry = () => {
  // 重置错误状态
  hasError.value = false
  error.value = null
  errorInfo.value = ''
  componentStack.value = ''

  // 触发重试事件
  emit('retry')
}

/**
 * 重置错误状态（供外部调用）
 */
const reset = () => {
  hasError.value = false
  error.value = null
  errorInfo.value = ''
  componentStack.value = ''
  errorCount.value = 0
}

/**
 * 获取错误信息（供外部调用）
 */
const getErrorInfo = (): ErrorInfo | null => {
  if (!hasError.value || !error.value) return null

  return {
    error: error.value,
    errorInfo: errorInfo.value,
    componentStack: componentStack.value,
    timestamp: timestamp.value
  }
}

// 暴露方法给父组件
defineExpose({
  reset,
  getErrorInfo
})
</script>

<template>
  <div :class="componentClasses">
    <!-- 正常内容 -->
    <template v-if="!hasError">
      <slot />
    </template>

    <!-- 错误展示 -->
    <template v-else>
      <!-- 自定义错误UI -->
      <slot
        name="error-content"
        :error="error"
        :error-info="errorInfo"
        :component-stack="componentStack"
        :timestamp="timestamp"
        :retry="handleRetry"
        :can-retry="canRetry"
      >
        <!-- 默认错误UI -->
        <div class="error-boundary__error">
          <div class="error-boundary__icon">
            <el-icon :size="64" color="var(--el-color-danger)">
              <CircleCloseFilled />
            </el-icon>
          </div>

          <h3 class="error-boundary__title">{{ fallbackTitle }}</h3>

          <p class="error-boundary__description">
            {{ fallbackDescription }}
          </p>

          <p class="error-boundary__message">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ errorMessage }}</span>
          </p>

          <!-- 错误详情 -->
          <div v-if="showDetails" class="error-boundary__details">
            <el-collapse>
              <el-collapse-item title="错误详情" name="details">
                <div class="error-boundary__info">
                  <p><strong>错误信息:</strong> {{ errorInfo }}</p>
                  <p><strong>组件堆栈:</strong> {{ componentStack }}</p>
                  <p><strong>发生时间:</strong> {{ new Date(timestamp).toLocaleString() }}</p>
                </div>
                <pre v-if="formattedStack" class="error-boundary__stack">{{ formattedStack }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>

          <!-- 操作按钮 -->
          <div class="error-boundary__actions">
            <el-button
              v-if="canRetry"
              type="primary"
              class="error-boundary__retry-btn"
              @click="handleRetry"
            >
              <el-icon><RefreshRight /></el-icon>
              <span>重试</span>
            </el-button>
            <el-button
              v-else
              type="info"
              disabled
            >
              已达到最大重试次数
            </el-button>
          </div>
        </div>
      </slot>
    </template>
  </div>
</template>

<style scoped lang="scss">
.error-boundary {
  width: 100%;

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    background-color: var(--tech-bg-secondary) !important;
    border-radius: 8px;
    border: 1px solid var(--tech-border-primary) !important;
    backdrop-filter: blur(10px);
  }

  &__icon {
    margin-bottom: 16px;
  }

  &__title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 500;
    color: var(--tech-text-primary) !important;
  }

  &__description {
    margin: 0 0 16px;
    font-size: 14px;
    color: var(--tech-text-secondary) !important;
  }

  &__message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 20px;
    padding: 12px 16px;
    font-size: 13px;
    color: var(--tech-red) !important;
    background-color: rgba(248, 113, 113, 0.15) !important;
    border-radius: 4px;
    max-width: 100%;
    word-break: break-all;

    .el-icon {
      flex-shrink: 0;
    }
  }

  &__details {
    width: 100%;
    max-width: 600px;
    margin-bottom: 20px;
    text-align: left;

    :deep(.el-collapse) {
      border: 1px solid var(--tech-border-primary) !important;
      border-radius: 4px;
      overflow: hidden;
      background-color: var(--tech-bg-card) !important;
    }

    :deep(.el-collapse-item__header) {
      padding: 0 16px;
      font-weight: 500;
      background-color: var(--tech-bg-card) !important;
      color: var(--tech-text-primary) !important;
    }

    :deep(.el-collapse-item__content) {
      padding: 16px;
      background-color: var(--tech-bg-card) !important;
      color: var(--tech-text-secondary) !important;
    }
  }

  &__info {
    margin-bottom: 12px;

    p {
      margin: 8px 0;
      font-size: 13px;
      color: var(--tech-text-secondary) !important;

      strong {
        color: var(--tech-text-primary) !important;
      }
    }
  }

  &__stack {
    margin: 0;
    padding: 12px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    color: var(--tech-text-secondary) !important;
    background-color: var(--tech-bg-tertiary) !important;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
  }

  &__actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__retry-btn {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
