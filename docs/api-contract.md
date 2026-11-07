# CRM HTTP API 契约

状态：G2 完成基线，2026-11-07
真源：FastAPI 生成的 `/openapi.json`。本文件记录兼容语义和不能由 OpenAPI 完整表达的行为。

## 生成与校验

```powershell
uv run --project apps/api python -m app.scripts.export_openapi
npm --prefix apps/web run generate:api
```

- `apps/api/openapi.json`：后端导出的 OpenAPI 3.1。
- `apps/web/src/generated/api.ts`：`openapi-typescript` 生成的 TypeScript 类型。
- CI 重新生成两者并执行 `git diff --exit-code`，防止代码与契约漂移。
- OpenAPI 不发布未使用的 FastAPI `422`/`HTTPValidationError`；运行时请求校验统一为 `400 + fields`。

## 通用约定

- 仅监听 `127.0.0.1`。项目没有认证、租户隔离或公网安全边界。
- 成功响应统一为 `{"data": ...}`。
- 错误响应统一为 `{"error": "..."}`。请求字段校验失败时额外返回：

```json
{
  "error": "输入校验失败",
  "fields": {
    "name": ["请填写客户姓名"]
  }
}
```

- 字段名、查询参数和 JSON 属性均为 camelCase。
- 主要状态码：
  - `200`：查询、更新、删除成功。
  - `201`：创建线索、商机、互动、任务成功。
  - `400`：JSON 无法解析、字段校验失败或查询参数不合法。
  - `404`：线索、商机或任务不存在。
  - `500`：未预期服务端错误，响应为 `{"error":"服务器暂时无法完成操作"}`。
- 非法 JSON 返回 `400` 和 `{"error":"请求内容不是有效 JSON"}`，不带 `fields`。
- 不向浏览器暴露 FastAPI 默认的 `detail` 或 `422` 结构。
- 日期时间入参必须含时区偏移（`Z` 或 `±HH:MM`）。旧实现按客户端提交的 ISO 字符串原样存储；数据库中的时间统一视为 UTC。
- 金额使用整数分：`amountCents`。前端按人民币元录入，除以 100 展示。
- 未传的属性在 PATCH 中保持原值；显式传入 `null` 才会清空可空属性。

## 枚举

