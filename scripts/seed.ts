/**
 * Bookart seed script — writes the mock marketplace to .data/bookart.json.
 *
 *   npm run seed       # generate the store if it doesn't exist
 *   npm run db:reset   # wipe + regenerate
 *
 * The app also self-seeds on first request, so running this is optional.
 */
import fs from "node:fs";
import path from "node:path";
import { buildSeed } from "../src/lib/seed-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "bookart.json");

const force = process.argv.includes("--force");

if (fs.existsSync(DATA_FILE) && !force) {
  console.log(`✓ Store already exists at ${path.relative(process.cwd(), DATA_FILE)}`);
  console.log("  Re-run with `npm run db:reset` or `npx tsx scripts/seed.ts --force` to regenerate.");
  process.exit(0);
}

const seed = buildSeed();
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));

const cities = new Map<string, number>();
for (const product of seed.products) cities.set(product.pickupCity, (cities.get(product.pickupCity) ?? 0) + 1);

console.log(`✓ Seeded Bookart store → ${path.relative(process.cwd(), DATA_FILE)}`);
console.log(`  users      : ${seed.users.length}`);
console.log(`  listings   : ${seed.products.length}`);
console.log(`  rentals    : ${seed.rentals.length}`);
console.log(`  purchases  : ${seed.purchases.length}`);
console.log(`  reviews    : ${seed.reviews.length}`);
console.log(`  cities     : ${[...cities.entries()].map(([city, n]) => `${city} (${n})`).join(", ")}`);
console.log("\nDemo accounts (password: demo1234)");
for (const email of ["buyer@bookart.in", "seller@bookart.in", "admin@bookart.in"]) {
  console.log(`  · ${email}`);
}
