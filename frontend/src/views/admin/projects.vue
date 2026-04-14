<template>
  <div class="projects-manage-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">项目管理</h1>
        <p class="page-subtitle">管理系统项目，配置仓库和成员</p>
      </div>
      <div class="header-actions">
        <el-input v-model="searchQuery" placeholder="搜索项目..." style="width: 240px" clearable>
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <tech-button variant="primary" :icon="Plus" @click="showAddDialog"> 添加项目 </tech-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <data-panel
        label="总项目数"
        :value="stats.total"
        :icon="FolderOpened"
        icon-color="#00d4ff"
        :icon-bg-color="'rgba(0, 212, 255, 0.1)'"
      />
      <data-panel
        label="活跃项目"
        :value="stats.active"
        :icon="CircleCheck"
        icon-color="#00ff88"
        :icon-bg-color="'rgba(0, 255, 136, 0.1)'"
      />
      <data-panel
        label="总代码行数"
        :value="stats.totalLines"
        suffix="行"
        :icon="Document"
        icon-color="#ff9500"
        :icon-bg-color="'rgba(255, 149, 0, 0.1)'"
      />
      <data-panel
        label="总提交数"
        :value="stats.totalCommits"
        :icon="DocumentChecked"
        icon-color="#ff006e"
        :icon-bg-color="'rgba(255, 0, 110, 0.1)'"
      />
    </div>

    <!-- 项目列表表格 -->
    <div class="projects-table-container">
      <data-table
        :data="filteredProjects"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :show-selection="true"
        row-test-id="project-row"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
      >
        <!-- 项目名称列 -->
        <template #column-name="{ row }">
          <div class="project-name-cell">
            <el-icon class="project-icon"><Folder /></el-icon>
            <div class="project-info">
              <span class="project-name">{{ row.name }}</span>
              <span v-if="row.description" class="project-desc">{{ row.description }}</span>
            </div>
          </div>
        </template>

        <!-- 阶段列 -->
        <template #column-stage="{ row }">
          <el-tag :type="getStageType(row.stage)" size="small">
            {{ getStageLabel(row.stage) }}
          </el-tag>
        </template>

        <!-- 负责人列 -->
        <template #column-manager="{ row }">
          <div class="manager-cell">
            <el-icon><User /></el-icon>
            <span>{{ row.manager || '-' }}</span>
          </div>
        </template>

        <!-- 状态列 -->
        <template #column-status="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>

        <!-- 操作列 -->
        <template #column-actions="{ row }">
          <div class="actions-cell">
            <el-button type="primary" link size="small" @click.stop="editProject(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
              <el-button type="primary" link size="small">
                <el-icon><More /></el-icon>
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :icon="User" @click="manageMembers(row)">成员管理</el-dropdown-item>
                  <el-dropdown-item
                    :icon="row.status === PROJECT_STATUS.ACTIVE ? FolderRemove : FolderChecked"
                    @click="toggleProjectStatus(row)"
                  >
                    {{ row.status === PROJECT_STATUS.ACTIVE ? '归档' : '激活' }}
                  </el-dropdown-item>
                  <el-dropdown-item :icon="Delete" divided @click="deleteProject(row)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </data-table>
    </div>

    <!-- 项目编辑弹窗 -->
    <ProjectEditDialog
      v-model:visible="dialogVisible"
      :project-data="currentProject"
      :loading="submitting"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- 成员管理弹窗 -->
    <ProjectMemberManage
      v-model:visible="memberDialogVisible"
      :project-id="currentProject?.id || 0"
      :project-name="currentProject?.name || ''"
      @change="handleMemberChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Search,
  FolderOpened,
  CircleCheck,
  Document,
  DocumentChecked,
  Folder,
  FolderRemove,
  FolderChecked,
  Edit,
  Delete,
  User,
  More,
} from '@element-plus/icons-vue'
import TechButton from '@/components/tech/TechButton.vue'
import DataPanel from '@/components/tech/DataPanel.vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import type { DataTableColumn } from '@/components/DataTable/DataTable.vue'
import type { Project } from '@/types/api'
import {
  STAGE_LABEL_MAP,
  STAGE_TYPE_MAP,
  STATUS_LABEL_MAP,
  STATUS_TYPE_MAP,
  PROJECT_STATUS,
  TABLE_COLUMNS,
  DEFAULT_PAGINATION,
} from './constants/projects'
import ProjectEditDialog from './components/ProjectEditDialog.vue'
import ProjectMemberManage from './components/ProjectMemberManage.vue'
import { getProjects, createProject, updateProject, deleteProject as deleteProjectApi } from '@/api/project'
import { onMounted } from 'vue'

const searchQuery = ref('')
const loading = ref(false)
const selectedProjects = ref<ProjectWithStats[]>([])

// 统计数据
const stats = computed(() => {
  const total = pagination.value.total
  const active = projects.value.filter(p => p.status === 'active').length
  const totalLines = projects.value.reduce((sum, p) => sum + (p.lines || 0), 0)
  const totalCommits = projects.value.reduce((sum, p) => sum + (p.commits || 0), 0)
  return {
    total,
    active,
    totalLines,
    totalCommits,
  }
})

// 项目数据（带统计扩展）
interface ProjectWithStats extends Project {
  commits?: number
  memberCount?: number
  lines?: number
  repoUrl?: string
  manager?: string
}

const projects = ref<ProjectWithStats[]>([])

