<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Setting,
} from '@element-plus/icons-vue'
import { FilterBar } from '@/components'
import { DataTable } from '@/components'
import { StatusTag } from '@/components'
import type { FilterItem } from '@/components'
import type { DataTableColumn, DataTablePagination, DataTableSort } from '@/components'
import type { Project } from '@/types/api'
import type { StatusTagType } from '@/components'
import { getProjects, deleteProject } from '@/api/project'

// ========== 加载状态 ==========
const loading = ref(false)

// ========== 筛选参数 ==========
const filterParams = reactive({
  name: '',
  status: '',
})

// ========== 排序参数 ==========
const sortParams = reactive<DataTableSort>({
  prop: '',
  order: 'ascending',
})

// ========== 分页参数 ==========
const pagination = ref<DataTablePagination>({
  currentPage: 1,
  pageSize: 20,
  total: 100,
})

// ========== 状态映射 ==========
const statusTypes: Record<string, StatusTagType> = {
  active: 'success',
  archived: 'info',
  deleted: 'error',
}

const statusText: Record<string, string> = {
  active: '进行中',
  archived: '已归档',
  deleted: '已删除',
}

// ========== 筛选配置 ==========
const filterConfig: FilterItem[] = [
  {
    key: 'name',
    label: '项目名称',
    type: 'input',
    placeholder: '请输入项目名称',
    span: 6,
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    span: 6,
    options: [
      { label: '全部状态', value: '' },
      { label: '进行中', value: 'active' },
      { label: '已归档', value: 'archived' },
      { label: '已删除', value: 'deleted' },
    ],
  },
]

// ========== 项目数据 ==========
const projects = ref<Project[]>([])

// ========== 表格列配置 ==========
const columns: DataTableColumn<Project>[] = [
  {
    prop: 'name',
    label: '项目名称',
    minWidth: 180,
    sortable: true,
    slot: 'column-name',
  },
  {
    prop: 'description',
    label: '描述',
    minWidth: 250,
    showOverflowTooltip: true,
  },
  {
    prop: 'memberCount',
    label: '成员数',
    width: 100,
    align: 'center',
    slot: 'column-memberCount',
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    slot: 'column-status',
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    minWidth: 160,
    sortable: true,
  },
  {
    prop: 'actions',
    label: '操作',
    width: 200,
    align: 'center',
    fixed: 'right',
    slot: 'column-actions',
  },
]

// ========== 加载项目列表 ==========
const fetchProjects = async () => {
  loading.value = true
  try {
    const response = await getProjects({
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      keyword: filterParams.name,
      status: filterParams.status,
    })
    projects.value = response.items
    pagination.value.total = response.total
  } catch (error) {
    ElMessage.error('获取项目列表失败')
    console.error('Failed to fetch projects:', error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  fetchProjects()
})

// ========== 过滤后的项目数据 ==========
const filteredProjects = computed(() => {
  let result = projects.value

  // 项目名称筛选
  if (filterParams.name) {
    const query = filterParams.name.toLowerCase()
    result = result.filter(
      project =>
        project.name.toLowerCase().includes(query) ||
        project.code.toLowerCase().includes(query)
    )
  }

  // 状态筛选
  if (filterParams.status) {
    result = result.filter(project => project.status === filterParams.status)
  }

  return result
})

// ========== 事件处理 ==========
// 处理筛选搜索
const handleSearch = async () => {
  pagination.value.currentPage = 1
  await fetchProjects()
}

// 处理筛选重置
const handleReset = async () => {
  filterParams.name = ''
  filterParams.status = ''
  pagination.value.currentPage = 1
  await fetchProjects()
}

// 处理筛选变化
const handleFilterChange = (values: Record<string, any>) => {
  filterParams.name = values.name || ''
  filterParams.status = values.status || ''
}

// 处理分页变化
const handlePageChange = async (page: number) => {
  pagination.value.currentPage = page
  await fetchProjects()
}

// 处理每页条数变化
const handleSizeChange = async (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  await fetchProjects()
}

// 处理排序变化
const handleSortChange = (sort: DataTableSort) => {
  sortParams.prop = sort.prop
  sortParams.order = sort.order
}

// ========== 编辑弹窗相关 (#41) ==========
const editDialogVisible = ref(false)
const currentProject = ref<Project | null>(null)

// 打开新增项目弹窗
const openAddDialog = () => {
  currentProject.value = null
  editDialogVisible.value = true
}

// 打开编辑项目弹窗
const openEditDialog = (project: Project) => {
  currentProject.value = project
  editDialogVisible.value = true
}

// 关闭编辑弹窗
const closeEditDialog = () => {
  editDialogVisible.value = false
  currentProject.value = null
}

// ========== 成员管理相关 (#42) ==========
const memberDialogVisible = ref(false)

// 打开成员管理弹窗
const openMemberDialog = (project: Project) => {
  currentProject.value = project
  memberDialogVisible.value = true
}

// 关闭成员管理弹窗
const closeMemberDialog = () => {
  memberDialogVisible.value = false
  currentProject.value = null
}

// ========== 删除项目 ==========
const handleDelete = async (project: Project) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除项目 "${project.name}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    // 调用删除API
    await deleteProject(project.id)
    ElMessage.success('删除成功')

    // 刷新列表
    await fetchProjects()
  } catch (error: any) {
    // 用户取消删除
    if (error === 'cancel' || error?.message === 'cancel') {
      return
    }
    // API调用失败
    ElMessage.error('删除失败')
    console.error('Failed to delete project:', error)
  }
}

