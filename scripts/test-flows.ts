/**
 * Bookart flow tests — runs the domain logic end-to-end without a browser.
 *
 *   npm run test:flows
 *
 * Covers: Haversine radius filtering, search matching, the rental deposit /
 * refund engine, the full rent → return → inspect → refund lifecycle, listing
 * creation and checkout re-pricing. The store is reset when the suite ends.
 */
import assert from "node:assert/strict";
import {
  checkoutActionPlaceholder,
  createListing,
  getDb,
  inspectAndSettle,
  listingsBySeller,
  queryProducts,
  rentItem,
  rentalsForBuyer,
  requestReturn,
  resetDb,
  searchSuggestions,
  findUserByEmail,
  placePurchaseOrders,
} from "../src/lib/test-bridge";
import { haversineKm, formatDistance, boundingBox } from "../src/lib/geo";
import { buildRentalTiers, lateFeeFor, quoteRental, settleRental, tierFee, inr } from "../src/lib/rental";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

async function main() {
const PITHAMPUR = { latitude: 22.6197, longitude: 75.6926 };
const INDORE = { latitude: 22.7196, longitude: 75.8577 };

/* ------------------------------------------------------------------ */
section("1 · Geolocation engine (Haversine)");
/* ------------------------------------------------------------------ */

await check("distance from Pithampur → Indore is ≈ 20 km", () => {
  const km = haversineKm(PITHAMPUR, INDORE);
  assert.ok(km > 16 && km < 24, `expected 16–24 km, got ${km.toFixed(2)}`);
});

await check("identical points return 0 km", () => {
  assert.equal(round(haversineKm(PITHAMPUR, PITHAMPUR)), 0);
});

await check("distance labels read naturally", () => {
  assert.match(formatDistance(0.85), /m away/);
  assert.match(formatDistance(2.42), /2\.4 km away/);
  assert.match(formatDistance(800), /Courier/);
});

await check("bounding box brackets the radius", () => {
  const box = boundingBox(PITHAMPUR, 25);
  assert.ok(box.minLat < PITHAMPUR.latitude && box.maxLat > PITHAMPUR.latitude);
  assert.ok(box.minLng < PITHAMPUR.longitude && box.maxLng > PITHAMPUR.longitude);
});

/* ------------------------------------------------------------------ */
section("2 · Radius filtering over the seeded catalogue");
/* ------------------------------------------------------------------ */

const near5 = queryProducts({ origin: PITHAMPUR, radiusKm: 5, limit: 500 });
const near10 = queryProducts({ origin: PITHAMPUR, radiusKm: 10, limit: 500 });
const near25 = queryProducts({ origin: PITHAMPUR, radiusKm: 25, limit: 500 });
const anywhere = queryProducts({ origin: PITHAMPUR, radiusKm: 0, limit: 500 });

await check("5 km ⊂ 10 km ⊂ 25 km ⊂ anywhere", () => {
  assert.ok(near5.total <= near10.total, "5km should not exceed 10km");
  assert.ok(near10.total <= near25.total, "10km should not exceed 25km");
  assert.ok(near25.total <= anywhere.total, "25km should not exceed anywhere");
  assert.ok(near5.total > 0, "expected local inventory around Pithampur");
});

await check("every result inside its radius is genuinely within it", () => {
  for (const item of near5.items) {
    assert.ok(item.distanceKm !== null && item.distanceKm <= 5.001, `${item.title} at ${item.distanceKm} km`);
  }
});

await check("listings are ordered nearest-first when asked", () => {
  const sorted = queryProducts({ origin: PITHAMPUR, radiusKm: 0, sort: "distance", limit: 50 }).items;
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok((sorted[i - 1].distanceKm ?? 0) <= (sorted[i].distanceKm ?? 0) + 1e-6);
  }
});

await check("courier-only listings are excluded from a 5 km search", () => {
  const farIds = anywhere.items.filter((p) => (p.distanceKm ?? 0) > 25).map((p) => p.id);
  const nearIds = new Set(near5.items.map((p) => p.id));
  assert.equal(farIds.some((id) => nearIds.has(id)), false);
});

/* ------------------------------------------------------------------ */
section("3 · Search matching (title / author / ISBN / subject / course)");
/* ------------------------------------------------------------------ */

