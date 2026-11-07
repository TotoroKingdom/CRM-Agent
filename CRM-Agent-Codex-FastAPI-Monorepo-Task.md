# Codex 执行任务：CRM-Agent 前后端分离与 AI-Friendly Monorepo 重构

## 你的身份和执行要求

你是本仓库的主执行 Codex Agent。**现在开始实际开发，不要仅输出方案或等待下一步指令**。先审计代码、列出基线，再在独立分支实施，每个阶段完成即可自行继续下一阶段。目标是保留已完成的 CRM 业务和前端 UI，同时把后端改为 FastAPI，建立方便后续多 Agent 协作的清晰项目目录及工程规范。

开工前先执行 `git status --short --branch`、检查当前分支和未提交修改；若存在用户改动则保护原样，使用独立 worktree/分支。基于最新 `origin/main` 创建 `refactor/fastapi-monorepo`，不直接修改 main，不强推、不清理用户数据库。若工作区无法访问，先排查仓库路径、当前执行环境、Git remote，不要误报已执行。

## 已审计的现有代码（执行前重新核对）

- 默认分支：`main`，源码集中在 `crm-overnight-mvp/`；仓库根目录仅有原任务计划和该项目目录。
- 技术：Next.js 16.4.5 / React 19 / TypeScript / Zod / Vitest；Node.js 24 原生 `node:sqlite`，数据位于 `crm-overnight-mvp/data/crm.sqlite`（Git 忽略）。
- UI 页面：Dashboard `/`、Leads `/leads`、Lead Details `/leads/[id]`、Pipeline `/pipeline`、Tasks `/tasks`。现有视觉布局与行为应保留。
- 后端代码：`src/app/api/**/route.ts`、`src/lib/db/{schema,database,repository,server,seed}.ts`、`src/lib/validation/schemas.ts`。
- 数据表：`leads`、`deals`、`activities`、`followup_tasks`；使用外键及级联删除；金额 `amount_cents` 整数分；业务时间存 UTC ISO，Dashboard 的今日任务使用 `Asia/Shanghai` 自然日。
- 旧 README 和 FINAL_REPORT 记录了 10 个测试通过，这是**历史记录**，迁移后必须重新执行并提供新的测试结果。
- 旧 `.gitignore` 忽略了 `AGENTS.md`，必须修复，提交根及模块级 AGENTS 指令。
- **安全边界：** 当前无认证、无租户隔离，仅限 localhost 的虚构演示数据，绝不能直接公网部署。

## 目标目录（保持适度简洁，不要为了架构而架构）

```text
CRM-Agent/
├── AGENTS.md                    # AI Agent 协作准则：必须被 Git 跟踪
├── README.md                    # 根目录唯一启动入口
├── .gitignore
├── .env.example
├── .github/workflows/ci.yml
├── apps/
│   ├── web/
│   │   ├── AGENTS.md
│   │   ├── src/app/              # 原 Next 页面 + CSS
│   │   ├── src/components/       # 保留现有组件
│   │   ├── src/lib/              # 前端 fetch client、纯展示类型/工具
│   │   ├── src/generated/        # OpenAPI 自动生成的 TS API 类型
│   │   ├── src/tests/
│   │   ├── package.json
│   │   └── next.config.ts
│   └── api/
│       ├── AGENTS.md
│       ├── pyproject.toml         # Python 3.12+、FastAPI、SQLAlchemy2、Pydantic2、Alembic、pytest、Ruff
│       ├── alembic.ini
│       ├── alembic/versions/
│       ├── app/
│       │   ├── main.py
│       │   ├── core/              # 配置、统一异常、时区
│       │   ├── api/routes/        # dashboard, leads, deals, activities, tasks
│       │   ├── schemas/          # Pydantic 请求/响应契约
│       │   ├── models/           # SQLAlchemy ORM
│       │   ├── repositories/     # 持久化查询
│       │   ├── services/         # CRM 业务规则
│       │   ├── db/               # Engine、Session、迁移管理
│       │   └── scripts/          # 显式 Seed、备份和旧 DB 迁移
│       └── tests/
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   ├── migration.md
│   └── tasks/fastapi-monorepo-progress.md
├── scripts/dev.ps1              # Windows 本地开发入口
├── scripts/dev.sh               # Linux/macOS 开发入口
└── data/                         # SQLite 数据；忽略 Git
```

按复杂度保留必要层次，不要引入 Nx/Turborepo、Redis、Celery、微服务、异步数据库驱动、复杂 DI 容器或新的业务模块。跨语言契约以 FastAPI OpenAPI 为真源，自动生成 TypeScript 类型；不要在两个语言中手动重复维护大量 DTO。

## 兼容性清单（P0，全部必需）

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

- 外部响应保留 `{ "data": ... }`；错误保留 `{ "error": "..." }`，校验错误按当前结构返回 `fields`；保留 201/400/404 等主要状态码，避免直接暴露 FastAPI 默认 `detail`/422 给前端。
- 对象字段保持 camelCase：`leadId`、`amountCents`、`expectedCloseAt`、`createdAt`、`completedAt`、`dealCount` 等。枚举值和页面文案含义不变。
- Leads：搜索、状态/渠道筛选、增改删、子对象级联；Lead Details 包含 activities/deals/tasks。
- Deals：六阶段、金额整数分、预期关闭时间、编辑阶段。
- Tasks：open/done/overdue/all、标记完成与恢复、到期时间。
- Dashboard：线索数、在途商机数、金额合计、北京时间今日待办和逾期数，及最近活动/商机/任务。
- Patch：区分属性缺省和显式 `null`；遵守旧校验边界和错误映射。
- **UI 原样优先**：禁止重建 UI、替换设计系统、改路由；仅调整读取 API 和不再准确的技术说明。

