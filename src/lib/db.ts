/**
 * Bookart data-access layer.
 *
 * Ships as a zero-config document store (JSON file on disk) so the whole app
 * runs with `npm run dev` alone. Every function below is shaped like the
 * Postgres/PostGIS query it replaces in production — see /supabase/schema.sql
 * for the SQL equivalent (ST_DWithin radius queries, escrow ledger tables).
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildSeed } from "./seed-data";
import { boundingBox, haversineKm, roundKm, type Coordinates } from "./geo";
import { addDays, buildRentalTiers, daysBetween, depositFor, inr, quoteRental, settleRental } from "./rental";
import type {
  Cart,
  Category,
  Condition,
  DBShape,
  Format,
  ItemKind,
  PenaltyGrade,
  Product,
  ProductWithDistance,
  PurchaseOrder,
  Rating,
  RentalOrder,
  Review,
  SellerKind,
  SessionUser,
  User,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "bookart.json");

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

declare global {
  // eslint-disable-next-line no-var
  var __bookartDb: DBShape | undefined;
}

function readFromDisk(): DBShape {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as DBShape;
    if (!parsed?.products?.length) return buildSeed();
    return parsed;
  } catch {
    const seed = buildSeed();
    persist(seed);
    return seed;
  }
}

function persist(db: DBShape) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("[bookart] failed to persist store", error);
  }
}

export function getDb(): DBShape {
  if (!globalThis.__bookartDb) globalThis.__bookartDb = readFromDisk();
  return globalThis.__bookartDb;
}

/** Writes are serialised through a tiny lock so parallel actions can't clobber the file. */
let writeQueue: Promise<unknown> = Promise.resolve();
export function mutate<T>(fn: (db: DBShape) => T): Promise<T> {
  const run = writeQueue.then(() => {
    const db = getDb();
    const result = fn(db);
    persist(db);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export function resetDb() {
  const seed = buildSeed();
  globalThis.__bookartDb = seed;
  persist(seed);
  return seed;
}

/* ------------------------------------------------------------------ */
/* Passwords & sessions                                                */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(12).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored?: string) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

/** Seeded users share the demo password so every account is explorable. */
function ensureDemoPassword(user: User) {
  if (!user.passwordHash) user.passwordHash = hashPassword("demo1234");
}

export function findUserByEmail(email: string) {
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (user) ensureDemoPassword(user);
  return user ?? null;
}

export function findUserById(id: string) {
  return getDb().users.find((u) => u.id === id) ?? null;
}

export function createSession(userId?: string): string {
  const token = crypto.randomBytes(20).toString("hex");
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.createdAt && Date.now() - Date.parse(s.createdAt) < 30 * 86_400_000);
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  persist(db);
  return token;
}

export function getSessionUser(token?: string | null): SessionUser | null {
  if (!token) return null;
  const session = getDb().sessions.find((s) => s.token === token);
  if (!session?.userId) return null;
  const user = findUserById(session.userId);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sellerKind: user.sellerKind,
    walletBalance: user.walletBalance,
    verifiedSeller: user.verifiedSeller,
    avatarColor: user.avatarColor,
    rating: user.rating,
    ratingsCount: user.ratingsCount,
    latitude: user.latitude,
    longitude: user.longitude,
    city: user.city,
    pincode: user.pincode,
    verification: user.verification,
  };
}

export function destroySession(token?: string | null) {
  if (!token) return;
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  persist(db);
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#0f766e"];

export interface NewUserInput {
  name: string;
  email: string;
  password?: string;
  provider?: "password" | "google";
  phone?: string;
  role?: User["role"];
  sellerKind?: SellerKind;
  occupation: User["occupation"];
  age?: number;
  gender?: User["gender"];
  address?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  avatarColor?: string;
  verification?: Partial<User["verification"]>;
}

export async function createUser(input: NewUserInput): Promise<User> {
  return mutate((db) => {
    const existing = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) throw new Error("An account with this email already exists.");

    const user: User = {
      id: `usr_${crypto.randomBytes(5).toString("hex")}`,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.password ? hashPassword(input.password) : undefined,
      provider: input.provider ?? "password",
      phone: input.phone,
      role: input.role ?? "buyer",
      sellerKind: input.sellerKind ?? "individual",
      occupation: input.occupation,
      age: input.age,
      gender: input.gender,
      address: input.address,
      city: input.city,
      pincode: input.pincode,
      latitude: input.latitude,
      longitude: input.longitude,
      rating: 0,
      ratingsCount: 0,
      walletBalance: 0,
      avatarColor: input.avatarColor ?? AVATAR_COLORS[db.users.length % AVATAR_COLORS.length],
      verifiedSeller: false,
      verification: {
        status: input.verification?.status ?? "none",
        gstin: input.verification?.gstin,
        registrationId: input.verification?.registrationId,
        submittedAt: input.verification?.submittedAt,
        note: input.verification?.note,
      },
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

export async function updateUser(id: string, patch: Partial<User>) {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    Object.assign(user, patch);
    return user;
  });
}

export async function adjustWallet(userId: string, delta: number) {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.walletBalance = Math.max(0, Math.round((user.walletBalance + delta) * 100) / 100);
    return user.walletBalance;
  });
}

