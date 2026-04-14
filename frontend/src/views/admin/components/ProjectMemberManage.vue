<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { Search, User, Delete, Edit, Plus } from '@element-plus/icons-vue'
import DataTable from '@/components/DataTable/DataTable.vue'
import type { DataTableColumn } from '@/components/DataTable/DataTable.vue'
import type { User as UserType, ProjectMember } from '@/types/api'
import { getProjectMembers, addProjectMember, removeProjectMember, updateProjectMember } from '@/api/project'
import { getUsers } from '@/api/user'

// ========== 类型定义 ==========
/** 成员角色 */
type MemberRole = 'owner' | 'maintainer' | 'developer' | 'member'

/** 项目成员 */
interface ProjectMemberWithUser {
  id: number
  projectId: number
  userId: number
  role: MemberRole
  joinedAt: string
  username?: string
  email?: string
  department?: string
  avatar?: string
}

/** 组件属性 */
interface Props {
  /** 是否显示对话框 */
  visible: boolean
  /** 项目ID */
  projectId: number
  /** 项目名称 */
  projectName: string
}

const props = defineProps<Props>()

/** 组件事件 */
const emit = defineEmits<{
  /** 更新visible状态 */
  (e: 'update:visible', value: boolean): void
  /** 成员变更 */
  (e: 'change', data: { projectId: number; members: ProjectMemberWithUser[] }): void
  /** 取消 */
  (e: 'cancel'): void
}>()

// ========== 角色配置 ==========
const ROLE_OPTIONS = [
  { value: 'owner', label: '负责人', type: 'danger' as const },
  { value: 'maintainer', label: '维护者', type: 'warning' as const },
  { value: 'developer', label: '开发者', type: 'primary' as const },
  { value: 'member', label: '成员', type: 'info' as const },
]

const ROLE_MAP: Record<MemberRole, string> = {
  owner: '负责人',
  maintainer: '维护者',
  developer: '开发者',
  member: '成员',
}

const ROLE_TYPE_MAP: Record<MemberRole, string> = {
  owner: 'danger',
  maintainer: 'warning',
  developer: 'primary',
  member: 'info',
}

// ========== 响应式数据 ==========
/** 加载状态 */
const loading = ref(false)
/** 成员列表 */
const members = ref<ProjectMemberWithUser[]>([])
/** 搜索关键词 */
const searchQuery = ref('')
/** 分页配置 */
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

/** 添加成员对话框 */
const addDialogVisible = ref(false)
const addFormRef = ref<FormInstance>()
const addForm = reactive({
  userId: null as number | null,
  role: 'member' as MemberRole,
})
const adding = ref(false)

/** 编辑角色对话框 */
const editDialogVisible = ref(false)
const editFormRef = ref<FormInstance>()
const editingMember = ref<ProjectMemberWithUser | null>(null)
const editForm = reactive({
  role: 'member' as MemberRole,
})
const editing = ref(false)

/** 可选用户列表 */
const availableUsers = ref<UserType[]>([])

/** 加载用户列表 */
const loadUsers = async () => {
  try {
    const response = await getUsers({ pageSize: 100 })
    availableUsers.value = response.items
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  }
}

/** 表格列配置 */
const columns = ref<DataTableColumn<ProjectMemberWithUser>[]>([
  { prop: 'username', label: '用户名', minWidth: 120 },
  { prop: 'email', label: '邮箱', minWidth: 180, showOverflowTooltip: true },
  { prop: 'department', label: '部门', minWidth: 100 },
  { prop: 'role', label: '角色', width: 100, slot: 'column-role' },
  { prop: 'joinedAt', label: '加入时间', width: 120 },
  { prop: 'actions', label: '操作', width: 150, fixed: 'right', slot: 'column-actions' },
])

// ========== 计算属性 ==========
/** 对话框标题 */
const dialogTitle = computed(() => `成员管理 - ${props.projectName || '未命名项目'}`)

/** 过滤后的成员列表 */
const filteredMembers = computed(() => {
  let result = members.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      member =>
        member.username?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.department?.toLowerCase().includes(query)
    )
  }
  return result
})

/** 分页后的成员列表 */
const paginatedMembers = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredMembers.value.slice(start, end)
})

/** 可选用户（排除已在项目中的用户） */
const selectableUsers = computed(() => {
  const memberUserIds = new Set(members.value.map(m => m.userId))
  return availableUsers.value.filter(user => !memberUserIds.has(user.id))
})

/** 添加表单验证规则 */
const addFormRules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