// 暴露给测试使用的方法和属性
defineExpose({
  filterParams,
  sortParams,
  editDialogVisible,
  memberDialogVisible,
  currentProject,
  filteredProjects,
  statusTypes,
  statusText,
  handleSearch,
  handleReset,
  openEditDialog,
  openMemberDialog,
})
</script>

<template>
  <div class="project-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-title">
        <h1 class="page-title">项目管理</h1>
        <p class="page-subtitle">管理系统项目、成员和权限</p>
      </div>
      <el-button
        type="primary"
        data-test="add-project-btn"
        @click="openAddDialog"
      >
        <el-icon><Plus /></el-icon>
        新增项目
      </el-button>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <FilterBar
        :filters="filterConfig"
        :loading="loading"
        :show-reset="true"
        :show-search="true"
        @search="handleSearch"
        @reset="handleReset"
        @change="handleFilterChange"
      />
    </div>

    <!-- 表格区域 -->
    <div class="table-section">
      <DataTable
        :data="filteredProjects"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
        @sort-change="handleSortChange"
      >
        <!-- 项目名称列自定义插槽 -->
        <template #column-name="{ row }">
          <div class="project-cell">
            <span class="project-name">{{ row.name }}</span>
            <span class="project-code">{{ row.code }}</span>
          </div>
        </template>

        <!-- 成员数列自定义插槽 -->
        <template #column-memberCount="{ row }">
          <el-tag
            type="info"
            size="small"
          >
            {{ row.members?.length || 0 }} 人
          </el-tag>
        </template>

        <!-- 状态列自定义插槽 -->
        <template #column-status="{ row }">
          <StatusTag
            :status="statusTypes[row.status] || 'default'"
            :text="statusText[row.status]"
            size="small"
          />
        </template>

        <!-- 操作列自定义插槽 -->
        <template #column-actions="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              link
              size="small"
              @click="openEditDialog(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              type="success"
              link
              size="small"
              @click="openMemberDialog(row)"
            >
              <el-icon><Setting /></el-icon>
              成员
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- 编辑弹窗占位 (#41) -->
    <!-- TODO: 实现项目编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="项目编辑"
      width="500px"
      destroy-on-close
    >
      <div class="placeholder-content">
        <p>项目编辑功能将在任务 #41 中实现</p>
        <p v-if="currentProject">当前项目: {{ currentProject.name }}</p>
      </div>
      <template #footer>
        <el-button @click="closeEditDialog">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 成员管理弹窗占位 (#42) -->
    <!-- TODO: 实现成员管理弹窗 -->
    <el-dialog
      v-model="memberDialogVisible"
      title="成员管理"
      width="600px"
      destroy-on-close
    >
      <div class="placeholder-content">
        <p>成员管理功能将在任务 #42 中实现</p>
        <p v-if="currentProject">当前项目: {{ currentProject.name }}</p>
        <p v-if="currentProject?.members">成员数: {{ currentProject.members.length }} 人</p>
      </div>
      <template #footer>
        <el-button @click="closeMemberDialog">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.project-list-page {
  padding: 24px;

  // 页面头部
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .header-title {
      .page-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--tech-text-primary, #ffffff);
        margin: 0 0 8px;
      }

      .page-subtitle {
        font-size: 14px;
        color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7));
        margin: 0;
      }
    }

    .el-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  // 筛选区域
  .filter-section {
    margin-bottom: 20px;
  }

  // 表格区域
  .table-section {
    background-color: var(--tech-bg-card, rgba(13, 33, 55, 0.6));
    border-radius: var(--tech-border-radius, 8px);
    padding: 16px;
    border: 1px solid var(--tech-border-primary, rgba(0, 212, 255, 0.2));
    backdrop-filter: blur(10px);
  }

  // 项目单元格样式
  .project-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .project-name {
      font-weight: 500;
      color: var(--tech-text-primary, #ffffff);
    }

    .project-code {
      font-size: 12px;
      color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));
    }
  }

  // 操作按钮样式
  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 8px;

    .el-button {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  // 占位内容样式
  .placeholder-content {
    padding: 40px;
    text-align: center;
    color: var(--tech-text-muted, rgba(255, 255, 255, 0.5));

    p {
      margin: 8px 0;
    }
  }
}

// 响应式布局
@media screen and (max-width: 768px) {
  .project-list-page {
    padding: 16px;

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;

      .el-button {
        width: 100%;
        justify-content: center;
      }
    }

    .table-section {
      padding: 12px;
    }

    .action-buttons {
      flex-direction: column;
      gap: 4px;
    }
  }
}
</style>