/** Seller upgrade with verification documents (GST / library registration). */
export async function submitSellerVerification(
  userId: string,
  payload: { sellerKind: SellerKind; gstin?: string; registrationId?: string; address?: string; city?: string; pincode?: string },
) {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.sellerKind = payload.sellerKind;
    user.role = user.role === "admin" ? "admin" : "seller";
    if (payload.address) user.address = payload.address;
    if (payload.city) user.city = payload.city;
    if (payload.pincode) user.pincode = payload.pincode;
    user.verification = {
      status: payload.sellerKind === "individual" ? "approved" : "pending",
      gstin: payload.gstin,
      registrationId: payload.registrationId,
      submittedAt: new Date().toISOString(),
      note:
        payload.sellerKind === "individual"
          ? "Individual seller — KYC auto-approved"
          : "Queued for manual verification (GST/Registration check)",
    };
    user.verifiedSeller = payload.sellerKind === "individual";
    return user;
  });
}

/* ------------------------------------------------------------------ */
/* Product queries                                                     */
/* ------------------------------------------------------------------ */

export interface ProductFilters {
  q?: string;
  categories?: Category[];
  kinds?: ItemKind[];
  modes?: ("buy" | "rent")[];
  conditions?: Condition[];
  formats?: Format[];
  sellerKinds?: SellerKind[];
  minPrice?: number;
  maxPrice?: number;
  radiusKm?: number;
  origin?: Coordinates | null;
  sellerId?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  includeUnavailable?: boolean;
}

export function sellerOf(product: Product) {
  return getDb().users.find((u) => u.id === product.sellerId);
}

export function hydrate(product: Product, origin?: Coordinates | null): ProductWithDistance {
  const distanceKm = origin ? roundKm(haversineKm(origin, product)) : null;
  return {
    ...product,
    distanceKm,
    seller: sellerOf(product),
    ratings: getDb().reviews
      .filter((r) => r.productId === product.id)
      .slice(0, 4)
      .map<Rating>((r) => ({
        score: r.score,
        comment: r.comment,
        buyerName: getDb().users.find((u) => u.id === r.buyerId)?.name ?? "Verified buyer",
        createdAt: r.createdAt,
      })),
  };
}

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function matchesText(product: Product, query: string) {
  const raw = [
    product.title,
    product.author,
    product.publisher,
    product.isbn,
    product.subject,
    product.course,
    product.edition,
    ...product.tags,
  ]
    .filter(Boolean)
    .join(" ");

  const haystack = squash(raw);
  // ISBNs and course codes are typed with hyphens/slashes/spaces — squash both
  // sides so "978-81-7709-187-8" matches "9788177091878".
  const squashedQuery = squash(query);
  if (squashedQuery && haystack.includes(squashedQuery)) return true;

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(squash(term)));
}

