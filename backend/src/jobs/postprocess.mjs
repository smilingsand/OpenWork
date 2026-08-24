import { isWithinWindow, matchesKeyword, normalizeJob } from "./core.mjs";
import { enrichLocations } from "./locations.mjs";

function candidateKey(job) {
  return `${job.company}|${job.title}|${job.location}`.toLocaleLowerCase("en");
}

/**
 * 所有 connector 交付已初步解析的 RawJob；此处集中完成标准化、日期/方式过滤、去重与相关性分组。
 */
export function prepareSearchResults(batches, query) {
  const unique = new Map();
  for (const batch of batches) {
    for (const raw of batch.jobs || []) {
      const job = normalizeJob(raw, query);
      if (!job || !isWithinWindow(job.postedAt, query.since, query.until)) continue;
      if (query.workMode !== "all" && job.workMode !== query.workMode) continue;
      const key = candidateKey(job);
      const existing = unique.get(key);
      if (existing) {
        existing.keywordSearch ||= Boolean(batch.keywordSearch);
      } else {
        unique.set(key, { job, keywordSearch: Boolean(batch.keywordSearch) });
      }
    }
  }
  const candidates = [...unique.values()].sort((first, second) => (
    second.job.postedAt.localeCompare(first.job.postedAt) || second.job.attention - first.job.attention
  ));
  const strongCandidates = candidates.filter(({ job }) => matchesKeyword(job, query.keyword)).map(({ job }) => job);
  // 只有上游已按关键词召回的来源，其未直接命中岗位才具有“弱相关”含义。
  const weakCandidates = candidates.filter(({ job, keywordSearch }) => keywordSearch && !matchesKeyword(job, query.keyword)).map(({ job }) => job);
  return { strongCandidates, weakCandidates };
}

export async function postprocessSearchResults(batches, query) {
  const { strongCandidates, weakCandidates } = prepareSearchResults(batches, query);
  const [jobs, weakJobs] = await Promise.all([enrichLocations(strongCandidates), enrichLocations(weakCandidates)]);
  return { jobs, weakJobs, relevance: { strong: jobs.length, weak: weakJobs.length } };
}
