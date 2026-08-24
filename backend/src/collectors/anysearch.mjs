import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cleanText, classifyWorkMode } from "../jobs/core.mjs";
import { config } from "../config.mjs";

const execFileAsync = promisify(execFile);

function field(details, start, endNames) {
  const ends = endNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return details.match(new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(.*?)\\s+(?=${ends})`, "s"))?.[1]?.trim() || "";
}

export const anySearchCollector = {
  name: "AnySearch (Adzuna)",
  enabled() { return Boolean(config.anySearch.cliPath); },
  async collect({ keyword }) {
    const cli = config.anySearch.cliPath;
    if (!cli) throw new Error("未配置 ANYSEARCH_CLI");
    const params = JSON.stringify({ type: "GeneralJobs", keyword, location: "", salary_min: "" });
    const { stdout } = await execFileAsync("node", [cli, "search", keyword, "--domain", "business", "--sub_domain", "business.jobs", "--sdp", params, "--max_results", String(config.anySearch.maxResults)], { timeout: 45000, maxBuffer: 12 * 1024 * 1024 });
    const headings = [...stdout.matchAll(/^### \d+\. (.+)$/gm)];
    return headings.flatMap((heading, index) => {
      const block = stdout.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? stdout.length);
      const sourceUrl = block.match(/- \*\*URL\*\*: (\S+)/)?.[1];
      const postedAt = block.match(/Posted:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      if (!sourceUrl || !postedAt) return [];
      const title = heading[1].replace(/\s+@\s+.*$/, "").trim();
      const location = field(block, "Location:", ["Salary:", "Contract:", "Category:", "Posted:"]) || "地点见职位页";
      return [{ id: `anysearch-${encodeURIComponent(sourceUrl)}`, title, company: field(block, "Company:", ["Location:"]) || "公开招聘团队", location,
        workMode: classifyWorkMode(`${title} ${location} ${block}`), date: postedAt, source: "AnySearch (Adzuna)", sourceUrl,
        salary: field(block, "Salary:", ["Contract:", "Category:", "Posted:"]), detail: cleanText(block) }];
    });
  }
};
