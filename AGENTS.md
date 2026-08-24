# AGENTS.md

## 项目定位

OpenWork 是一个独立维护的动态岗位发现项目。它受到 `huangbai-AI/OpenWork` 启发，并保留了原项目 README 原文作为历史资料：`README_Upstream.md`。

- `README.md` 是当前项目的正式、面向使用者的入口文档。
- `README_Upstream.md` 仅用于追溯原项目说明；不要把它当作当前运行、安装或架构的依据。
- 根目录 `worklog.md` 是本项目的正式变更日志。不要新建或恢复 `README_chris_changes.md`、`worklog_chris_changes.md`。
- 根目录 `settings.ini` 是默认运行配置文件；不得在其中写入或提交任何密钥、Cookie、密码或令牌。

本地路径：`D:\MyWorks\OpenWork`

## 分支与 Git

- 当前开发线：`chris-changes`。所有新功能、修复和文档更新必须在该分支完成。
- `main` 保留为历史稳定基线，不直接开发，也不因日常功能修改而改动。
- `feature/openwork-visual-refinement` 仅作参考；可选择性借鉴，未经明确要求不得整体合并。
- 修改前确认当前分支；不得 force-push、硬重置、改写历史、删除远程分支或丢弃用户改动。
- 不要将用户未要求的 `.gitignore`、锁文件或无关改动一并提交。

## 当前架构事实

```text
frontend/                  浏览器页面、交互地球、筛选与结果列表
backend/src/app.mjs        原生 Node.js HTTP 服务与静态文件托管
backend/src/collectors/    来源 connector：请求与 RawJob 初步解析
backend/src/jobs/          关键词、标准化、公共后处理、地点增强
backend/src/services/      查询任务编排、缓存与来源容错
settings.ini               默认参数；环境变量优先覆盖
tests/smoke.mjs            冒烟与回归测试
docs/                      面向项目的架构、配置、数据源与设计资料
codex/                     仅供 Codex 延续工作的项目记忆、交接和计划（忽略 Git）
temp/                      临时分析、截图和测试输出（忽略 Git）
```

前端通过 `POST /api/searches` 创建异步查询任务，再轮询 `GET /api/searches/:taskId`。connector 只负责来源访问和初步解析；日期/工作方式过滤、去重、强弱相关分组及地点增强必须统一放在 `backend/src/jobs/postprocess.mjs` 或其明确的公共依赖中，不能复制到 connector 或前端。

## 工作方式

执行较大改动前：

1. 阅读 `README.md`、本文件、`codex/handoff.md` 和相关 `docs/` 文档。
2. 检查 Git 分支与工作区状态，保护现有未提交改动。
3. 理解相关代码的数据流，必要时对照参考分支。
4. 保持修改小而聚焦，遵循现有代码风格。
5. 进行与风险相称的验证，不能未经检查声称完成。

数据源、限流、地点、相关性与隐私相关的改动，应至少记录：来源、原始候选数量、过滤/去重结果、失败来源和未验证风险。

## 文档与项目记忆

- `README.md`：安装、配置、启动、使用、架构、数据来源和运行边界的权威说明。产品行为变化时同步更新。
- `docs/architecture.md`：模块责任、API 和数据流。
- `docs/configuration.md`：`settings.ini`、环境变量和安全配置说明。
- `docs/data-sources.md`：每个 connector 的能力、限制和相关性语义。
- `worklog.md`：按日期记录已完成的实质性变更。
- `codex/project-memory.md`：长期技术事实和验证结论。
- `codex/handoff.md`：当前工作区、已完成事项、风险与下一步。
- `codex/plans/`：仅保存仍有价值的实施计划；完成后应标记状态，避免过期计划伪装成当前事实。

`docs/`、`codex/`、`temp/` 被忽略是有意设计；除非用户明确要求，不修改 `.gitignore` 将它们纳入版本控制。

## 运行与验证

- 本地服务：`npm run dev`，默认访问 `http://127.0.0.1:4173`；同一命令启动后端并托管前端。
- 停止服务：在启动终端按 `Ctrl+C`。
- 回归检查：`npm run test:smoke`。
- 修改 `settings.ini` 或环境变量后必须重启服务。

外部来源失败、限流或页面结构改变是可预期情况。查询必须支持部分成功；不得用伪造数据填补失败来源，也不得通过绕过登录、验证码、付费墙或访问限制来取得岗位数据。
