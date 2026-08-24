# OpenWork

OpenWork 是一个以交互式地球为核心的动态岗位发现工具。用户选择时间范围和来源、输入职业关键词并按 Enter 后，系统会实时访问所选岗位来源，统一清洗、去重、判断相关性、补充可信城市坐标，并将结果同时呈现在右侧列表和地球上。

本项目受到 [huangbai-AI/OpenWork](https://github.com/huangbai-AI/OpenWork) 启发，并以其早期代码和视觉理念为基础发展而来；目前的动态查询后端、数据源 connector、筛选与相关性流程、目录结构和交互已是独立演进的实现。原项目作者的 README 原文完整保存在 [README_Upstream.md](README_Upstream.md)。

## 功能概览

- 动态查询：不依赖旧的静态岗位 JSON；每次新查询会替换当前浏览器会话中的旧结果。
- 时间范围：过去 1 天、3 天、1 周、2 周或 1 月。
- 来源选择：LinkedIn、AnySearch（当前主要为 Adzuna）和 Remote 来源组；SEEK 在界面中保留为“暂未接入”。
- 统一数据管道：每个 connector 只负责请求和初步解析，公共后处理统一完成日期过滤、工作方式过滤、跨来源去重、强弱相关分组与地点增强。
- 部分成功：单个外部来源超时或失败不会中断整次查询；页面会提示部分来源不可用。
- 地球交互：仅对可信的城市级地点绘制圆点；悬停圆点查看同城全部岗位；点击国家可临时筛选右侧列表，点击空白处恢复全量。
- 岗位详情：点击右侧列表定位城市并打开详情卡，可查看来源信息或前往原始岗位页面。
- 短期缓存：相同的关键词、时间范围和来源在缓存有效期内复用结果，减少重复访问外部服务。

## 系统结构

```text
浏览器（frontend/）
  └─ 关键词、时间范围、来源 → POST /api/searches

Node.js 服务（backend/src/）
  ├─ 异步任务与短期内存缓存
  ├─ collectors/             各来源请求与 RawJob 初步解析
  │   ├─ linkedin.mjs
  │   ├─ anysearch.mjs
  │   ├─ remote-api.mjs
  │   └─ remote-rss.mjs
  └─ jobs/
      ├─ keywords.mjs        关键词规范化与语法校验
      ├─ postprocess.mjs     公共后处理与强/弱相关分组
      └─ locations.mjs       保守的城市地理编码

settings.ini                 默认运行参数（环境变量可覆盖）
tests/smoke.mjs              后端冒烟与回归测试
docs/                        架构、数据源和配置补充说明
```

查询处理顺序如下：

```text
输入规范化 → 来源 connector 返回 RawJob 候选
→ 日期/工作方式过滤 → 去重 → 强弱相关分组 → 城市地点增强
→ API 结果 → 列表与地球展示
```

各 connector 不共享 HTML、RSS、JSON 或 CLI 的解析逻辑；它们只交付统一字段的原始候选。这样新增来源时不会把网站差异扩散到前端或公共业务层。

## 支持的数据来源

| 页面选项 | 当前状态 | 实际访问内容 | 说明 |
| --- | --- | --- | --- |
| LinkedIn | 已接入，默认 | LinkedIn Jobs 匿名公开搜索页 | 使用 Worldwide `geoId`，支持安全分页；不使用 Cookie、登录态或账户凭据。 |
| AnySearch (Adzuna) | 已接入 | AnySearch CLI 的 `business.jobs` 查询 | 当前测试结果主要来自 Adzuna；AnySearch 的实际覆盖由其服务端决定。 |
| Remote | 已接入 | Remote OK、Remotive、Jobicy、Himalayas、We Work Remotely、NoDesk、Arbeitnow | 访问各公开 API/RSS 或公开页面；仅采集明确远程的 Arbeitnow 岗位。 |
| SEEK（暂未接入） | 未接入 | 无 | 菜单项禁用，不会发起请求。 |

外部网站会变更页面、排序、可见数量或限流策略，因此同一条件在不同时间返回不同数量是正常现象。LinkedIn 的匿名页面尤其可能受地域、限流和页面结构变化影响。

## 安装

### 前置条件

- Node.js 20 或更高版本（建议使用当前 LTS）。
- npm。
- 使用 AnySearch 时：本机已安装可调用的 AnySearch CLI，且其自身凭据已配置。项目不会保存 AnySearch API Key。

### 获取代码并安装依赖

```powershell
git clone <你的仓库地址> OpenWork
Set-Location OpenWork
git switch chris-changes
npm install
```

`chris-changes` 是当前开发线；请不要在 `main` 上直接开发。若克隆的远程仓库默认未检出该分支，可先执行 `git fetch origin`，再使用 `git switch --track origin/chris-changes`。

## 配置

根目录 [settings.ini](settings.ini) 是默认配置文件。环境变量优先于其中同名设置，因此适合做本机或部署环境的临时覆盖。修改配置后必须重启服务。

不要将 API Key、Cookie、密码或其它秘密写入 `settings.ini`，也不要提交这些信息。

| 配置段 | 主要参数 | 用途 |
| --- | --- | --- |
| `[server]` | `port`、`source_timeout_ms`、`search_cache_ttl_ms` | 服务地址、单来源超时、查询缓存有效期。 |
| `[remote]` | 各来源的 `*_max_results`、`*_max_pages` | Remote 来源组的安全上限；`0` 表示不再由 OpenWork 额外截断。 |
| `[anysearch]` | `cli_path`、`max_results` | AnySearch CLI 路径与单次返回上限。 |
| `[linkedin]` | `geo_id`、`max_results`、`page_size` | LinkedIn 地域编号、总安全上限和分页大小。默认 `geo_id=92000000`，即 Worldwide。 |

常用环境变量：

```powershell
# 可选：机器相关路径建议用环境变量，不写入 settings.ini
$env:ANYSEARCH_CLI = 'C:\path\to\anysearch_cli.js'

# 可选：仅本次启动覆盖默认值
$env:PORT = '4173'
$env:LINKEDIN_MAX_RESULTS = '50'
$env:LINKEDIN_GEO_ID = '92000000'
$env:SOURCE_TIMEOUT_MS = '20000'
$env:SEARCH_CACHE_TTL_MS = '300000'
```

`ANYSEARCH_CLI` 仅在选择 **AnySearch (Adzuna)** 时需要；未配置时该来源会返回明确的配置错误，而不会悄悄改用其它来源。

## 启动与关闭

在项目根目录执行：

```powershell
npm run dev
```

浏览器访问 [http://127.0.0.1:4173](http://127.0.0.1:4173)。该命令会同时启动 Node 后端并托管前端静态文件，不需要再分别启动两个进程。

在运行命令的终端按 `Ctrl+C` 即可正常停止服务。

运行回归检查：

```powershell
npm run test:smoke
```

## 使用方法

1. 打开首页并点击“开始查看”。
2. 在查询页右上角选择时间范围和岗位来源。
3. 在底部关键词框输入查询条件，按 **Enter** 发起检索。
4. 检索期间，输入框右侧显示“检索中…”。完成后显示强、弱相关数量；默认展示强相关列表和地图点。
5. 点击“强”或“弱”的数量可切换右侧列表与地图所展示的相关性组。点击总数入口可重新展开已收起的列表，并清除临时国家筛选。
6. 悬停城市圆点查看该城市的全部岗位；点击右侧岗位查看详情或打开原始页面。点击国家按国家过滤，点击地球空白处恢复当前相关性组的全量岗位。

### 关键词输入语法

多个关键词以一个或多个空格分隔；由多个单词组成的一个短语必须使用半角或全角引号包围。例如：

```text
"Data Analytics" Sydney "Technical Support"
```

系统会把全角/单引号统一为 ASCII 双引号、压缩空白并将字母转为小写，得到规范查询：

```text
"data analytics" sydney "technical support"
```

不要输入 `AND`、`OR` 等布尔操作符。LinkedIn connector 会把规范关键词转换为 LinkedIn URL 所需的 `AND` 形式；例如前两个条件会成为 `"data analytics" AND sydney`，再进行 URL 编码。`Sydney`、`Australia` 等写在该输入框中只是关键词，不会自动推断 LinkedIn 的城市编号；默认地域由 `settings.ini` 的 `geo_id` 决定。

## 强相关与弱相关

所有来源在日期、工作方式和去重完成后，再统一进行相关性处理：

- **强相关**：岗位已解析字段（标题、公司、地点、摘要、标签等）直接命中规范关键词。
- **弱相关**：仅适用于已由上游按关键词召回的来源（目前为 LinkedIn、AnySearch）。它表示上游认为相关，但公开可解析字段未全部直接命中；保留这部分岗位避免因为页面信息不完整而丢失候选。
- **Remote**：当前使用最新岗位 feed，而非远程来源的关键词搜索接口，因此只返回强相关，弱相关为 0。

地球上的圆点是按**城市聚合**后的点，而不是“一岗一个点”：同一城市有多个岗位时仍只显示一个圆点。因此圆点数量通常小于右侧岗位数量；没有可信城市坐标的岗位仍会在列表中出现，但不会在地球上伪造位置。

## 内部 API

前端和后端使用以下 JSON API；它们主要供本项目 UI 使用，也便于本地诊断：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 返回服务与来源配置状态。 |
| `POST` | `/api/searches` | 创建异步查询任务。请求体：`{ "keyword": "AI", "filters": { "rangeDays": 30, "source": "linkedin" } }`。 |
| `GET` | `/api/searches/:taskId` | 轮询任务状态、进度、来源错误和完成后的岗位结果。 |

任务状态为 `queued`、`running`、`completed`、`partial` 或 `failed`。`partial` 表示部分来源失败但已有可用结果。

## 运行边界与注意事项

- 这是动态查询系统，不需要运行旧的 `collect_month_jobs.mjs` 或 `collect_remote_jobs.mjs` 来刷新静态数据。
- 运行时数据只保留在查询任务和短期内存缓存中；重启服务后缓存会清空。
- 任一来源失败并不代表整个查询失败。请查看页面提示或 `/api/searches/:taskId` 的来源错误信息。
- 地点解析故意保守：国家、地区、歧义城市或上下文不一致的地点不会生成地图点，以避免错误定位。
- GitHub Pages 只能托管静态页面，不能直接承载本项目的 Node 后端。部署时需要 Node 服务或兼容的 Serverless 运行环境。
- 请遵守各数据来源的服务条款、robots/访问政策和当地适用法律；不要使用本项目绕过登录、付费墙、验证码或访问限制。

## 文档与维护

- [docs/architecture.md](docs/architecture.md)：服务、任务和数据处理架构。
- [docs/data-sources.md](docs/data-sources.md)：各 connector 的能力、限制和相关性语义。
- [docs/configuration.md](docs/configuration.md)：`settings.ini` 与环境变量参考。
- [worklog.md](worklog.md)：本项目的变更记录。
- [README_Upstream.md](README_Upstream.md)：原项目 README 原文，供历史追溯。

开发规范与分支约定在 [AGENTS.md](AGENTS.md)。
