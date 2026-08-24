import { cleanText } from "../jobs/core.mjs";
import { capResults, config } from "../config.mjs";

const feeds = [
  "remote-programming-jobs", "remote-design-jobs", "remote-devops-sysadmin-jobs", "remote-product-jobs",
  "remote-sales-and-marketing-jobs", "remote-customer-support-jobs", "remote-management-and-finance-jobs", "all-other-remote-jobs"
];
const headers = { "User-Agent": "OpenWork/2.0 (+dynamic-job-search)" };
const tag = (block, name) => cleanText(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1] || "");

async function getText(url, signal) {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

export const rssCollectors = [
  {
    name: "We Work Remotely",
    keywordSearch: false,
    async collect({ signal }) {
      const xmls = await Promise.all(feeds.map((feed) => getText(`https://weworkremotely.com/categories/${feed}.rss`, signal)));
      return capResults(xmls.flatMap((xml, feedIndex) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match, index) => {
        const item = match[1];
        const fullTitle = tag(item, "title");
        const separator = fullTitle.indexOf(":");
        const url = tag(item, "link") || tag(item, "guid");
        return {
          id: `wwr-${encodeURIComponent(url || `${fullTitle}-${index}`)}`,
          title: separator > 0 ? fullTitle.slice(separator + 1) : fullTitle,
          company: separator > 0 ? fullTitle.slice(0, separator) : "远程招聘团队",
          location: tag(item, "region") || tag(item, "country") || "全球远程", workMode: "remote", date: tag(item, "pubDate"),
          source: "We Work Remotely", sourceUrl: url, tags: [feeds[feedIndex], tag(item, "category")], detail: tag(item, "description")
        };
      })), config.remote.weWorkRemotelyMaxResults);
    }
  },
  {
    name: "NoDesk",
    keywordSearch: false,
    async collect({ signal }) {
      const xml = await getText("https://nodesk.co/remote-jobs/index.xml", signal);
      return capResults([...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match, index) => {
        const item = match[1];
        const fullTitle = tag(item, "title");
        const position = fullTitle.lastIndexOf(" at ");
        const url = tag(item, "link") || tag(item, "guid");
        return {
          id: `nodesk-${encodeURIComponent(url || `${fullTitle}-${index}`)}`,
          title: position > 0 ? fullTitle.slice(0, position) : fullTitle,
          company: position > 0 ? fullTitle.slice(position + 4) : "远程招聘团队",
          location: "全球远程", workMode: "remote", date: tag(item, "pubDate"), source: "NoDesk", sourceUrl: url,
          detail: tag(item, "description")
        };
      }), config.remote.noDeskMaxResults);
    }
  }
];
