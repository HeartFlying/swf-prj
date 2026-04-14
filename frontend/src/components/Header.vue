<template>
  <header class="app-header" data-testid="app-header">
    <div class="header-left">
      <button class="menu-toggle" @click="$emit('toggle-sidebar')" data-testid="menu-toggle">
        <el-icon><Fold /></el-icon>
      </button>
      <breadcrumb />
    </div>

    <div class="header-center">
      <div class="system-status">
        <span class="status-item">
          <span class="status-dot online" />
          <span class="status-text">系统正常</span>
        </span>
        <span class="divider" />
        <span class="time-display">{{ currentTime }}</span>
      </div>
    </div>

    <div class="header-right">
      <div class="header-actions">
        <button class="action-btn" @click="toggleTheme" data-testid="theme-toggle">
          <el-icon><component :is="isDark ? Sunny : Moon" /></el-icon>
        </button>
        <button class="action-btn" @click="toggleFullscreen" data-testid="fullscreen-toggle">
          <el-icon><component :is="isFullscreen ? Close : FullScreen" /></el-icon>
        </button>
        <el-dropdown trigger="click">
          <button class="action-btn notification-btn" data-testid="notification-btn">
            <el-icon><Bell /></el-icon>
            <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu class="notification-dropdown">
              <div class="notification-header">
                <span>通知</span>
                <el-button type="primary" link>全部已读</el-button>
              </div>
              <el-dropdown-item v-for="i in 3" :key="i">
                <div class="notification-item">
                  <div class="notification-title">同步完成</div>
                  <div class="notification-time">5分钟前</div>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Fold, Sunny, Moon, FullScreen, Close, Bell } from '@element-plus/icons-vue'
import Breadcrumb from './Breadcrumb.vue'

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const currentTime = ref('')
const isDark = ref(true)
const isFullscreen = ref(false)
const unreadCount = ref(3)

let timeInterval: number | null = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const toggleTheme = () => {
  isDark.value = !isDark.value
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped lang="scss">
.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.05) 0%, transparent 100%);
  border-bottom: 1px solid var(--tech-border-secondary);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--tech-cyan), transparent 50%);
    opacity: 0.5;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .menu-toggle {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--tech-border-secondary);
      border-radius: var(--tech-radius-md);
      color: var(--tech-text-secondary);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--tech-cyan);
        color: var(--tech-cyan);
        background: rgba(0, 212, 255, 0.1);
      }
    }
  }

  .header-center {
    .system-status {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: var(--tech-font-mono);

      .status-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--tech-green);
          box-shadow: 0 0 8px var(--tech-green);
          animation: pulse 2s ease-in-out infinite;
        }

        .status-text {
          font-size: 13px;
          color: var(--tech-text-secondary);
        }
      }

      .divider {
        width: 1px;
        height: 16px;
        background: var(--tech-border-secondary);
      }

      .time-display {
        font-size: 14px;
        color: var(--tech-cyan);
        font-weight: 500;
      }
    }
  }

  .header-right {
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      .action-btn {
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid var(--tech-border-secondary);
        border-radius: var(--tech-radius-md);
        color: var(--tech-text-secondary);
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          border-color: var(--tech-cyan);
          color: var(--tech-cyan);
          background: rgba(0, 212, 255, 0.1);
        }

        &.notification-btn {
          .notification-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            background: var(--tech-pink);
            color: white;
            font-size: 10px;
            font-weight: 600;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--tech-font-mono);
          }
        }
      }
    }
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

<style lang="scss">
.notification-dropdown {
  background: var(--tech-bg-secondary) !important;
  border: 1px solid var(--tech-border-primary) !important;
  min-width: 280px;

  .notification-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--tech-border-secondary);
    font-weight: 600;
    color: var(--tech-text-primary);
  }

  .notification-item {
    padding: 8px 0;

    .notification-title {
      font-size: 14px;
      color: var(--tech-text-primary);
    }

    .notification-time {
      font-size: 12px;
      color: var(--tech-text-muted);
      margin-top: 4px;
    }
  }
}
</style>
