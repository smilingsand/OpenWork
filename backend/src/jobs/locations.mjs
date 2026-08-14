const nonCity = /^(?:global|worldwide|anywhere|remote|远程|全球|europe|asia|africa|america|united states|\busa\b|canada|united kingdom|\buk\b|germany|france|australia|india|china|japan|taiwan|hong kong|macao|macau)$/i;
const cache = new Map();

function normalizePlace(value) {
  return String(value || "")
    .toLocaleLowerCase("en")
    .replace(/[.'’_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedAliases(value) {
  const normalized = normalizePlace(value);
  const aliases = new Set([normalized]);
  if (["us", "u s", "usa", "u s a", "united states of america"].includes(normalized)) aliases.add("united states");
  if (["uk", "u k", "great britain", "britain"].includes(normalized)) aliases.add("united kingdom");
  if (["taiwan province of china", "taiwan china"].includes(normalized)) aliases.add("taiwan");
  return aliases;
}

export function parseLocationCandidate(location) {
  const parts = String(location || "")
    .replace(/\b(remote|hybrid|onsite)\b/gi, "")
    .replace(/远程|混合办公|到岗/g, "")
    .split(/[;,，|/、]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const city = parts[0]?.slice(0, 100) || "";
  if (!city) return { kind: "unknown" };
  if (nonCity.test(city)) return { kind: "region" };
  return { kind: "city", city, context: parts.slice(1, 4).map((part) => part.slice(0, 100)) };
}

function exactCityMatch(item, city) {
  return normalizePlace(item.name) === normalizePlace(city);
}

function matchesContext(item, context) {
  const resultAliases = [item.name, item.admin1, item.country, item.country_code]
    .flatMap((value) => [...normalizedAliases(value)]);
  return context.some((part) => normalizedAliases(part).size
    && [...normalizedAliases(part)].some((alias) => resultAliases.includes(alias)));
}

export function selectGeocodeResult(results, place) {
  if (place?.kind !== "city") return null;
  const cities = (results || []).filter((item) => /^PPL/.test(item.feature_code || "") && exactCityMatch(item, place.city));
  if (!cities.length) return null;
  if (place.context.length) {
    const contextual = cities.filter((item) => matchesContext(item, place.context));
    return contextual.length === 1 ? contextual[0] : null;
  }
  const distinctAreas = new Set(cities.map((item) => `${item.country_code || item.country || ""}|${item.admin1 || ""}`));
  return distinctAreas.size === 1 && cities.length === 1 ? cities[0] : null;
}

async function geocode(place) {
  const cacheKey = JSON.stringify(place);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const request = new URL("https://geocoding-api.open-meteo.com/v1/search");
  request.searchParams.set("name", place.city);
  request.searchParams.set("count", "5");
  request.searchParams.set("language", "en");
  request.searchParams.set("format", "json");
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
    const data = response.ok ? await response.json() : {};
    const city = selectGeocodeResult(data.results, place);
    const result = city ? { lat: city.latitude, lng: city.longitude, mapCity: [city.name, city.admin1, city.country].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(", ") } : null;
    cache.set(cacheKey, result);
    return result;
  } catch { return null; }
}

export async function enrichLocations(jobs, concurrency = 6) {
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const place = parseLocationCandidate(job.location);
      const mapped = place.kind === "city" ? await geocode(place) : null;
      if (mapped) Object.assign(job, mapped, { mapPrecision: "city", mapBasis: "job-city" });
      else Object.assign(job, { mapPrecision: place.kind === "region" ? "region" : "global", mapBasis: "eligibility-region" });
    }
  }));
  return jobs;
}
