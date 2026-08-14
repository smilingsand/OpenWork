# OpenWork — chris-changes

本项目 fork 自原作者的 OpenWork。原作者说明保持在 `README.md`；本文件记录 `chris-changes` 分支的架构、设计、运行方式和差异化开发。

## 分支约定

- `main` 是与 upstream 保持同步的稳定基线，不在其上开发。
- 所有本地功能开发均在 `chris-changes` 进行。
- `origin/feature/openwork-visual-refinement` 只作选择性参考，不整体合并。

## 当前架构

```text
frontend/  → 浏览器 UI、地球展示、关键词输入与筛选控件
backend/   → Node.js HTTP 服务、查询任务、采集器、过滤与去重
data/cache/ → 未来可选的运行时缓存目录
```

页面首次打开没有历史岗位；用户刷新搜索时调用 `POST /api/searches`，再轮询 `GET /api/searches/:taskId`。

## 设计与数据流

```text
职业关键词 + 时间范围 + 工作方式
  → POST /api/searches
  → 查询任务（独立来源超时/容错）
  → 标准化、日期过滤、工作方式判定、关键词过滤、去重
  → 保守地点处理（城市精确匹配、地区上下文校验、歧义不落点）
  → 前端列表和 3D 地球展示
```

页面首次加载显示空地图和搜索入口。动态数据只保留在当前查询任务和短期内存缓存中，不写回版本化的源码数据文件。

## 查询条件

- `keyword`：必填职业关键词。
- `filters.rangeDays`：仅允许 `1`、`3`、`7`、`30`。
- `filters.workMode`：`all`、`remote`、`onsite`。

领域模型使用 `workMode`，并预留 `hybrid` 与 `unknown`。历史 `remote: false` 不自动视为到岗职位。

## 当前完成度

- 已完成：目录迁移、移除历史岗位数据和小红书离线构建链路、Node 原生 HTTP 服务、异步任务 API、内存缓存、来源级容错、远程/通用来源初步采集器、动态地点处理、前端时间/工作方式控件和查询页交互。
- 待验证/补充：真实来源端到端验证、浏览器自动化验证、部署说明与可选的共享离线快照入口。

## 页面交互约定

- 首页不显示固定时间范围；进入查询页后才能选择时间范围和工作方式。
- 输入关键词后按 Enter 发起查询；“检索中…”出现期间保留当前缓存，成功结果会整体替换旧结果。
- 右侧列表是当前查询结果；点击岗位打开详情卡，按钮依次为“查看详情”和“前往页面”。
- 悬停城市点显示该城市全部岗位的高层浮窗，每项可跳转来源页面；浮窗、详情卡不会同时出现。
- 点击国家只将列表和地图点限制到该国家；点击地球空白处恢复当前查询的全部岗位。
- 仅具有可信城市坐标的岗位显示为城市点。国家/地区名、上下文不符或同名歧义地点仍显示在列表，但不绘制点。

## 数据来源与容错

- 远程来源：Remote OK、Remotive、Jobicy、Himalayas、We Work Remotely、NoDesk。
- 通用来源：Arbeitnow、可选 AnySearch。
- 每个来源独立执行；超时或失败仅标记该来源失败，查询可返回部分结果（`partial`）。
- `AnySearch` 依赖本机 Node CLI，未配置时自动跳过。

## 本地命令

```powershell
npm run dev
```

服务默认地址：`http://127.0.0.1:4173`。

## 配置

可选环境变量：

- `PORT`：服务端口，默认 `4173`。
- `ANYSEARCH_CLI`：AnySearch Node CLI 的绝对路径；未配置时该来源自动跳过。
- `SOURCE_TIMEOUT_MS`：单来源超时，默认 20 秒。
- `SEARCH_CACHE_TTL_MS`：查询缓存时长，默认 5 分钟。

## 注意事项

- 当前动态检索尚未完成真实外部来源端到端验证，不能作为生产可用功能声明。
- 地点解析刻意采取保守策略；不可信地点不会显示地图点，这是预期的数据质量保护。
- GitHub Pages 不能直接运行 Node 后端；部署时需要 Node 服务器或兼容的 Serverless 运行时。
- 所有 chris 分支改动记入项目根目录的 `worklog_chris_changes.md`。