/** 编辑表单验证规则 */
const editFormRules = {
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// ========== 方法 ==========
/** 获取角色标签 */
const getRoleLabel = (role: MemberRole): string => ROLE_MAP[role] || role

/** 获取角色类型 */
const getRoleType = (role: MemberRole): string => ROLE_TYPE_MAP[role] || 'info'

/** 处理对话框关闭 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 处理取消 */
const handleCancel = () => {
  emit('cancel')
  handleClose()
}

/** 处理分页变化 */
const handlePageChange = (page: number) => {
  pagination.currentPage = page
}

/** 处理每页条数变化 */
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

/** 打开添加成员对话框 */
const openAddDialog = () => {
  addForm.userId = null
  addForm.role = 'member'
  addDialogVisible.value = true
}

/** 提交添加成员 */
const submitAddMember = async () => {
  if (!addFormRef.value) return

  await addFormRef.value.validate(async (valid) => {
    if (valid) {
      adding.value = true

      try {
        await addProjectMember(props.projectId, {
          user_id: addForm.userId!,
          role: addForm.role
        })
        ElMessage.success('成员添加成功')
        await loadMembers()
        addDialogVisible.value = false
      } catch (error) {
        ElMessage.error('添加成员失败')
      } finally {
        adding.value = false
      }
    }
  })
}

/** 打开编辑角色对话框 */
const openEditDialog = (member: ProjectMemberWithUser) => {
  editingMember.value = member
  editForm.role = member.role
  editDialogVisible.value = true
}

/** 提交编辑角色 */
const submitEditRole = async () => {
  if (!editFormRef.value || !editingMember.value) return

  const memberId = editingMember.value.id

  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      editing.value = true

      try {
        await updateProjectMember(
          props.projectId,
          memberId,
          editForm.role
        )
        ElMessage.success('角色更新成功')
        await loadMembers()
        editDialogVisible.value = false
      } catch (error) {
        ElMessage.error('角色更新失败')
      } finally {
        editing.value = false
      }
    }
  })
}

/** 移除成员 */
const removeMember = async (member: ProjectMemberWithUser) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除成员 "${member.username}" 吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await removeProjectMember(props.projectId, member.id)
    ElMessage.success('成员已移除')
    await loadMembers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除成员失败')
    }
  }
}

/** 加载成员数据 */
const loadMembers = async () => {
  loading.value = true

  try {
    const response = await getProjectMembers(props.projectId, { pageSize: 100 })
    members.value = response.items.map((member: ProjectMember) => ({
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role as MemberRole,
      joinedAt: member.joinedAt,
      username: member.user?.username || member.username,
      email: member.user?.email || member.email,
      department: member.user?.department,
      avatar: member.user?.avatar,
    }))
    pagination.total = members.value.length
  } catch (error) {
    ElMessage.error('加载成员列表失败')
  } finally {
    loading.value = false
  }
}

/** 监听visible变化，打开时加载数据 */
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadMembers()
      loadUsers()
    }
  }
)

/** 监听搜索关键词变化，重置分页 */
watch(searchQuery, () => {
  pagination.currentPage = 1
})

// ========== 暴露方法 ==========
defineExpose({
  members,
  loadMembers,
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="900px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    destroy-on-close
    class="member-manage-dialog"
    @update:model-value="handleClose"
  >
    <div class="member-manage">
      <!-- 工具栏 -->
      <div class="member-toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索成员..."
          style="width: 240px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" :icon="Plus" @click="openAddDialog">
          添加成员
        </el-button>
      </div>

      <!-- 成员列表 -->
      <div class="member-table-container">
        <data-table
          :data="paginatedMembers"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
        >
          <!-- 角色列 -->
          <template #column-role="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>

          <!-- 操作列 -->
          <template #column-actions="{ row }">
            <div class="actions-cell">
              <el-button
                type="primary"
                link
                size="small"
                :icon="Edit"
                @click="openEditDialog(row)"
              >
                修改角色
              </el-button>
              <el-button
                type="danger"
                link
                size="small"
                :icon="Delete"
                @click="removeMember(row)"
              >
                移除
              </el-button>
            </div>
          </template>
        </data-table>
      </div>

      <!-- 成员统计 -->
      <div class="member-stats">
        <span>共 {{ members.length }} 名成员</span>
        <span>
          负责人: {{ members.filter(m => m.role === 'owner').length }} |
          维护者: {{ members.filter(m => m.role === 'maintainer').length }} |
          开发者: {{ members.filter(m => m.role === 'developer').length }} |
          成员: {{ members.filter(m => m.role === 'member').length }}
        </span>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">关闭</el-button>
      </div>
    </template>

    <!-- 添加成员对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加成员"
      width="400px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="80px"
      >
        <el-form-item label="选择用户" prop="userId">
          <el-select
            v-model="addForm.userId"
            placeholder="请选择用户"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="user in selectableUsers"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            >
              <div class="user-option">
                <el-icon><User /></el-icon>
                <span class="username">{{ user.username }}</span>
                <span class="department">({{ user.department }})</span>
              </div>
            </el-option>
          </el-select>
          <div v-if="selectableUsers.length === 0" class="no-user-hint">
            暂无可添加的用户
          </div>
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="addForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="option in ROLE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            >
              <el-tag :type="option.type" size="small">{{ option.label }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="adding"
          :disabled="selectableUsers.length === 0"
          @click="submitAddMember"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑角色对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="修改角色"
      width="400px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        label-width="80px"
      >
        <el-form-item label="当前用户">
          <div class="current-user">
            <el-icon><User /></el-icon>
            <span>{{ editingMember?.username }}</span>
          </div>
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="option in ROLE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            >
              <el-tag :type="option.type" size="small">{{ option.label }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="submitEditRole">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<style scoped lang="scss">
.member-manage-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.member-manage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-table-container {
  min-height: 300px;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-stats {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--tech-border-secondary) !important;
  color: var(--tech-text-muted) !important;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 用户选项样式
.user-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .username {
    font-weight: 500;
  }

  .department {
    color: var(--tech-text-muted) !important;
    font-size: 12px;
  }
}

.no-user-hint {
  color: var(--tech-text-muted) !important;
  font-size: 12px;
  margin-top: 4px;
}

.current-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--tech-bg-secondary) !important;
  border-radius: 4px;

  .el-icon {
    color: var(--tech-cyan) !important;
  }
}
</style>
