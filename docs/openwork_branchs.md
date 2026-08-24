# OpenWork 远程 Branch 版本分析报告（历史参考）

> 本文是 2026-08-14 对上游仓库的只读调查记录，不描述当前 OpenWork 的运行架构、安装方式或数据源。当前项目说明请阅读根目录 README.md 和 docs/ 中的架构、配置、数据源文档。

> 分析对象：[huangbai-AI/OpenWork](https://github.com/huangbai-AI/OpenWork)
> 分析方式：仅使用 GitHub 公开页面、GitHub API 与 `gh` CLI 的只读远程查询。
> 未执行：`git clone`、下载仓库、checkout、安装依赖、build、test 或代码修改。
> 数据查询时间：2026-08-14（提交时间均为 UTC）。

## 1. Branch Overview

| Branch | 最新提交时间 | 最新 commit | 最新 commit message | 相对 `main` 的提交图关系 | 主要用途判断 |
|---|---:|---|---|---|---|
| `main` | 2026-07-21 17:32:46 | `b6fe2554567` | 规范岗位聚合、补充大陆岗位并修复发布 | 基准 | 官方默认、已部署的稳定整合版 |
| `feature/openwork-visual-refinement` | 2026-07-22 15:48:57 | `8f8079b61a19` | 调整小红书品牌位置与卡片内容宽度 | diverged；43 ahead / 1 behind | 后续最多的视觉、移动端、小红书与数据迭代分支 |
| `feature/cluster-threshold` | 2026-07-21 17:29:12 | `a629196b095c` | 修复 OpenWork 发布与岗位选择状态 | diverged；6 ahead / 1 behind | 已合并功能的原始开发分支 |
| `agent/openwork-polish-xhs-logo` | 2026-07-21 06:17:59 | `739eee5b73d5` | 优化 OpenWork 地球交互与品牌体验 | diverged；1 ahead / 5 behind | 已合并的早期 UI、品牌与小红书适配分支 |

> “ahead / behind” 仅表示 Git 提交图关系，不能直接等同于功能是否已经合并。本仓库的两个已合并 PR 均采用 squash 合并，因此原 branch 的 commit SHA 不会成为 `main` 的祖先。

## 2. Branch-by-Branch Analysis

### `main`

- 默认 branch，也是 GitHub Pages 的发布来源（`main` 根目录）。
- 最新提交：`规范岗位聚合、补充大陆岗位并修复发布`。
- 已包含：
  - 以默认视角定义岗位聚合阈值；
  - 31 个中国大陆官方岗位；
  - 国家色板、选中反馈和边缘穿模修复；
  - GitHub Pages 依赖加载与国家/岗位选择状态修复；
  - 单一底部搜索入口。
- README 描述当前原型有 1,495 条近 30 天岗位线索、902 条远程岗位，并明确网页与离线小红书包的定位。

判断：这是 **官方默认 / 当前稳定发布版本**。

### `agent/openwork-polish-xhs-logo`

- merge-base：`3b5232736152`（2026-07-18）。
- 只有一个独立 commit：`优化 OpenWork 地球交互与品牌体验`。
- 主要文件：`index.html`、`explore.js`、`styles.css`、`README.md`、小红书源码与构建脚本、品牌图标。
- 主要内容：OpenWork 品牌统一、连续地球场景、悬停/点击岗位卡、简化搜索框、移动端与小红书离线构建。
- 对应 [PR #1](https://github.com/huangbai-AI/OpenWork/pull/1) 已于 2026-07-21 合并；`main` 的 `84d97996` 是其 squash 结果。

判断：早期已完成并正式合入的分支；不宜作为后续开发基础，因为它缺少后续圆钉、国家、聚合与数据更新。

### `feature/cluster-threshold`

- 从 `main` 的 `3b92870c`（2026-07-21 11:15 UTC）分叉。
- 有 6 个独立 commit，涵盖：
  - 聚合阈值；
  - 中国大陆岗位数据；
  - 国家浅色莫兰迪配色与选中态；
  - 国家边缘穿模修复；
  - 发布和岗位选择状态修复。
- 主要文件：`data-china.js`、`explore.js`、`index.html`、`styles.css`、`xhs-tool-src/local-globe.js`、`tests/smoke.mjs`。
- 对应 [PR #2](https://github.com/huangbai-AI/OpenWork/pull/2) 已合并；`main` 最新 `b6fe255` 是将该 6 个 commit squash 后的正式结果。

判断：这是已进入 `main` 的功能开发历史，不是未合并候选版本。除非需要逐 commit 回溯，不建议从它继续。

### `feature/openwork-visual-refinement`

- 以 `feature/cluster-threshold` 的 head `a629196b` 为直接祖先，额外有 **37 个 commit**；因此完整继承了阈值、大陆岗位和国家交互这组改动。
- 相对 `main` 的图关系为 43 ahead / 1 behind；其中 “behind 1” 是 `main` 的 squash commit `b6fe255`。该功能基础已经通过原始的 6 个 commits 存在于本分支，并非实际缺少这一组功能。
- 后续主要工作：
  - 全球工作地图、首页、地球/海陆/国家板块视觉重构；
  - 图钉、悬浮卡、转场、桌面与移动布局优化；
  - 更新最近 30 天岗位数据；
  - 小红书离线包构建、校验、初始化修复、安全区与分页/卡片布局；
  - 新增或调整数据采集与位置富化脚本，以及小红书 smoke test。
- 变更范围明显更大：数据文件、视觉资源、`landing.js`、`explore.js`、构建/采集脚本、测试、小红书源码均有改动。
- 没有发现该 branch 对应的已合并 PR。

判断：它是 **时间上最新、功能和迭代量最大的候选**，但尚未进入默认部署链；应被视为长期视觉 / 跨平台迭代分支，不能只因为提交最新就判为正式版本。

## 3. Version Relationship

```text
初始发布
  └─ 3b523273
      ├─ agent/openwork-polish-xhs-logo
      │    └─ 739eee5  ── squash 合并 ──> main: 84d9799
      │
      └─ main: 84d9799 → 圆钉/交互改进 → 3b92870
                              │
                              ├─ feature/cluster-threshold
                              │    └─ 6 commits → a629196
                              │         └─ squash 合并 ──> main: b6fe255
                              │
                              └─ feature/openwork-visual-refinement
                                   └─ 包含 a629196 + 37 commits → 8f8079b
```

结论：

- `agent/openwork-polish-xhs-logo` 的主要修改已以 squash 形式进入 `main`。
- `feature/cluster-threshold` 的主要修改也已以 squash 形式进入 `main`。
- `feature/openwork-visual-refinement` 继承 `feature/cluster-threshold`，其后续 37 个 commits 尚未见合并到 `main` 的证据。

## 4. Key Differences

- `main`：正式部署基线；功能较完整，提交历史被 squash 整理，适合稳定开发。
- `agent/openwork-polish-xhs-logo`：早期品牌、交互、小红书离线包基础；已被正式版吸收。
- `feature/cluster-threshold`：数据和地图交互增强；已被正式版吸收。
- `feature/openwork-visual-refinement`：
  - 相比 `main`，重点不是单一局部修复，而是大规模视觉重塑、页面转场、移动端/小红书体验、数据刷新与工具链完善；
  - 最像“功能增强 + 平台适配 + 视觉实验”的综合分支；
  - 若要整合，应下一步直接进行远程 diff 审查，尤其核对是否覆盖了 `main` 的 Pages 发布修复及最终状态处理。

## 5. GitHub 可见状态

- 默认 branch：`main`。
- GitHub Pages：已启用、状态为 `built`、HTTPS 已启用，来源为 `main` 的 `/`；站点为 <https://huangbai-ai.github.io/OpenWork/>。
- PR：共 2 个，均已合并；无开放 PR。
- Releases：无。
- Tags：无。
- 仓库为公开、未归档；README 是当前 `main` 对项目能力和数据规模的正式说明。

## 6. Preliminary Recommendation

- 最像当前正式版本：`main`。
- 时间上最新：`feature/openwork-visual-refinement`。
- 包含最多后续开发：`feature/openwork-visual-refinement`，比 `feature/cluster-threshold` 多 37 个直接后续 commits。
- 不建议直接作为基础：
  - `agent/openwork-polish-xhs-logo`：早期且已被合并；
  - `feature/cluster-threshold`：已被 squash 合并，继续开发会造成历史与 `main` 分叉。
- 下一步最值得深入比较的两个版本：
  1. `main`（部署稳定基线）；
  2. `feature/openwork-visual-refinement`（最大后续功能集）。

初步方向是：后续应重点判断是否将 `feature/openwork-visual-refinement` 中的 37 个后续提交选择性或整体整合到 `main`；当前不建议直接把它判定为“最终版本”。
