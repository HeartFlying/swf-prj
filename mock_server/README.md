# Mock Server

独立的Mock Server，模拟GitLab、禅道(ZenTao)、Trae的外部API。

## 架构

```
mock_server/
├── main.py                     # FastAPI入口，运行在8001端口
├── config.py                   # 配置
├── routers/
│   ├── gitlab.py              # GitLab API路由
│   ├── zendao.py              # 禅道API路由
│   └── trae.py                # Trae API路由
├── data_generators/
│   ├── __init__.py
│   ├── gitlab_generator.py    # GitLab数据生成
│   ├── zendao_generator.py    # 禅道数据生成
│   └── trae_generator.py      # Trae数据生成
└── requirements.txt
```

## 快速开始

### 1. 安装依赖

```bash
cd mock_server
pip install -r requirements.txt
```

### 2. 启动Mock Server

```bash
# 使用uvicorn启动
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# 或者直接运行main.py
python main.py
```

### 3. 验证服务

访问 http://localhost:8001/ 查看服务状态

访问 http://localhost:8001/docs 查看Swagger API文档

## API端点

### GitLab Mock (前缀: /api/v4)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/projects/{project_id}/repository/commits` | 获取提交记录列表 |
| GET | `/projects/{project_id}/merge_requests` | 获取MR列表 |
| GET | `/projects/{project_id}/members` | 获取成员列表 |

**查询参数:**
- `since`, `until`: 日期筛选 (ISO 8601格式)
- `state`: MR状态筛选 (opened, closed, merged)
- `per_page`: 每页数量 (默认20, 最大100)
- `page`: 页码 (默认1)

### 禅道 Mock (前缀: /api/v1/zendao)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/bugs` | 获取Bug列表 |
| GET | `/bugs/{bug_id}` | 获取Bug详情 |
| GET | `/tasks` | 获取任务列表 |
| GET | `/tasks/{task_id}` | 获取任务详情 |

**查询参数:**
- `product_id`: 按产品筛选
- `project_id`: 按项目筛选
- `status`: 状态筛选
- `severity`: Bug严重程度筛选 (1-4)
- `per_page`: 每页数量
- `page`: 页码

### Trae Mock (前缀: /api/v1/trae)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/token-usage` | 获取Token使用数据 |
| GET | `/token-usage/summary` | 获取Token使用汇总统计 |
| GET | `/ai-suggestions` | 获取AI建议数据 |
| GET | `/ai-suggestions/{suggestion_id}` | 获取AI建议详情 |
| GET | `/ai-suggestions/stats` | 获取AI建议统计 |

**查询参数:**
- `user_id`: 按用户筛选
- `start_date`, `end_date`: 日期范围筛选
- `model`: 按AI模型筛选
- `suggestion_type`: 建议类型筛选
- `status`: 状态筛选
- `per_page`: 每页数量
- `page`: 页码

## 测试调用示例

### GitLab API

```bash
# 获取提交记录
curl http://localhost:8001/api/v4/projects/1/repository/commits

# 获取MR列表
curl http://localhost:8001/api/v4/projects/1/merge_requests

# 获取成员列表
curl http://localhost:8001/api/v4/projects/1/members

# 带日期筛选
curl "http://localhost:8001/api/v4/projects/1/repository/commits?since=2024-01-01T00:00:00Z"
```

### 禅道 API

```bash
# 获取Bug列表
curl http://localhost:8001/api/v1/zendao/bugs

# 按状态筛选
curl "http://localhost:8001/api/v1/zendao/bugs?status=active"

# 获取任务列表
curl http://localhost:8001/api/v1/zendao/tasks
```

### Trae API

```bash
# 获取Token使用数据
curl http://localhost:8001/api/v1/trae/token-usage

# 获取汇总统计
curl http://localhost:8001/api/v1/trae/token-usage/summary

# 获取AI建议
curl http://localhost:8001/api/v1/trae/ai-suggestions

# 获取统计信息
curl http://localhost:8001/api/v1/trae/ai-suggestions/stats
```

## 后端集成客户端

后端应用通过HTTP客户端调用Mock Server。

### 使用示例

```python
from app.integrations.gitlab import GitLabClient
from app.integrations.zendao import ZenTaoClient
from app.integrations.trae import TraeClient

# GitLab
async with GitLabClient() as client:
    commits = await client.get_commits(project_id=1)
    mrs = await client.get_merge_requests(project_id=1)
    members = await client.get_members(project_id=1)

# ZenTao
async with ZenTaoClient() as client:
    bugs = await client.get_bugs()
    tasks = await client.get_tasks()
    bug_stats = await client.get_bug_stats()

# Trae
async with TraeClient() as client:
    token_usage = await client.get_token_usage()
    suggestions = await client.get_ai_suggestions()
    productivity = await client.get_developer_productivity()
```

### 环境变量

```bash
# Mock Server URL (后端连接用)
export MOCK_SERVER_URL=http://localhost:8001

# API认证令牌 (可选)
export GITLAB_TOKEN=your_gitlab_token
export ZENDAO_TOKEN=your_zendao_token
export TRAE_API_KEY=your_trae_api_key
```

## 数据生成

使用Faker库生成随机但真实的数据:

- **GitLab**: 提交信息、MR、成员
- **ZenTao**: Bug、任务
- **Trae**: Token使用记录、AI建议

数据生成器支持:
- 合理的数值范围
- 日期范围筛选
- 状态过滤
- 分页支持

## 配置

在 `config.py` 中修改配置:

```python
HOST = "0.0.0.0"      # 监听地址
PORT = 8001           # 监听端口
DEFAULT_COMMITS_COUNT = 50
DEFAULT_MR_COUNT = 20
DEFAULT_MEMBERS_COUNT = 10
DEFAULT_BUGS_COUNT = 30
DEFAULT_TASKS_COUNT = 40
```

## Docker运行

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

构建并运行:
```bash
docker build -t mock-server .
docker run -p 8001:8001 mock-server
```