| 名称 | 值 |
|---|---|
| Channel | `WEBSITE`, `SHOPIFY`, `AMAZON`, `TIKTOK`, `REFERRAL`, `OTHER` |
| LeadStatus | `NEW`, `CONTACTED`, `QUALIFIED`, `DISQUALIFIED` |
| Priority | `HIGH`, `MEDIUM`, `LOW` |
| DealStage | `DISCOVERY`, `QUALIFICATION`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST` |
| ActivityType | `CALL`, `EMAIL`, `MESSAGE`, `MEETING`, `NOTE` |
| TaskFilter | `open`, `done`, `overdue`, `all`；缺省为 `all` |

## 对象

### Lead

```json
{
  "id": "uuid",
  "name": "林晓雯",
  "company": "星河家居",
  "email": "demo@example.test",
  "phone": null,
  "channel": "SHOPIFY",
  "status": "NEW",
  "priority": "HIGH",
  "country": "中国",
  "note": null,
  "createdAt": "2026-11-07T01:00:00.000Z",
  "updatedAt": "2026-11-07T01:00:00.000Z",
  "dealCount": 2,
  "openTaskCount": 1
}
```

### Deal

```json
{
  "id": "uuid",
  "leadId": "uuid",
  "leadName": "林晓雯",
  "company": "星河家居",
  "title": "独立站增长方案",
  "amountCents": 5000000,
  "stage": "PROPOSAL",
  "expectedCloseAt": null,
  "createdAt": "2026-11-07T01:00:00.000Z",
  "updatedAt": "2026-11-07T01:00:00.000Z"
}
```

### Activity

```json
{
  "id": "uuid",
  "leadId": "uuid",
  "leadName": "林晓雯",
  "company": "星河家居",
  "type": "CALL",
  "content": "电话确认了独立站增长需求。",
  "occurredAt": "2026-11-07T03:00:00.000Z",
  "createdAt": "2026-11-07T03:01:00.000Z"
}
```

### FollowupTask

```json
{
  "id": "uuid",
  "leadId": "uuid",
  "leadName": "林晓雯",
  "company": "星河家居",
  "title": "明天联系客户确认报价",
  "dueAt": "2026-11-08T05:00:00.000Z",
  "completedAt": null,
  "createdAt": "2026-11-07T03:01:00.000Z",
  "updatedAt": "2026-11-07T03:01:00.000Z"
}
```

## 端点

### `GET /api/dashboard`

返回：

```json
{
  "data": {
    "stats": {
      "leadCount": 24,
      "activeDealCount": 8,
      "expectedAmountCents": 121600000,
      "todayTaskCount": 1,
      "overdueTaskCount": 2
    },
    "tasks": [],
    "activities": [],
    "deals": []
  }
}
```

- `activeDealCount` 和 `expectedAmountCents` 不包含 `WON`、`LOST`。
- `todayTaskCount` 是 `Asia/Shanghai` 自然日内、未完成的任务数；区间为当天 `00:00:00.000` 至 `23:59:59.999`。
- `overdueTaskCount` 是早于北京时间当天起点且未完成的任务数。
- `tasks` 是未完成且 `dueAt <= 当天结束` 的任务，按逾期优先、截止时间升序，最多 6 条。
- `activities` 按 `occurredAt` 降序，最多 6 条。
- `deals` 按旧商机排序规则，最多 8 条。

### `GET /api/leads`

查询参数：

| 参数 | 规则 |
|---|---|
| `search` | 可选；trim 后最长 120；匹配姓名、公司或非空邮箱 |
| `status` | 可选；LeadStatus |
| `channel` | 可选；Channel |

- 所有筛选组合为 AND。
- 按 `updatedAt` 降序。
- 每项包含 `dealCount` 和 `openTaskCount`。
- 未知查询参数被忽略；非法枚举返回 `400` 和 `fields`。

### `POST /api/leads`

请求：

```json
{
  "name": "橙海贸易",
  "company": "橙海贸易有限公司",
  "email": null,
  "phone": null,
  "channel": "SHOPIFY",
  "status": "NEW",
  "priority": "HIGH",
  "country": "中国",
  "note": null
}
```

校验：

- `name` 必填，trim 后 1–80 字符。
- email 必填值须为邮箱，最长 160；可空。
- phone 最长 50；可空。
- country 最长 80；可空。
- note 最长 500；可空。
- company 必填，trim 后 1–120 字符。
- channel、status、priority 必须为对应枚举。

成功：`201 {"data": Lead}`。

### `GET /api/leads/{id}`

成功：`200 {"data": LeadDetails}`；`LeadDetails` 是 Lead 加以下数组：

- `activities`：该线索互动，`occurredAt` 降序。
- `deals`：该线索商机，按旧商机排序规则。
- `tasks`：该线索任务，未完成优先，`dueAt` 升序。

不存在：`404 {"error":"线索不存在"}`。

### `PATCH /api/leads/{id}`

- 允许 Lead 创建字段的任意子集；空对象合法。
- 省略属性保持原值；email、phone、country、note 可显式 `null`。
- 不可把 name、company、channel、status、priority 设为 `null`。
- 成功返回更新后的 Lead；不存在返回 `404`。

### `DELETE /api/leads/{id}`

- 成功：`200 {"data":{"id":"..."}}`。
- 关联 deals、activities、followup_tasks 通过数据库外键级联删除。
- 不存在：`404 {"error":"线索不存在"}`。

### `GET /api/leads/{id}/activities`

- 成功：`200 {"data": Activity[]}`，按 `occurredAt` 降序。
- 线索不存在：`404 {"error":"线索不存在"}`。

### `POST /api/leads/{id}/activities`

请求体不需要 `leadId`；路径 id 为准，即使 body 内含 `leadId` 也会被路径 id 覆盖。请求字段：

- `type`：ActivityType。
- `content`：trim 后 1–2000。
- `occurredAt`：含偏移的 ISO 时间。

成功：`201 {"data": Activity}`。线索不存在：`404`。

### `GET /api/deals`

- 可选 `leadId` 过滤；未知 id 返回空数组，不返回 404。
- 排序：`WON` 最后、`LOST` 最末；其余阶段内部按 `updatedAt` 降序。
- 响应内连接 lead，包含 `leadName`、`company`。

### `POST /api/deals`

请求字段：

- `leadId`：非空。
- `title`：trim 后 1–160。
- `amountCents`：整数，0–999999999999。
- `stage`：DealStage。
- `expectedCloseAt`：可空 ISO 时间。

成功：`201 {"data": Deal}`。lead 不存在：`404 {"error":"线索不存在"}`。

### `PATCH /api/deals/{id}`

- 允许 title、amountCents、stage、expectedCloseAt 的任意子集；不可更改 leadId。
- 显式 `expectedCloseAt: null` 清空日期；省略保持原值。
- 成功：`200 {"data": Deal}`；不存在：`404 {"error":"商机不存在"}`。

### `GET /api/tasks`

`filter`：

- `open`：未完成，包含逾期。
- `done`：已完成。
- `overdue`：未完成且 `dueAt < 当前时间`。
- `all` 或省略：全部。

排序：未完成在前，再按 `dueAt` 升序。响应包含 `leadName` 和 `company`。

### `POST /api/tasks`

请求字段：

- `leadId`：非空。
- `title`：trim 后 1–200。
- `dueAt`：含偏移的 ISO 时间。

成功：`201 {"data": FollowupTask}`。lead 不存在：`404`。

### `PATCH /api/tasks/{id}`

- 允许 `title`、`dueAt`、`completed` 的任意子集。
- `completed: true` 设置 `completedAt` 为当前 UTC 时间；`completed: false` 清空为 `null`。
- 省略 `completed` 保持原完成状态。
- 成功：`200 {"data": FollowupTask}`；不存在：`404 {"error":"任务不存在"}`。

## 数据库基线

旧库为 SQLite，四张表：`leads`、`deals`、`activities`、`followup_tasks`。

- 主键均为 TEXT UUID。
- 外键均指向 `leads(id) ON DELETE CASCADE`。
- 枚举由 CHECK 约束保护，金额有 `amount_cents >= 0`。
- 时间字段为 TEXT。
- 旧库实测：24 leads、10 deals、20 activities、12 tasks；`PRAGMA integrity_check=ok`、`foreign_key_check=[]`。

## 已识别的兼容风险

1. 旧 PATCH 合并逻辑会保留省略字段；新实现必须读取 `model_fields_set`，不能把 Python 默认 `None` 当作显式 null。
2. 旧错误结构使用 camelCase 字段名和字符串数组，FastAPI 默认 `422/detail` 不可直接暴露。
3. 旧实现不规范化时间字符串；迁移层应保留已有字符串并让新写入保持 UTC ISO。
4. 旧 Dashboard 使用北京时间自然日，不能用服务器本地时区或 UTC 日界线替代。
5. 旧 Seed 会在任意请求首次建库时自动运行；新实现必须改为显式、幂等命令。
6. 旧 `taskListQuerySchema` 对未知查询参数执行 strip；新实现不应因未知参数报错。
7. 旧 `PATCH /api/leads/{id}` 空对象会刷新 `updatedAt`；兼容层保留该行为。
