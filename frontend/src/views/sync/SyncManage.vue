<script setup lang="ts">
import { ref } from 'vue'
import {
  Refresh,
  List,
  Timer,
} from '@element-plus/icons-vue'
import TechLayout from '@/layouts/TechLayout.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

// 页面加载状态
const isLoading = ref(false)

// 手动触发同步按钮加载状态
const isManualSyncLoading = ref(false)

// 处理手动同步
const handleManualSync = async () => {
  isManualSyncLoading.value = true
  // TODO: #32 实现手动触发同步逻辑
  await new Promise(resolve => setTimeout(resolve, 1000))
  isManualSyncLoading.value = false
}
</script>

<template>
  <TechLayout>
    <div class="sync-manage-page">
      <!-- 面包屑导航 -->
      <div class="breadcrumb-container">
        <Breadcrumb />
      </div>

      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">同步管理</h1>
          <p class="page-subtitle">管理数据同步任务和查看同步日志</p>
        </div>
        <div class="header-right">
          <!-- TODO: #32 手动触发同步按钮占位 -->
          <div class="manual-sync-area">
            <el-button
              type="primary"
              :icon="Refresh"
              :loading="isManualSyncLoading"
              @click="handleManualSync"
            >
              手动触发同步
            </el-button>
          </div>
        </div>
      </div>

      <!-- 页面内容区 -->
      <div class="page-content">
        <el-skeleton v-if="isLoading" :rows="10" animated />

        <div v-else class="content-area">
          <!-- 主体内容区 -->
          <div class="content-main">
            <!-- TODO: #30 同步任务列表区域占位 -->
            <div class="sync-task-section" data-task-id="30">
              <div class="section-header">
                <el-icon><Timer /></el-icon>
                <span class="section-title">同步任务</span>
              </div>
              <div class="task-list-placeholder placeholder-card">
                <div class="placeholder-icon">
                  <el-icon :size="48"><Timer /></el-icon>
                </div>
                <div class="placeholder-text">
                  <h3>同步任务列表</h3>
                  <p>任务 #30: 同步任务列表组件将在此处实现</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 侧边栏区域 -->
          <div class="content-sidebar">
            <!-- TODO: #31 同步日志查看区域占位 -->
            <div class="sync-log-section" data-task-id="31">
              <div class="section-header">
                <el-icon><List /></el-icon>
                <span class="section-title">同步日志</span>
              </div>
              <div class="log-viewer-placeholder placeholder-card">
                <div class="placeholder-icon">
                  <el-icon :size="48"><List /></el-icon>
                </div>
                <div class="placeholder-text">
                  <h3>同步日志</h3>
                  <p>任务 #31: 同步日志查看组件将在此处实现</p>
                </div>
              </div>
            </div>

            <!-- TODO: #32 手动触发同步占位 -->
            <div class="manual-sync-placeholder placeholder-card" data-task-id="32">
              <div class="placeholder-icon">
                <el-icon :size="32"><Refresh /></el-icon>
              </div>
              <div class="placeholder-text">
                <h4>手动触发同步</h4>
                <p>任务 #32: 手动同步功能将在此处实现</p>
              </div>
              <el-button
                type="primary"
                size="small"
                :icon="Refresh"
                :loading="isManualSyncLoading"
                @click="handleManualSync"
              >
                立即同步
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </TechLayout>
</template>

<style scoped lang="scss">
.sync-manage-page {
  padding: var(--tech-content-padding-lg, 24px);

  // 面包屑导航
  .breadcrumb-container {
    margin-bottom: 16px;
  }

  // 页面头部
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--tech-border-secondary, rgba(0, 212, 255, 0.1));

    .header-left {
      .page-title {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff);
      }

      .page-subtitle {
        margin: 0;
        font-size: 14px;
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
      }
    }

    .header-right {
      .manual-sync-area {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }

    // 响应式：移动端堆叠布局
    @media (max-width: 768px) {
      flex-direction: column;
      gap: 16px;

      .header-right {
        width: 100%;

        .manual-sync-area {
          width: 100%;

          .el-button {
            width: 100%;
          }
        }
      }
    }
  }

  // 页面内容区
  .page-content {
    .content-area {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 24px;

      // 响应式布局
      @media (max-width: 1200px) {
        grid-template-columns: 1fr 300px;
      }

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }
    }

    // 主体内容区
    .content-main {
      min-width: 0;
    }

    // 侧边栏区域
    .content-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;

      @media (max-width: 992px) {
        flex-direction: row;
        flex-wrap: wrap;

        > * {
          flex: 1;
          min-width: 280px;
        }
      }
    }
  }

  // 区块头部样式
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: var(--tech-text-primary, #ffffff);

    .el-icon {
      color: var(--tech-cyan, #00d4ff);
    }
  }

  // 同步任务区块
  .sync-task-section {
    background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
    border-radius: var(--tech-border-radius, 8px);
    padding: 20px;
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
    backdrop-filter: blur(10px);
  }

  // 同步日志区块
  .sync-log-section {
    background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
    border-radius: var(--tech-border-radius, 8px);
    padding: 20px;
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
    backdrop-filter: blur(10px);
  }

  // 占位卡片样式
  .placeholder-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.05));
    border-radius: var(--tech-border-radius, 8px);
    border: 2px dashed var(--tech-border-primary, rgba(0, 212, 255, 0.3));
    text-align: center;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--tech-cyan, #00d4ff);
      background: var(--tech-bg-hover, rgba(0, 212, 255, 0.1));
    }

    .placeholder-icon {
      margin-bottom: 16px;
      color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
    }

    .placeholder-text {
      h3, h4 {
        margin: 0 0 8px;
        font-size: 16px;
        color: var(--tech-text-primary, #ffffff);
      }

      p {
        margin: 0;
        font-size: 13px;
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
      }
    }

    .el-button {
      margin-top: 16px;
    }
  }

  // 手动同步占位
  .manual-sync-placeholder {
    background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
    border-radius: var(--tech-border-radius, 8px);
    padding: 20px;
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
    backdrop-filter: blur(10px);

    .placeholder-icon {
      color: var(--tech-cyan, #00d4ff);
    }
  }
}

// 响应式断点适配
@media (max-width: 575px) {
  .sync-manage-page {
    padding: var(--tech-content-padding-xs, 12px);

    .page-header {
      .page-title {
        font-size: 20px;
      }
    }

    .sync-task-section,
    .sync-log-section,
    .manual-sync-placeholder {
      padding: 16px;
    }
  }
}

@media (min-width: 576px) and (max-width: 767px) {
  .sync-manage-page {
    padding: var(--tech-content-padding-sm, 16px);
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .sync-manage-page {
    padding: var(--tech-content-padding-md, 20px);
  }
}

@media (min-width: 1400px) {
  .sync-manage-page {
    .page-content {
      .content-area {
        grid-template-columns: 1fr 400px;
      }
    }
  }
}
</style>
