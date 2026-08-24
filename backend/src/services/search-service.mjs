import { validateSearchRequest, filterAndDedupe } from "../jobs/core.mjs";
import { remoteCollectors, collectArbeitnow } from "../collectors/remote-api.mjs";
import { rssCollectors } from "../collectors/remote-rss.mjs";
import { anySearchCollector } from "../collectors/anysearch.mjs";
import { enrichLocations } from "../jobs/locations.mjs";

const CACHE_TTL_MS = Number(process.env.SEARCH_CACHE_TTL_MS || 5 * 60 * 1000);
const SOURCE_TIMEOUT_MS = Number(process.env.SOURCE_TIMEOUT_MS || 20000);

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
      collectors.push(...remoteCollectors, ...rssCollectors, { name: "Arbeitnow", collect: collectArbeitnow });
    } else {
      if (!anySearchCollector.enabled()) throw new Error("未配置 AnySearch。请设置 ANYSEARCH_CLI 后重启后端服务。");
      collectors.push(anySearchCollector);
    }
    const sources = [];
    const batches = await Promise.all(collectors.map(async (collector) => {
      onProgress({ source: collector.name, state: "running" });
      try {
        const jobs = await withTimeout(collector, query);
        sources.push({ name: collector.name, state: "completed", count: jobs.length });
        onProgress({ source: collector.name, state: "completed", count: jobs.length });
        return jobs;
      } catch (error) {
        sources.push({ name: collector.name, state: "failed", message: error.message });
        onProgress({ source: collector.name, state: "failed", message: error.message });
        return [];
      }
    }));
    const jobs = await enrichLocations(filterAndDedupe(batches.flat(), query));
    const result = { query: { keyword: query.keyword, filters: { rangeDays: query.rangeDays, source: query.source }, window: { since: query.since.toISOString(), until: query.until.toISOString() } }, jobs, sources, cached: false };
    this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  }
}
