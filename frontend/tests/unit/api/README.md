# API单元测试

本目录包含前端API层的单元测试，用于验证前端API与后端OpenAPI文档的一致性。

## 测试覆盖范围

### 1. user.spec.ts - 用户API测试 (10个测试)
- `getUsers` - 获取用户列表（支持分页和关键词筛选）
- `getUserById` - 根据ID获取用户
- `createUser` - 创建用户
- `updateUser` - 更新用户
- `deleteUser` - 删除用户
- `getUserProjects` - 获取当前用户项目列表
- `updateCurrentUser` - 更新当前用户资料
- `changePassword` - 修改密码（验证snake_case字段命名）

**API对齐验证点**:
- Task 1.1: `changePassword` 使用 `old_password`/`new_password` 蛇形命名

### 2. project.spec.ts - 项目API测试 (12个测试)
- `getProjects` - 获取项目列表（支持stage参数筛选）
- `getProjectById` - 根据ID获取项目
- `createProject` - 创建项目
- `updateProject` - 更新项目
- `deleteProject` - 删除项目
- `getProjectMembers` - 获取项目成员（支持分页）
- `addProjectMember` - 添加项目成员
- `removeProjectMember` - 移除项目成员

**API对齐验证点**:
- Task 1.2: `addProjectMember` 使用 `user_id` 蛇形命名
- Task 2.1: `getProjectMembers` 支持分页参数
- Task 4.3: `getProjects` 支持 `stage` 参数

### 3. cache.spec.ts - 缓存API测试 (10个测试)
- `getCacheStats` - 获取缓存统计
- `clearAllCache` - 清空所有缓存（支持类型筛选）
- `clearCacheByPattern` - 按模式清空缓存
- `checkCacheHealth` - 缓存健康检查

**API对齐验证点**:
- Task 1.3: `clearCacheByPattern` 使用params传递pattern
- Task 2.5: `clearAllCache` 支持 `cache_type`/`user_id`/`project_id` 参数
- Task 3.1: `CacheStats` 类型定义映射 `keys_count`/`stats_keys`/`dashboard_keys`
- Task 3.4: `CacheHealthResponse` 类型定义

### 4. stats.spec.ts - 统计API测试 (28个测试)
- `getPersonalDashboard` - 个人仪表盘
- `getPersonalCodeStats` - 个人代码统计
- `getPersonalTokenStats` - 个人Token统计
- `getPersonalBugRate` - 个人Bug率
- `getProjectDashboard` - 项目仪表盘
- `getProjectCodeRank` - 项目代码排行
- `getProjectBugTrend` - 项目Bug趋势
- `getProjectCodeTrend` - 项目代码趋势
- `getProjectAIAdoption` - 项目AI采纳率
- `getGlobalTokenTrend` - 全局Token趋势
- `getActivityTrend` - 活动趋势
- `getTopUsers`/`getTopUsersV2` - 用户排行
- `getProjectCommitRank` - 项目提交排行
- `getGlobalSummary` - 全局摘要
- `getPersonalHeatmap` - 个人热力图
- `getHeatmapData` - 全局热力图
- `getProjectStats` - 项目统计概览

**API对齐验证点**:
- Task 1.5: `getHeatmapData` 响应格式
- Task 1.6: `ProjectDashboard` 使用 `project_id`/`total_stats` 蛇形命名
- Task 2.2: `getProjectAIAdoption` 默认 `days=30`
- Task 2.3: `getActivityTrend` 默认 `days=30`
- Task 2.4: `getPersonalHeatmap` 使用 `user_id`/`metric_type` 蛇形命名
- Task 4.2: `getProjectStats` 新增API

### 5. sync.spec.ts - 同步API测试 (17个测试)
- `getSyncTasks` - 获取同步任务列表
- `getSyncTaskById` - 获取同步任务详情
- `createSyncTask` - 创建同步任务
- `triggerSync` - 触发同步任务
- `getSyncLogs` - 获取同步日志
- `getSyncStatus` - 获取同步状态
- `syncGitLab`/`syncTrae`/`syncZendao` - 执行同步
- `cancelSyncTask` - 取消同步任务
- `getAllSyncLogs` - 获取全局同步日志

**API对齐验证点**:
- Task 2.6: `getSyncLogs` 支持 `level` 筛选
- Task 2.7: `taskId` 使用 `number` 类型
- Task 3.2: `SyncLog` 类型定义
- Task 4.1: `getAllSyncLogs` 新增API

### 6. auth.spec.ts - 认证API测试 (10个测试)
- `login` - 用户登录
- `logout` - 用户登出
- `refreshToken` - 刷新访问令牌
- `getCurrentUser` - 获取当前用户信息

**API对齐验证点**:
- Task 1.4: `refreshToken` 响应字段适配

## 运行测试

```bash
# 运行所有API测试
cd frontend
npm run test:run -- tests/unit/api/

# 运行单个测试文件
npm run test:run -- tests/unit/api/user.spec.ts

# 开发模式运行（监视文件变化）
npm run test -- tests/unit/api/
```

## 测试设计原则

1. **API对齐验证**: 每个测试都验证前端API调用与后端OpenAPI规范的一致性
2. **字段命名检查**: 验证snake_case与camelCase的转换正确性
3. **参数传递验证**: 验证查询参数和请求体的格式正确性
4. **响应类型检查**: 验证响应数据类型与TypeScript类型定义一致
5. **边界情况覆盖**: 测试可选参数、默认值和空值处理

## 维护指南

当后端API变更时:
1. 更新对应的API函数实现
2. 更新对应的类型定义
3. 更新对应的单元测试
4. 运行测试确保前后端一致性

## 关联文档

- `memory/project_api_alignment_tasks.md` - API对齐任务完成状态
- `src/types/api.ts` - API类型定义
- `src/api/*.ts` - API函数实现
