## 项目概述

基于 Vue 3 + FastAPI 的全栈应用。

## 项目结构

```
my-project/
├── database/                 # 需求、设计和原型
├── frontend/                 # Vue 3 前端
│   ├── src/
│   │   ├── api/             # API 接口定义
│   │   ├── components/      # 公共组件
│   │   ├── composables/     # 组合式函数
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── styles/          # 全局样式
│   │   ├── types/           # TypeScript 类型
│   │   ├── utils/           # 工具函数
│   │   └── views/           # 页面视图
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # 支持文档
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── api/             # API 路由
│   │   ├── core/            # 核心配置
│   │   ├── db/              # 数据库模型和连接
│   │   ├── models/          # Pydantic 模型
│   │   ├── schemas/         # 数据验证模式
│   │   ├── services/        # 业务逻辑
│   │   └── utils/           # 工具函数
│   ├── migrations/          # 数据库迁移
│   ├── tests/               # 测试文件
│   ├── pyproject.toml
│   └── main.py
├── mock_server/              # 模拟 Trae/GitLab/禅道 API
├── docker-compose.yml        # 本地开发环境
└── CLAUDE.md                 # 项目配置
```

## 技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|----------|
| 前端框架 | Vue 3 | Composition API |
| 前端语言 | TypeScript | 严格模式 |
| UI 库 | Element Plus | - |
| 图表 | ECharts 5 | - |
| 状态管理 | Pinia | - |
| 构建工具 | Vite 5 | - |
| 后端框架 | FastAPI | Python 3.11+ |
| ORM | SQLAlchemy 2.0 | 异步 |
| 数据库 | PostgreSQL 15 | 主库 |
| 缓存 | Redis 7 | 会话/缓存 |
| 迁移 | Alembic | - |

## 命名规范

### 前端
- 组件: PascalCase (`UserProfile.vue`)
- 组合式函数: `use` 前缀 (`useAuth.ts`)
- 类型接口: `I` 前缀 (`IUser`)
- API 函数: 模块组织，统一错误处理

### 后端
- 路由: 按资源分组，版本控制 (`/api/v1/...`)
- 依赖注入: FastAPI Depends
- 数据库: 异步会话管理
- 错误处理: 统一异常处理器

## 常用命令

```bash
# Docker
docker-compose up -d     # 启动数据库
docker-compose down      # 停止服务

# 前端
cd frontend && npm run dev      # 开发服务器
cd frontend && npm run type-check  # TypeScript 检查

# 后端
cd backend && uvicorn app.main:app --reload  # 启动服务
cd backend && pytest                          # 运行测试
cd backend && alembic upgrade head            # 执行迁移
```

## API 开发规范

### 字段命名
- **前端**: camelCase (`refreshToken`, `createdAt`)
- **后端**: snake_case (`refresh_token`, `created_at`)
- **转换**: HTTP 拦截器自动处理，业务代码不手动转换

### HTTP 拦截器配置
```typescript
// frontend/src/utils/request.ts
import { camelizeKeys, decamelizeKeys } from 'humps'

// 请求: camelCase → snake_case
service.interceptors.request.use((config) => {
  if (config.data) config.data = decamelizeKeys(config.data)
  if (config.params) config.params = decamelizeKeys(config.params)
  return config
})

// 响应: snake_case → camelCase
service.interceptors.response.use((response) => {
  if (response.data) response.data = camelizeKeys(response.data)
  return response
})
```

### API 评审检查清单
- [ ] 请求方法一致性 (GET/POST/PUT/DELETE)
- [ ] 请求路径一致性
- [ ] 参数命名一致性（依赖拦截器自动转换）
- [ ] 响应数据结构一致性
- [ ] 错误处理格式一致性
- [ ] TypeScript 类型检查通过

## 数据库规范

