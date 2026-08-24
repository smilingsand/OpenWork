import { cleanText, classifyWorkMode } from "../jobs/core.mjs";
import { config } from "../config.mjs";
import { toLinkedInKeywords } from "../jobs/keywords.mjs";

const LINKEDIN_SEARCH_URL = "https://www.linkedin.com/jobs/search/";
const MAX_PUBLIC_RESULTS = 25;
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9"
};

function attribute(value = "") {
  return cleanText(value).replace(/&amp;/g, "&");
}

function firstMatch(value, pattern) {
  return value.match(pattern)?.[1] || "";
}

export function buildLinkedInSearchUrl({ keyword, keywordTerms, rangeDays, start = 0 }) {
  const url = new URL(LINKEDIN_SEARCH_URL);
  url.searchParams.set("f_TPR", `r${rangeDays * 24 * 60 * 60}`);
  url.searchParams.set("geoId", config.linkedin.geoId);
  if (start > 0) url.searchParams.set("start", String(start));
  // LinkedIn 需要显式布尔连接，例如："data analytics" AND sydney。
  url.searchParams.set("keywords", toLinkedInKeywords(keywordTerms || keyword));
  return url.toString();
}

export function parseLinkedInSearchResults(html, limit = MAX_PUBLIC_RESULTS) {
  const cards = [...String(html).matchAll(/<li\b[^>]*>([\s\S]*?data-entity-urn="urn:li:jobPosting:\d+"[\s\S]*?)<\/li>/gi)];
  return cards.flatMap((match) => {
    const card = match[1];
    const id = firstMatch(card, /data-entity-urn="urn:li:jobPosting:(\d+)"/i);
    const title = cleanText(firstMatch(card, /<h3\b[^>]*base-search-card__title[^>]*>([\s\S]*?)<\/h3>/i));
    const company = cleanText(firstMatch(card, /<h4\b[^>]*base-search-card__subtitle[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i));
    const location = cleanText(firstMatch(card, /<span\b[^>]*job-search-card__location[^>]*>([\s\S]*?)<\/span>/i));
    const date = attribute(firstMatch(card, /<time\b[^>]*datetime="([^"]+)"/i));
    const sourceUrl = attribute(firstMatch(card, /href="([^"]*\/jobs\/view\/[^"]+)"/i));
    if (!id || !title || !company || !location || !date || !sourceUrl) return [];
    return [{
      id: `linkedin-${id}`,
      title,
      company,
      location,
      date,
      source: "LinkedIn",
      sourceUrl,
      workMode: classifyWorkMode(`${title} ${location} ${card}`),
      detail: "LinkedIn 公开职位搜索结果。"
    }];
  }).slice(0, limit);
}

export function parseLinkedInDeclaredResultCount(html) {
  const text = cleanText(firstMatch(html, /results-context-header__job-count[^>]*>([\s\S]*?)<\/span>/i));
  if (!text || text.includes("+")) return null;
  const number = Number(text.replace(/[^\d]/g, ""));
  return Number.isInteger(number) && number >= 0 ? number : null;
}

async function collectPage(query, start) {
  const response = await fetch(buildLinkedInSearchUrl({ ...query, start }), { headers, signal: query.signal });
  if (!response.ok) throw new Error(`LinkedIn Jobs 返回 HTTP ${response.status}`);
  const html = await response.text();
  if (/No matching jobs found\.|emptyResult=true/i.test(html)) return { jobs: [], declaredCount: 0 };
  return {
    jobs: parseLinkedInSearchResults(html, config.linkedin.pageSize),
    declaredCount: parseLinkedInDeclaredResultCount(html)
  };
}

export const linkedInCollector = {
  name: "LinkedIn",
  async collect(query) {
    const first = await collectPage(query, 0);
    const targetCount = Math.min(config.linkedin.maxResults, first.declaredCount ?? config.linkedin.maxResults);
    const offsets = Array.from({ length: Math.max(0, Math.ceil(targetCount / config.linkedin.pageSize) - 1) }, (_, index) => (index + 1) * config.linkedin.pageSize);
    const rest = await Promise.allSettled(offsets.map((start) => collectPage(query, start)));
    const seen = new Set();
    return [first, ...rest.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])]
      .flatMap((page) => page.jobs)
      .filter((job) => !seen.has(job.id) && seen.add(job.id))
      .slice(0, targetCount);
  }
};
