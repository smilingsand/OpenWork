# 配置参考

OpenWork 从项目根目录的 [settings.ini](../settings.ini) 读取默认配置。环境变量优先于 INI 值；这使部署环境无需修改版本库中的文件。配置改动需重启 `npm run dev` 后生效。

## 安全规则

- 不要在 `settings.ini` 写入 API Key、Cookie、密码、访问令牌或个人路径以外的秘密。
- AnySearch CLI 路径属于机器相关参数，优先使用 `ANYSEARCH_CLI` 环境变量。
- 不要用项目配置绕过第三方的登录、验证码、限流或服务条款。

## `[server]`

| INI 键 | 环境变量 | 默认值 | 范围/说明 |
| --- | --- | --- | --- |
| `port` | `PORT` | `4173` | 服务监听端口。 |
| `source_timeout_ms` | `SOURCE_TIMEOUT_MS` | `20000` | 单一 connector 超时，1,000–120,000 毫秒。 |
| `search_cache_ttl_ms` | `SEARCH_CACHE_TTL_MS` | `300000` | 内存查询缓存，0–86,400,000 毫秒；设为 0 禁用缓存。 |

## `[remote]`

| INI 键 | 环境变量 | 默认值 |
| --- | --- | ---: |
| `remote_ok_max_results` | `REMOTE_OK_MAX_RESULTS` | 0 |
| `remotive_max_results` | `REMOTIVE_MAX_RESULTS` | 500 |
| `jobicy_max_results` | `JOBICY_MAX_RESULTS` | 50 |
| `himalayas_max_pages` | `HIMALAYAS_MAX_PAGES` | 10 |
| `we_work_remotely_max_results` | `WE_WORK_REMOTELY_MAX_RESULTS` | 0 |
| `nodesk_max_results` | `NODESK_MAX_RESULTS` | 0 |
| `arbeitnow_max_pages` | `ARBEITNOW_MAX_PAGES` | 6 |

`0` 表示不额外在 OpenWork 一侧截断；不表示上游一定返回无限结果。其余项目会由配置解析器进行安全范围校验。

## `[anysearch]`

| INI 键 | 环境变量 | 默认值 | 说明 |
| --- | --- | ---: | --- |
| `cli_path` | `ANYSEARCH_CLI` | 空 | Node 可执行的 AnySearch CLI 绝对路径。 |
| `max_results` | `ANYSEARCH_MAX_RESULTS` | 10 | 单次 `business.jobs` 请求的候选上限，1–100。 |

示例（PowerShell，仅当前终端有效）：

```powershell
$env:ANYSEARCH_CLI = 'C:\Users\you\.codex\skills\anysearch-skill\scripts\anysearch_cli.js'
```

CLI 的认证由 AnySearch 自身管理；本项目不读取或保存 API Key。未配置 CLI 时，选择 AnySearch 会返回明确错误。

## `[linkedin]`

| INI 键 | 环境变量 | 默认值 | 说明 |
| --- | --- | ---: | --- |
| `geo_id` | `LINKEDIN_GEO_ID` | `92000000` | LinkedIn 地理实体编号；默认 Worldwide。仅接受数字。 |
| `max_results` | `LINKEDIN_MAX_RESULTS` | 50 | 匿名公开页安全总上限，1–200。 |
| `page_size` | `LINKEDIN_PAGE_SIZE` | 25 | 单页解析数量，10–25。 |

关键词中的 `Sydney` 或 `Australia` 只是 LinkedIn `keywords` 参数的一部分，不会自动映射成 `geo_id`。如需改变地域范围，应显式配置已知有效的 LinkedIn 地理编号。

## 配置排错

1. 修改 INI/环境变量后先停止已有 `npm run dev`，再重新启动。
2. 访问 `GET /api/health` 检查服务和可用来源配置。
3. AnySearch 失败时先确认 `ANYSEARCH_CLI` 指向存在的 `.js` 文件，并确认该 CLI 在当前用户环境可认证。
4. LinkedIn 数量偏少、分页中止或来源失败时，应视为公开页的可见性、限流或 HTML 变化风险；不要通过 Cookie/登录绕过。
