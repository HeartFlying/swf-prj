<template>
  <aside class="sidebar" :class="{ collapsed: collapsed }" data-testid="sidebar">
    <!-- Logo -->
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span v-if="!collapsed" class="logo-text">DevMetrics</span>
      </div>
      <button class="toggle-btn" @click="$emit('toggle')" data-testid="sidebar-toggle">
        <el-icon>
          <component :is="collapsed ? ArrowRight : ArrowLeft" />
        </el-icon>
      </button>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div v-if="!collapsed" class="section-title">主菜单</div>
        <router-link
          v-for="item in mainMenu"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
          :data-testid="`nav-${item.path.replace('/', '').replace(/\//g, '-')}`"
        >
          <span class="nav-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span v-if="!collapsed" class="nav-text">{{ item.name }}</span>
          <span v-if="!collapsed && item.badge" class="nav-badge">{{ item.badge }}</span>
        </router-link>
      </div>

      <div class="nav-section">
        <div v-if="!collapsed" class="section-title">数据统计</div>
        <router-link
          v-for="item in statsMenu"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
          :data-testid="`nav-${item.path.replace('/', '').replace(/\//g, '-')}`"
        >
          <span class="nav-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span v-if="!collapsed" class="nav-text">{{ item.name }}</span>
        </router-link>
      </div>

      <div class="nav-section">
        <div v-if="!collapsed" class="section-title">系统管理</div>
        <router-link
          v-for="item in adminMenu"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path.startsWith(item.path) }"
          :data-testid="`nav-${item.path.replace('/', '').replace(/\//g, '-')}`"
        >
          <span class="nav-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span v-if="!collapsed" class="nav-text">{{ item.name }}</span>
        </router-link>
      </div>
    </nav>

    <!-- 用户信息 -->
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">{{ userInitials }}</div>
        <div v-if="!collapsed" class="user-details">
          <div class="user-name">{{ authStore.user?.username || '用户' }}</div>
          <div class="user-role">{{ authStore.user?.role?.name || '开发者' }}</div>
        </div>
      </div>
      <button v-if="!collapsed" class="logout-btn" @click="handleLogout" data-testid="logout-btn">
        <el-icon><SwitchButton /></el-icon>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  Odometer,
  User,
  Folder,
  Refresh,
  Setting,
  SwitchButton,
  DataLine,
  TrendCharts,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

interface Props {
  collapsed?: boolean
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
})

defineEmits<{
  toggle: []
}>()

const _route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mainMenu = [
  { name: '仪表盘', path: '/dashboard', icon: Odometer },
  { name: '数据同步', path: '/sync', icon: Refresh, badge: 0 },
]

const statsMenu = [
  { name: '个人统计', path: '/personal-stats', icon: User },
  { name: '项目统计', path: '/project-stats', icon: DataLine },
  { name: '趋势分析', path: '/trends', icon: TrendCharts },
]

const adminMenu = [
  { name: '用户管理', path: '/admin/users', icon: User },
  { name: '项目管理', path: '/admin/projects', icon: Folder },
  { name: '系统设置', path: '/admin/settings', icon: Setting },
]

const userInitials = computed(() => {
  const username = authStore.user?.username || 'U'
  return username.slice(0, 2).toUpperCase()
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: var(--tech-bg-secondary);
  border-right: 1px solid var(--tech-border-secondary);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width 0.3s ease;

  &.collapsed {
    width: 64px;
  }

  // 头部
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--tech-border-secondary);

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;

      .logo-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--tech-cyan);
        background: rgba(0, 212, 255, 0.1);
        border-radius: var(--tech-radius-md);

        svg {
          width: 24px;
          height: 24px;
        }
      }

      .logo-text {
        font-size: 18px;
        font-weight: 700;
        color: var(--tech-text-primary);
        font-family: var(--tech-font-mono);
        background: linear-gradient(135deg, var(--tech-cyan), var(--tech-green));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .toggle-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--tech-border-secondary);
      border-radius: var(--tech-radius-sm);
      color: var(--tech-text-muted);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--tech-cyan);
        color: var(--tech-cyan);
      }
    }
  }

  // 导航
  .sidebar-nav {
    flex: 1;
    padding: 16px 12px;
    overflow-y: auto;

    .nav-section {
      margin-bottom: 24px;

      .section-title {
        padding: 0 12px;
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 600;
        color: var(--tech-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      margin-bottom: 4px;
      border-radius: var(--tech-radius-md);
      color: var(--tech-text-secondary);
      text-decoration: none;
      transition: all 0.3s ease;
      position: relative;

      .nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        font-size: 18px;
        flex-shrink: 0;
      }

      .nav-text {
        flex: 1;
        font-size: 14px;
      }

      .nav-badge {
        padding: 2px 6px;
        background: var(--tech-pink);
        color: white;
        font-size: 11px;
        font-weight: 600;
        border-radius: 10px;
        font-family: var(--tech-font-mono);
      }

      &:hover {
        background: rgba(0, 212, 255, 0.1);
        color: var(--tech-cyan);
      }

      &.active {
        background: rgba(0, 212, 255, 0.15);
        color: var(--tech-cyan);

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--tech-cyan);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 10px var(--tech-cyan);
        }
      }
    }
  }

  // 底部
  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--tech-border-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .user-avatar {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--tech-cyan), var(--tech-purple));
        color: white;
        font-size: 12px;
        font-weight: 600;
        border-radius: 50%;
        font-family: var(--tech-font-mono);
      }

      .user-details {
        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--tech-text-primary);
        }

        .user-role {
          font-size: 12px;
          color: var(--tech-text-muted);
        }
      }
    }

    .logout-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--tech-border-secondary);
      border-radius: var(--tech-radius-sm);
      color: var(--tech-text-muted);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--tech-pink);
        color: var(--tech-pink);
        background: rgba(255, 0, 110, 0.1);
      }
    }
  }
}
</style>
