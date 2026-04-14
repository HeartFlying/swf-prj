<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElDialog, ElTree, ElInput, ElButton, ElCheckbox, ElMessage, ElEmpty } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { TreeInstance } from 'element-plus'

// ========== 类型定义 ==========
/** 权限项 */
export interface Permission {
  /** 权限ID */
  id: string
  /** 权限名称 */
  name: string
  /** 权限编码 */
  code: string
  /** 权限类型 */
  type: 'menu' | 'action'
  /** 父权限ID */
  parentId?: string
  /** 子权限列表 */
  children?: Permission[]
}

/** 组件属性 */
interface Props {
  /** 是否显示对话框 */
  visible: boolean
  /** 角色ID */
  roleId: string
  /** 角色名称 */
  roleName: string
  /** 当前权限列表 */
  permissions: string[]
}

const props = defineProps<Props>()

/** 组件事件 */
const emit = defineEmits<{
  /** 更新visible状态 */
  (e: 'update:visible', value: boolean): void
  /** 提交权限变更 */
  (e: 'submit', data: { roleId: string; permissions: string[] }): void
  /** 取消 */
  (e: 'cancel'): void
}>()

// ========== 权限数据 ==========
/** 权限树数据 */
const permissionTree = ref<Permission[]>([
  {
    id: '1',
    name: '系统管理',
    code: 'system',
    type: 'menu',
    children: [
      {
        id: '1-1',
        name: '用户管理',
        code: 'system:user',
        type: 'menu',
        parentId: '1',
        children: [
          { id: '1-1-1', name: '查看用户', code: 'system:user:view', type: 'action', parentId: '1-1' },
          { id: '1-1-2', name: '新增用户', code: 'system:user:create', type: 'action', parentId: '1-1' },
          { id: '1-1-3', name: '编辑用户', code: 'system:user:update', type: 'action', parentId: '1-1' },
          { id: '1-1-4', name: '删除用户', code: 'system:user:delete', type: 'action', parentId: '1-1' },
        ],
      },
      {
        id: '1-2',
        name: '角色管理',
        code: 'system:role',
        type: 'menu',
        parentId: '1',
        children: [
          { id: '1-2-1', name: '查看角色', code: 'system:role:view', type: 'action', parentId: '1-2' },
          { id: '1-2-2', name: '新增角色', code: 'system:role:create', type: 'action', parentId: '1-2' },
          { id: '1-2-3', name: '编辑角色', code: 'system:role:update', type: 'action', parentId: '1-2' },
          { id: '1-2-4', name: '删除角色', code: 'system:role:delete', type: 'action', parentId: '1-2' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: '项目管理',
    code: 'project',
    type: 'menu',
    children: [
      {
        id: '2-1',
        name: '项目列表',
        code: 'project:list',
        type: 'menu',
        parentId: '2',
        children: [
          { id: '2-1-1', name: '查看项目', code: 'project:view', type: 'action', parentId: '2-1' },
          { id: '2-1-2', name: '创建项目', code: 'project:create', type: 'action', parentId: '2-1' },
          { id: '2-1-3', name: '编辑项目', code: 'project:update', type: 'action', parentId: '2-1' },
          { id: '2-1-4', name: '删除项目', code: 'project:delete', type: 'action', parentId: '2-1' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: '数据统计',
    code: 'stats',
    type: 'menu',
    children: [
      {
        id: '3-1',
        name: '个人统计',
        code: 'stats:personal',
        type: 'menu',
        parentId: '3',
        children: [
          { id: '3-1-1', name: '查看个人统计', code: 'stats:personal:view', type: 'action', parentId: '3-1' },
          { id: '3-1-2', name: '导出个人数据', code: 'stats:personal:export', type: 'action', parentId: '3-1' },
        ],
      },
      {
        id: '3-2',
        name: '项目统计',
        code: 'stats:project',
        type: 'menu',
        parentId: '3',
        children: [
          { id: '3-2-1', name: '查看项目统计', code: 'stats:project:view', type: 'action', parentId: '3-2' },
          { id: '3-2-2', name: '导出项目数据', code: 'stats:project:export', type: 'action', parentId: '3-2' },
        ],
      },
    ],
  },
  {
    id: '4',
    name: '数据同步',
    code: 'sync',
    type: 'menu',
    children: [
      {
        id: '4-1',
        name: '同步任务',
        code: 'sync:task',
        type: 'menu',
        parentId: '4',
        children: [
          { id: '4-1-1', name: '查看同步任务', code: 'sync:task:view', type: 'action', parentId: '4-1' },
          { id: '4-1-2', name: '创建同步任务', code: 'sync:task:create', type: 'action', parentId: '4-1' },
          { id: '4-1-3', name: '执行同步', code: 'sync:task:execute', type: 'action', parentId: '4-1' },
        ],
      },
    ],
  },
])

// ========== 响应式数据 ==========
/** 搜索关键词 */
const searchKeyword = ref('')
/** 树组件引用 */
const treeRef = ref<TreeInstance | null>(null)
/** 当前选中的权限ID列表 */
const selectedPermissionIds = ref<string[]>([])
/** 全选状态 */
const isAllSelected = ref(false)
/** 半选状态 */
const isIndeterminate = ref(false)

// ========== 计算属性 ==========
/** 当前权限ID列表（从props同步） */
const currentPermissionIds = computed(() => props.permissions)

/** 对话框标题 */
const dialogTitle = computed(() => `权限配置 - ${props.roleName || '未命名角色'}`)

/** 树形组件配置 */
const treeProps = {
  label: 'name',
  children: 'children',
}

/** 是否有权限数据 */
const hasPermissionData = computed(() => permissionTree.value.length > 0)

/** 过滤后的权限树 */
const filteredPermissionTree = computed(() => {
  if (!searchKeyword.value) return permissionTree.value

  const keyword = searchKeyword.value.toLowerCase()
  const filterNode = (node: Permission): Permission | null => {
    const matchName = node.name.toLowerCase().includes(keyword)
    const matchCode = node.code.toLowerCase().includes(keyword)

    if (node.children) {
      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is Permission => child !== null)

      if (filteredChildren.length > 0 || matchName || matchCode) {
        return { ...node, children: filteredChildren }
      }
    }

    if (matchName || matchCode) {
      return { ...node }
    }

    return null
  }

  return permissionTree.value
    .map(filterNode)
    .filter((node): node is Permission => node !== null)
})

/** 所有权限ID列表 */
const allPermissionIds = computed(() => {
  const ids: string[] = []
  const traverse = (nodes: Permission[]) => {
    nodes.forEach(node => {
      ids.push(node.id)
      if (node.children) {
        traverse(node.children)
      }
    })
  }
  traverse(permissionTree.value)
  return ids
})

// ========== 方法 ==========
/** 处理对话框关闭 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 处理取消 */
const handleCancel = () => {
  emit('cancel')
  handleClose()
}

/** 处理提交 */
const handleSubmit = () => {
  const checkedKeys = getCheckedPermissions()
  emit('submit', {
    roleId: props.roleId,
    permissions: checkedKeys,
  })
}

/** 处理节点选中状态变化 */
const handleCheckChange = () => {
  updateSelectAllState()
}

/** 更新全选状态 */
const updateSelectAllState = () => {
  const checkedKeys = getCheckedPermissions()
  const total = allPermissionIds.value.length

  if (checkedKeys.length === 0) {
    isAllSelected.value = false
    isIndeterminate.value = false
  } else if (checkedKeys.length === total) {
    isAllSelected.value = true
    isIndeterminate.value = false
  } else {
    isAllSelected.value = false
    isIndeterminate.value = true
  }
}

/** 获取选中的权限ID列表 */
const getCheckedPermissions = (): string[] => {
  if (!treeRef.value) return []
  return treeRef.value.getCheckedKeys(false) as string[]
}

/** 全选 */
const selectAll = () => {
  if (treeRef.value) {
    treeRef.value.setCheckedKeys(allPermissionIds.value, false)
    isAllSelected.value = true
    isIndeterminate.value = false
  }
}

/** 取消全选 */
const deselectAll = () => {
  if (treeRef.value) {
    treeRef.value.setCheckedKeys([], false)
    isAllSelected.value = false
    isIndeterminate.value = false
  }
}

/** 处理全选复选框变化 */
const handleSelectAllChange = (val: boolean | string | number) => {
  if (val) {
    selectAll()
  } else {
    deselectAll()
  }
}

/** 展开全部 */
const expandAll = () => {
  if (treeRef.value) {
    const expandNode = (nodes: Permission[]) => {
      nodes.forEach(node => {
        treeRef.value?.store.nodesMap[node.id]?.expand()
        if (node.children) {
          expandNode(node.children)
        }
      })
    }
    expandNode(permissionTree.value)
  }
}

/** 收起全部 */
const collapseAll = () => {
  if (treeRef.value) {
    const collapseNode = (nodes: Permission[]) => {
      nodes.forEach(node => {
        treeRef.value?.store.nodesMap[node.id]?.collapse()
        if (node.children) {
          collapseNode(node.children)
        }
      })
    }
    collapseNode(permissionTree.value)
  }
}

/** 清空搜索 */
const clearSearch = () => {
  searchKeyword.value = ''
}

/** 过滤节点方法 */
const filterNodeMethod = (value: string, data: Record<string, unknown>) => {
  if (!value) return true
  const keyword = value.toLowerCase()
  const permissionData = data as unknown as Permission
  return permissionData.name.toLowerCase().includes(keyword) || permissionData.code.toLowerCase().includes(keyword)
}

/** 初始化权限选中状态 */
const initPermissionState = () => {
  nextTick(() => {
    if (treeRef.value && props.permissions) {
      treeRef.value.setCheckedKeys(props.permissions, false)
      updateSelectAllState()
    }
  })
}

// ========== 监听器 ==========
/** 监听visible变化，打开时初始化权限状态 */
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initPermissionState()
    }
  }
)

/** 监听permissions变化 */
watch(
  () => props.permissions,
  (newVal) => {
    if (newVal && props.visible) {
      initPermissionState()
    }
  },
  { immediate: true }
)

/** 监听搜索关键词变化，过滤树节点 */
watch(searchKeyword, (val) => {
  if (treeRef.value) {
    treeRef.value.filter(val)
  }
})

// ========== 暴露方法 ==========
defineExpose({
  selectedPermissionIds,
  currentPermissionIds,
  getCheckedPermissions,
  selectAll,
  deselectAll,
  clearSearch,
  treeProps,
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    destroy-on-close
    class="permission-manager-dialog"
    @update:model-value="handleClose"
    @opened="initPermissionState"
  >
    <div class="permission-manager">
      <!-- 工具栏 -->
      <div class="permission-toolbar">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索权限名称或编码"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 批量操作 -->
        <div class="batch-actions">
          <el-checkbox
            v-model="isAllSelected"
            :indeterminate="isIndeterminate"
            @change="handleSelectAllChange"
          >
            全选
          </el-checkbox>
          <el-button type="primary" link size="small" @click="selectAll">
            全部选中
          </el-button>
          <el-button type="danger" link size="small" @click="deselectAll">
            取消全选
          </el-button>
          <el-button type="info" link size="small" @click="expandAll">
            展开全部
          </el-button>
          <el-button type="info" link size="small" @click="collapseAll">
            收起全部
          </el-button>
        </div>
      </div>

      <!-- 权限树 -->
      <div class="permission-tree-container">
        <el-tree
          v-if="hasPermissionData"
          ref="treeRef"
          :data="filteredPermissionTree"
          :props="treeProps"
          node-key="id"
          show-checkbox
          default-expand-all
          :filter-node-method="filterNodeMethod"
          :default-checked-keys="currentPermissionIds"
          @check-change="handleCheckChange"
          class="permission-tree"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <span class="node-name">{{ data.name }}</span>
              <span class="node-code">({{ data.code }})</span>
              <el-tag
                v-if="data.type === 'action'"
                size="small"
                type="warning"
                class="node-type-tag"
              >
                操作
              </el-tag>
              <el-tag
                v-else
                size="small"
                type="success"
                class="node-type-tag"
              >
                菜单
              </el-tag>
            </span>
          </template>
        </el-tree>

        <el-empty v-else description="暂无权限数据" />
      </div>

      <!-- 统计信息 -->
      <div class="permission-stats">
        <span>已选择 {{ getCheckedPermissions().length }} 项权限</span>
        <span>共 {{ allPermissionIds.length }} 项权限</span>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.permission-manager-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.permission-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--tech-border-secondary) !important;

  .search-input {
    width: 280px;
  }

  .batch-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-left: auto;
  }
}

.permission-tree-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--tech-border-secondary) !important;
  border-radius: 4px;
  padding: 12px;
  background: var(--tech-bg-card) !important;

  .permission-tree {
    .custom-tree-node {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;

      .node-name {
        font-weight: 500;
      }

      .node-code {
        color: var(--tech-text-muted) !important;
        font-size: 12px;
      }

      .node-type-tag {
        margin-left: auto;
      }
    }
  }
}

.permission-stats {
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

// 响应式适配
@media (max-width: 768px) {
  .permission-toolbar {
    flex-direction: column;
    align-items: stretch;

    .search-input {
      width: 100%;
    }

    .batch-actions {
      margin-left: 0;
      justify-content: flex-start;
    }
  }
}
</style>
