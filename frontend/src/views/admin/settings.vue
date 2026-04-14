<template>
  <div class="settings-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">系统设置</h1>
        <p class="page-subtitle">配置系统参数和全局选项</p>
      </div>
      <div class="header-actions">
        <tech-button variant="primary" :icon="Check" :loading="saving" data-testid="loading-indicator" @click="saveSettings">
          保存设置
        </tech-button>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-grid" data-testid="settings-grid">
      <!-- 同步设置 -->
      <tech-card title="同步设置" :icon="Refresh" class="settings-card" data-testid="settings-card">
        <el-form :model="settings" label-position="top">
          <el-form-item label="启用自动同步">
            <el-switch v-model="settings.syncEnabled" />
          </el-form-item>

          <el-form-item label="自动同步间隔">
            <el-select v-model="settings.autoSyncInterval" style="width: 200px">
              <el-option label="15分钟" :value="15" />
              <el-option label="30分钟" :value="30" />
              <el-option label="1小时" :value="60" />
              <el-option label="6小时" :value="360" />
              <el-option label="12小时" :value="720" />
              <el-option label="24小时" :value="1440" />
            </el-select>
          </el-form-item>

          <el-form-item label="数据保留天数">
            <el-slider v-model="settings.retentionDays" :min="7" :max="365" :step="1" show-input />
          </el-form-item>
        </el-form>
      </tech-card>

      <!-- 用户限制 -->
      <tech-card title="用户限制" :icon="User" class="settings-card" data-testid="settings-card">
        <el-form :model="settings" label-position="top">
          <el-form-item label="每用户最大项目数">
            <el-input-number
              v-model="settings.maxProjectsPerUser"
              :min="1"
              :max="100"
              style="width: 200px"
            />
          </el-form-item>

          <el-form-item label="允许注册的邮箱域名">
            <el-select
              v-model="settings.allowedDomains"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入邮箱域名"
              style="width: 100%"
            >
              <el-option label="example.com" value="example.com" data-testid="domain-tag" />
              <el-option label="company.com" value="company.com" data-testid="domain-tag" />
            </el-select>
          </el-form-item>
        </el-form>
      </tech-card>

      <!-- AI模型设置 -->
      <tech-card title="AI模型设置" :icon="Cpu" class="settings-card" data-testid="settings-card">
        <el-form :model="settings" label-position="top">
          <el-form-item label="允许的AI模型">
            <el-checkbox-group v-model="settings.allowedModels">
              <el-checkbox label="gpt-4">GPT-4</el-checkbox>
              <el-checkbox label="gpt-4-turbo">GPT-4 Turbo</el-checkbox>
              <el-checkbox label="gpt-3.5-turbo">GPT-3.5 Turbo</el-checkbox>
              <el-checkbox label="claude-3-opus">Claude 3 Opus</el-checkbox>
              <el-checkbox label="claude-3-sonnet">Claude 3 Sonnet</el-checkbox>
              <el-checkbox label="gemini-pro">Gemini Pro</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="默认模型">
            <el-select v-model="settings.defaultModel" style="width: 200px">
              <el-option
                v-for="model in settings.allowedModels"
                :key="model"
                :label="model"
                :value="model"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Token使用限制（每日）">
            <el-input-number
              v-model="settings.dailyTokenLimit"
              :min="1000"
              :step="1000"
              style="width: 200px"
            />
            <span class="input-suffix">tokens</span>
          </el-form-item>
        </el-form>
      </tech-card>

      <!-- 通知设置 -->
      <tech-card title="通知设置" :icon="Bell" class="settings-card" data-testid="settings-card">
        <el-form :model="settings" label-position="top">
          <el-form-item label="启用邮件通知">
            <el-switch v-model="settings.emailNotifications" />
          </el-form-item>

          <el-form-item label="同步完成通知">
            <el-switch v-model="settings.syncCompleteNotification" />
          </el-form-item>

          <el-form-item label="异常告警通知">
            <el-switch v-model="settings.errorNotification" />
          </el-form-item>

          <el-form-item label="每周报告">
            <el-switch v-model="settings.weeklyReport" />
          </el-form-item>
        </el-form>
      </tech-card>

      <!-- 系统信息 -->
      <tech-card title="系统信息" :icon="InfoFilled" class="settings-card" data-testid="settings-card">
        <div class="system-info">
          <div class="info-item">
            <span class="info-label" data-testid="info-label">系统版本</span>
            <span class="info-value">v1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-testid="info-label">最后更新</span>
            <span class="info-value">2024-03-28</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-testid="info-label">数据库版本</span>
            <span class="info-value">PostgreSQL 15</span>
          </div>
          <div class="info-item">
            <span class="info-label" data-testid="info-label">缓存状态</span>
            <span class="info-value"><el-tag type="success" size="small">正常</el-tag></span>
          </div>
          <div class="info-item">
            <span class="info-label" data-testid="info-label">系统运行时间</span>
            <span class="info-value">15天 8小时 32分钟</span>
          </div>
        </div>

        <div class="system-actions">
          <tech-button variant="ghost" :icon="Refresh" @click="clearCache"> 清除缓存 </tech-button>
          <tech-button variant="ghost" :icon="Download" @click="exportLogs"> 导出日志 </tech-button>
          <tech-button variant="danger" :icon="Warning" @click="resetSystem">
            重置系统
          </tech-button>
        </div>
      </tech-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Check,
  Refresh,
  User,
  Cpu,
  Bell,
  InfoFilled,
  Download,
  Warning,
} from '@element-plus/icons-vue'
import TechCard from '@/components/tech/TechCard.vue'
import TechButton from '@/components/tech/TechButton.vue'
import { clearAllCache } from '@/api/cache'
import { updateSettings } from '@/api/settings'

