import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../backend/src/app.mjs";
import { parseLocationCandidate, selectGeocodeResult } from "../backend/src/jobs/locations.mjs";

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
  body: JSON.stringify({ keyword: "", filters: { rangeDays: 30, workMode: "all" } })
});
assert.equal(invalid.status, 400);

app.close();
await once(app, "close");
console.log("动态 API 冒烟检查通过");
