<!--
  UserList Page Component
  用户列表页面组件

  @description 用户管理页面，提供用户列表展示、筛选、排序、分页和增删改查功能
  @author DevMetrics Team

  @example
  <UserList />
-->
<script setup lang="ts">
/**
 * UserList Page Logic
 * 用户列表页面逻辑
 *
 * @description 处理用户列表的数据获取、筛选、排序、分页和编辑操作
 */
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  User as UserIcon,
} from '@element-plus/icons-vue'
import { FilterBar } from '@/components'
import { DataTable } from '@/components'
import { StatusTag } from '@/components'
import type { FilterItem } from '@/components'
import type { DataTableColumn, DataTablePagination, DataTableSort } from '@/components'
import type { User } from '@/types/api'
import { getUsers, deleteUser } from '@/api/user'

// ========== 加载状态 ==========
/** 表格加载状态 */
const loading = ref(false)

// ========== 筛选参数 ==========
/** 筛选参数对象 */
const filterParams = reactive({
  username: '',
  role: '',
  status: '',
})

// ========== 排序参数 ==========
/** 排序参数对象 */
const sortParams = reactive<DataTableSort>({
  prop: '',
  order: 'ascending',
})

// ========== 分页参数 ==========
/** 分页配置对象 */
const pagination = ref<DataTablePagination>({
  currentPage: 1,
  pageSize: 20,
  total: 100,
})

// ========== 角色映射 ==========
/** 角色名称映射 */
const roleNames: Record<string, string> = {
  admin: '管理员',
  developer: '开发者',
  viewer: '访客',
}

/** 角色标签类型映射 */
const roleTypes: Record<string, 'danger' | 'success' | 'info'> = {
  admin: 'danger',
  developer: 'success',
  viewer: 'info',
}

// ========== 状态映射 ==========
/** 状态标签类型映射 */
const statusTypes: Record<string, 'success' | 'error'> = {
  active: 'success',
  inactive: 'error',
}

/** 状态文本映射 */
const statusText: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
}