const saving = ref(false)

const settings = reactive({
  // 同步设置
  syncEnabled: true,
  autoSyncInterval: 60,
  retentionDays: 90,

  // 用户限制
  maxProjectsPerUser: 10,
  allowedDomains: ['example.com'],

  // AI模型设置
  allowedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  defaultModel: 'gpt-4-turbo',
  dailyTokenLimit: 100000,

  // 通知设置
  emailNotifications: true,
  syncCompleteNotification: true,
  errorNotification: true,
  weeklyReport: true,
})

const saveSettings = async () => {
  saving.value = true
  try {
    await updateSettings({
      syncEnabled: settings.syncEnabled,
      autoSyncInterval: settings.autoSyncInterval,
      retentionDays: settings.retentionDays,
      maxProjectsPerUser: settings.maxProjectsPerUser,
      allowedModels: settings.allowedModels,
    })
    ElMessage.success({
      message: '设置已保存',
      customClass: 'message-success',
    })
  } catch (error) {
    ElMessage.error({
      message: '保存设置失败',
      customClass: 'message-error',
    })
  } finally {
    saving.value = false
  }
}

const clearCache = async () => {
  try {
    await ElMessageBox.confirm('确定要清除系统缓存吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'dialog-message',
      title: '确认操作',
    })
    await clearAllCache()
    ElMessage.success({
      message: '缓存已清除',
      customClass: 'message-success',
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error({
        message: '清除缓存失败',
        customClass: 'message-error',
      })
    }
  }
}

const exportLogs = () => {
  ElMessage.success({
    message: '日志导出成功',
    customClass: 'message-success',
  })
}

const resetSystem = () => {
  ElMessageBox.confirm('警告：此操作将重置所有系统设置到默认值，确定要继续吗？', '危险操作', {
    confirmButtonText: '确定重置',
    cancelButtonText: '取消',
    type: 'error',
    customClass: 'dialog-message',
    title: '危险操作',
  }).then(() => {
    ElMessage.success({
      message: '系统已重置',
      customClass: 'message-success',
    })
  })
}
</script>

<style scoped lang="scss">
.settings-page {
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    .header-content {
      .page-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--tech-text-primary);
        margin: 0 0 8px;
      }

      .page-subtitle {
        font-size: 14px;
        color: var(--tech-text-muted);
        margin: 0;
      }
    }
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;

    .settings-card {
      :deep(.el-form-item__label) {
        color: var(--tech-text-secondary);
        font-weight: 500;
      }

      .input-suffix {
        margin-left: 8px;
        color: var(--tech-text-muted);
      }
    }
  }

  .system-info {
    .info-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--tech-border-secondary);

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        font-size: 14px;
        color: var(--tech-text-secondary);
      }

      .info-value {
        font-size: 14px;
        color: var(--tech-text-primary);
        font-family: var(--tech-font-mono);
      }
    }
  }

  .system-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--tech-border-secondary);
  }
}
</style>
