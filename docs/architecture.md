# 架构

## 目标

在保留现有 CRM 页面、视觉、路由和业务规则的前提下，将浏览器数据访问从 Next.js Route Handlers + `node:sqlite` 迁移到 Python FastAPI 后端，并保持本地单用户、低复杂度运行方式。

## 组件

```text
┌──────────────────────────────┐
│ Browser                      │
│ React 19 / Next.js 16        │
└──────────────┬───────────────┘
               │ same-origin /api/*
┌──────────────▼───────────────┐
│ apps/web                     │
│ App Router pages             │
│ typed API client             │
│ next.config rewrite          │
└──────────────┬───────────────┘
               │ 127.0.0.1:8000
┌──────────────▼───────────────┐
│ apps/api                     │
│ routes → services            │
│ services → repositories      │
│ repositories → SQLAlchemy    │
└──────────────┬───────────────┘
               │ sqlite3
┌──────────────▼───────────────┐
│ data/crm.sqlite              │
└──────────────────────────────┘
```

## 前端

- `src/app`：页面与全局样式；路由和 UI 结构保持迁移前状态。
- `src/components`：展示组件和表单。
- `src/lib/api/client.ts`：唯一 HTTP 数据访问入口，抛出带 `status/fields` 的 `ApiError`。
- `src/lib/types.ts`：从生成 OpenAPI 类型导出 DTO，并保留页面所需的运行时枚举与中文标签。
- `src/generated/api.ts`：`openapi-typescript` 生成文件，不可手改。
- `next.config.ts`：把同源 `/api/:path*` 代理到 `API_INTERNAL_URL`。

浏览器保持同源调用，因此本地开发不需要 CORS，也不需要把 API 地址写进页面。

## 后端

### Routes

`app/api/routes` 只处理 HTTP 参数、依赖、状态码和响应 envelope。资源为 dashboard、leads、deals、tasks，lead activities 挂在 lead 下。

### Schemas

`app/schemas` 使用 Pydantic v2 和 camelCase alias。请求模型负责长度、枚举、金额、ISO 时间和可空性校验；响应模型是 OpenAPI 契约真源。

### Services

`app/services/crm.py` 承载业务规则和事务提交：

- Lead 搜索、过滤、更新、删除。
- Deal 排序、阶段与金额更新。
- Task open/done/overdue/all 规则和完成时间。
- Dashboard 北京时间日界线、KPI 和最近对象。
- 对象不存在时抛出领域异常。

### Repositories

`app/repositories/crm.py` 只负责 SQLAlchemy 查询和持久化，不生成 HTTP 响应。Lead 列表使用关联子查询计算 `dealCount` 和 `openTaskCount`，避免多表 JOIN 放大计数。

### Models / DB

四张表保持旧字段名和约束：

- `leads`
- `deals`
- `activities`
- `followup_tasks`

金额为整数分，时间为 UTC ISO 字符串，外键 `ON DELETE CASCADE`，每个 SQLite 连接启用 `PRAGMA foreign_keys = ON`。

## 契约和错误

- 成功：`{"data": ...}`。
- 失败：`{"error": "..."}`；字段错误增加 `fields`。
- 请求校验统一映射为 `400`，不暴露 FastAPI 默认 `422/detail`。
- 缺失对象映射为 `404`，未预期异常映射为 `500`。
- PATCH 使用 `exclude_unset`，区分“未提供”和显式 `null`。

## 数据生命周期

- Alembic 管理 schema；空库通过 `upgrade head` 初始化。
- 正常应用启动不 Seed。
- 显式 Seed 幂等，只在全空库执行。
- 旧库迁移读取只读 source，创建备份、staging、逐行校验和 manifest，再原子替换 target。
- 原旧库不删除；回滚通过数据库备份而不是 Alembic downgrade。

## 测试策略

- 后端 pytest：路由契约、错误映射、PATCH 语义、Dashboard 北京时间、持久化、级联删除、迁移、回滚、Seed。
- 前端 Vitest：API client URL/方法/JSON/错误 envelope，以及北京时间格式化。
- 前端 typecheck/build：保证生成类型和页面集成可编译。
- CI：前端串行 checks、后端 Ruff/pytest、OpenAPI 生成漂移检查。

## 有意不做

- 不引入 Nx/Turborepo、微服务、Redis、Celery、异步 ORM 或复杂 DI。
- 不做认证、多租户、公网部署、真实第三方集成。
- 不重写 UI 或替换设计系统。
- 不运行浏览器 E2E；如未来需要，必须另行授权并明确验收证据。