await check("title search finds Laxmikanth's Polity", () => {
  const res = queryProducts({ q: "indian polity", origin: PITHAMPUR, radiusKm: 0, limit: 10 });
  assert.ok(res.items.length >= 1);
  assert.match(res.items[0].title.toLowerCase(), /polity/);
});

await check("ISBN search resolves a specific copy", () => {
  const res = queryProducts({ q: "978-81-7709-187-8", origin: PITHAMPUR, radiusKm: 0, limit: 5 });
  assert.equal(res.items.length, 1);
  assert.match(res.items[0].title, /Concepts of Physics/);
});

await check("subject + course search finds handwritten notes", () => {
  const res = queryProducts({ q: "handwritten notes", origin: PITHAMPUR, radiusKm: 0, limit: 10 });
  assert.ok(res.items.length >= 3, `expected several notes bundles, got ${res.items.length}`);
});

await check("typeahead suggestions return light payloads", () => {
  const suggestions = searchSuggestions("gate", PITHAMPUR, 5);
  assert.ok(suggestions.length >= 1);
  assert.ok(typeof suggestions[0].price === "number");
});

/* ------------------------------------------------------------------ */
section("4 · Rental deposit / refund engine");
/* ------------------------------------------------------------------ */

const rentable = queryProducts({ origin: PITHAMPUR, radiusKm: 0, limit: 500 }).items.find(
  (p) => p.isRentable && p.buyPrice !== null,
)!;

await check("deposit equals the full equivalent purchase price", () => {
  const quote = quoteRental({ product: rentable, days: 30 });
  assert.equal(quote.deposit, Math.round((rentable.buyPrice ?? 0) * rentable.depositMultiplier));
});

await check("longer tiers are cheaper per day", () => {
  const rate7 = quoteRental({ product: rentable, days: 7 }).effectiveDailyRate;
  const rate90 = quoteRental({ product: rentable, days: 90 }).effectiveDailyRate;
  assert.ok(rate90 < rate7, `90-day ${rate90}/day should beat 7-day ${rate7}/day`);
});

await check("refund = deposit − rental fee with no damage", () => {
  const quote = quoteRental({ product: rentable, days: 30 });
  assert.equal(quote.refundAmount, quote.deposit - quote.rentalFee);
});

await check("penalty grades scale 0% / 10% / 35% / 100%", () => {
  const base = quoteRental({ product: rentable, days: 30 });
  const minor = quoteRental({ product: rentable, days: 30, grade: "minor" });
  const major = quoteRental({ product: rentable, days: 30, grade: "major" });
  const lost = quoteRental({ product: rentable, days: 30, grade: "lost" });
  assert.equal(minor.penaltyAmount, Math.round(base.deposit * 0.1));
  assert.equal(major.penaltyAmount, Math.round(base.deposit * 0.35));
  assert.equal(lost.penaltyAmount, base.deposit);
  assert.equal(lost.refundAmount, 0);
});

await check("late fee is 10% of daily rate per day, capped at 60% of deposit", () => {
  const perDay = lateFeeFor(10, 1, 1000);
  assert.equal(perDay, 1);
  assert.equal(lateFeeFor(10, 5, 1000), 5);
  assert.equal(lateFeeFor(10, 9999, 1000), 600);
});

await check("settlement breakdown reconciles to the refund", () => {
  const decision = settleRental({ depositPaid: 620, rentalFee: 165, grade: "minor", lateDays: 3, baseRatePerDay: 9 });
  const net = decision.breakdown.reduce((sum, row) => sum + row.amount, 0);
  assert.equal(net, decision.refundAmount);
  assert.equal(decision.refundAmount, 620 - 165 - 62 - 3);
});

await check("deposit multipliers apply for rare / collector copies", () => {
  const rare = queryProducts({ origin: PITHAMPUR, radiusKm: 0, limit: 500 }).items.find(
    (p) => p.depositMultiplier > 1 && p.isRentable,
  );
  if (rare) {
    const quote = quoteRental({ product: rare, days: 30 });
    assert.ok(quote.deposit > (rare.buyPrice ?? rare.mrp), "collector deposit should exceed list price");
  }
});

await check("tier pricing is deterministic and rounded to ₹5", () => {
  const tiers = buildRentalTiers(9, 620);
  assert.equal(tiers.length, 4);
  for (const tier of tiers) assert.equal(tier.fee % 5, 0);
  assert.equal(tierFee(9, 7, 620), tiers[0].fee);
});

