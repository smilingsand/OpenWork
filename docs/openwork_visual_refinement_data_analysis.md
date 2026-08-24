# OpenWork `feature/openwork-visual-refinement 数据刷新与数据源分析（历史参考）

> 本文记录 2026-08-14 对上游参考分支的静态数据机制调查，不描述当前动态查询系统。当前配置与来源能力以根目录 README.md、docs/configuration.md、docs/data-sources.md 为准。

> 分析对象：[huangbai-AI/OpenWork](https://github.com/huangbai-AI/OpenWork) 的 `feature/openwork-visual-refinement` 分支。
> 分析方式：只读 GitHub API / `gh` CLI 远程查询。
> 未执行：clone、下载仓库、checkout、安装依赖、build、test 或代码修改。

## 结论

该分支所谓的“刷新近 30 天岗位数据”不是运行时自动更新，也不是新增一批数据源；它通过本地 Node 采集脚本重新抓取后，将结果生成并提交为静态 `data-*.js` 文件。

相对 `main`，数据层最主要的变化是：

- 将采集时间窗从固定的 `2026-06-18 ～ 2026-07-18` 改成脚本执行日向前滚动 30 天；
- 重写了 `data-month.js`、`data-remote.js`、`data-locations.js`；
- 实际静态岗位总量从 `main` 的 1,495 降为约 729，远程岗位从 902 降为约 627；
- 没有远程 diff 证据显示新增采集源；`Arbeitnow` 和 We Work Remotely 在这次静态输出中没有贡献岗位；
- 中国大陆 31 个官方岗位在该分支历史中新增，但已经经 squash 合入 `main`，不是该分支相对 `main` 的新增能力。

## 1. 数据相关 commits

| Commit | 时间（UTC） | 内容 |
|---|---:|---|
| [`3799270`](https://github.com/huangbai-AI/OpenWork/commit/3799270ef31d6ca9be6b8976eb6d0be6abc4d36e) | 2026-07-21 12:46 | 新增中国大陆官方岗位静态数据 |
| [`dd20d81`](https://github.com/huangbai-AI/OpenWork/commit/dd20d815383e2c1c6ed5ebea45bd63d64d23740d) | 2026-07-21 18:06 | 完善小红书离线包构建和校验 |
| [`9a9fe7d`](https://github.com/huangbai-AI/OpenWork/commit/9a9fe7d83a7b8fea177c45895af52e815bd5ddf6) | 2026-07-22 14:17 | 刷新近 30 天岗位并重建小红书包 |

GitHub 的按路径提交历史显示：

- `data-month.js`、`data-remote.js`、`data-locations.js` 在目标 branch 的后续修改都来自 `9a9fe7d`；
- `data-china.js` 仅由 `3799270` 引入；
- `scripts/validate_xhs_tool.mjs` 由 `dd20d81` 新增，并由 `9a9fe7d` 补充；
- 未发现与数据刷新相关的 GitHub Actions workflow。

### `3799270`：中国大陆岗位

修改：

- 新增 `data-china.js`（411 行）；
- 修改 `README.md`、`index.html`、`scripts/build_xhs_tool.mjs`、`tests/smoke.mjs`。

数据：

- 31 条静态录入、带官方申请链接的岗位；
- Apple 招聘官网 23 条、Microsoft Careers 4 条、NVIDIA Careers 4 条；
- 北京 9、上海 8、成都 6、深圳 4、苏州 4。

判断：属于“增加中国大陆岗位”。实现是静态数据录入，不存在对应的自动采集脚本；该能力已在 `main`。

### `dd20d81`：离线包构建与校验

修改：

- 新增 `scripts/validate_xhs_tool.mjs`；
- 修改 `scripts/build_xhs_tool.mjs`、`README.md`、`package.json` 和小红书离线端源码。

新增校验会验证：

- zip 没有外部 URL、`fetch`、WebSocket 等联网能力；
- 离线岗位都具有 `postedAt`，且都处于执行时计算的近 30 天窗口；
- 数据、脚本和资源均被打进 zip。

它不采集岗位，也不增加数据源。

### `9a9fe7d`：实际数据刷新

| 文件 | 变化 |
|---|---:|
| `data-month.js` | +2,251 / -15,939 |
| `data-remote.js` | +6,080 / -10,719 |
| `data-locations.js` | +1,483 / -6,519 |
| `scripts/collect_month_jobs.mjs` | +20 / -6 |
| `scripts/collect_remote_jobs.mjs` | +8 / -3 |
| `scripts/enrich_locations.mjs` | +8 / -1 |
| `scripts/build_xhs_tool.mjs` | +24 / -4 |
| `scripts/validate_xhs_tool.mjs` | +19 |
| `tests/smoke.mjs` | +15 / -3 |

关键 diff：

```js
const until = new Date();
const since = new Date(until);
since.setUTCDate(since.getUTCDate() - 29);
```

这替换了原有固定日期窗口。两个采集器会写入 `WORK_DATA_META.updatedAt` 与动态窗口标签。

另外：

- `collect_month_jobs.mjs` 为 Remote OK、Remotive、Arbeitnow 增加单源失败后返回空数组的容错；
- `enrich_locations.mjs` 为 We Work Remotely 的各 RSS 分类请求增加容错。

判断：这是“原有数据源重新抓取 / 刷新”“滚动 30 天筛选”“重新生成 location enrichment 输出”。没有新增采集源，也没有变更去重键。

## 2. 数据源与抓取方式

### `scripts/collect_month_jobs.mjs`

| 数据源 | 获取方式 | 本次是否新增 |
|---|---|---|
| AnySearch / 职位搜索 | 调用配置中的 `anysearch_cli.js`，按职位、城市和近一个月查询 | 否 |
| Remote OK | `https://remoteok.com/api` | 否 |
| Remotive | `https://remotive.com/api/remote-jobs?limit=500` | 否 |
| Arbeitnow | `https://www.arbeitnow.com/api/job-board-api?page=N`，最多 6 页 | 否 |

脚本先以 `company | title | location` 去重，写入 `data-month.js` 时再按 `sourceUrl` 避免与既有岗位重复。

### `scripts/collect_remote_jobs.mjs`

| 数据源 | 获取方式 | 本次是否新增 |
|---|---|---|
| We Work Remotely | 多个分类 RSS feed | 否 |
| NoDesk | `https://nodesk.co/remote-jobs/index.xml` RSS | 否 |
| Jobicy | `https://jobicy.com/api/v2/remote-jobs?count=50` | 否 |
| Himalayas | `https://himalayas.app/jobs/api?offset=N` | 否 |

该脚本按 `company | title | location` 去重；写入时还检查既有 ID 与职位键。

### `scripts/enrich_locations.mjs`

- 对职位明确城市、We Work Remotely RSS 中的总部字段，以及少量内置公司总部映射生成候选地点；
- 调用 Open-Meteo Geocoding API：`https://geocoding-api.open-meteo.com/v1/search`；
- 可验证城市标记为 `city`；无法可靠落点的岗位标记为 `global` 或 `region`，不伪造城市坐标；
- 未使用 Nominatim，也未使用浏览器定位。

## 3. 与 `main` 的数据快照比较

| 指标 | `main` | `feature/openwork-visual-refinement` |
|---|---:|---:|
| 基础 `data.js` | 39 条 | 39 条 |
| `data-month.js` | 770 条 | 199 条 |
| `data-remote.js` | 655 条 | 460 条 |
| 中国大陆静态数据 | 31 条 | 31 条 |
| 合计岗位 | 1,495 | 约 729 |
| 远程岗位 | 902 | 约 627 |
| `data-month.js` 窗口 | 2026-06-18 ～ 07-18 | 2026-06-23 ～ 07-22 |
| `data-remote.js` 窗口 | 2026-06-18 ～ 07-18 | 2026-06-23 ～ 07-22 |
| 城市级点 | 769 | 约 166 |

分支输出中的 source 字段分布：

- `data-month.js`：Remote OK 99、招聘网站 / AnySearch 65、Remotive 35；
- `data-remote.js`：Himalayas 400、Jobicy 50、NoDesk 10；
- 本次生成数据中没有 Arbeitnow，也没有 We Work Remotely 的输出记录。

所以“刷新”不等于“数据更多”：它是一个时间更晚、总量明显更小的静态快照。

## 4. 分类判断

| 类别 | 是否成立 | 证据 |
|---|---|---|
| A. 增加新数据源 | 否 | 采集脚本的 collector 与 URL 未新增 |
| B. 原有源重新抓取 | 是 | 重生成 `data-month.js`、`data-remote.js` |
| C. 扩大抓取范围 | 否 | 地点查询和 feed 集合无本次新增证据 |
| D. 修改筛选条件 | 是 | 固定日期改为滚动 30 天 |
| E. 修改去重 / 聚合 | 否 | 去重键保持 `company/title/location` |
| F. location enrichment | 是，但为重跑和容错 | 重写 `data-locations.js`，增加 WWR RSS 失败容错 |
| G. 增加中国大陆岗位 | 是，但已在 `main` | `data-china.js` 的 31 条官方岗位 |
| H. 静态数据文件人工更新 | 是 | 最终产物是已提交的静态 JS 数据文件 |

## 5. 自动化状态

没有发现 `.github/workflows/` 中与采集、刷新或发布数据有关的 workflow。

刷新模型是：**手动运行 Node 采集脚本 → 生成静态数据文件 → 提交产物 → 构建离线小红书包**。站点运行时不会重新抓取岗位数据。

## 6. 建议

如果只关心“数据刷新能力”，值得抽取：

1. `collect_month_jobs.mjs` 和 `collect_remote_jobs.mjs` 的滚动 30 天窗口；
2. 单源失败不阻断整批抓取的容错；
3. `enrich_locations.mjs` 的城市 / 总部 / 区域分级；
4. `validate_xhs_tool.mjs` 对离线数据新鲜度和离线约束的校验。

不建议直接把该 branch 的 `data-month.js`、`data-remote.js`、`data-locations.js` 当作比 `main` 更完整的数据集：远程证据表明，它们只是一次更新更晚但总量显著更小的静态快照。
