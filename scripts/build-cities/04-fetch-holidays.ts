/**
 * Fetch public holidays for every country that appears in our data (city
 * country codes ∪ zone country lists) from the free Nager.Date API and emit
 * data/holidays.json.
 *
 * Build-time + committed on purpose: pages are static, so a runtime call (or a
 * live "there's a holiday today" claim) would either add a network dependency
 * or go stale. A baked current-year calendar is durable SEO content. Refresh
 * annually (re-run `pnpm data:holidays`) — and at the year boundary — then
 * commit the diff, same model as data/cities.json.
 *
 * Run: `pnpm data:holidays` (tsx scripts/build-cities/04-fetch-holidays.ts).
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import citiesData from '@/data/cities.json';
import { zones } from '@/data/zones';
import type { City } from '@/lib/cities/types';

const OUT_PATH = join(import.meta.dirname, '..', '..', 'data', 'holidays.json');

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  global: boolean;
}

interface Holiday {
  date: string; // ISO yyyy-mm-dd
  name: string; // English name
  localName: string;
}

interface HolidaysFile {
  year: number;
  holidays: Record<string, Holiday[]>;
}

/** Country codes that actually appear on a page: any city's country + any zone's countries. */
function inUseCountryCodes(): string[] {
  const codes = new Set<string>();
  for (const c of citiesData as City[]) codes.add(c.country_code);
  for (const z of zones) for (const code of z.countries) codes.add(code);
  return [...codes].sort();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch one country's holidays. Returns null (clean skip) when Nager has no
 * data: a 404 (invalid code) or a 204 No Content / empty body (supported code
 * but no holiday set — common for much of Africa, the Middle East and Asia).
 * Retries only genuine transient errors (429 / 5xx).
 */
async function fetchHolidays(year: number, code: string): Promise<Holiday[] | null> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** attempt); // 1s, 2s, 4s backoff
    try {
      const res = await fetch(url);
      if (res.status === 404 || res.status === 204) return null; // no data — expected
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); // 429/5xx → retry
      const body = (await res.text()).trim();
      if (!body) return null; // empty 200 body — treat as no data
      const data = JSON.parse(body) as NagerHoliday[];
      // National holidays only — drop regional/county-specific ones to keep the
      // page-level list clean and country-accurate.
      return data
        .filter((h) => h.global)
        .map((h) => ({ date: h.date, name: h.name, localName: h.localName }));
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr ?? new Error('unknown error');
}

async function main() {
  const year = new Date().getFullYear();
  const codes = inUseCountryCodes();
  console.warn(`Fetching ${year} holidays for ${codes.length} countries...`);

  const holidays: Record<string, Holiday[]> = {};
  let ok = 0;
  let skipped = 0;
  for (const code of codes) {
    await sleep(120); // be polite — avoid tripping Nager's rate limiter
    try {
      const list = await fetchHolidays(year, code);
      if (list && list.length > 0) {
        holidays[code] = list;
        ok++;
      } else {
        skipped++;
      }
    } catch (err) {
      // Don't fail the whole build for one country — log and move on.
      console.warn(`  ${code}: ${(err as Error).message}`);
      skipped++;
    }
  }

  const out: HolidaysFile = { year, holidays };
  await writeFile(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.warn(`Wrote ${OUT_PATH} — ${ok} countries with holidays, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