export function queryProducts(filters: ProductFilters): { items: ProductWithDistance[]; total: number } {
  const db = getDb();
  const {
    q, categories, kinds, modes, conditions, formats, sellerKinds,
    minPrice, maxPrice, radiusKm, origin, sellerId, sort = "relevance",
    limit = 60, offset = 0, includeUnavailable = false,
  } = filters;

  let rows: ProductWithDistance[] = db.products.map((p) => hydrate(p, origin ?? undefined));

  if (!includeUnavailable) rows = rows.filter((p) => p.status !== "draft");
  if (sellerId) rows = rows.filter((p) => p.sellerId === sellerId);
  if (q) rows = rows.filter((p) => matchesText(p, q));
  if (categories?.length) rows = rows.filter((p) => categories.includes(p.category));
  if (kinds?.length) rows = rows.filter((p) => kinds.includes(p.kind));
  if (conditions?.length) rows = rows.filter((p) => conditions.includes(p.condition));
  if (formats?.length) rows = rows.filter((p) => formats.includes(p.format));
  if (sellerKinds?.length) rows = rows.filter((p) => p.seller && sellerKinds.includes(p.seller.sellerKind));

  if (modes?.length) {
    rows = rows.filter((p) =>
      modes.some((mode) =>
        mode === "rent" ? p.isRentable : p.buyPrice !== null,
      ),
    );
  }

  if (minPrice !== undefined) rows = rows.filter((p) => (p.buyPrice ?? p.mrp) >= minPrice);
  if (maxPrice !== undefined) rows = rows.filter((p) => (p.buyPrice ?? p.mrp) <= maxPrice);

  // Radius filter — bounding-box first (index friendly), then exact Haversine.
  if (origin && radiusKm && radiusKm > 0) {
    const box = boundingBox(origin, radiusKm);
    rows = rows.filter(
      (p) =>
        p.latitude >= box.minLat &&
        p.latitude <= box.maxLat &&
        p.longitude >= box.minLng &&
        p.longitude <= box.maxLng &&
        p.distanceKm !== null &&
        p.distanceKm <= radiusKm,
    );
  }

  const priceOf = (p: ProductWithDistance) => p.buyPrice ?? p.mrp;
  switch (sort) {
    case "distance":
      rows.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
      break;
    case "price_asc":
      rows.sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case "price_desc":
      rows.sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case "rating":
      rows.sort((a, b) => (b.seller?.rating ?? 0) - (a.seller?.rating ?? 0));
      break;
    case "newest":
      rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      break;
    default:
      rows.sort((a, b) => {
        const distScore = (p: ProductWithDistance) => (p.distanceKm === null ? 40 : Math.min(40, p.distanceKm));
        const relevance = (p: ProductWithDistance) => (p.status === "available" ? 0 : 12) + distScore(p) * 0.4 - p.rating * 2;
        return relevance(a) - relevance(b);
      });
  }

  // Available items float above rented/sold listings.
  rows.sort((a, b) => Number(a.status !== "available") - Number(b.status !== "available"));

  const total = rows.length;
  return { items: rows.slice(offset, offset + limit), total };
}

export function getProductBySlugOrId(id: string) {
  return getDb().products.find((p) => p.id === id) ?? null;
}

export interface Facets {
  total: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  byFormat: Record<string, number>;
  byMode: { buy: number; rent: number };
  priceMin: number;
  priceMax: number;
  sellerCount: number;
}

export function facetsFor(filters: ProductFilters): Facets {
  const { items } = queryProducts({ ...filters, limit: 10_000, offset: 0 });
  const byCategory: Record<string, number> = {};
  const byCondition: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;
  let buy = 0;
  let rent = 0;
  const sellers = new Set<string>();

  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    byCondition[item.condition] = (byCondition[item.condition] ?? 0) + 1;
    byFormat[item.format] = (byFormat[item.format] ?? 0) + 1;
    const price = item.buyPrice ?? item.mrp;
    priceMin = Math.min(priceMin, price);
    priceMax = Math.max(priceMax, price);
    if (item.buyPrice !== null) buy += 1;
    if (item.isRentable) rent += 1;
    sellers.add(item.sellerId);
  }

  return {
    total: items.length,
    byCategory,
    byCondition,
    byFormat,
    byMode: { buy, rent },
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
    sellerCount: sellers.size,
  };
}

export function searchSuggestions(query: string, origin?: Coordinates | null, limit = 6) {
  if (!query || query.trim().length < 2) return [];
  const { items } = queryProducts({ q: query, origin, sort: "distance", limit });
  return items.map((p) => ({
    id: p.id,
    title: p.title,
    author: p.author,
    category: p.category,
    price: p.buyPrice ?? p.mrp,
    distanceKm: p.distanceKm,
    condition: p.condition,
  }));
}

export function logSearch(q: string) {
  if (!q.trim()) return;
  const db = getDb();
  db.meta.searchLog.push({ q: q.trim(), at: new Date().toISOString() });
  db.meta.searchLog = db.meta.searchLog.slice(-200);
  persist(db);
}

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export type NewListingInput = Omit<
  Product,
  "id" | "createdAt" | "rating" | "ratingCount" | "views" | "status" | "rentalTiers" | "sellerId"
