# Coding Agent Stats

本目录包含所有 API 接口的独立定义文件。每个接口都有一个对应的 JSON 文件。

## 目录

### authentication

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `POST` | `/api/v1/auth/login` | Login | [post_api_v1_auth_login.json](post_api_v1_auth_login.json) |
| `POST` | `/api/v1/auth/logout` | Logout Endpoint | [post_api_v1_auth_logout.json](post_api_v1_auth_logout.json) |
| `GET` | `/api/v1/auth/me` | Get Me | [get_api_v1_auth_me.json](get_api_v1_auth_me.json) |
| `POST` | `/api/v1/auth/refresh` | Refresh | [post_api_v1_auth_refresh.json](post_api_v1_auth_refresh.json) |

### cache

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `POST` | `/api/v1/cache/clear` | 清除缓存 | [post_api_v1_cache_clear.json](post_api_v1_cache_clear.json) |
| `POST` | `/api/v1/cache/clear-pattern` | 按模式清除缓存 | [post_api_v1_cache_clear-pattern.json](post_api_v1_cache_clear-pattern.json) |
| `GET` | `/api/v1/cache/health` | 检查缓存服务健康状态 | [get_api_v1_cache_health.json](get_api_v1_cache_health.json) |
| `GET` | `/api/v1/cache/stats` | 获取缓存统计信息 | [get_api_v1_cache_stats.json](get_api_v1_cache_stats.json) |

### default

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `GET` | `/` | Root | [get_.json](get_.json) |
| `GET` | `/health` | Health Check | [get_health.json](get_health.json) |

### global-stats

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `GET` | `/api/v1/stats/global/activity-trend` | 获取全局活动趋势 | [get_api_v1_stats_global_activity-trend.json](get_api_v1_stats_global_activity-trend.json) |
| `GET` | `/api/v1/stats/global/heatmap` | 获取全局热力图数据 | [get_api_v1_stats_global_heatmap.json](get_api_v1_stats_global_heatmap.json) |
| `GET` | `/api/v1/stats/global/summary` | 获取全局统计摘要 | [get_api_v1_stats_global_summary.json](get_api_v1_stats_global_summary.json) |
| `GET` | `/api/v1/stats/global/token-trend` | 获取全局Token使用趋势 | [get_api_v1_stats_global_token-trend.json](get_api_v1_stats_global_token-trend.json) |
| `GET` | `/api/v1/stats/global/top-users` | 获取Token使用量排行用户 | [get_api_v1_stats_global_top-users.json](get_api_v1_stats_global_top-users.json) |
| `GET` | `/api/v1/stats/global/top-users-v2` | 获取Token使用量排行用户（V2版本） | [get_api_v1_stats_global_top-users-v2.json](get_api_v1_stats_global_top-users-v2.json) |

### personal-stats

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `GET` | `/api/v1/stats/personal/bugs` | 获取个人Bug率统计 | [get_api_v1_stats_personal_bugs.json](get_api_v1_stats_personal_bugs.json) |
| `GET` | `/api/v1/stats/personal/code` | 获取个人代码统计 | [get_api_v1_stats_personal_code.json](get_api_v1_stats_personal_code.json) |
| `GET` | `/api/v1/stats/personal/dashboard` | 获取个人仪表板统计 | [get_api_v1_stats_personal_dashboard.json](get_api_v1_stats_personal_dashboard.json) |
| `GET` | `/api/v1/stats/personal/heatmap` | 获取个人提交热力图数据 | [get_api_v1_stats_personal_heatmap.json](get_api_v1_stats_personal_heatmap.json) |
| `GET` | `/api/v1/stats/personal/tokens` | 获取个人Token使用统计 | [get_api_v1_stats_personal_tokens.json](get_api_v1_stats_personal_tokens.json) |

### project-stats

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `GET` | `/api/v1/stats/projects/{project_id}` | 获取项目统计概览 | [get_api_v1_stats_projects_{project_id}.json](get_api_v1_stats_projects_{project_id}.json) |
| `GET` | `/api/v1/stats/projects/{project_id}/ai-adoption` | 获取项目AI采纳率趋势 | [get_api_v1_stats_projects_{project_id}_ai-adoption.json](get_api_v1_stats_projects_{project_id}_ai-adoption.json) |
| `GET` | `/api/v1/stats/projects/{project_id}/bug-trend` | 获取项目Bug趋势 | [get_api_v1_stats_projects_{project_id}_bug-trend.json](get_api_v1_stats_projects_{project_id}_bug-trend.json) |
| `GET` | `/api/v1/stats/projects/{project_id}/code-rank` | 获取项目代码量排行 | [get_api_v1_stats_projects_{project_id}_code-rank.json](get_api_v1_stats_projects_{project_id}_code-rank.json) |
| `GET` | `/api/v1/stats/projects/{project_id}/code-trend` | 获取项目代码趋势 | [get_api_v1_stats_projects_{project_id}_code-trend.json](get_api_v1_stats_projects_{project_id}_code-trend.json) |
| `GET` | `/api/v1/stats/projects/{project_id}/commit-rank` | 获取项目提交数排行 | [get_api_v1_stats_projects_{project_id}_commit-rank.json](get_api_v1_stats_projects_{project_id}_commit-rank.json) |
| `GET` | `/api/v1/stats/projects/{project_id}/dashboard` | 获取项目仪表板统计 | [get_api_v1_stats_projects_{project_id}_dashboard.json](get_api_v1_stats_projects_{project_id}_dashboard.json) |