// ========== 筛选配置 ==========
const filterConfig: FilterItem[] = [
  {
    key: 'username',
    label: '用户名',
    type: 'input',
    placeholder: '请输入用户名',
    span: 6,
  },
  {
    key: 'role',
    label: '角色',
    type: 'select',
    placeholder: '请选择角色',
    span: 6,
    options: [
      { label: '全部角色', value: '' },
      { label: '管理员', value: 'admin' },
      { label: '开发者', value: 'developer' },
      { label: '访客', value: 'viewer' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    span: 6,
    options: [
      { label: '全部状态', value: '' },
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' },
    ],
  },
]

// ========== 用户数据 ==========
const users = ref<User[]>([])

// ========== 表格列配置 ==========
const columns: DataTableColumn<User>[] = [
  {
    prop: 'username',
    label: '用户名',
    minWidth: 150,
    sortable: true,
    slot: 'column-username',
  },
  {
    prop: 'email',
    label: '邮箱',
    minWidth: 200,
    sortable: true,
  },
  {
    prop: 'role',
    label: '角色',
    width: 100,
    align: 'center',
    slot: 'column-role',
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
    width: 150,
    align: 'center',
    fixed: 'right',
    slot: 'column-actions',
  },
]

// ========== 过滤后的用户数据 ==========
// 现在数据从API获取，本地只做展示，不再做客户端筛选
const filteredUsers = computed(() => {
  return users.value
})

// ========== API 调用 ==========
/**
 * 加载用户列表
 */
const loadUsers = async () => {
  loading.value = true
  try {
    const params: {
      page: number
      pageSize: number
      keyword?: string
    } = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
    }

    // 如果有用户名筛选，作为keyword传递
    if (filterParams.username) {
      params.keyword = filterParams.username
    }

    const response = await getUsers(params)
    users.value = response.items
    pagination.value.total = response.total
  } catch (error) {
    ElMessage.error('获取用户列表失败')
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

// ========== 事件处理 ==========
/**
 * 处理筛选搜索
 */
const handleSearch = async () => {
  pagination.value.currentPage = 1
  await loadUsers()
}

/**
 * 处理筛选重置
 */
const handleReset = async () => {
  filterParams.username = ''
  filterParams.role = ''
  filterParams.status = ''
  pagination.value.currentPage = 1
  await loadUsers()
}

/**
 * 处理筛选值变化
 * @param {Record<string, any>} values - 筛选值对象
 */
const handleFilterChange = (values: Record<string, any>) => {
  filterParams.username = values.username || ''
  filterParams.role = values.role || ''
  filterParams.status = values.status || ''
}

/**
 * 处理分页变化
 * @param {number} page - 页码
 */
const handlePageChange = async (page: number) => {
  pagination.value.currentPage = page
  await loadUsers()
}

/**
 * 处理每页条数变化
 * @param {number} size - 每页条数
 */
const handleSizeChange = async (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  await loadUsers()
}

/**
 * 处理排序变化
 * @param {DataTableSort} sort - 排序参数
 */
const handleSortChange = (sort: DataTableSort) => {
  sortParams.prop = sort.prop
  sortParams.order = sort.order
}

// ========== 编辑弹窗相关 (#36) ==========
/** 编辑弹窗可见性 */
const editDialogVisible = ref(false)
/** 当前编辑的用户 */
const currentUser = ref<User | null>(null)

/**
 * 打开新增用户弹窗
 */
const openAddDialog = () => {
  currentUser.value = null
  editDialogVisible.value = true
}

/**
 * 打开编辑用户弹窗
 * @param {User} user - 要编辑的用户
 */
const openEditDialog = (user: User) => {
  currentUser.value = user
  editDialogVisible.value = true
}

/**
 * 关闭编辑弹窗
 */
const closeEditDialog = () => {
  editDialogVisible.value = false
  currentUser.value = null
}

// ========== 权限管理相关 (#37) ==========
/** 权限管理弹窗可见性 */
const permissionDialogVisible = ref(false)

/**
 * 打开权限管理弹窗
 * @param {User} user - 要管理的用户
 */
const openPermissionDialog = (user: User) => {
  currentUser.value = user
  permissionDialogVisible.value = true
}

/**
 * 关闭权限管理弹窗
 */
const closePermissionDialog = () => {
  permissionDialogVisible.value = false
  currentUser.value = null
}

// ========== 删除用户 ==========
/**
 * 处理删除用户
 * @param {User} user - 要删除的用户
 */
const handleDelete = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await deleteUser(user.id)
    ElMessage.success('删除成功')
    // 刷新列表
    await loadUsers()
  } catch (error: any) {
    // 用户取消删除时不显示错误
    if (error !== 'cancel' && error?.message !== 'cancel') {
      ElMessage.error('删除失败')
      console.error('Failed to delete user:', error)
    }
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadUsers()
})

// 暴露给测试使用的方法和属性
defineExpose({
  filterParams,
  sortParams,
  editDialogVisible,
  permissionDialogVisible,
  currentUser,
  filteredUsers,
  users,
  roleNames,
  roleTypes,
  statusTypes,
  statusText,
  handleSearch,
  handleReset,
  openEditDialog,
  openPermissionDialog,
  loadUsers,
})
</script>

<template>
  <div class="user-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-title">
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">管理系统用户账号、角色和权限</p>
      </div>
      <el-button
        type="primary"
        data-test="add-user-btn"
        @click="openAddDialog"
      >
        <el-icon><Plus /></el-icon>
        新增用户
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
        :data="filteredUsers"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
        @sort-change="handleSortChange"
      >
        <!-- 用户名列自定义插槽 -->
        <template #column-username="{ row }">
          <div class="user-cell">
            <el-icon class="user-icon"><UserIcon /></el-icon>
            <span class="user-name">{{ row.username }}</span>
          </div>
        </template>

        <!-- 角色列自定义插槽 -->
        <template #column-role="{ row }">
          <el-tag
            :type="roleTypes[row.role?.name || '']"
            size="small"
          >
            {{ roleNames[row.role?.name || ''] }}
          </el-tag>
        </template>

        <!-- 状态列自定义插槽 -->
        <template #column-status="{ row }">
          <StatusTag
            :status="row.isActive ? 'success' : 'error'"
            :text="row.isActive ? '启用' : '禁用'"
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

    <!-- 编辑弹窗占位 (#36) -->
    <!-- TODO: 实现用户编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="用户编辑"
      width="500px"
      destroy-on-close
    >
      <div class="placeholder-content">
        <p>用户编辑功能将在任务 #36 中实现</p>
        <p v-if="currentUser">当前用户: {{ currentUser.username }}</p>
      </div>
      <template #footer>
        <el-button @click="closeEditDialog">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 权限管理弹窗占位 (#37) -->
    <!-- TODO: 实现权限管理弹窗 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="权限管理"
      width="600px"
      destroy-on-close
    >
      <div class="placeholder-content">
        <p>权限管理功能将在任务 #37 中实现</p>
        <p v-if="currentUser">当前用户: {{ currentUser.username }}</p>
      </div>
      <template #footer>
        <el-button @click="closePermissionDialog">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-list-page {
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

  // 用户单元格样式
  .user-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .user-icon {
      font-size: 16px;
      color: var(--tech-cyan, #00d4ff);
    }

    .user-name {
      font-weight: 500;
      color: var(--tech-text-primary, #ffffff);
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
  .user-list-page {
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
  }
}
</style>
