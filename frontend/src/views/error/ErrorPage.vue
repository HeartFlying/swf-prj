<template>
  <div class="error-page">
    <div class="error-container">
      <!-- 错误码展示 -->
      <div class="error-code">
        <span class="digit" v-for="(digit, index) in displayCode" :key="index">{{ digit }}</span>
      </div>

      <!-- 错误消息 -->
      <div class="error-message">{{ errorMessage }}</div>

      <!-- 错误描述 -->
      <p class="error-description">{{ displayDescription }}</p>

      <!-- 自动重试倒计时 -->
      <div v-if="showAutoRetry" class="retry-section">
        <div class="retry-countdown">
          <el-icon><Timer /></el-icon>
          <span>{{ countdown }} 秒后自动重试</span>
        </div>
        <tech-button
          variant="ghost"
          size="small"
          class="cancel-auto-retry"
          @click="cancelAutoRetry"
        >
          取消
        </tech-button>
      </div>

      <!-- 操作按钮组 -->
      <div class="error-actions">
        <tech-button
          variant="primary"
          :icon="RefreshRight"
          class="manual-retry-btn"
          :class="{ loading: isRetrying }"
          :disabled="(retryCount ?? 0) >= maxRetries || isRetrying"
          @click="handleManualRetry"
        >
          <span v-if="isRetrying">重试中...</span>
          <span v-else-if="(retryCount ?? 0) >= maxRetries">已达最大重试次数</span>
          <span v-else>立即重试</span>
        </tech-button>

        <tech-button
          variant="secondary"
          :icon="HomeFilled"
          class="back-home-btn"
          @click="goHome"
        >
          返回首页
        </tech-button>

        <tech-button
          variant="ghost"
          :icon="ArrowLeft"
          class="back-prev-btn"
          @click="goBack"
        >
          返回上一页
        </tech-button>
      </div>

      <!-- 重试次数提示 -->
      <p v-if="(retryCount ?? 0) > 0" class="retry-hint">
        已重试 {{ retryCount ?? 0 }} / {{ maxRetries }} 次
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshRight, HomeFilled, ArrowLeft, Timer } from '@element-plus/icons-vue'
import TechButton from '@/components/tech/TechButton.vue'
import { useAutoRetry } from '@/composables/useRetry'

export interface ErrorPageProps {
  /** 错误码 */
  code?: string
  /** 自定义错误消息 */
  message?: string
  /** 是否启用自动重试 */
  autoRetry?: boolean
  /** 自动重试延迟（秒） */
  retryDelay?: number
  /** 最大重试次数 */
  maxRetries?: number
  /** 自定义错误消息映射 */
  customMessages?: Record<string, string>
  /** 重试成功标记（用于重置状态） */
  retrySuccess?: boolean
}

const props = withDefaults(defineProps<ErrorPageProps>(), {
  code: '404',
  message: '',
  autoRetry: false,
  retryDelay: 5,
  maxRetries: 3,
  customMessages: () => ({}),
  retrySuccess: false,
})

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const router = useRouter()

// 使用自动重试 composable
const {
  retryCount,
  isRetrying,
  canRetry,
  countdown,
  showAutoRetry,
  retry,
  startAutoRetry,
  cancelAutoRetry,
  reset,
} = useAutoRetry({
  maxRetries: props.maxRetries,
  autoRetryDelay: props.retryDelay,
  enabled: props.autoRetry,
  onRetry: () => emit('retry'),
})

// 错误码映射
const errorCodeMap: Record<string, { message: string; description: string }> = {
  '404': {
    message: '页面未找到',
    description: '您访问的页面不存在或已被移除',
  },
  '500': {
    message: '服务器错误',
    description: '服务器遇到了意外情况，无法完成请求',
  },
  '403': {
    message: '访问被拒绝',
    description: '您没有权限访问此页面',
  },
  '401': {
    message: '未授权访问',
    description: '请先登录后再访问此页面',
  },
  '503': {
    message: '服务不可用',
    description: '服务器暂时无法处理请求，请稍后重试',
  },
}

// 计算显示的错误码
const displayCode = computed(() => props.code)

// 计算错误消息
const errorMessage = computed(() => {
  if (props.customMessages[props.code]) {
    return props.customMessages[props.code]
  }
  return errorCodeMap[props.code]?.message || '未知错误'
})

// 计算错误描述
const displayDescription = computed(() => {
  if (props.message) {
    return props.message
  }
  return errorCodeMap[props.code]?.description || '发生了一个错误'
})

// 手动重试
const handleManualRetry = () => {
  cancelAutoRetry()
  retry()
}

// 返回首页
const goHome = () => {
  router.push('/dashboard')
}

// 返回上一页
const goBack = () => {
  router.go(-1)
}

// 监听重试成功，重置计数
watch(
  () => props.retrySuccess,
  (success) => {
    if (success) {
      reset()
    }
  }
)

// 生命周期
onMounted(() => {
  if (props.autoRetry) {
    startAutoRetry()
  }
})
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--tech-bg-primary);

  .error-container {
    text-align: center;
    padding: 40px;
    max-width: 500px;

    .error-code {
      font-size: 120px;
      font-weight: 700;
      font-family: var(--tech-font-mono);
      margin-bottom: 20px;

      .digit {
        display: inline-block;
        background: linear-gradient(135deg, var(--tech-cyan), var(--tech-pink));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: glitch 2s infinite;

        &:nth-child(2) {
          animation-delay: 0.2s;
        }

        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    .error-message {
      font-size: 24px;
      font-weight: 600;
      color: var(--tech-text-primary);
      margin-bottom: 12px;
    }

    .error-description {
      font-size: 14px;
      color: var(--tech-text-muted);
      margin-bottom: 32px;
    }

    .retry-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
      padding: 12px 20px;
      background: var(--tech-bg-secondary);
      border-radius: var(--tech-radius-md);
      border: 1px solid var(--tech-border-primary);

      .retry-countdown {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--tech-cyan);

        .el-icon {
          animation: pulse 1.5s ease-in-out infinite;
        }
      }
    }

    .error-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;

      .manual-retry-btn {
        &.loading {
          opacity: 0.7;
          cursor: wait;
        }
      }
    }

    .retry-hint {
      font-size: 12px;
      color: var(--tech-text-muted);
      margin-top: 8px;
    }
  }
}

@keyframes glitch {
  0%,
  100% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
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
</style>