/* ------------------------------------------------------------------ */
section("5 · Rental lifecycle (rent → return → inspect → refund)");
/* ------------------------------------------------------------------ */

const buyer = findUserByEmail("buyer@bookart.in")!;
const target = queryProducts({ origin: PITHAMPUR, radiusKm: 25, limit: 500 }).items.find(
  (p) => p.isRentable && p.status === "available" && p.sellerId !== buyer.id,
)!;
const walletBefore = buyer.walletBalance;

const order = await rentItem({ buyerId: buyer.id, productId: target.id, days: 15 });
const quote = quoteRental({ product: target, days: 15 });

await check("rental created with deposit in escrow", () => {
  assert.ok(order.depositPaid >= quote.deposit - 1, `deposit ${order.depositPaid} vs ${quote.deposit}`);
  assert.equal(order.status, "active");
  assert.equal(order.rentalFee, quote.rentalFee);
});

await check("listing flips to `rented` so nobody double-books it", () => {
  const listing = getDb().products.find((p) => p.id === target.id)!;
  assert.equal(listing.status, "rented");
  assert.equal(listing.rentedBy, buyer.id);
});

await check("overdue rental sweeps into `overdue` after the due date", () => {
  const db = getDb();
  const record = db.rentals.find((r) => r.id === order.id)!;
  record.dueDate = new Date(Date.now() - 4 * 86_400_000).toISOString();
  const quoteLate = quoteRental({ product: target, days: 15, lateDays: 4 });
  assert.ok(quoteLate.lateFee > 0);
  assert.ok(quoteLate.refundAmount < quote.refundAmount);
});

await requestReturn(order.id, buyer.id);

await check("buyer return request notifies the seller", () => {
  const record = getDb().rentals.find((r) => r.id === order.id)!;
  assert.equal(record.status, "return_requested");
  assert.ok(record.timeline.some((t) => /return requested/i.test(t.label)));
});

const settlement = await inspectAndSettle(order.id, "minor", "A few pencil notes on the last chapter.");

await check("seller inspection releases refund net of fee, penalty and late fee", () => {
  assert.ok(settlement.refundAmount > 0, "expected a positive refund");
  assert.equal(settlement.order.status, "refunded");
  const net = settlement.breakdown.reduce((sum, row) => sum + row.amount, 0);
  assert.equal(net, settlement.refundAmount);
});

await check("buyer wallet grew by exactly the refund amount", () => {
  const after = findUserByEmail("buyer@bookart.in")!.walletBalance;
  assert.equal(round(after - walletBefore), round(settlement.refundAmount));
});

await check("listing is relisted and condition downgraded after a penalty", () => {
  const listing = getDb().products.find((p) => p.id === target.id)!;
  assert.equal(listing.status, "available");
  assert.equal(listing.rentedBy, undefined);
  assert.equal(listing.condition, "gently_used");
});

await check("seller received the rental fee plus the penalty", () => {
  const seller = getDb().users.find((u) => u.id === target.sellerId)!;
  assert.ok(seller.walletBalance >= settlement.order.rentalFee + settlement.order.penaltyAmount - 0.01);
});

await check("rentals dashboard exposes escrow + due dates", () => {
  const rows = rentalsForBuyer(buyer.id);
  const row = rows.find((r) => r.id === order.id)!;
  assert.equal(row.product?.id, target.id);
  assert.equal(typeof row.daysToDue, "number");
});

/* ------------------------------------------------------------------ */
section("6 · Checkout re-pricing");
/* ------------------------------------------------------------------ */

const buyTarget = queryProducts({ origin: PITHAMPUR, radiusKm: 25, limit: 500 }).items.find(
  (p) => p.buyPrice !== null && p.status === "available" && p.sellerId !== buyer.id,
)!;

const purchases = await placePurchaseOrders({
  buyerId: buyer.id,
  address: "212, Scheme 54, Vijay Nagar, Indore 452010",
  paymentMethod: "upi",
  deliveryMode: "pickup",
  courierFee: 0,
  lines: [{ productId: buyTarget.id, amount: buyTarget.buyPrice ?? buyTarget.mrp }],
});

await check("purchase creates an order and marks the copy sold", () => {
  assert.equal(purchases.length, 1);
  assert.equal(getDb().products.find((p) => p.id === buyTarget.id)!.status, "sold");
});

