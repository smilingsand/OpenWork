import { validateSearchRequest } from "../jobs/core.mjs";
import { remoteCollectors, collectArbeitnow } from "../collectors/remote-api.mjs";
import { rssCollectors } from "../collectors/remote-rss.mjs";
import { anySearchCollector } from "../collectors/anysearch.mjs";
import { linkedInCollector } from "../collectors/linkedin.mjs";
import { postprocessSearchResults } from "../jobs/postprocess.mjs";
import { config } from "../config.mjs";

const CACHE_TTL_MS = config.server.searchCacheTtlMs;
const SOURCE_TIMEOUT_MS = config.server.sourceTimeoutMs;

function withTimeout(collector, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  return collector.collect({ ...query, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

export class SearchService {
  constructor() { this.cache = new Map(); }

  async search(input, onProgress = () => {}) {
    const query = validateSearchRequest(input);
    const cacheKey = JSON.stringify({ keyword: query.keyword.toLocaleLowerCase("zh-CN"), rangeDays: query.rangeDays, source: query.source });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.result, cached: true };

    const collectors = [];
    if (query.source === "remote") {
      collectors.push(...remoteCollectors, ...rssCollectors, { name: "Arbeitnow", keywordSearch: false, collect: collectArbeitnow });
    } else if (query.source === "anysearch") {
      if (!anySearchCollector.enabled()) throw new Error("未配置 AnySearch。请设置 ANYSEARCH_CLI 后重启后端服务。");
      collectors.push(anySearchCollector);
    } else {
      collectors.push(linkedInCollector);
    }
    const sources = [];
    const batches = await Promise.all(collectors.map(async (collector) => {
      onProgress({ source: collector.name, state: "running" });
      try {
        const jobs = await withTimeout(collector, query);
        sources.push({ name: collector.name, state: "completed", count: jobs.length });
        onProgress({ source: collector.name, state: "completed", count: jobs.length });
        return { jobs, keywordSearch: collector.keywordSearch };
      } catch (error) {
        sources.push({ name: collector.name, state: "failed", message: error.message });
        onProgress({ source: collector.name, state: "failed", message: error.message });
        return { jobs: [], keywordSearch: collector.keywordSearch };
      }
    }));
    const { jobs, weakJobs, relevance } = await postprocessSearchResults(batches, query);
    const result = {
      query: { keyword: query.keyword, keywordTerms: query.keywordTerms, filters: { rangeDays: query.rangeDays, source: query.source }, window: { since: query.since.toISOString(), until: query.until.toISOString() } },
      jobs,
      weakJobs,
      relevance,
      sources,
      cached: false
    };
    this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  }
}
