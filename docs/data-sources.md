# 数据来源与结果语义

## 来源能力

| 来源 | connector 输入 | connector 输出 | `keywordSearch` | 主要限制 |
| --- | --- | --- | --- | --- |
| LinkedIn | 关键词、天数、`geo_id`、分页起点 | 匿名公开搜索页的职位卡片 | 是 | 公开页可见性、限流、排序、地域和 HTML 均可能变化。 |
| AnySearch (Adzuna) | 规范关键词、`business.jobs`、结果上限 | AnySearch CLI 结构化文本中的岗位候选 | 是 | 需要本机 CLI；实际覆盖和排序由 AnySearch 决定，当前不承诺永久仅来自 Adzuna。 |
| Remote | 查询窗口 | 各公开 API、RSS 或公开页面的最新职位候选 | 否 | 每个来源有自身分页、发布时间、格式和限流规则。 |
| SEEK | 无 | 无 | 不适用 | 尚未实现；页面禁用，不会发起连接。 |

Remote 组包含：Remote OK、Remotive、Jobicy、Himalayas、We Work Remotely、NoDesk 和 Arbeitnow。Arbeitnow 仅保留明确标识为 remote 的岗位。

## RawJob 契约

来源 adapter 应尽可能提供：`id`、`title`、`company`、`location`、`workMode`、`date`、`source`、`sourceUrl`，以及可选的 `salary`、`tags`、`detail`。解析不完整的候选可以交给公共层进一步判断，但无法获得有效发布日期或基本岗位信息的记录会被剔除。

## 强弱相关性

处理顺序固定为：**标准化 → 日期/工作方式过滤 → 去重 → 相关性分组 → 地点增强**。

- 强相关：标准化后的公开字段直接覆盖所有关键词/短语。
- 弱相关：仅来源已经执行关键词召回（`keywordSearch: true`）时适用。它保留来源端判断为匹配、但 OpenWork 从公开卡片中无法直接验证的候选。
- `keywordSearch: false` 的来源不会产生弱相关候选，避免把整个最新 feed 中未匹配的岗位误称为相关。

因此，Remote 的弱相关数量恒为 0；LinkedIn、AnySearch 可以同时出现强、弱两组。强弱并非“岗位质量”或“招聘方可信度”评级，而是当前公开字段对输入关键词的可验证程度。

## 日期、去重和地点

- 日期窗口由后端统一计算，时间范围支持 1、3、7、14、30 天；前端不会另行做“最近 30 天”二次截断。
- 去重发生在相关性分组之前，以避免同一岗位在不同来源或分页中重复计数。
- 地理编码发生在相关性分组之后；地点无法确定不影响岗位在列表中保留。
- 地图点按城市聚合，点数小于岗位数是预期行为。

## 容错与可观测性

每个 connector 独立执行并带超时。单来源失败会记录在任务的 `sources` 字段；存在失败来源时任务状态为 `partial`，不会自动改用其它来源，也不会用缓存以外的旧数据伪造成功。调试时可轮询 `/api/searches/:taskId` 检查各来源的状态、数量和错误信息。