### projects

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `GET` | `/api/v1/projects` | 获取项目列表 | [get_api_v1_projects.json](get_api_v1_projects.json) |
| `POST` | `/api/v1/projects` | 创建新项目 | [post_api_v1_projects.json](post_api_v1_projects.json) |
| `GET` | `/api/v1/projects/{project_id}` | 获取项目详情 | [get_api_v1_projects_{project_id}.json](get_api_v1_projects_{project_id}.json) |
| `PUT` | `/api/v1/projects/{project_id}` | 更新项目 | [put_api_v1_projects_{project_id}.json](put_api_v1_projects_{project_id}.json) |
| `DELETE` | `/api/v1/projects/{project_id}` | 删除项目 | [delete_api_v1_projects_{project_id}.json](delete_api_v1_projects_{project_id}.json) |
| `GET` | `/api/v1/projects/{project_id}/members` | 获取项目成员列表 | [get_api_v1_projects_{project_id}_members.json](get_api_v1_projects_{project_id}_members.json) |
| `POST` | `/api/v1/projects/{project_id}/members` | 添加项目成员 | [post_api_v1_projects_{project_id}_members.json](post_api_v1_projects_{project_id}_members.json) |
| `DELETE` | `/api/v1/projects/{project_id}/members/{member_id}` | 删除项目成员 | [delete_api_v1_projects_{project_id}_members_{member_id}.json](delete_api_v1_projects_{project_id}_members_{member_id}.json) |
| `PUT` | `/api/v1/projects/{project_id}/members/{member_id}` | 更新项目成员角色 | [put_api_v1_projects_{project_id}_members_{member_id}.json](put_api_v1_projects_{project_id}_members_{member_id}.json) |

### sync

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `POST` | `/api/v1/sync/gitlab` | 触发GitLab数据同步 | [post_api_v1_sync_gitlab.json](post_api_v1_sync_gitlab.json) |
| `GET` | `/api/v1/sync/logs` | 获取同步日志列表 | [get_api_v1_sync_logs.json](get_api_v1_sync_logs.json) |
| `GET` | `/api/v1/sync/status` | 获取同步系统状态 | [get_api_v1_sync_status.json](get_api_v1_sync_status.json) |
| `POST` | `/api/v1/sync/tasks` | 创建同步任务 | [post_api_v1_sync_tasks.json](post_api_v1_sync_tasks.json) |
| `GET` | `/api/v1/sync/tasks` | 获取同步任务列表 | [get_api_v1_sync_tasks.json](get_api_v1_sync_tasks.json) |
| `GET` | `/api/v1/sync/tasks/{task_id}` | 获取同步任务详情 | [get_api_v1_sync_tasks_{task_id}.json](get_api_v1_sync_tasks_{task_id}.json) |
| `POST` | `/api/v1/sync/tasks/{task_id}/cancel` | 取消同步任务 | [post_api_v1_sync_tasks_{task_id}_cancel.json](post_api_v1_sync_tasks_{task_id}_cancel.json) |
| `GET` | `/api/v1/sync/tasks/{task_id}/logs` | 获取同步任务日志 | [get_api_v1_sync_tasks_{task_id}_logs.json](get_api_v1_sync_tasks_{task_id}_logs.json) |
| `POST` | `/api/v1/sync/tasks/{task_id}/trigger` | 触发同步任务 | [post_api_v1_sync_tasks_{task_id}_trigger.json](post_api_v1_sync_tasks_{task_id}_trigger.json) |
| `POST` | `/api/v1/sync/trae` | 触发Trae数据同步 | [post_api_v1_sync_trae.json](post_api_v1_sync_trae.json) |
| `POST` | `/api/v1/sync/zendao` | 触发ZenTao数据同步 | [post_api_v1_sync_zendao.json](post_api_v1_sync_zendao.json) |

### users

| 方法 | 路径 | 描述 | 文件 |
|------|------|------|------|
| `GET` | `/api/v1/users` | Get Users | [get_api_v1_users.json](get_api_v1_users.json) |
| `POST` | `/api/v1/users` | Create User | [post_api_v1_users.json](post_api_v1_users.json) |
| `GET` | `/api/v1/users/me` | Get Current User Info | [get_api_v1_users_me.json](get_api_v1_users_me.json) |
| `PATCH` | `/api/v1/users/me` | Update Current User Profile | [patch_api_v1_users_me.json](patch_api_v1_users_me.json) |
| `POST` | `/api/v1/users/me/change-password` | Change Current User Password | [post_api_v1_users_me_change-password.json](post_api_v1_users_me_change-password.json) |
| `GET` | `/api/v1/users/me/projects` | Get Current User Projects | [get_api_v1_users_me_projects.json](get_api_v1_users_me_projects.json) |
| `GET` | `/api/v1/users/{user_id}` | Get User | [get_api_v1_users_{user_id}.json](get_api_v1_users_{user_id}.json) |
| `PUT` | `/api/v1/users/{user_id}` | Update User | [put_api_v1_users_{user_id}.json](put_api_v1_users_{user_id}.json) |
| `DELETE` | `/api/v1/users/{user_id}` | Delete User | [delete_api_v1_users_{user_id}.json](delete_api_v1_users_{user_id}.json) |

## 统计信息

- **总接口数**: 57
- **Tag 分类数**: 9
- **分类**: authentication, cache, default, global-stats, personal-stats, project-stats, projects, sync, users