> & {
  sellerId: string;
  status?: Product["status"];
  rentalTiers?: Product["rentalTiers"];
};

export async function createListing(input: NewListingInput): Promise<Product> {
  return mutate((db) => {
    const baseRate = input.rentalBaseRate ?? Math.max(3, Math.round((input.buyPrice ?? input.mrp) / 90));
    const product: Product = {
      ...input,
      id: `prd_${crypto.randomBytes(5).toString("hex")}`,
      sellerId: input.sellerId,
      isRentable: input.isRentable,
      rentalBaseRate: input.isRentable ? baseRate : null,
      rentalTiers: input.isRentable
        ? input.rentalTiers?.length
          ? input.rentalTiers
          : buildRentalTiers(baseRate, input.buyPrice ?? input.mrp)
        : [],
      status: input.status ?? "available",
      rating: 0,
      ratingCount: 0,
      views: 0,
      createdAt: new Date().toISOString(),
      coverStyle: db.products.length + 7,
    };
    db.products.unshift(product);
    return product;
  });
}

export async function updateListing(id: string, patch: Partial<Product>) {
  return mutate((db) => {
    const product = db.products.find((p) => p.id === id);
    if (!product) throw new Error("Listing not found");
    Object.assign(product, patch);
    if (patch.isRentable !== undefined || patch.rentalBaseRate !== undefined || patch.buyPrice !== undefined) {
      const rate = product.rentalBaseRate ?? Math.max(3, Math.round((product.buyPrice ?? product.mrp) / 90));
      product.rentalBaseRate = product.isRentable ? rate : null;
      product.rentalTiers = product.isRentable
        ? product.rentalTiers?.length
          ? product.rentalTiers
          : buildRentalTiers(rate, product.buyPrice ?? product.mrp)
        : [];
    }
    return product;
  });
}

export async function deleteListing(id: string) {
  return mutate((db) => {
    db.products = db.products.filter((p) => p.id !== id);
    return true;
  });
}

