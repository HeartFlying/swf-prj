<template>
  <div class="users-manage-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">管理系统用户，分配角色和权限</p>
      </div>
      <div class="header-actions">
        <tech-button variant="primary" :icon="Plus" @click="showAddDialog"> 添加用户 </tech-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <data-panel
        label="总用户数"
        :value="stats.total"
        :icon="UserFilled"
        icon-color="#00d4ff"
        :icon-bg-color="'rgba(0, 212, 255, 0.1)'"
      />
      <data-panel
        label="活跃用户"
        :value="stats.active"
        :icon="CircleCheck"
        icon-color="#00ff88"
        :icon-bg-color="'rgba(0, 255, 136, 0.1)'"
      />
      <data-panel
        label="管理员"
        :value="stats.admins"
        :icon="UserIcon"
        icon-color="#ff9500"
        :icon-bg-color="'rgba(255, 149, 0, 0.1)'"
      />
      <data-panel
        label="今日新增"
        :value="stats.todayNew"
        :icon="TrendCharts"
        icon-color="#ff006e"
        :icon-bg-color="'rgba(255, 0, 110, 0.1)'"
      />
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索用户名或邮箱..."
        class="search-input"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="roleFilter" placeholder="筛选角色" class="role-filter" clearable data-testid="role-filter">
        <el-option label="全部角色" value="" />
        <el-option label="管理员" value="admin" />
        <el-option label="开发者" value="developer" />
        <el-option label="访客" value="viewer" />
      </el-select>

      <el-select v-model="statusFilter" placeholder="筛选状态" class="status-filter" clearable data-testid="status-filter">
        <el-option label="全部状态" value="" />
        <el-option label="启用" value="active" />
        <el-option label="禁用" value="inactive" />
      </el-select>
    </div>

    <!-- 用户列表 -->
    <tech-card title="用户列表" :icon="List">
      <DataTable
        :data="filteredUsers"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-test-id="user-row"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
      >
        <!-- 用户名列自定义插槽 -->
        <template #column-username="{ row }">
          <div class="user-cell">
            <div class="user-avatar" data-testid="user-avatar">{{ row.username.slice(0, 2).toUpperCase() }}</div>
            <div class="user-info">
              <div class="user-name">{{ row.username }}</div>
            </div>
          </div>
        </template>

        <!-- 角色列自定义插槽 -->
        <template #column-role="{ row }">
          <el-tag :type="roleTypes[row.role?.name || '']" size="small">
            {{ roleNames[row.role?.name || ''] }}
          </el-tag>
        </template>

        <!-- 状态列自定义插槽 -->
        <template #column-status="{ row }">
          <el-switch
            v-model="row.isActive"
            :active-text="'启用'"
            :inactive-text="'禁用'"
            inline-prompt
            @change="toggleUserStatus(row)"
          />
        </template>

        <!-- 操作列自定义插槽 -->
        <template #column-actions="{ row }">
          <el-button type="primary" link size="small" @click="editUser(row)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button type="danger" link size="small" @click="deleteUser(row)">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </DataTable>
    </tech-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '添加用户'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>

        <el-form-item label="部门" prop="department">
          <el-input v-model="form.department" placeholder="请输入部门" />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="开发者" value="developer" />
            <el-option label="访客" value="viewer" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  Search,
  UserFilled,
  CircleCheck,
  User as UserIcon,
  TrendCharts,
  List,
  Edit,
  Delete,
} from '@element-plus/icons-vue'
import TechCard from '@/components/tech/TechCard.vue'
import TechButton from '@/components/tech/TechButton.vue'
import DataPanel from '@/components/tech/DataPanel.vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import type { DataTableColumn, DataTablePagination } from '@/components/DataTable/DataTable.vue'
import type { User } from '@/types/api'
import { getUsers, createUser, updateUser, deleteUser as deleteUserApi } from '@/api/user'

const loading = ref(false)
const searchQuery = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

// 统计数据
const stats = computed(() => {
  const total = users.value.length
  const active = users.value.filter(u => u.isActive).length
  const admins = users.value.filter(u => u.role?.name === 'admin').length

  return {
    total,
    active,
    admins,
    todayNew: 0,
  }
})

// 角色映射
const roleNames: Record<string, string> = {
  admin: '管理员',
  developer: '开发者',
  viewer: '访客',
}

const roleTypes: Record<string, string> = {
  admin: 'danger',
  developer: 'success',
  viewer: 'info',
}

