<template>
  <div class="tech-layout" :class="layoutClasses">
    <!-- 背景效果 -->
    <div class="layout-bg">
      <div class="grid-pattern" />
      <div class="gradient-overlay" />
    </div>

    <!-- 侧边栏 -->
    <sidebar :collapsed="effectiveSidebarCollapsed" @toggle="toggleSidebar" />

    <!-- 主内容区 -->
    <div
      class="main-wrapper"
      :class="[
        { 'sidebar-collapsed': effectiveSidebarCollapsed },
        layoutClasses
      ]"
    >
      <!-- 顶部栏 -->
      <app-header @toggle-sidebar="toggleSidebar" />

      <!-- 页面内容 -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 扫描线装饰 -->
    <scan-line :speed="4" :opacity="0.3" :particles="true" :particle-count="15" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import AppHeader from '@/components/Header.vue'
import ScanLine from '@/components/tech/ScanLine.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 使用响应式断点
const { isXS, isSM, isMD, isLG, isXL, isXXL } = useBreakpoint()

// 根据断点计算布局类名
const layoutClasses = computed(() => ({
  'breakpoint-xs': isXS.value,
  'breakpoint-sm': isSM.value,
  'breakpoint-md': isMD.value,
  'breakpoint-lg': isLG.value,
  'breakpoint-xl': isXL.value,
  'breakpoint-xxl': isXXL.value,
  'is-mobile': isXS.value,
  'is-tablet': isSM.value || isMD.value,
  'is-desktop': isLG.value || isXL.value || isXXL.value
}))

// 根据断点计算是否需要自动折叠侧边栏（移动端）
const shouldAutoCollapse = computed(() => isXS.value || isSM.value)

// 实际使用的侧边栏折叠状态（考虑自动折叠）
const effectiveSidebarCollapsed = computed(() => {
  if (shouldAutoCollapse.value) return true
  return sidebarCollapsed.value
})
</script>

<style scoped lang="scss">
.tech-layout {
  position: relative;
  width: 100%;
  height: var(--tech-screen-height, 100vh);
  margin: 0 auto;
  background: var(--tech-bg-primary);
  overflow: hidden;
  display: flex;

  .layout-bg {
    position: absolute;
    inset: 0;
    z-index: 0;

    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
      background-size: var(--tech-grid-size, 50px) var(--tech-grid-size, 50px);
    }

    .gradient-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(0, 212, 255, 0.05) 0%, transparent 50%);
    }
  }

  .main-wrapper {
    position: relative;
    z-index: 1;
    flex: 1;
    margin-left: var(--tech-sidebar-width);
    display: flex;
    flex-direction: column;
    transition: margin-left var(--tech-transition-duration, 0.3s) ease;

    &.sidebar-collapsed {
      margin-left: var(--tech-sidebar-collapsed-width);
    }
  }

  .main-content {
    flex: 1;
    padding: var(--tech-content-padding-lg, 24px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  // 响应式断点类
  &.breakpoint-xs {
    .main-content {
      padding: var(--tech-content-padding-xs, 12px);
    }
  }

  &.breakpoint-sm {
    .main-content {
      padding: var(--tech-content-padding-sm, 16px);
    }
  }

  &.breakpoint-md {
    .main-content {
      padding: var(--tech-content-padding-md, 20px);
    }
  }

  // 移动端适配
  &.is-mobile {
    .main-wrapper {
      margin-left: 0;

      &.sidebar-collapsed {
        margin-left: 0;
      }
    }
  }
}

// 页面切换动画
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

// 响应式断点 - 使用CSS变量和类名组合
// 注意：主要响应式逻辑现在通过useBreakpoint composable和CSS变量处理
// 以下媒体查询作为后备方案

@media (max-width: 767px) {
  .tech-layout {
    --tech-content-padding: var(--tech-content-padding-xs, 12px);

    .main-content {
      padding: var(--tech-content-padding);
    }
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .tech-layout {
    --tech-content-padding: var(--tech-content-padding-sm, 16px);

    .main-content {
      padding: var(--tech-content-padding);
    }
  }
}

@media (min-width: 992px) and (max-width: 1399px) {
  .tech-layout {
    --tech-content-padding: var(--tech-content-padding-lg, 24px);
  }
}

@media (min-width: 1400px) {
  .tech-layout {
    --tech-content-padding: var(--tech-content-padding-xl, 32px);

    .main-content {
      padding: var(--tech-content-padding);
    }
  }
}
</style>
