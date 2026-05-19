import { fetchAndParseGeonames } from './01-fetch-geonames';
import { mergeAirports } from './02-merge-airports';
import { tierAndDisambiguate } from './03-tier-and-disambiguate';

async function run() {
  console.warn('=== Step 1: Fetch GeoNames ===');
  const cities = await fetchAndParseGeonames();

  console.warn('\n=== Step 2: Merge airports ===');
  await mergeAirports(cities);

  console.warn('\n=== Step 3: Tier + disambiguate ===');
  await tierAndDisambiguate();

  console.warn('\nDone. Outputs:');
  console.warn('  data/cities.json');
  console.warn('  data/disambiguation.json');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