## 分阶段实现（每个 Gate 都要提交）

### G0：只读审计与契约基线
1. 核对 `main` 当前文件、README、四张表的 DDL、八组 API 的输入输出及原有测试；保留原有测试结果，顺序运行 `npm test` → `npm run typecheck` → `npm run build`，不可并行 Next 的 typegen 与 build。
2. 编写 `docs/api-contract.md`，建立 API 返回结构/状态码基线，并识别业务边界与可能不一致之处。
3. 创建 `docs/tasks/fastapi-monorepo-progress.md`，记录风险、进度、基线提交和状态。

**Gate：** 文档可复现，用户文件/数据库未被覆盖。

### G1：Monorepo 骨架与前端无损迁移
1. 用 `git mv` 为主将 Next 项目整理到 `apps/web/`，根 README/ignore、`AGENTS.md`、脚本就位。
2. 先确保既有页面和资源仍可构建；保留现有 CSS/交互，不进行视觉重构。
3. 创建 FastAPI 最小可启动骨架与 `/health`、`/openapi.json`。

**Gate：** Next 页面路由、样式、类型检查和构建正常，FastAPI 单独启动健康检查通过。

### G2：FastAPI 完整替换 Next API
1. 使用 SQLAlchemy 2 + Pydantic v2 实现四张表、字段和约束，Alembic 建立新库初始迁移。
2. 分离 routes / services / repositories / schemas / db；Session 生命周期清晰，事务边界可靠，错误处理统一。
3. 实现上述旧接口的严格兼容层，并建立 pytest API 契约与 repository/service 单测；以临时 SQLite 隔离测试。
4. 前端采用 `next.config.ts` rewrites：浏览器继续同源调用 `/api/*`，代理到本机 `http://127.0.0.1:8000/api/*`；地址从环境配置，不硬编码生产 URL。**最终删除旧 Next route handlers 和 node:sqlite DB 依赖**。
5. 生成 FastAPI OpenAPI → TypeScript 类型，建立可重复生成命令，前端统一 API 客户端。

**Gate：** 八组 API 的已有行为保持，前端不再直接访问数据库，前端构建 + 后端 pytest 均通过。

### G3：数据库保全、Seed 和业务闭环
1. 使用旧 SQLite **副本**验证“备份 → 校验旧 schema → 迁移/安全 baseline → 校验原始 ID、条数、关系、时间 → 回滚”；不得重置原件、不得盲目 stamp。
2. 全新空库走 `alembic upgrade head`，Seed 用显式命令、幂等；不得在正常服务启动时自动重复注入演示数据。
3. 用 API 自动化测试验证：创建虚构 Shopify 客户 → 电话互动 → 50,000 元商机 → PROPOSAL → 创建并完成任务 → 工作台统计变化 → 重启/重连后数据仍在；线索删除触发级联；非法输入 400、缺失对象 404。

**Gate：** 全新 DB 和旧 DB 副本均可用，原始数据零损失，端到端 API 业务闭环通过。未执行浏览器 E2E 时不得宣称浏览器人工验收已通过。

### G4：AI-Friendly 规范、交付和 PR
1. 根及 apps/web、apps/api 三份简洁 `AGENTS.md`：工程边界、文件职责、测试策略、修改范围、并行 Agent 不得写同一文件、默认禁止 Maven 全生命周期、E2E/真实外部集成需额外授权、日志与交付证据。
2. ".env.example"、`scripts/dev.ps1` 和 `scripts/dev.sh` 支持简单启动前后端（Web `127.0.0.1:3000`，API `127.0.0.1:8000`），根 README 包含初始化、DB 迁移、Seed、测试、OpenAPI 类型生成和故障排查。
3. GitHub Actions CI：前端 test/typecheck/build **串行**、后端 Ruff/pytest；只做与本仓库相关的门禁。
4. 更新 docs/architecture.md、docs/migration.md、进度文档，保留历史报告到合适归档位置。清理不用的旧 Node DB、Seed、过时依赖/测试，不删除必要的测试覆盖。
5. 逐项验证功能、数据和 Git diff。记录实际命令、测试通过数、构建结果、无法验证项与剩余风险。

**Gate：** 根目录一键本地开发、前后端各自独立运行、合同一致、旧数据迁移路径经验证、CI 通过或明确记载权限/环境阻塞。

## Git 与交付约束

- 使用分支 `refactor/fastapi-monorepo`；每个 Gate 一个或多个可解释的 commits，最终推送并创建指向 `main` 的 PR；**不要自动合并**。
- 不能修改其他仓库或工作树；不能强推、reset --hard、覆盖用户未提交修改；不能删除/覆盖原 SQLite 文件。
- 本项目未做身份验证，禁止暴露公网或添加真实客户数据；不调用外部真实 CRM、邮件、Shopify/Amazon API；不需要 Computer Use/E2E、负载测试或生产 DB 迁移。
- 默认只运行相关单元/API 测试、lint/typecheck/build，别将运行时间耗在全量无关检查。子 Agent 可并行只读分析，代码修改必须明确互不重叠的文件所有权。
- 遇到权限/环境问题，准确记录而不是编造成功；尽量完成不依赖权限的本地任务。
- 最后提供：PR URL、分支、HEAD SHA、目录变化、八组接口兼容结果、数据迁移证据、测试/构建结果、完整启动命令和已知问题。

**请立即开始 G0 审计，然后直接执行 G1–G4，不要停留在规划阶段。**
