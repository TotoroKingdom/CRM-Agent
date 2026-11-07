# 数据库迁移与回滚

本项目只使用本机 SQLite。迁移工具遵循三条硬规则：

1. 旧数据库只以只读模式打开。
2. 迁移前自动创建 SQLite 备份和 manifest。
3. 目标已存在时默认拒绝；不得把 `--target` 指向旧原库。

## 路径

- 旧原库（保留）：`crm-overnight-mvp/data/crm.sqlite`
- 新运行时库：`data/crm.sqlite`
- 备份与 manifest：`data/backups/`
- Alembic 配置：`apps/api/alembic.ini`

`data/`、旧库目录和备份都不进入 Git。

## 初始化依赖

```powershell
uv sync --project apps/api --python 3.12
npm --prefix apps/web ci
```

## 全新空库

确认目标不存在，或先单独备份目标。然后：

```powershell
uv run --project apps/api alembic -c apps/api/alembic.ini upgrade head
uv run --project apps/api python -m app.scripts.seed --database data/crm.sqlite
```

Seed 只在四张表全部为空时插入演示数据；重复执行返回 `"seeded": false`，不会覆盖或重复。应用启动不会自动 Seed。

预期首次计数：

```json
{"leads": 24, "deals": 10, "activities": 20, "tasks": 12}
```

## 旧库副本迁移

先停止占用数据库的 Web/API 进程，并记录原库哈希：

```powershell
Get-FileHash -Algorithm SHA256 crm-overnight-mvp/data/crm.sqlite
```

执行迁移：

```powershell
uv run --project apps/api python -m app.scripts.legacy_migration `
  --source crm-overnight-mvp/data/crm.sqlite `
  --target data/crm.sqlite
```

脚本会依次：

1. 检查 `PRAGMA integrity_check`、表/列、外键级联、枚举、金额和时间字段。
2. 用 SQLite backup API 创建新备份和 `.manifest.json`。
3. 在临时 staging 文件中执行 `alembic upgrade head`。
4. 按 `leads → deals → activities → followup_tasks` 复制原始行并保留 ID、时间和全部字段。
5. 对比四张表的完整行集合、主键集合、条数、外键检查和 Alembic revision。
6. 确认源文件迁移前后 SHA-256 相同。
7. 使用原子替换把 staging 移到目标路径。

目标已存在时脚本拒绝执行。只有在明确知道目标将被替换并已有备份时，才可加 `--replace`；脚本会额外备份旧目标。

## 验证

```powershell
uv run --project apps/api python -c "import sqlite3; c=sqlite3.connect('data/crm.sqlite'); print(c.execute('select version_num from alembic_version').fetchone()); print(c.execute('pragma integrity_check').fetchone()); print(c.execute('pragma foreign_key_check').fetchall())"
```

本次实际迁移证据：

- 源 SHA-256：`4f264eac4173674905dda14e0953656125b00bb6d53ba296428121e1823293b7`
- 迁移前后源哈希一致。
- 目标计数：24 / 10 / 20 / 12。
- 四张表完整行集合逐值一致。
- 目标 `PRAGMA integrity_check = ok`、`PRAGMA foreign_key_check = []`。
- Alembic revision：`aff88cb2ab30`。

## 回滚

优先使用脚本：

```powershell
uv run --project apps/api python -m app.scripts.rollback_migration `
  --backup data/backups/crm-20261107T101443Z-c05e5293.sqlite `
  --target data/crm.sqlite `
  --replace
```

回滚脚本会：

- 只接受通过旧 schema 与完整性校验的备份。
- 目标已存在时要求 `--replace`，并先创建 `pre-rollback` 备份。
- 先恢复到 staging，逐表比对行，再原子替换目标。

本次使用真实备份回滚到独立验证文件，备份与回滚目标 SHA-256 均为：

```text
076408a1b3b3a5a37408eaef284016a18850127743204c51cfe24779f09e4512
```

回滚后 24 / 10 / 20 / 12 条记录逐行等于旧原库。

不要用 `alembic downgrade` 作为业务回滚手段，因为它会删除表。生产式恢复应恢复数据库备份。

## 失败处理

- 校验失败：脚本退出，目标不会替换；保留源文件和备份。
- Alembic 失败：staging 文件默认删除，可用 `--keep-staging` 排查。
- 目标被占用：停止 API/Web 后重试。
- 原库哈希变化：停止所有进程并检查是否有人直接写入旧路径；不得继续覆盖。
- 备份损坏：从另一个备份恢复，不要修改原库来“修复”。

## 未自动执行的事项

- 不删除旧原库。
- 不清空根 `data/`。
- 不自动 Seed。
- 不自动公网部署。
- 浏览器 E2E 和真实外部服务测试需要额外授权。
