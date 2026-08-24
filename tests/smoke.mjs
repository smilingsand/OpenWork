import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../backend/src/app.mjs";
import { matchesKeyword, validateSearchRequest } from "../backend/src/jobs/core.mjs";
import { prepareSearchResults } from "../backend/src/jobs/postprocess.mjs";
import { parseLocationCandidate, selectGeocodeResult } from "../backend/src/jobs/locations.mjs";
import { buildLinkedInSearchUrl, parseLinkedInDeclaredResultCount, parseLinkedInSearchResults } from "../backend/src/collectors/linkedin.mjs";
import { parseIni } from "../backend/src/config.mjs";
import { normalizeKeywordInput } from "../backend/src/jobs/keywords.mjs";

assert.deepEqual(parseIni("[linkedin]\nmax_results = 12\n; comment\n[server]\nport=4200"), { "linkedin.max_results": "12", "server.port": "4200" });
assert.deepEqual(normalizeKeywordInput(' “Data Analytics”  Sydney \'Technical Support\' '), {
  keyword: '"data analytics" sydney "technical support"',
  terms: [
    { value: "data analytics", phrase: true },
    { value: "sydney", phrase: false },
    { value: "technical support", phrase: true }
  ]
});
assert.throws(() => normalizeKeywordInput('"data analytics'), /引号未闭合/);
assert.deepEqual(parseLocationCandidate("Taiwan, Jiangsu, China"), { kind: "region" });
assert.deepEqual(parseLocationCandidate("Taiwan，Jiangsu，China"), { kind: "region" });
assert.equal(selectGeocodeResult([
  { name: "Taiwan", admin1: "Jiangsu", country: "China", country_code: "CN", feature_code: "PPL", latitude: 0, longitude: 0 }
], parseLocationCandidate("Taiwan, Jiangsu, China")), null);
assert.equal(selectGeocodeResult([
  { name: "Taipei", admin1: "Taipei", country: "Taiwan", country_code: "TW", feature_code: "PPLA", latitude: 25.03, longitude: 121.57 }
], parseLocationCandidate("Taipei, Taiwan"))?.country_code, "TW");
assert.equal(selectGeocodeResult([
  { name: "London", admin1: "England", country: "United Kingdom", country_code: "GB", feature_code: "PPLC", latitude: 51.5, longitude: -0.12 },
  { name: "London", admin1: "Ontario", country: "Canada", country_code: "CA", feature_code: "PPL", latitude: 42.98, longitude: -81.25 }
], parseLocationCandidate("London")), null);
const remoteSearch = validateSearchRequest({ keyword: "AI", filters: { rangeDays: 14, source: "remote" } });
assert.equal(remoteSearch.rangeDays, 14);
assert.equal(remoteSearch.workMode, "remote");
assert.deepEqual(validateSearchRequest({ keyword: '"Data Analytics" Sydney', filters: { rangeDays: 7, source: "linkedin" } }).keywordTerms, [
  { value: "data analytics", phrase: true }, { value: "sydney", phrase: false }
]);
const linkedInQuery = validateSearchRequest({ keyword: "tm1", filters: { rangeDays: 30, source: "linkedin" } });
const linkedInCandidates = [
  { id: "strong", title: "TM1 Developer", company: "Example", location: "Sydney", date: "2026-08-20", source: "LinkedIn" },
  { id: "weak", title: "Planning Analytics Developer", company: "Example Two", location: "Sydney", date: "2026-08-20", source: "LinkedIn" }
];
const linkedInPrepared = prepareSearchResults([{ jobs: linkedInCandidates, keywordSearch: true }], linkedInQuery);
assert.equal(linkedInPrepared.strongCandidates.length, 1);
assert.equal(linkedInPrepared.weakCandidates.length, 1);
const remotePrepared = prepareSearchResults([{ jobs: linkedInCandidates, keywordSearch: false }], linkedInQuery);
assert.equal(remotePrepared.strongCandidates.length, 1);
assert.equal(remotePrepared.weakCandidates.length, 0);
assert.equal(validateSearchRequest({ keyword: "AI", filters: { rangeDays: 30, source: "anysearch" } }).workMode, "all");
assert.equal(validateSearchRequest({ keyword: "AI", filters: { rangeDays: 30, source: "linkedin" } }).source, "linkedin");
const linkedInSearch = new URL(buildLinkedInSearchUrl({ keyword: '"data analysis" sydney', rangeDays: 7 }));
assert.equal(linkedInSearch.searchParams.get("f_TPR"), "r604800");
assert.equal(linkedInSearch.searchParams.get("geoId"), "92000000");
assert.equal(linkedInSearch.searchParams.get("keywords"), '"data analysis" AND sydney');
assert.equal(new URL(buildLinkedInSearchUrl({ keyword: "tm1", rangeDays: 30, start: 25 })).searchParams.get("start"), "25");
assert.equal(parseLinkedInDeclaredResultCount('<span class="results-context-header__job-count">36</span>'), 36);
assert.equal(parseLinkedInDeclaredResultCount('<span class="results-context-header__job-count">1,000+</span>'), null);
assert.equal(new URL(buildLinkedInSearchUrl({ keyword: "AI", rangeDays: 30 })).searchParams.get("f_TPR"), "r2592000");
const linkedInJobs = parseLinkedInSearchResults(`
  <ul><li><a class="base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:123"><h3 class="base-search-card__title">Data Analyst</h3><h4 class="base-search-card__subtitle"><a>Example Pty Ltd</a></h4><span class="job-search-card__location">Sydney, New South Wales, Australia</span><time datetime="2026-08-24">1 hour ago</time><a href="https://www.linkedin.com/jobs/view/data-analyst-at-example-123">View</a></a></li></ul>`);
assert.deepEqual(linkedInJobs[0], {
  id: "linkedin-123", title: "Data Analyst", company: "Example Pty Ltd", location: "Sydney, New South Wales, Australia",
  date: "2026-08-24", source: "LinkedIn", sourceUrl: "https://www.linkedin.com/jobs/view/data-analyst-at-example-123",
  workMode: "unknown", detail: "LinkedIn 公开职位搜索结果。"
});
assert.deepEqual(parseLinkedInSearchResults("No matching jobs found."), []);
assert.equal(matchesKeyword({ title: "Data Analysis", company: "Example", location: "Sydney", category: "开发", summary: "", tags: [] }, '"data analysis" sydney'), true);

const app = createApp();
app.listen(0, "127.0.0.1");
await once(app, "listening");
const { port } = app.address();
const baseUrl = `http://127.0.0.1:${port}`;

const health = await fetch(`${baseUrl}/api/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).status, "ok");

const invalid = await fetch(`${baseUrl}/api/searches`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ keyword: "", filters: { rangeDays: 30, source: "remote" } })
});
assert.equal(invalid.status, 400);

const malformedKeyword = await fetch(`${baseUrl}/api/searches`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ keyword: '"Data Analytics', filters: { rangeDays: 30, source: "linkedin" } })
});
assert.equal(malformedKeyword.status, 400);
assert.match((await malformedKeyword.json()).error, /引号未闭合/);

app.close();
await once(app, "close");
console.log("动态 API 冒烟检查通过");
