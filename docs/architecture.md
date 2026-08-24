# OpenWork 架构

## 目标

OpenWork 在浏览器中提供统一的动态岗位搜索体验。前端不直接访问第三方招聘网站；Node.js 后端负责执行来源隔离的采集、处理异步任务，并只将标准化岗位结果返回给浏览器。

## 模块边界

| 区域 | 责任 | 不负责 |
| --- | --- | --- |
| `frontend/` | 输入、筛选、任务轮询、列表、地球与交互状态 | 外部来源请求、HTML/RSS/CLI 解析、长期持久化。 |
| `backend/src/app.mjs` | HTTP 路由、静态文件托管、异步任务状态 | 数据源特定的解析逻辑。 |
| `backend/src/services/search-service.mjs` | 按来源编排 connector、来源级容错、缓存、进度 | 各网站字段的解析细节。 |
| `backend/src/collectors/` | 访问一个来源并解析为统一的 RawJob 候选 | 跨来源去重、相关性判断、地图坐标。 |
| `backend/src/jobs/` | 输入规则、标准化、公共后处理、城市增强 | 具体网站访问。 |
| `settings.ini` | 可审阅的非秘密默认运行参数 | API Key、Cookie、用户数据。 |

## API 与任务生命周期

1. 前端将 `{ keyword, filters: { rangeDays, source } }` 提交给 `POST /api/searches`。
2. 服务立即返回 `202` 和 `taskId`；客户端轮询 `GET /api/searches/:taskId`。
3. `search-service` 选择对应 connector，分别应用超时并记录来源进度。
4. connector 失败时该来源被标记 `failed`，其它来源继续；全部成功为 `completed`，任一来源失败但仍有执行结果为 `partial`。
5. connector 输出交给 `postprocessSearchResults`，结果写入短期内存缓存并返回任务结果。

任务与缓存仅驻留在进程内存。服务重启、进程退出或缓存 TTL 到期后，结果会消失；没有静态岗位数据刷新步骤。

## 数据流

```text
用户输入
  → keywords.mjs：校验、规范化、短语解析
  → search-service.mjs：创建来源请求
  → collector：RawJob[] + keywordSearch 能力标记
  → postprocess.mjs：标准化、日期/工作方式过滤、去重、强弱相关分组
  → locations.mjs：仅为可信城市补充经纬度
  → API：jobs / weakJobs / relevance / sources
  → 前端：相关性组列表、城市聚合圆点、国家临时筛选与详情
```

### 公共后处理

`postprocess.mjs` 是所有来源共享的唯一后处理入口：

1. 标准化每个 RawJob 的标题、公司、日期、来源链接、工作方式等字段。
2. 根据请求窗口过滤发布日期，根据当前来源要求过滤工作方式。
3. 以公司、标题和地点等稳定字段做跨来源去重。
4. 直接命中关键词的岗位进入强相关组；已由上游关键词搜索召回但未直接命中的候选可进入弱相关组。
5. 对两个结果组并行运行保守的城市地点增强。地理编码失败不会丢弃岗位，只是不绘制地图点。

connector 的 `keywordSearch` 是能力声明，而不是前端选项：LinkedIn 与 AnySearch 为 `true`；Remote 来源组当前为 `false`，因为其接入的是最新岗位 feed，而非来源端关键词查询。

## 地图显示语义

- 一个圆点代表一个可信城市，而不是一条岗位记录；同城职位被聚合到同一点。
- 仅城市名称精确、国家/地区上下文一致且无歧义时才绘制圆点。
- 点击国家只改变当前前端列表和圆点的临时筛选，不会修改本次关键词检索的强/弱总数，也不会重新请求来源。
- 无坐标岗位仍在右侧列表可见。

## 扩展新 connector

新增来源应遵循以下顺序：

1. 在 `backend/src/collectors/` 实现请求与初步解析，返回 RawJob 数组。
2. 声明来源名称和 `keywordSearch` 能力，不复制公共过滤或地理编码代码。
3. 在 `search-service.mjs` 中按 `filters.source` 接入。
4. 在 `settings.ini` 与 `backend/src/config.mjs` 添加无秘密的上限/超时配置及环境变量覆盖。
5. 更新 `docs/data-sources.md`、`README.md`、`worklog.md` 和相关冒烟测试。
6. 对真实来源做小范围验证，记录返回量、失败行为、限流和已知限制。
