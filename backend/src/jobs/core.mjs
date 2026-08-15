const WORK_MODES = new Set(["all", "remote", "onsite"]);
const RANGE_DAYS = new Set([1, 3, 7, 14, 30]);

export function createWindow(rangeDays, now = new Date()) {
  if (!RANGE_DAYS.has(rangeDays)) throw new Error("rangeDays 仅支持 1、3、7、14、30");
  const until = new Date(now);
  until.setUTCHours(23, 59, 59, 999);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (rangeDays - 1));
  since.setUTCHours(0, 0, 0, 0);
  return { since, until };
}

export function validateSearchRequest(input = {}) {
  const keyword = String(input.keyword || "").trim().slice(0, 120);
  if (!keyword) throw new Error("请输入职业关键词");
  const filters = input.filters || {};
  const rangeDays = Number(filters.rangeDays ?? 30);
  const workMode = String(filters.workMode ?? "all");
  if (!RANGE_DAYS.has(rangeDays)) throw new Error("时间范围仅支持 1、3、7、14、30 天");
  if (!WORK_MODES.has(workMode)) throw new Error("工作方式仅支持 all、remote、onsite");
  return { keyword, rangeDays, workMode, ...createWindow(rangeDays) };
}

export function cleanText(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

export function categoryFor(title, detail = "") {
  const text = `${title} ${detail}`.toLocaleLowerCase("en");
  if (/nurse|doctor|medical|clinical|health|therap|pharma|patient/.test(text)) return "医疗";
  if (/teacher|tutor|instructor|educat|curriculum/.test(text)) return "教育";
  if (/accountant|accounting|finance|financial|payroll|bookkeep|controller|tax|audit/.test(text)) return "财务";
  if (/lawyer|legal|counsel|compliance|paralegal|attorney/.test(text)) return "法务";
  if (/writer|editor|copywriter|translation|translator|journalist/.test(text)) return "写作";
  if (/customer support|customer service|client support|helpdesk|customer success/.test(text)) return "客服";
  if (/assistant|administrator|administrative|coordinator|recruit|human resources/.test(text)) return "行政";
  if (/designer|design|creative|art director|\bux\b|\bui\b/.test(text)) return "设计";
  if (/machine learning|artificial intelligence|\bai\b|llm|data scientist/.test(text)) return "人工智能";
  if (/product manager|product owner|program manager|project manager/.test(text)) return "产品";
  if (/marketing|communications|seo|growth|brand|social media/.test(text)) return "市场";
  if (/sales|account executive|business development|partnership|account manager/.test(text)) return "销售";
  if (/game|gaming|level designer/.test(text)) return "游戏";
  if (/engineer|developer|devops|software|programmer|architect|\bqa\b|security|data/.test(text)) return "开发";
  return "运营";
}

export function classifyWorkMode(value, fallback = "unknown") {
  const text = cleanText(value).toLocaleLowerCase("en");
  if (/hybrid|混合办公/.test(text)) return "hybrid";
  if (/remote|work from home|home-based|远程|居家/.test(text)) return "remote";
  if (/on[ -]?site|in[ -]?office|office[- ]based|到岗|坐班/.test(text)) return "onsite";
  return fallback;
}

export function isWithinWindow(value, since, until) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date >= since && date <= until;
}

export function matchesKeyword(job, keyword) {
  const tokens = String(keyword).trim().toLocaleLowerCase("zh-CN").split(/\s+/).filter(Boolean);
  const haystack = [job.title, job.company, job.category, job.location, job.mapCity, job.summary, ...(job.tags || [])]
    .join(" ").toLocaleLowerCase("zh-CN");
  return tokens.every((token) => haystack.includes(token));
}

export function normalizeJob(raw, context) {
  const postedDate = new Date(raw.postedAt || raw.date);
  if (!Number.isFinite(postedDate.getTime())) return null;
  const title = cleanText(raw.title) || "未命名岗位";
  const company = cleanText(raw.company) || "公开招聘团队";
  const location = cleanText(raw.location) || "地点见职位页";
  const workMode = raw.workMode || classifyWorkMode(`${location} ${(raw.tags || []).join(" ")} ${raw.detail || ""}`, raw.remote === true ? "remote" : "unknown");
  const postedAt = postedDate.toISOString().slice(0, 10);
  const category = raw.category || categoryFor(title, `${raw.detail || ""} ${(raw.tags || []).join(" ")}`);
  const sourceUrl = cleanText(raw.sourceUrl || raw.url);
  return {
    id: raw.id || `${raw.source || "job"}-${encodeURIComponent(sourceUrl || `${company}-${title}-${postedAt}`)}`,
    title,
    company,
    category,
    location,
    workMode,
    remote: workMode === "remote",
    salary: cleanText(raw.salary) || "未公开",
    postedAt,
    posted: raw.posted || postedAt,
    attention: Number(raw.attention) || 8,
    source: cleanText(raw.source) || "公开职位源",
    sourceUrl,
    summary: cleanText(raw.summary) || `${company} 正在招聘 ${title}。具体要求请查看原职位页。`,
    tags: [...new Set([category, workMode === "remote" ? "远程" : workMode === "onsite" ? "到岗" : "", ...(raw.tags || []).map(cleanText)])].filter(Boolean).slice(0, 6),
    evidence: raw.evidence || "职位页"
  };
}

export function filterAndDedupe(jobs, query) {
  const unique = new Map();
  for (const raw of jobs) {
    const job = normalizeJob(raw, query);
    if (!job || !isWithinWindow(job.postedAt, query.since, query.until)) continue;
    if (!matchesKeyword(job, query.keyword)) continue;
    if (query.workMode !== "all" && job.workMode !== query.workMode) continue;
    const key = `${job.company}|${job.title}|${job.location}`.toLocaleLowerCase("en");
    if (!unique.has(key)) unique.set(key, job);
  }
  return [...unique.values()].sort((a, b) => b.postedAt.localeCompare(a.postedAt) || b.attention - a.attention);
}