export function listingsBySeller(sellerId: string) {
  return queryProducts({ sellerId, includeUnavailable: true, limit: 200, sort: "newest" });
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

function cartFor(db: DBShape, key: string): Cart {
  let cart = db.carts.find((c) => c.key === key);
  if (!cart) {
    cart = { key, lines: [], updatedAt: new Date().toISOString() };
    db.carts.push(cart);
  }
  return cart;
}

export async function cartAdd(key: string, productId: string, mode: "buy" | "rent", days?: number) {
  return mutate((db) => {
    const cart = cartFor(db, key);
    const existing = cart.lines.find((l) => l.productId === productId && l.mode === mode);
    if (existing) existing.days = days ?? existing.days;
    else cart.lines.push({ productId, mode, days, addedAt: new Date().toISOString() });
    cart.updatedAt = new Date().toISOString();
    return cart;
  });
}

export async function cartUpdate(key: string, productId: string, patch: Partial<Cart["lines"][number]>) {
  return mutate((db) => {
    const cart = cartFor(db, key);
    const line = cart.lines.find((l) => l.productId === productId);
    if (line) Object.assign(line, patch);
    cart.updatedAt = new Date().toISOString();
    return cart;
  });
}

export async function cartRemove(key: string, productId: string, mode?: "buy" | "rent") {
  return mutate((db) => {
    const cart = cartFor(db, key);
    cart.lines = cart.lines.filter((l) => !(l.productId === productId && (mode ? l.mode === mode : true)));
    cart.updatedAt = new Date().toISOString();
    return cart;
  });
}

export async function cartClear(key: string) {
  return mutate((db) => {
    const cart = cartFor(db, key);
    cart.lines = [];
    cart.updatedAt = new Date().toISOString();
    return cart;
  });
}

export function getCart(key: string) {
  const db = getDb();
  return db.carts.find((c) => c.key === key) ?? { key, lines: [], updatedAt: new Date().toISOString() };
}

export interface HydratedCartLine {
  product: ProductWithDistance;
  mode: "buy" | "rent";
  days?: number;
  deposit?: number;
  rentalFee?: number;
  refundable?: number;
  amount: number;
}

export function hydrateCart(key: string, origin?: Coordinates | null) {
  const cart = getCart(key);
  const lines: HydratedCartLine[] = [];
  for (const line of cart.lines) {
    const product = getDb().products.find((p) => p.id === line.productId);
    if (!product) continue;
    const hydrated = hydrate(product, origin ?? undefined);
    if (line.mode === "rent") {
      const quote = quoteRental({ product, days: line.days ?? 7 });
      lines.push({
        product: hydrated,
        mode: "rent",
        days: line.days ?? 7,
        deposit: quote.deposit,
        rentalFee: quote.rentalFee,
        refundable: quote.refundAmount,
        amount: quote.deposit,
      });
    } else {
      lines.push({ product: hydrated, mode: "buy", amount: product.buyPrice ?? product.mrp });
    }
  }

  const subtotal = lines.filter((l) => l.mode === "buy").reduce((sum, l) => sum + l.amount, 0);
  const deposits = lines.filter((l) => l.mode === "rent").reduce((sum, l) => sum + (l.deposit ?? 0), 0);
  const rentalFees = lines.filter((l) => l.mode === "rent").reduce((sum, l) => sum + (l.rentalFee ?? 0), 0);

  return { key, lines, subtotal, deposits, rentalFees, total: subtotal + deposits, count: lines.length };
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export async function placePurchaseOrders(params: {
  buyerId: string;
  address: string;
  paymentMethod: PurchaseOrder["paymentMethod"];
  lines: { productId: string; amount: number }[];
  courierFee: number;
  deliveryMode: PurchaseOrder["deliveryMode"];
}): Promise<PurchaseOrder[]> {
  return mutate((db) => {
    const created: PurchaseOrder[] = [];
    for (const line of params.lines) {
      const product = db.products.find((p) => p.id === line.productId);
      if (!product) continue;
      const order: PurchaseOrder = {
        id: `ord_${crypto.randomBytes(4).toString("hex")}`,
        buyerId: params.buyerId,
        sellerId: product.sellerId,
        productId: product.id,
        amount: line.amount,
        deliveryMode: params.deliveryMode,
        courierFee: params.courierFee,
        address: params.address,
        paymentMethod: params.paymentMethod,
        status: "placed",
        createdAt: new Date().toISOString(),
      };
      db.purchases.unshift(order);
      created.push(order);
      product.status = "sold";
    }
    return created;
  });
}

export async function rentItem(params: { buyerId: string; productId: string; days: number }): Promise<RentalOrder> {
  const { buyerId, productId, days } = params;
  const product = getProductBySlugOrId(productId);
  if (!product) throw new Error("Listing not found");
  if (!product.isRentable) throw new Error("This listing is not available for rent.");
  if (product.status !== "available") throw new Error("This copy is currently rented or sold out.");

  const quote = quoteRental({ product, days });
  const seller = findUserById(product.sellerId);
  const buyer = findUserById(buyerId);

  const walletShortfall = buyer ? Math.max(0, quote.deposit - buyer.walletBalance) : quote.deposit;
  void seller;

  const order = await mutate((db) => {
    const now = new Date();
    const order: RentalOrder = {
      id: `rent_${crypto.randomBytes(4).toString("hex")}`,
      buyerId,
      sellerId: product.sellerId,
      productId,
      days,
      tierLabel: product.rentalTiers.find((t) => t.days === days)?.label ?? `${days} days`,
      depositPaid: quote.deposit,
      rentalFee: quote.rentalFee,
      refundAmount: quote.deposit - quote.rentalFee,
      lateFee: 0,
      penaltyPct: 0,
      penaltyAmount: 0,
      startDate: now.toISOString(),
      dueDate: addDays(now, days).toISOString(),
      status: "active",
      createdAt: now.toISOString(),
      timeline: [
        {
          at: now.toISOString(),
          label: `Security deposit of ${inr(quote.deposit)} paid${walletShortfall > 0 ? ` (${inr(quote.deposit - walletShortfall)} from wallet, ${inr(walletShortfall)} via original payment method)` : " from wallet"}`,
        },
        {
          at: now.toISOString(),
          label: `Rental fee ${inr(quote.rentalFee)} for ${days} day${days > 1 ? "s" : ""}`,
        },
      ],
    };
    db.rentals.unshift(order);
    const target = db.products.find((p) => p.id === productId);
    if (target) {
      target.status = "rented";
      target.rentedBy = buyerId;
    }
    return order;
  });

  // Note: payment collection happens in the calling server action
  // (rentNowAction / checkoutAction) so the wallet is never debited twice.
  return order;
}

export async function requestReturn(orderId: string, userId: string) {
  return mutate((db) => {
    const order = db.rentals.find((r) => r.id === orderId);
    if (!order) throw new Error("Rental not found");
    if (order.buyerId !== userId) throw new Error("Not your rental");
    if (order.status === "refunded") throw new Error("This rental is already settled");
    order.status = "return_requested";
    order.returnRequestedAt = new Date().toISOString();
    order.timeline.push({ at: new Date().toISOString(), label: "Return requested by buyer — awaiting seller inspection" });
    return order;
  });
}

export interface InspectionResult {
  order: RentalOrder;
  refundAmount: number;
  breakdown: { label: string; amount: number; kind: "credit" | "debit" }[];
}

export async function inspectAndSettle(
  orderId: string,
  grade: PenaltyGrade,
  notes?: string,
): Promise<InspectionResult> {
  const order = getDb().rentals.find((r) => r.id === orderId);
  if (!order) throw new Error("Rental not found");
  const product = getProductBySlugOrId(order.productId);
  const baseRate = product?.rentalBaseRate ?? 8;
  const lateDays = Math.max(0, daysBetween(order.dueDate, new Date()));

  const decision = settleRental({
    depositPaid: order.depositPaid,
    rentalFee: order.rentalFee,
    grade,
    lateDays,
    baseRatePerDay: baseRate,
  });

  const updated = await mutate((db) => {
    const target = db.rentals.find((r) => r.id === orderId);
    if (!target) throw new Error("Rental not found");
    const now = new Date().toISOString();
    target.inspectionGrade = grade;
    target.inspectionNotes = notes;
    target.returnedAt = now;
    target.refundedAt = now;
    target.status = "refunded";
    target.lateFee = decision.breakdown.find((b) => b.label.startsWith("Late fee"))?.amount
      ? Math.abs(decision.breakdown.find((b) => b.label.startsWith("Late fee"))!.amount)
      : 0;
    target.penaltyAmount = Math.abs(
      decision.breakdown.find((b) => b.label.startsWith("Damage penalty"))?.amount ?? 0,
    );
    target.penaltyPct = target.depositPaid ? target.penaltyAmount / target.depositPaid : 0;
    target.refundAmount = decision.refundAmount;
    target.refundMethod = "wallet";
    target.timeline.push({
      at: now,
      label: `Inspected: ${grade.toUpperCase()} — refund ${inr(decision.refundAmount)} credited to buyer wallet`,
    });

    const listing = db.products.find((p) => p.id === target.productId);
    if (listing) {
      listing.status = grade === "lost" ? "sold" : "available";
      listing.rentedBy = undefined;
      if (grade === "major") listing.condition = "heavily_annotated";
      else if (grade === "minor") listing.condition = "gently_used";
    }

    const buyer = db.users.find((u) => u.id === target.buyerId);
    if (buyer) buyer.walletBalance = Math.round((buyer.walletBalance + decision.refundAmount) * 100) / 100;

    const seller = db.users.find((u) => u.id === target.sellerId);
    if (seller) {
      seller.walletBalance = Math.round((seller.walletBalance + target.rentalFee + target.penaltyAmount) * 100) / 100;
    }
    return target;
  });

  return { order: updated, refundAmount: decision.refundAmount, breakdown: decision.breakdown };
}

/** Cron-style sweep that flips rentals past their due date into `overdue`. */
export async function markOverdueRentals() {
  return mutate((db) => {
    const now = new Date();
    let changed = 0;
    for (const rental of db.rentals) {
      if (rental.status === "active" && Date.parse(rental.dueDate) < now.getTime()) {
        rental.status = "overdue";
        rental.timeline.push({ at: now.toISOString(), label: "Due date passed — late fee accruing" });
        changed += 1;
      }
    }
    return changed;
  });
}

export function rentalsForBuyer(buyerId: string) {
  const db = getDb();
  return db.rentals
    .filter((r) => r.buyerId === buyerId)
    .map((r) => ({
      ...r,
      product: db.products.find((p) => p.id === r.productId),
      seller: db.users.find((u) => u.id === r.sellerId),
      daysToDue: daysBetween(new Date(), r.dueDate),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function rentalsForSeller(sellerId: string) {
  const db = getDb();
  return db.rentals
    .filter((r) => r.sellerId === sellerId)
    .map((r) => ({
      ...r,
      product: db.products.find((p) => p.id === r.productId),
      buyer: db.users.find((u) => u.id === r.buyerId),
      daysToDue: daysBetween(new Date(), r.dueDate),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function purchasesForBuyer(buyerId: string) {
  const db = getDb();
  return db.purchases
    .filter((p) => p.buyerId === buyerId)
    .map((p) => ({
      ...p,
      product: db.products.find((x) => x.id === p.productId),
      seller: db.users.find((u) => u.id === p.sellerId),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function salesForSeller(sellerId: string) {
  const db = getDb();
  return db.purchases
    .filter((p) => p.sellerId === sellerId)
    .map((p) => ({
      ...p,
      product: db.products.find((x) => x.id === p.productId),
      buyer: db.users.find((u) => u.id === p.buyerId),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/* ------------------------------------------------------------------ */
/* Reviews, admin & analytics                                          */
/* ------------------------------------------------------------------ */

export async function addReview(input: { productId: string; buyerId: string; score: number; comment: string }) {
  return mutate((db) => {
    const product = db.products.find((p) => p.id === input.productId);
    if (!product) throw new Error("Listing not found");
    const review: Review = {
      id: `rev_${crypto.randomBytes(4).toString("hex")}`,
      productId: input.productId,
      sellerId: product.sellerId,
      buyerId: input.buyerId,
      score: Math.min(5, Math.max(1, input.score)),
      comment: input.comment,
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);

    const seller = db.users.find((u) => u.id === product.sellerId);
    if (seller) {
      const total = seller.rating * seller.ratingsCount + review.score;
      seller.ratingsCount += 1;
      seller.rating = Math.round((total / seller.ratingsCount) * 10) / 10;
    }
    return review;
  });
}

export function pendingVerifications() {
  return getDb().users.filter((u) => u.verification.status === "pending");
}

export async function reviewVerification(userId: string, approve: boolean, note?: string) {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.verification = {
      ...user.verification,
      status: approve ? "approved" : "rejected",
      reviewedAt: new Date().toISOString(),
      note: note ?? user.verification.note,
    };
    user.verifiedSeller = approve;
    return user;
  });
}

export function platformStats() {
  return platformStatsFor(getDb());
}

export function platformStatsFor(db: DBShape) {
  const activeRentals = db.rentals.filter((r) => r.status === "active" || r.status === "overdue" || r.status === "return_requested");
  const escrowHeld = activeRentals.reduce((sum, r) => sum + r.depositPaid, 0);
  const rentalRevenue = db.rentals
    .filter((r) => r.status === "refunded")
    .reduce((sum, r) => sum + r.rentalFee + r.penaltyAmount, 0);
  const salesRevenue = db.purchases.reduce((sum, p) => sum + p.amount, 0);

  return {
    users: db.users.length,
    buyers: db.users.filter((u) => u.role === "buyer").length,
    sellers: db.users.filter((u) => u.role === "seller").length,
    stores: db.users.filter((u) => u.sellerKind === "bookstore").length,
    libraries: db.users.filter((u) => u.sellerKind === "library").length,
    listings: db.products.length,
    available: db.products.filter((p) => p.status === "available").length,
    rented: db.products.filter((p) => p.status === "rented").length,
    sold: db.products.filter((p) => p.status === "sold").length,
    activeRentals: activeRentals.length,
    escrowHeld,
    rentalRevenue,
    salesRevenue,
    pendingVerifications: db.users.filter((user) => user.verification.status === "pending").length,
    reviews: db.reviews.length,
    searches: db.meta.searchLog.length,
  };
}

export function trendingSearches(limit = 6) {
  const db = getDb();
  const counts = new Map<string, number>();
  for (const entry of db.meta.searchLog) counts.set(entry.q, (counts.get(entry.q) ?? 0) + 1);
  const seeded = ["UPSC polity", "handwritten notes", "JEE physics", "NCERT class 10", "GATE CSE", "rare Hindi books"];
  return [
    ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([q]) => q),
    ...seeded,
  ].slice(0, limit);
}

export function depositPreview(product: Product) {
  return { deposit: depositFor(product), quote: quoteRental({ product, days: 30 }) };
}

export type { DBShape };
