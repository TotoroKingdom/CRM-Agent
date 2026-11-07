# CrossFlow CRM

面向跨境电商/B2B 销售场景的单用户本机 CRM MVP。G1 可见 UI、G2 SQLite 持久化、G3 核心业务闭环和 G4 本地交付验证已完成，详细证据记录在 `FINAL_REPORT.md`。

> **安全边界：** 本项目没有身份认证和多租户隔离。仅允许在本机开发环境使用，禁止部署到公网，也不要录入真实客户信息。

## 当前状态

- G1 可见 UI：已完成
- G2 SQLite 真持久化：已完成
- G3 核心 CRM 业务闭环：已完成
- G4 可交付验证：见 `FINAL_REPORT.md`

本项目位于独立子目录 `crm-overnight-mvp/`，不修改父工作区中的其他项目。

## 启动

要求 Node.js 24+（使用 Node 原生 `node:sqlite`，版本约束也写在 `package.json`）。开发服务器显式绑定 `127.0.0.1`，不应对公网暴露。

```powershell
npm install
npm run db:seed
npm run dev
```

然后访问 http://127.0.0.1:3000。首次访问 API 也会自动建表并在空数据库插入演示数据；`npm run db:seed` 可显式初始化，非空数据库会跳过，不覆盖用户数据。SQLite 文件位于 `data/crm.sqlite`，不会提交到 Git。

## 验证

```powershell
npm test
npm run typecheck
npm run build
```

请按上面的顺序执行 `npm test`、`npm run typecheck`、`npm run build`，不要并行执行 `typecheck` 与 `build`，因为 Next.js 会同时生成 `.next` 类型文件。

## 已知限制

当前为单用户本机 Demo，没有登录、权限、多租户隔离和真实外部平台/消息发送。所有样例客户和新增验收数据都必须是虚构数据；未经身份认证不得公网部署或录入真实客户信息。当前未执行浏览器 E2E、真实外部集成或公网部署验证。
