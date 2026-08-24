import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const settingsPath = path.join(root, "settings.ini");

export function parseIni(text = "") {
  const values = {};
  let section = "";
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const header = line.match(/^\[([^\]]+)]$/);
    if (header) {
      section = header[1].trim().toLowerCase();
      continue;
    }
    const separator = line.indexOf("=");
    if (!section || separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    if (key) values[`${section}.${key}`] = line.slice(separator + 1).trim();
  }
  return values;
}

function readSettings() {
  try {
    return parseIni(readFileSync(settingsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

const settings = readSettings();

function value(section, key, environment, fallback = "") {
  const override = process.env[environment];
  return override?.trim() || settings[`${section}.${key}`] || fallback;
}

function integer(section, key, environment, fallback, { min, max, allowZero = false }) {
  const parsed = Number(value(section, key, environment, String(fallback)));
  if (!Number.isInteger(parsed) || parsed < (allowZero ? 0 : min) || parsed > max) return fallback;
  return parsed;
}

function numericIdentifier(section, key, environment, fallback) {
  const candidate = value(section, key, environment, fallback);
  return /^\d+$/.test(candidate) ? candidate : fallback;
}

export const config = {
  server: {
    port: integer("server", "port", "PORT", 4173, { min: 1, max: 65535 }),
    sourceTimeoutMs: integer("server", "source_timeout_ms", "SOURCE_TIMEOUT_MS", 20000, { min: 1000, max: 120000 }),
    searchCacheTtlMs: integer("server", "search_cache_ttl_ms", "SEARCH_CACHE_TTL_MS", 5 * 60 * 1000, { min: 0, max: 24 * 60 * 60 * 1000, allowZero: true })
  },
  remote: {
    remoteOkMaxResults: integer("remote", "remote_ok_max_results", "REMOTE_OK_MAX_RESULTS", 0, { min: 1, max: 5000, allowZero: true }),
    remotiveMaxResults: integer("remote", "remotive_max_results", "REMOTIVE_MAX_RESULTS", 500, { min: 1, max: 500 }),
    jobicyMaxResults: integer("remote", "jobicy_max_results", "JOBICY_MAX_RESULTS", 50, { min: 1, max: 100 }),
    himalayasMaxPages: integer("remote", "himalayas_max_pages", "HIMALAYAS_MAX_PAGES", 10, { min: 1, max: 50 }),
    weWorkRemotelyMaxResults: integer("remote", "we_work_remotely_max_results", "WE_WORK_REMOTELY_MAX_RESULTS", 0, { min: 1, max: 5000, allowZero: true }),
    noDeskMaxResults: integer("remote", "nodesk_max_results", "NODESK_MAX_RESULTS", 0, { min: 1, max: 5000, allowZero: true }),
    arbeitnowMaxPages: integer("remote", "arbeitnow_max_pages", "ARBEITNOW_MAX_PAGES", 6, { min: 1, max: 100 })
  },
  anySearch: {
    cliPath: value("anysearch", "cli_path", "ANYSEARCH_CLI"),
    maxResults: integer("anysearch", "max_results", "ANYSEARCH_MAX_RESULTS", 10, { min: 1, max: 100 })
  },
  linkedin: {
    geoId: numericIdentifier("linkedin", "geo_id", "LINKEDIN_GEO_ID", "92000000"),
    maxResults: integer("linkedin", "max_results", "LINKEDIN_MAX_RESULTS", 50, { min: 1, max: 200 }),
    pageSize: integer("linkedin", "page_size", "LINKEDIN_PAGE_SIZE", 25, { min: 10, max: 25 })
  }
};

export function capResults(items, maxResults) {
  return maxResults > 0 ? items.slice(0, maxResults) : items;
}
