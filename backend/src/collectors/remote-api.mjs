import { cleanText } from "../jobs/core.mjs";
import { capResults, config } from "../config.mjs";

const headers = { "User-Agent": "OpenWork/2.0 (+dynamic-job-search)" };

async function getJson(url, signal) {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

export const remoteCollectors = [
  {
    name: "Remote OK",
    keywordSearch: false,
    async collect({ signal }) {
      const data = await getJson("https://remoteok.com/api", signal);
      return capResults((Array.isArray(data) ? data.slice(1) : []).map((job) => ({
        id: `remoteok-${job.id}`, title: job.position, company: job.company, location: job.location || "全球远程",
        workMode: "remote", salary: job.salary_min || job.salary_max ? `$${job.salary_min || 0}–${job.salary_max || "?"} / 年` : "未公开",
        date: job.date || new Date(Number(job.epoch) * 1000), source: "Remote OK", sourceUrl: job.url || job.apply_url,
        tags: job.tags || [], detail: job.description
      })), config.remote.remoteOkMaxResults);
    }
  },
  {
    name: "Remotive",
    keywordSearch: false,
    async collect({ signal }) {
      const data = await getJson(`https://remotive.com/api/remote-jobs?limit=${config.remote.remotiveMaxResults}`, signal);
      return capResults((data.jobs || []).map((job) => ({
        id: `remotive-${job.id}`, title: job.title, company: job.company_name, location: job.candidate_required_location || "全球远程",
        workMode: "remote", salary: job.salary, date: job.publication_date, source: "Remotive", sourceUrl: job.url,
        tags: [job.category, ...(job.tags || [])], detail: job.description
      })), config.remote.remotiveMaxResults);
    }
  },
  {
    name: "Jobicy",
    keywordSearch: false,
    async collect({ signal }) {
      const data = await getJson(`https://jobicy.com/api/v2/remote-jobs?count=${config.remote.jobicyMaxResults}`, signal);
      return capResults((data.jobs || []).map((job) => ({
        id: `jobicy-${job.id}`, title: job.jobTitle, company: job.companyName, location: job.jobGeo || "全球远程",
        workMode: "remote", salary: job.jobSalary, date: job.pubDate, source: "Jobicy", sourceUrl: job.url,
        tags: [...(job.jobIndustry || []), ...(job.jobType || [])], detail: job.jobExcerpt || job.jobDescription
      })), config.remote.jobicyMaxResults);
    }
  },
  {
    name: "Himalayas",
    keywordSearch: false,
    async collect({ signal }) {
      const first = await getJson("https://himalayas.app/jobs/api?offset=0", signal);
      const pages = [first];
      const count = Math.min(config.remote.himalayasMaxPages, Math.ceil((first.totalCount || 20) / 20));
      const rest = await Promise.all(Array.from({ length: Math.max(0, count - 1) }, (_, index) =>
        getJson(`https://himalayas.app/jobs/api?offset=${(index + 1) * 20}`, signal)));
      pages.push(...rest);
      return pages.flatMap((page) => page.jobs || []).map((job) => ({
        id: `himalayas-${encodeURIComponent(job.guid || job.applicationLink)}`, title: job.title, company: job.companyName,
        location: (job.locationRestrictions || []).join("、") || "全球远程", workMode: "remote",
        salary: job.minSalary || job.maxSalary ? `${job.currency || "USD"} ${job.minSalary || ""}–${job.maxSalary || ""}` : "未公开",
        date: new Date(Number(job.pubDate) * 1000), source: "Himalayas", sourceUrl: job.applicationLink || job.guid,
        tags: [...(job.parentCategories || []), job.employmentType], detail: job.excerpt || job.description
      }));
    }
  }
];

export async function collectArbeitnow({ signal }) {
  const all = [];
  for (let page = 1; page <= config.remote.arbeitnowMaxPages; page += 1) {
    const data = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, signal);
    all.push(...(data.data || []));
    if (!data.links?.next) break;
  }
  return all.map((job) => ({
    id: `arbeitnow-${job.slug}`, title: job.title, company: job.company_name, location: job.location || "地点见职位页",
    workMode: job.remote ? "remote" : undefined, salary: "未公开", date: new Date(Number(job.created_at) * 1000),
    source: "Arbeitnow", sourceUrl: job.url, tags: [...(job.tags || []), ...(job.job_types || [])], detail: cleanText(job.description)
  }));
}