// 用户数据
const users = ref<User[]>([])

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const response = await getUsers({
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      keyword: searchQuery.value || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined,
    })

    users.value = response.items
    pagination.value.total = response.total
  } catch (error) {
    ElMessage.error('加载用户列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadUsers()
})

// 表格列配置
const columns: DataTableColumn<User>[] = [
  {
    prop: 'username',
    label: '用户名',
    minWidth: 180,
    slot: 'column-username',
  },
  {
    prop: 'email',
    label: '邮箱',
    minWidth: 200,
  },
  {
    prop: 'department',
    label: '部门',
    width: 120,
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
    prop: 'actions',
    label: '操作',
    width: 150,
    align: 'center',
    fixed: 'right',
    slot: 'column-actions',
  },
]

// 分页配置
const pagination = ref<DataTablePagination>({
  currentPage: 1,
  pageSize: 20,
  total: 0,
})

// 过滤用户（服务端分页）
const filteredUsers = computed(() => {
  return users.value
})

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.value.currentPage = page
  loadUsers()
}

// 处理每页条数变化
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  loadUsers()
}

// 监听搜索和筛选变化
let filterTimeout: ReturnType<typeof setTimeout> | null = null
watch([searchQuery, roleFilter, statusFilter], () => {
  if (filterTimeout) {
    clearTimeout(filterTimeout)
  }
  filterTimeout = setTimeout(() => {
    pagination.value.currentPage = 1
    loadUsers()
  }, 300)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (filterTimeout) {
    clearTimeout(filterTimeout)
  }
})

// 对话框
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  username: '',
  email: '',
  password: '',
  department: '',
  role: 'developer' as 'admin' | 'developer' | 'viewer',
  isActive: true,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 个字符', trigger: 'blur' },
  ],
  department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const showAddDialog = () => {
  isEdit.value = false
  form.id = 0
  form.username = ''
  form.email = ''
  form.password = ''
  form.department = ''
  form.role = 'developer'
  form.isActive = true
  dialogVisible.value = true
}

const editUser = (user: User) => {
  isEdit.value = true
  form.id = user.id
  form.username = user.username
  form.email = user.email
  form.department = user.department
  form.role = (user.role?.name as 'admin' | 'developer' | 'viewer') || 'developer'
  form.isActive = user.isActive
  dialogVisible.value = true
}

// 角色名称到ID的映射
const roleToIdMap: Record<string, number> = {
  admin: 1,
  developer: 2,
  viewer: 3,
}

const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          await updateUser(form.id, {
            email: form.email,
            department: form.department,
            isActive: form.isActive,
            roleId: roleToIdMap[form.role],
          })
          ElMessage.success('用户更新成功')
        } else {
          await createUser({
            username: form.username,
            email: form.email,
            department: form.department,
            password: form.password,
            roleId: roleToIdMap[form.role],
          })
          ElMessage.success('用户添加成功')
        }
        // 重新加载列表
        await loadUsers()
        dialogVisible.value = false
      } catch (error) {
        ElMessage.error(isEdit.value ? '用户更新失败' : '用户添加失败')
        console.error(error)
      } finally {
        submitting.value = false
      }
    }
  })
}

const deleteUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${user.username}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteUserApi(user.id)
    ElMessage.success('删除成功')
    // 重新加载列表
    await loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }
}

const toggleUserStatus = async (user: User) => {
  const action = user.isActive ? '启用' : '禁用'
  try {
    await updateUser(user.id, { isActive: user.isActive })
    ElMessage.success(`用户已${action}`)
  } catch (error) {
    // 恢复原状态
    user.isActive = !user.isActive
    ElMessage.error('操作失败')
    console.error(error)
  }
}
</script>

<style scoped lang="scss">
.users-manage-page {
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

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--tech-bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--tech-border-primary);

    .search-input {
      width: 280px;
    }

    .role-filter,
    .status-filter {
      width: 140px;
    }
  }

  .user-cell {
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
    }

    .user-info {
      .user-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--tech-text-primary);
      }
    }
  }

  :deep(.data-table) {
    .el-tag {
      font-size: 12px;
    }

    .el-switch {
      --el-switch-on-color: #00ff88;
      --el-switch-off-color: #ff4d4f;
    }
  }

  @media (max-width: 768px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }

    .filter-bar {
      flex-wrap: wrap;

      .search-input,
      .role-filter,
      .status-filter {
        width: 100%;
      }
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;

      .header-actions {
        width: 100%;
      }
    }
  }
}
</style>
