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
职业关键词 + 时间范围 + 岗位来源
  → POST /api/searches
  → 查询任务（独立来源超时/容错）
  → 标准化、日期过滤、关键词过滤、去重
  → 保守地点处理（城市精确匹配、地区上下文校验、歧义不落点）
  → 前端列表和 3D 地球展示
```

页面首次加载显示空地图和搜索入口。动态数据只保留在当前查询任务和短期内存缓存中，不写回版本化的源码数据文件。

## 查询条件

- `keyword`：必填职业关键词。
- `filters.rangeDays`：仅允许 `1`、`3`、`7`、`14`、`30`（过去 1 天、3 天、1 周、2 周、1 月）。
- `filters.source`：`remote`、`anysearch`、`linkedin`。页面显示为 `Remote`、`AnySearch (Adzuna)` 与 `LinkedIn`；SEEK 目前明确标为暂未接入。

领域模型使用 `workMode`，并预留 `hybrid` 与 `unknown`。历史 `remote: false` 不自动视为到岗职位。

### 关键词输入规则

- 原作者 `main` 的原始实现没有短语、地点或布尔检索语法：将输入按空白拆为词，并要求每个词都出现在同一岗位的标题、公司、地点、摘要或标签中。因此 `Data Analytics Sydney` 等同于 `Data`、`Analytics`、`Sydney` 三词，程序无法自行判断前两词是否应作为一个职位短语。
- 当前统一规则：多个关键词以一个或多个空格分隔；一个关键词本身包含多个单词时，必须用引号包围。例如：`"Data Analytics" Sydney "Technical Support"`。普通单词如 `AI` 可直接输入；不使用 `AND`、`OR` 等布尔操作符。
- 公共关键词模块会把中文/全角单双引号和 ASCII 单引号统一为 ASCII 双引号、将英文字母转为小写、压缩空白，并校验空引号、未闭合引号和未以空格分隔的关键词。标准结果为：`"data analytics" sydney "technical support"`。
- Remote 的本地过滤会逐项匹配，带引号的短语要求连续命中；AnySearch 接收同一条标准查询串。LinkedIn connector 则由同一解析结果组织为 LinkedIn 所需的 `AND` 表达式：`"data analytics" sydney` 会变为 `"data analytics" AND sydney`，再由 URL 编码写入 `keywords` 参数。后端解析出的关键词项也会返回给前端地图使用，避免前后端规则不一致。
- 当前 LinkedIn connector 尚无独立地点字段；`Sydney` 只是 `keywords` 的一部分，匿名公开页仍可能按 LinkedIn 默认国家返回。若需要可靠地点筛选，下一阶段应新增独立“地点”输入并映射到 LinkedIn 的地点参数，而非从自由文本猜测。

## 当前完成度

- 已完成：目录迁移、移除历史岗位数据和小红书离线构建链路、Node 原生 HTTP 服务、异步任务 API、内存缓存、来源级容错、远程/AnySearch 来源采集器、动态地点处理、前端时间/来源控件和查询页交互。
- 已验证：AnySearch (Adzuna) 端到端检索。以 `AI`、过去 1 月测试，原始 10 条中 1 条薪资统计页被过滤，保留 9 条有效岗位；过去 1 周保留 5 条。
- 待验证/补充：Remote 来源组端到端验证、浏览器自动化验证、部署说明与可选的共享离线快照入口。

## 页面交互约定

- 首页不显示固定时间范围；进入查询页后才能选择时间范围和岗位来源。
- 时间与岗位来源使用页面自绘浅色下拉菜单，避免系统原生下拉主题闪现。
- 输入关键词后按 Enter 发起查询；输入、检索中或零结果时不显示右侧列表，成功结果会整体替换旧结果。
- 搜索框右侧显示“强 / 弱”两个数量入口。LinkedIn 的强相关是标题、公司、地点等已解析字段直接命中关键词的岗位；弱相关是 LinkedIn 已召回、但这些公开卡字段未直接命中的岗位。默认显示强相关列表和地图点；点击任一数量会切换右侧列表和地图点，并以绿色背景标示当前组。Remote 和 AnySearch 当前全部视为强相关，弱相关为 0。
- 右侧列表是当前查询结果并在面板内滚动展示全部岗位；点击岗位打开详情卡，按钮依次为“查看详情”和“前往页面”。
- 搜索框右侧岗位数固定表示本次关键词检索的全量结果。列表收起后可点击该数字重新展开；若已按国家筛选，点击该数字会清除国家筛选并展示全量列表。
- 悬停城市点显示该城市全部岗位的高层浮窗，每项可跳转来源页面；浮窗、详情卡不会同时出现。
- 点击国家只将列表和地图点限制到该国家；点击地球空白处恢复当前查询的全部岗位。
- 仅具有可信城市坐标的岗位显示为城市点。国家/地区名、上下文不符或同名歧义地点仍显示在列表，但不绘制点。

## 数据来源与容错

- `Remote`：Remote OK、Remotive、Jobicy、Himalayas、We Work Remotely、NoDesk，以及 Arbeitnow 的明确远程岗位。
- `AnySearch (Adzuna)`：仅调用 AnySearch 的 `business.jobs` 结构化职位查询；当前测试结果主要来自 Adzuna，不能承诺永久只返回 Adzuna。
- `LinkedIn`：请求 LinkedIn Jobs 匿名公开搜索页，解析首屏职位卡片；不使用 Cookie 或登录态。使用统一关键词格式，例如 `"Data Analysis" Sydney`。
- SEEK：当前未接入，页面中禁用显示，不发起请求。
- 每个来源独立执行；超时或失败仅标记该来源失败，查询可返回部分结果（`partial`）。
- 选择 `AnySearch (Adzuna)` 时依赖本机 Node CLI；未配置 `ANYSEARCH_CLI` 会返回明确配置错误。

## 本地命令

```powershell
npm run dev
```

服务默认地址：`http://127.0.0.1:4173`。

