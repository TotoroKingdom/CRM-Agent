# CrossFlow CRM

单用户、仅限本机运行的 CRM。前端为 Next.js 16 App Router，后端为 Python 3.12 FastAPI + SQLAlchemy 2 + Alembic，采用适度拆分的 Monorepo。

> **安全边界：** 当前没有认证、权限或多租户隔离。只能在本机使用虚构演示数据；禁止公网部署、接入真实客户数据或真实外部 CRM/消息服务。

## 结构

```text
apps/web       Next.js 页面、样式、API Client、OpenAPI 生成类型
apps/api       FastAPI、SQLAlchemy、Alembic、pytest、迁移/Seed 工具
docs           架构、API 契约、迁移和任务记录
scripts        Windows / Linux / macOS 本地启动入口
data           本地 SQLite 与备份（Git 忽略）
```

请求链路：

```text
浏览器 → Next.js :3000 → /api/* rewrite → FastAPI :8000 → SQLite
```

浏览器不直接连接 SQLite，也不保存后端数据库代码。

## 环境

- Node.js 24+
- npm 11+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## 快速启动

首次安装依赖：

```powershell
npm --prefix apps/web ci
uv sync --project apps/api --python 3.12
```

Windows：

```powershell
.\scripts\dev.ps1
```

Linux / macOS：

```bash
./scripts/dev.sh
```

脚本会：

1. 缺失依赖时安装 Node/Python 依赖。
2. 对 `data/crm.sqlite` 执行幂等 `alembic upgrade head`。
3. 启动 API `http://127.0.0.1:8000`。
4. 启动 Web `http://127.0.0.1:3000`。
5. 退出时停止后台 API。

API 文档：`http://127.0.0.1:8000/docs`。

脚本不会自动 Seed。空库需要显式执行：

```powershell
uv run --project apps/api python -m app.scripts.seed --database data/crm.sqlite
```

Seed 只在四张表全空时写入虚构数据；重复执行会跳过。应用启动不会自动注入数据。

## 配置

可从 `.env.example` 创建本机 `.env`：

- `CRM_DATABASE_PATH`：默认 `./data/crm.sqlite`。
- `API_INTERNAL_URL`：Next 服务端 rewrite 地址，默认 `http://127.0.0.1:8000`。
- `NEXT_PUBLIC_API_BASE_URL`：通常留空，浏览器走同源 `/api/*`。

启动脚本读取根 `.env`，但不会覆盖已经存在的进程环境变量。

## 独立启动

API：

```powershell
$env:CRM_DATABASE_PATH = "data/crm.sqlite"
uv run --project apps/api alembic -c apps/api/alembic.ini upgrade head
uv run --project apps/api uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```

Web：

```powershell
$env:API_INTERNAL_URL = "http://127.0.0.1:8000"
npm --prefix apps/web run dev
```

## 八组 API

| 路径 | 方法 |
|---|---|
| `/api/dashboard` | GET |
| `/api/leads` | GET, POST |
| `/api/leads/{id}` | GET, PATCH, DELETE |
| `/api/leads/{id}/activities` | GET, POST |
| `/api/deals` | GET, POST |
| `/api/deals/{id}` | PATCH |
| `/api/tasks` | GET, POST |
| `/api/tasks/{id}` | PATCH |

成功响应为 `{"data": ...}`；失败为 `{"error": "..."}`，字段错误附加 `fields`。兼容细节见 `docs/api-contract.md`。

## 数据库

- 运行时数据库默认 `data/crm.sqlite`，不提交 Git。
- 旧库保留在 `crm-overnight-mvp/data/crm.sqlite`，迁移只读原库。
- 旧库副本迁移、备份、逐行校验和回滚见 `docs/migration.md`。
- 不要使用 `alembic downgrade` 作为业务回滚；使用数据库备份。

## 测试与检查

前端必须串行执行，避免 Next type generation 与构建并发写 `.next`：

```powershell
npm --prefix apps/web test
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
```

后端：

```powershell
uv run --project apps/api ruff format --check apps/api
uv run --project apps/api ruff check apps/api
uv run --project apps/api pytest apps/api/tests
```

## OpenAPI 契约

FastAPI OpenAPI 是机器可读真源：

```powershell
uv run --project apps/api python -m app.scripts.export_openapi
npm --prefix apps/web run generate:api
```

生成文件：

- `apps/api/openapi.json`
- `apps/web/src/generated/api.ts`

不要手改生成文件。CI 会校验两者与后端代码一致。

## 故障排查

- `no such table`：运行 `uv run --project apps/api alembic -c apps/api/alembic.ini upgrade head`。
- 端口占用：停止占用 `3000` 或 `8000` 的进程，或临时改端口和 `API_INTERNAL_URL`。
- Web 请求 `/api/*` 返回 502：确认 API 已启动，且 `API_INTERNAL_URL` 指向 `127.0.0.1:8000`。
- 旧库直接执行 Alembic 报“table already exists”：不要 stamp；按 `docs/migration.md` 迁移到新目标。
- `data/crm.sqlite` 被占用：停止 API/Web 后再执行迁移或回滚。
- `uv` 未找到：安装 uv 后重新执行 `uv sync --project apps/api --python 3.12`。

## 文档

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/migration.md`
- `docs/tasks/fastapi-monorepo-progress.md`
- `docs/archive/legacy-crm/`：迁移前的历史报告

## 已知限制

没有认证、权限、多租户、真实消息发送或第三方 CRM 集成。未执行浏览器 E2E、Computer Use、负载测试、公网部署或生产数据库迁移。
