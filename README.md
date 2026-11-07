# CrossFlow CRM

本仓库是单用户、仅限本机运行的 CRM，采用 Next.js 16 前端与 Python 3.12 FastAPI 后端的 Monorepo 结构。

> **安全边界：** 当前没有认证、权限和多租户隔离。只能在本机使用虚构演示数据；禁止公网部署或录入真实客户信息。

## 目录

```text
apps/web       Next.js 页面、样式、API Client 与生成类型
apps/api       FastAPI、SQLAlchemy 2、Alembic、pytest
docs           架构、API 契约、迁移和任务记录
scripts        Windows / POSIX 本地开发入口
data           本地 SQLite（Git 忽略）
```

## 环境

- Node.js 24+
- npm 11+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## 启动

首次初始化：

```powershell
npm --prefix apps/web ci
uv sync --project apps/api
```

Windows 一键启动前后端：

```powershell
.\scripts\dev.ps1
```

Linux / macOS：

```bash
./scripts/dev.sh
```

Web：`http://127.0.0.1:3000`

API：`http://127.0.0.1:8000`

API 文档：`http://127.0.0.1:8000/docs`

## 验证

前端（必须串行，避免 Next typegen 与 build 同时写 `.next`）：

```powershell
npm --prefix apps/web test
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
```

后端：

```powershell
uv run --project apps/api pytest apps/api/tests
uv run --project apps/api ruff check apps/api
```

## 数据库

运行时数据库路径由 `CRM_DATABASE_PATH` 指定，默认 `data/crm.sqlite`。数据库不会提交，旧数据迁移和回滚步骤见 `docs/migration.md`。

## 文档

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/migration.md`
- `docs/tasks/fastapi-monorepo-progress.md`
