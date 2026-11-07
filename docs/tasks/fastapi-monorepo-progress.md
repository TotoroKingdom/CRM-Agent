# FastAPI Monorepo 重构进度

开始日期：2026-11-07（Asia/Shanghai）  
目标分支：`refactor/fastapi-monorepo`  
基线提交：`b0c3928`（`origin/main`）

## 总体状态

| Gate | 状态 | 说明 |
|---|---|---|
| G0 审计与契约基线 | PASS | 旧测试/类型检查/构建与 HTTP 契约已采集；数据库未修改 |
| G1 Monorepo 骨架与前端迁移 | PASS | Next 页面/资源无损迁移；FastAPI 健康检查通过 |
| G2 FastAPI 完整替换 | PENDING | |
| G3 数据保全、Seed 与业务闭环 | PENDING | |
| G4 规范、交付与 PR | PENDING | |

状态含义：`PASS` 表示有本机实测证据；`PARTIAL` 表示部分路径未验证；`BLOCKED` 表示环境或权限阻塞；不得把未执行项目写成通过。

## G0 基线证据

执行目录：`C:\AI\CRM-Agent\crm-overnight-mvp`。按顺序执行：

| 命令 | 结果 |
|---|---|
| `npm test` | PASS；3 个测试文件，10/10 tests |
| `npm run typecheck` | PASS；Next typegen + `tsc --noEmit` |
| `npm run build` | PASS；Next.js 16.4.5，10 个页面/路由条目 |

只读 HTTP 烟测：

- `GET /api/dashboard`：`200`，24 leads、8 active deals、121600000 分、1 条今日待办、2 条逾期。
- `GET /api/leads`：`200`，24 条记录。
- `GET /api/leads?status=WECHAT`：`400`，`{"error":"输入校验失败","fields":{...}}`。
- `GET /api/leads/not-there`：`404`，`{"error":"线索不存在"}`。
- `POST /api/leads` 非法 JSON：`400`，`{"error":"请求内容不是有效 JSON"}`。
- 未执行写请求；用户数据库未被修改。

## G1 证据

- 使用 `git mv` 将 Next.js 页面、组件、样式、测试和配置迁移到 `apps/web`。
- 原 README、PROGRESS、FINAL_REPORT 归档到 `docs/archive/legacy-crm/`，保留历史记录。
- 旧 SQLite 数据目录和日志仍在 `crm-overnight-mvp/` 原路径，未删除、未修改。
- 建立根 `.gitignore`，不再忽略 `AGENTS.md`；忽略 Node/Python 产物、本地数据库、日志和 IDE 文件。
- 建立根、`apps/web`、`apps/api` 三份 `AGENTS.md`，以及根 README 和初始开发脚本。
- 使用 `uv` 创建 Python 3.12.13 虚拟环境；FastAPI 最小骨架提供 `/health` 与 `/openapi.json`。

本 Gate 实测：

| 命令/检查 | 结果 |
|---|---|
| `npm ci`（`apps/web`） | PASS；63 packages |
| `npm test` | PASS；3 files，10/10 tests |
| `npm run typecheck` | PASS |
| `npm run build` | PASS；Next.js 16.4.5 |
| `uv sync --project apps/api --python 3.12` | PASS；Python 3.12.13 |
| `uv run --project apps/api pytest apps/api/tests` | PASS；1/1 |
| `uv run --project apps/api ruff check apps/api` | PASS |
| 独立启动 uvicorn 后 `GET /health` | `200 {"status":"ok"}` |
| `GET /openapi.json` | `200`，title 为 `CrossFlow CRM API` |

此时 Next 旧 Route Handlers 仍保留，作为 G2 删除前的回退路径；浏览器尚未切换到 FastAPI。

数据库快照：

- 路径：`crm-overnight-mvp/data/crm.sqlite`。
- 大小：81920 bytes。
- SHA-256：`4f264eac4173674905dda14e0953656125b00bb6d53ba296428121e1823293b7`。G3 迁移前后重新测量并比对。
- 表：`leads`、`deals`、`activities`、`followup_tasks`。
- 条数：24 / 10 / 20 / 12。
- `PRAGMA integrity_check`：`ok`。
- `PRAGMA foreign_key_check`：空。
- 用户库被 `.gitignore` 忽略，不进入提交。

## 工作区保护

开始时 `main` 的已跟踪文件干净，存在以下未跟踪内容：

- `.idea/`
- `CRM-Agent-Codex-FastAPI-Monorepo-Task.md`
- `crm-overnight-mvp/dev-20261107-173917.err.log`
- `crm-overnight-mvp/dev-20261107-173917.out.log`

处理原则：不删除、不覆盖、不提交 IDE 配置；旧 SQLite 始终保留在原路径，迁移只读取原库并在新路径创建经校验的副本。

## 已知风险

| 风险 | 缓解 |
|---|---|
| PATCH 省略与显式 null 混淆 | 使用 Pydantic `model_fields_set`，增加契约测试 |
| FastAPI 默认 422 泄漏 | 全局异常处理器统一映射为 400 + `fields` |
| 旧数据时间字符串被重写 | 旧库用字符串字段读取；迁移后逐值比对 |
| 北京时间统计偏差 | 使用 `zoneinfo.ZoneInfo("Asia/Shanghai")` 计算日边界并测试 |
| 自动 Seed 覆盖/重复 | 删除启动时 Seed；仅提供显式幂等 CLI |
| 原数据库被误改 | 迁移脚本只读 source；先备份；目标存在时默认拒绝 |
| Python 3.12 环境缺失 | 使用仓库内 `uv` 管理虚拟环境，CI 固定 Python 3.12 |

## 计划提交

每个 Gate 至少一个可解释的 commit。最终 PR 指向 `main`，不自动合并。