### 禁止使用的 SQLite 特有函数
| 禁止 | 替代方案 | 用途 |
|------|---------|------|
| `func.julianday()` | `extract('epoch', col)` | 时间差计算 |
| `func.date('now')` | `func.now()` | 当前时间 |
| `func.strftime()` | `func.to_char()` | 日期格式化 |

### 日期计算标准写法
```python
from sqlalchemy import extract

# 计算时间差（小时）
avg_seconds = func.avg(
    extract('epoch', end_col) - extract('epoch', start_col)
).label("avg_seconds")
avg_hours = avg_seconds / 3600
```

### 兼容性检查清单
- [ ] 本地使用 PostgreSQL（docker-compose）
- [ ] 避免数据库特定函数
- [ ] 复杂查询先在 PostgreSQL 验证

## 主题样式规范

### Element Plus 变量映射

| Element Plus | 科技风变量 |
|--------------|-----------|
| `--el-bg-color*` | `--tech-bg-*` |
| `--el-text-color*` | `--tech-text-*` |
| `--el-border-color*` | `--tech-border-*` |
| `--el-fill-color*` | `--tech-bg-*` |
| `--el-color-primary` | `--tech-cyan` |
| `--el-color-success` | `--tech-green` |
| `--el-color-warning` | `--tech-orange` |
| `--el-color-danger` | `--tech-red` |

### 关键覆盖点
- **ElSkeleton**: `.el-skeleton__item` 背景设为青色渐变
- **ElEmpty**: `background: transparent`，设置描述文字颜色
- **ElTable**: 覆盖表头背景和文字颜色
- **卡片容器**: 添加 `backdrop-filter: blur(10px)`

## E2E 测试数据构建流程

### 前置条件
1. 启动数据库: `docker-compose up -d`
2. 启动后端服务: `cd backend && uvicorn app.main:app --reload`
3. 执行数据库迁移: `cd backend && alembic upgrade head`

### 构建命令
```bash
cd backend

# 生成 E2E 测试数据（首次执行）
python scripts/seed_e2e_data.py

# 重新生成（清空后重建）
python scripts/seed_e2e_data.py --clear

# 仅清空数据
python scripts/seed_e2e_data.py --clear-only
```

### 生成的数据
| 数据类型 | 数量 | 说明 |
|----------|------|------|
| 用户 | 10个 | admin/developer/tester/pm等 |
| 项目 | 5个 | 不同stage(active/archived) |
| 代码提交 | 200+条 | 最近30天 |
| Token使用 | 240+条 | 最近30天 |
| Bug记录 | 40+条 | 按项目分布 |
| 同步任务 | 10个 | 含日志 |

### 测试账号
所有账号密码均为: `password123`
- admin (管理员)
- developer (开发者)
- tester (测试人员)
- pm (项目经理)
- zhangsan/lisi/wangwu/zhaoliu/testuser

### 数据关联关系
```
User → Role
User → ProjectMember → Project
User → CodeCommit → Project
User → TokenUsage → Project
User → BugRecord
Project → DataSource (GitLab + ZenDao)
SyncTask → SyncLog
```

---

## 开发检查清单

### 提交前检查
- [ ] `npm run type-check` 通过
- [ ] `mypy app` 通过
- [ ] `ruff check .` 无错误
- [ ] 单元测试通过

### API 修改检查
- [ ] 前后端字段命名符合规范
- [ ] 请求/响应类型定义更新
- [ ] 拦截器能正确处理新字段

### 数据库修改检查
- [ ] 不使用 SQLite 特有函数
- [ ] 迁移脚本已生成并测试
- [ ] 日期/时间计算使用标准函数

### 前端样式检查
- [ ] 使用 Element Plus 变量而非硬编码
- [ ] 深色主题下组件显示正常
- [ ] 响应式布局测试通过

### E2E 测试检查
- [ ] 数据已生成: `python scripts/seed_e2e_data.py`
- [ ] 后端服务运行中
- [ ] 前端服务运行中
- [ ] 测试账号可正常登录
