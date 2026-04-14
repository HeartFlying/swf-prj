<script setup lang="ts">
import { ref } from 'vue'
import TechLayout from '@/layouts/TechLayout.vue'
import {
  House,
  DataLine,
  TrendCharts,
  UserFilled,
} from '@element-plus/icons-vue'

// 页面加载状态
const loading = ref(false)

// 刷新数据
const refreshData = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}
</script>

<template>
  <TechLayout>
    <div class="project-stats-page">
      <!-- 面包屑导航 -->
      <nav class="breadcrumb-nav">
        <ElBreadcrumb separator="/">
          <ElBreadcrumbItem :to="{ path: '/' }">
            <ElIcon><House /></ElIcon>
            首页
          </ElBreadcrumbItem>
          <ElBreadcrumbItem>
            <ElIcon><DataLine /></ElIcon>
            项目统计
          </ElBreadcrumbItem>
        </ElBreadcrumb>
      </nav>

      <!-- 页面头部 -->
      <header class="page-header">
        <h1 class="page-title">项目统计</h1>
        <!-- TODO: #24 项目选择器 -->
        <div class="project-selector-placeholder">
          <span class="placeholder-label">项目选择器 (#24)</span>
        </div>
      </header>

      <!-- 主体内容区 -->
      <main class="page-content">
        <!-- 统计卡片区域 -->
        <section class="stats-cards-section">
          <!-- TODO: #25 成员贡献统计 -->
          <div class="stats-cards-placeholder">
            <div class="placeholder-header">
              <ElIcon><UserFilled /></ElIcon>
              <span>成员贡献统计占位 (#25)</span>
            </div>
            <div class="placeholder-body">
              <div class="stat-card-placeholder" v-for="i in 4" :key="i">
                <div class="placeholder-icon"></div>
                <div class="placeholder-text">
                  <div class="placeholder-line"></div>
                  <div class="placeholder-line short"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 图表区域 -->
        <section class="charts-section">
          <!-- TODO: #26 代码趋势图表 -->
          <div class="code-trend-placeholder">
            <div class="placeholder-header">
              <ElIcon><TrendCharts /></ElIcon>
              <span>代码趋势图表占位 (#26)</span>
            </div>
            <div class="chart-placeholder-body">
              <div class="chart-area"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </TechLayout>
</template>

<style scoped lang="scss">
.project-stats-page {
  padding: var(--tech-content-padding-lg, 24px);

  // 面包屑导航
  .breadcrumb-nav {
    margin-bottom: 20px;

    :deep(.el-breadcrumb) {
      font-size: 14px;

      .el-breadcrumb__item {
        display: flex;
        align-items: center;

        .el-icon {
          margin-right: 4px;
          font-size: 14px;
        }
      }
    }
  }

  // 页面头部
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--tech-text-primary, #ffffff);
    }

    // 项目选择器占位
    .project-selector-placeholder {
      padding: 12px 24px;
      background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.05));
      border: 2px dashed var(--tech-border-primary, rgba(0, 212, 255, 0.3));
      border-radius: var(--tech-border-radius, 8px);
      min-width: 200px;
      text-align: center;

      .placeholder-label {
        color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
        font-size: 14px;
      }
    }
  }

  // 主体内容区
  .page-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;

    // 响应式布局：大屏幕时统计卡片和图表并排
    @media (min-width: 1200px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  // 统计卡片区域
  .stats-cards-section {
    .stats-cards-placeholder {
      background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
      border-radius: var(--tech-border-radius, 8px);
      border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
      padding: 20px;
      backdrop-filter: blur(10px);

      .placeholder-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff);

        .el-icon {
          font-size: 18px;
          color: var(--tech-cyan, #00d4ff);
        }
      }

      .placeholder-body {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;

        .stat-card-placeholder {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--tech-bg-secondary, rgba(0, 212, 255, 0.05));
          border-radius: var(--tech-border-radius, 8px);

          .placeholder-icon {
            width: 40px;
            height: 40px;
            background: rgba(0, 212, 255, 0.15);
            border-radius: 50%;
            flex-shrink: 0;
          }

          .placeholder-text {
            flex: 1;

            .placeholder-line {
              height: 12px;
              background: var(--tech-bg-tertiary, rgba(0, 212, 255, 0.1));
              border-radius: 2px;
              margin-bottom: 8px;

              &.short {
                width: 60%;
                height: 8px;
              }

              &:last-child {
                margin-bottom: 0;
              }
            }
          }
        }
      }
    }
  }

  // 图表区域
  .charts-section {
    .code-trend-placeholder {
      background: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
      border-radius: var(--tech-border-radius, 8px);
      border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
      padding: 20px;
      height: 100%;
      backdrop-filter: blur(10px);

      .placeholder-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff);

        .el-icon {
          font-size: 18px;
          color: var(--tech-green, #00ff88);
        }
      }

      .chart-placeholder-body {
        .chart-area {
          height: 300px;
          background: linear-gradient(
            135deg,
            var(--tech-bg-secondary, rgba(0, 212, 255, 0.05)) 0%,
            var(--tech-bg-tertiary, rgba(0, 212, 255, 0.1)) 100%
          );
          border-radius: var(--tech-border-radius, 8px);
          display: flex;
          align-items: center;
          justify-content: center;

          &::after {
            content: '代码趋势图表区域';
            color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
            font-size: 14px;
          }
        }
      }
    }
  }
}

// 响应式适配
@media (max-width: 768px) {
  .project-stats-page {
    padding: var(--tech-content-padding-xs, 12px);

    .page-header {
      flex-direction: column;
      align-items: flex-start;

      .page-title {
        font-size: 20px;
      }

      .project-selector-placeholder {
        width: 100%;
      }
    }

    .page-content {
      grid-template-columns: 1fr;
    }

    .stats-cards-section {
      .stats-cards-placeholder {
        .placeholder-body {
          grid-template-columns: 1fr;
        }
      }
    }
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .project-stats-page {
    padding: var(--tech-content-padding-md, 20px);

    .page-content {
      grid-template-columns: 1fr;
    }
  }
}
</style>
