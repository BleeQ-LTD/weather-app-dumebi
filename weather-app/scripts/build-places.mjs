#!/usr/bin/env node
// Builds public/places.json, the built-in list the search box suggests from.
//
//   npm run build:places                 downloads the GeoNames files and builds
//   npm run build:places -- --from DIR   builds from files already in DIR
//
// Data: GeoNames (https://www.geonames.org), CC BY 4.0. The app credits it in
// the attribution line under the forecast.
//
// What goes in (agreed rules):
//   - cities (and big city districts) with at least 100,000 people
//   - every state / region (first-level division) and every country, always
//   - states and countries use their capital's coordinates for the weather
//   - English names only (GeoNames' main name)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "public", "places.json");
const BASE_URL = "https://download.geonames.org/export/dump/";

const MIN_CITY_POPULATION = 100_000;

// Historical, abandoned, destroyed or otherwise not-real-today places
const EXCLUDED_CODES = new Set(["PPLH", "PPLQ", "PPLW", "PPLCH"]);

// "Edo State" is shown as "Edo"; the full name still matches when typed.
const STATE_SUFFIX = /\s+(state|province|region)$/i;

const KIND = { city: 0, state: 1, country: 2 };

// ---------- Files ----------

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

async function getFile(name, fromDir) {
  if (fromDir) return readFile(path.join(fromDir, name));

  const url = BASE_URL + name;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed (status ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

// Minimal reader for GeoNames' single-file zips (stored or deflated).
function unzipEntry(zip, wanted) {
  const EOCD = 0x06054b50;
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== EOCD) end--;
  if (end < 0) throw new Error("Not a zip file");

  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);

  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const compressedSize = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extraLength = zip.readUInt16LE(p + 30);
    const commentLength = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nameLength);

    if (name === wanted) {
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const data = zip.subarray(start, start + compressedSize);
      return method === 0 ? data : inflateRawSync(data);
    }

    p += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`${wanted} not found in zip`);
}

function rows(text) {
  return String(text)
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t"));
}

// ---------- Build ----------

const round = (n) => Math.round(n * 10000) / 10000;

function englishCountryName(code, fallback) {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return name && name !== code ? name : fallback;
  } catch {
    return fallback;
  }
}

function largest(list) {
  return list.reduce((best, c) => (!best || c.population > best.population ? c : best), null);
}

async function main() {
  const fromDir = argValue("--from");

  const [citiesZip, admin1Text, countryText] = await Promise.all([
    getFile("cities1000.zip", fromDir),
    getFile("admin1CodesASCII.txt", fromDir),
    getFile("countryInfo.txt", fromDir),
  ]);

  // cities1000: every populated place with 1,000+ people. Small ones are only
  // used to find capitals; the list itself keeps 100,000+.
  const allCities = rows(unzipEntry(citiesZip, "cities1000.txt").toString("utf8"))
    .map((c) => ({
      name: c[1],
      latitude: Number(c[4]),
      longitude: Number(c[5]),
      featureCode: c[7],
      country: c[8],
      admin1: c[10],
      population: Number(c[14]) || 0,
    }))
    .filter((c) => !EXCLUDED_CODES.has(c.featureCode));

  const byCountry = new Map();
  const byAdmin1 = new Map();
  for (const c of allCities) {
    if (!byCountry.has(c.country)) byCountry.set(c.country, []);
    byCountry.get(c.country).push(c);
    const key = `${c.country}.${c.admin1}`;
    if (!byAdmin1.has(key)) byAdmin1.set(key, []);
    byAdmin1.get(key).push(c);
  }

  const places = [];

  // Cities
  for (const c of allCities) {
    if (c.population < MIN_CITY_POPULATION) continue;
    places.push([c.name, c.country, KIND.city, round(c.latitude), round(c.longitude), c.population]);
  }
  const cityCount = places.length;

  // States: weather from the capital (PPLA), or the biggest town if unknown
  let skippedStates = 0;
  for (const [code, name] of rows(admin1Text)) {
    const cities = byAdmin1.get(code) ?? [];
    const capital = largest(cities.filter((c) => c.featureCode === "PPLA")) ?? largest(cities);
    if (!capital) {
      skippedStates++;
      continue;
    }

    const shown = name.replace(STATE_SUFFIX, "").trim() || name;
    const aliases = [...new Set([name, `${shown} State`])].filter((a) => a !== shown);
    const population = cities.reduce((sum, c) => sum + c.population, 0);

    places.push([shown, code.split(".")[0], KIND.state, round(capital.latitude), round(capital.longitude), population, aliases]);
  }
  const stateCount = places.length - cityCount;

  // Countries: weather from the capital (PPLC)
  let skippedCountries = 0;
  for (const c of rows(countryText)) {
    const [code, , , , geonamesName, capitalName, , populationText] = c;
    const cities = byCountry.get(code) ?? [];
    const capital =
      largest(cities.filter((x) => x.featureCode === "PPLC")) ??
      largest(cities.filter((x) => x.name === capitalName)) ??
      largest(cities);
    if (!capital) {
      skippedCountries++;
      continue;
    }

    const shown = englishCountryName(code, geonamesName);
    const aliases = geonamesName && geonamesName !== shown ? [geonamesName] : [];

    places.push([shown, code, KIND.country, round(capital.latitude), round(capital.longitude), Number(populationText) || 0, aliases]);
  }
  const countryCount = places.length - cityCount - stateCount;

  // Biggest first, so the app can stop scanning early
  places.sort((a, b) => b[5] - a[5]);
  for (const p of places) if (p[6] && p[6].length === 0) p.length = 6;

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const json = JSON.stringify({
    version: 1,
    source: "GeoNames (CC BY 4.0)",
    // [name, countryCode, kind (0 city, 1 state, 2 country), lat, lon, population, aliases?]
    places,
  });
  await writeFile(OUT_FILE, json);

  console.log(
    `Wrote ${path.relative(ROOT, OUT_FILE)}: ${cityCount} cities, ${stateCount} states, ` +
      `${countryCount} countries (${(json.length / 1024).toFixed(0)} KB). ` +
      `Skipped ${skippedStates} states and ${skippedCountries} countries with no known town.`
  );
}

if (!existsSync(path.join(ROOT, "package.json"))) {
  console.error("Run this from the weather-app project.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