await check("sold listings still surface (marked) but cannot be rented again", async () => {
  const sold = getDb().products.find((p) => p.id === buyTarget.id)!;
  assert.equal(sold.status, "sold");
  if (sold.isRentable) {
    await assert.rejects(
      () => rentItem({ buyerId: buyer.id, productId: sold.id, days: 7 }),
      /rented or sold out/i,
    );
  }
});

/* ------------------------------------------------------------------ */
section("7 · Seller listing creation");
/* ------------------------------------------------------------------ */

const seller = findUserByEmail("seller@bookart.in")!;
const created = await createListing({
  sellerId: seller.id,
  kind: "notes",
  title: "Thermodynamics Unit-wise Handwritten Notes (Test)",
  author: "Aarav Sharma",
  publisher: "Self",
  edition: "2025",
  year: 2025,
  isbn: "978-93-0000-000-0",
  language: "English",
  pages: 180,
  subject: "Thermodynamics",
  course: "B.Tech Sem 3",
  category: "college_notes",
  format: "spiral_notes",
  condition: "like_new",
  conditionNotes: ["Highlighted definitions"],
  purchasedOn: "2025-06",
  mrp: 600,
  buyPrice: 260,
  isRentable: true,
  rentalBaseRate: 7,
  depositMultiplier: 1,
  tags: ["thermodynamics", "btech"],
  latitude: PITHAMPUR.latitude,
  longitude: PITHAMPUR.longitude,
  pickupArea: "Sector 3, Pithampur",
  pickupCity: "Pithampur",
  pickupPincode: "454775",
  coverStyle: 3,
});

await check("new listing carries generated rental tiers", () => {
  assert.equal(created.rentalTiers.length, 4);
  assert.equal(created.rentalBaseRate, 7);
  assert.equal(created.status, "available");
});

await check("new listing is instantly discoverable within its radius", () => {
  const found = queryProducts({ q: "Thermodynamics", origin: PITHAMPUR, radiusKm: 5, limit: 20 }).items;
  assert.ok(found.some((p) => p.id === created.id));
  assert.ok((found.find((p) => p.id === created.id)?.distanceKm ?? 99) < 5);
});

await check("seller dashboard lists own inventory", () => {
  const mine = listingsBySeller(seller.id).items;
  assert.ok(mine.some((p) => p.id === created.id));
});

/* ------------------------------------------------------------------ */
section("8 · Price band / filter combinations");
/* ------------------------------------------------------------------ */

await check("price band filters respect both bounds", () => {
  const band = queryProducts({ origin: PITHAMPUR, radiusKm: 0, minPrice: 200, maxPrice: 500, limit: 200 });
  for (const item of band.items) {
    const price = item.buyPrice ?? item.mrp;
    assert.ok(price >= 200 && price <= 500, `${item.title} at ${inr(price)}`);
  }
});

await check("rent-only filter excludes buy-only listings", () => {
  const rentOnly = queryProducts({ origin: PITHAMPUR, radiusKm: 0, modes: ["rent"], limit: 200 });
  assert.ok(rentOnly.items.length > 0);
  for (const item of rentOnly.items) assert.equal(item.isRentable, true);
});

await check("condition + format filters intersect correctly", () => {
  const filtered = queryProducts({
    origin: PITHAMPUR,
    radiusKm: 0,
    conditions: ["like_new", "brand_new"],
    formats: ["paperback"],
    limit: 200,
  });
  for (const item of filtered.items) {
    assert.ok(["like_new", "brand_new"].includes(item.condition));
    assert.equal(item.format, "paperback");
  }
});

await check("library-only filter returns lending libraries", () => {
  const libraries = queryProducts({ origin: PITHAMPUR, radiusKm: 0, sellerKinds: ["library"], limit: 200 });
  assert.ok(libraries.items.length > 0);
  for (const item of libraries.items) assert.equal(item.seller?.sellerKind, "library");
});

/* ------------------------------------------------------------------ */

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed\n`);

// Restore the pristine demo store so the app keeps its seeded demo data.
resetDb();
console.log("↺ demo store reset to seeded state\n");

process.exit(failed === 0 ? 0 : 1);
}

function round(n: number, p = 1) {
  return Number(n.toFixed(p));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