## 配置

根目录 [`settings.ini`](settings.ini) 是默认配置文件；环境变量优先于文件同名设置，可用于本机临时覆盖。不要将 API Key、Cookie 或密码写进该文件。

- `[server]`：`port`、`source_timeout_ms`、`search_cache_ttl_ms`。
- `[remote]`：Remote OK、Remotive、Jobicy、Himalayas、We Work Remotely、NoDesk 和 Arbeitnow 的单来源结果/页数上限；其中值 `0` 表示不由 OpenWork 额外截断，数据源自身仍可能有限制。
- `[anysearch]`：`cli_path`、`max_results`。建议把机器相关的 CLI 路径放在环境变量 `ANYSEARCH_CLI`；文件中的 `cli_path` 仅用于希望固定该机器配置时。
- `[linkedin]`：`geo_id`（默认 `92000000`，LinkedIn Worldwide）、`max_results`（安全总上限，允许 `1`–`200`）与 `page_size`（每页解析数，默认 `25`）。connector 会根据 LinkedIn 公开页的明确结果数提前停止；若页面显示 `1,000+` 等不确定数，则以 `max_results` 为准。输入的 `Australia`、`Sydney` 等仍是 `keywords` 中的普通关键词，并不替代 `geo_id`。

可覆盖设置的环境变量：

- `PORT`：服务端口，默认 `4173`。
- `ANYSEARCH_CLI`：AnySearch Node CLI 的绝对路径；仅在选择 `AnySearch (Adzuna)` 时需要。未配置时该来源查询会明确失败，不会退回其它来源。
- `LINKEDIN_MAX_RESULTS`、`LINKEDIN_PAGE_SIZE`：覆盖 `[linkedin].max_results`、`[linkedin].page_size`。
- `LINKEDIN_GEO_ID`：覆盖 `[linkedin].geo_id`；仅接受数字编号。
- `SOURCE_TIMEOUT_MS`：单来源超时，默认 20 秒。
- `SEARCH_CACHE_TTL_MS`：查询缓存时长，默认 5 分钟。

## 注意事项

- Remote 来源组尚未完成真实外部来源端到端验证，不能作为生产可用功能声明；AnySearch (Adzuna) 已完成一次公开岗位端到端验证。
- LinkedIn 匿名公开页已完成端到端验证；分页受公开页排序、声明总数、限流与 HTML 变动影响。connector 只使用安全上限内、可解析且不重复的卡片；后续分页页失败时保留已成功页。
- LinkedIn 默认传 `geoId=92000000`（Worldwide）；当前仍不会从自由文本猜测或伪造国家/城市编号。
- 修改 `settings.ini` 或环境变量后，须重启后端（`npm run dev`）才会生效。
- 地点解析刻意采取保守策略；不可信地点不会显示地图点，这是预期的数据质量保护。
- GitHub Pages 不能直接运行 Node 后端；部署时需要 Node 服务器或兼容的 Serverless 运行时。
- 所有 chris 分支改动记入项目根目录的 `worklog_chris_changes.md`。