// 加载项目列表
const loadProjects = async () => {
  loading.value = true
  try {
    const response = await getProjects({
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      keyword: searchQuery.value || undefined,
    })
    // 转换数据格式，添加统计字段的默认值
    projects.value = response.items.map((project: Project) => ({
      ...project,
      commits: 0,
      memberCount: project.members?.length || 0,
      lines: 0,
      repoUrl: '',
      manager: project.managerId?.toString() || '-',
    }))
    pagination.value.total = response.total
  } catch (error) {
    ElMessage.error('加载项目列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadProjects()
})

// 分页配置
const pagination = ref({ ...DEFAULT_PAGINATION })

// 表格列配置
const columns = ref<DataTableColumn<ProjectWithStats>[]>(TABLE_COLUMNS)

// 过滤后的项目（服务端分页）
const filteredProjects = computed(() => {
  return projects.value
})

// 监听搜索词变化，重新加载
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    pagination.value.currentPage = 1
    loadProjects()
  }, 300)
})

// 获取阶段标签
const getStageLabel = (stage: string): string => STAGE_LABEL_MAP[stage] || stage

// 获取阶段类型
const getStageType = (stage: string): string => STAGE_TYPE_MAP[stage] || ''

// 获取状态标签
const getStatusLabel = (status: string): string => STATUS_LABEL_MAP[status] || status

// 获取状态类型
const getStatusType = (status: string): string => STATUS_TYPE_MAP[status] || 'info'

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.value.currentPage = page
  loadProjects()
}

// 处理每页条数变化
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  loadProjects()
}

// 处理选择变化
const handleSelectionChange = (selection: ProjectWithStats[]) => {
  selectedProjects.value = selection
}

// 处理行点击
const handleRowClick = (row: ProjectWithStats) => {
  // 可以在这里实现查看详情功能
  console.log('Row clicked:', row)
}

// 处理下拉菜单命令
const handleCommand = (command: string, row: ProjectWithStats) => {
  switch (command) {
    case 'edit':
      editProject(row)
      break
    case 'members':
      manageMembers(row)
      break
    case 'toggle':
      toggleProjectStatus(row)
      break
    case 'delete':
      deleteProject(row)
      break
  }
}

// 项目编辑弹窗
const dialogVisible = ref(false)
const currentProject = ref<ProjectWithStats | null>(null)
const submitting = ref(false)

// 成员管理弹窗
const memberDialogVisible = ref(false)

/** 显示添加弹窗 */
const showAddDialog = () => {
  currentProject.value = null
  dialogVisible.value = true
}

/** 编辑项目 */
const editProject = (project: ProjectWithStats) => {
  currentProject.value = project
  dialogVisible.value = true
}

/** 处理表单提交 */
const handleSubmit = async (formData: {
  name: string
  description: string
  status: 'active' | 'archived'
  gitlabRepoUrl: string
  zentaoProductId: string
}) => {
  submitting.value = true

  try {
    if (currentProject.value) {
      // 编辑模式
      await updateProject(currentProject.value.id, {
        name: formData.name,
        description: formData.description,
        status: formData.status,
      })
      ElMessage.success('项目更新成功')
    } else {
      // 新增模式
      await createProject({
        name: formData.name,
        code: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        status: formData.status,
      })
      ElMessage.success('项目添加成功')
    }
    // 重新加载列表
    await loadProjects()
    dialogVisible.value = false
    currentProject.value = null
  } catch (error) {
    ElMessage.error(currentProject.value ? '项目更新失败' : '项目添加失败')
    console.error(error)
  } finally {
    submitting.value = false
  }
}

/** 处理取消 */
const handleCancel = () => {
  currentProject.value = null
}

const deleteProject = async (project: ProjectWithStats) => {
  try {
    await ElMessageBox.confirm(`确定要删除项目 "${project.name}" 吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteProjectApi(project.id)
    ElMessage.success('删除成功')
    // 重新加载列表
    await loadProjects()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }
}

const toggleProjectStatus = async (project: ProjectWithStats) => {
  const newStatus = project.status === PROJECT_STATUS.ACTIVE ? PROJECT_STATUS.ARCHIVED : PROJECT_STATUS.ACTIVE
  const action = newStatus === PROJECT_STATUS.ACTIVE ? '激活' : '归档'

  try {
    await updateProject(project.id, { status: newStatus })
    project.status = newStatus
    ElMessage.success(`项目已${action}`)
  } catch (error) {
    ElMessage.error('操作失败')
    console.error(error)
  }
}

const manageMembers = (project: ProjectWithStats) => {
  currentProject.value = project
  memberDialogVisible.value = true
}

/** 处理成员变更 */
const handleMemberChange = (data: { projectId: number; members: any[] }) => {
  // 更新项目成员数量
  const project = projects.value.find(p => p.id === data.projectId)
  if (project) {
    project.memberCount = data.members.length
  }
}
</script>

<style scoped lang="scss">
.projects-manage-page {
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .projects-table-container {
    background: var(--tech-bg-card);
    border: 1px solid var(--tech-border-secondary);
    border-radius: var(--tech-radius-lg);
    padding: 20px;

    // 项目名称单元格样式
    .project-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;

      .project-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 212, 255, 0.1);
        border-radius: var(--tech-radius-md);
        color: var(--tech-cyan);
        font-size: 18px;
        flex-shrink: 0;
      }

      .project-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;

        .project-name {
          font-weight: 500;
          color: var(--tech-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .project-desc {
          font-size: 12px;
          color: var(--tech-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    // 负责人单元格样式
    .manager-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--tech-text-secondary);

      .el-icon {
        font-size: 14px;
        color: var(--tech-text-muted);
      }
    }

    // 操作列样式
    .actions-cell {
      display: flex;
      align-items: center;
      gap: 8px;

      .el-button {
        padding: 4px 8px;
        font-size: 13px;

        .el-icon {
          margin-right: 4px;
          font-size: 14px;
        }
      }
    }
  }
}
</style>
