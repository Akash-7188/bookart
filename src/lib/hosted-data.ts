import { createClient } from "@/lib/supabase/server";
import { buildRentalTiers, daysBetween, settleRental } from "@/lib/rental";
import type { Facets, NewListingInput, ProductFilters } from "@/lib/db";
import { boundingBox, haversineKm, roundKm, type Coordinates } from "@/lib/geo";
import type {
  Cart,
  Category,
  DBShape,
  PurchaseOrder,
  Product,
  ProductWithDistance,
  Rating,
  RentalOrder,
  Review,
  SellerKind,
  User,
} from "@/lib/types";

type ProductRow = Record<string, unknown> & {
  id: string;
  seller_id: string;
  title: string;
  author: string;
};

type ProfileRow = {
  id: string;
  name: string;
  role: User["role"];
  seller_kind: SellerKind;
  city: string | null;
  rating: number | string;
  ratings_count: number;
  avatar_color: string | null;
  verified_seller: boolean;
};

const isConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sellerId: row.seller_id,
    kind: row.kind as Product["kind"],
    title: row.title,
    author: row.author,
    publisher: (row.publisher as string | null) ?? undefined,
    edition: (row.edition as string | null) ?? undefined,
    year: (row.year as number | null) ?? undefined,
    isbn: (row.isbn as string | null) ?? undefined,
    language: row.language as string,
    pages: (row.pages as number | null) ?? undefined,
    subject: (row.subject as string | null) ?? undefined,
    course: (row.course as string | null) ?? undefined,
    category: row.category as Category,
    format: row.format as Product["format"],
    condition: row.condition as Product["condition"],
    conditionNotes: (row.condition_notes as string[]) ?? [],
    purchasedOn: (row.purchased_on as string | null) ?? undefined,
    mrp: Number(row.mrp),
    buyPrice: row.buy_price === null ? null : Number(row.buy_price),
    isRentable: Boolean(row.is_rentable),
    rentalBaseRate: row.rental_base_rate === null ? null : Number(row.rental_base_rate),
    rentalTiers: (row.rental_tiers as Product["rentalTiers"]) ?? [],
    depositMultiplier: Number(row.deposit_multiplier),
    tags: (row.tags as string[]) ?? [],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    pickupArea: (row.pickup_area as string | null) ?? "",
    pickupCity: (row.pickup_city as string | null) ?? "",
    pickupPincode: (row.pickup_pincode as string | null) ?? "",
    status: row.status as Product["status"],
    rentedBy: (row.rented_by as string | null) ?? undefined,
    rating: Number(row.rating),
    ratingCount: Number(row.rating_count),
    views: Number(row.views),
    createdAt: String(row.created_at),
    coverStyle: Number(row.cover_style ?? 1),
  };
}

function mapSeller(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: "",
    provider: "password",
    role: row.role,
    sellerKind: row.seller_kind,
    occupation: "Other",
    city: row.city ?? undefined,
    rating: Number(row.rating),
    ratingsCount: row.ratings_count,
    walletBalance: 0,
    avatarColor: row.avatar_color ?? "#4f46e5",
    verifiedSeller: row.verified_seller,
    verification: { status: "none" },
    createdAt: "",
  };
}

function squash(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesText(product: Product, query: string) {
  const raw = [
    product.title, product.author, product.publisher, product.isbn,
    product.subject, product.course, product.edition, ...product.tags,
  ].filter(Boolean).join(" ");
  const haystack = squash(raw);
  const squashedQuery = squash(query);
  if (squashedQuery && haystack.includes(squashedQuery)) return true;
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(squash(term)));
}

async function loadProducts(filters: ProductFilters): Promise<ProductWithDistance[]> {
  const supabase = await createClient();
  const [productsResult, profilesResult] = await Promise.all([
    supabase.from("products").select("*").neq("status", "draft").limit(5000),
    supabase.from("public_seller_profiles").select("*").limit(5000),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const profileById = new Map((profilesResult.data as ProfileRow[]).map((profile) => [profile.id, profile]));
  const origin = filters.origin ?? null;
  let rows = (productsResult.data as ProductRow[]).map((row): ProductWithDistance => {
    const product = mapProduct(row);
    const sellerRow = profileById.get(product.sellerId);
    return {
      ...product,
      distanceKm: origin ? roundKm(haversineKm(origin, product)) : null,
      seller: sellerRow ? mapSeller(sellerRow) : undefined,
      ratings: [],
    };
  });

  if (filters.sellerId) rows = rows.filter((product) => product.sellerId === filters.sellerId);
  if (filters.q) rows = rows.filter((product) => matchesText(product, filters.q!));
  if (filters.categories?.length) rows = rows.filter((product) => filters.categories!.includes(product.category));
  if (filters.kinds?.length) rows = rows.filter((product) => filters.kinds!.includes(product.kind));
  if (filters.conditions?.length) rows = rows.filter((product) => filters.conditions!.includes(product.condition));
  if (filters.formats?.length) rows = rows.filter((product) => filters.formats!.includes(product.format));
  if (filters.sellerKinds?.length) rows = rows.filter((product) => product.seller && filters.sellerKinds!.includes(product.seller.sellerKind));
  if (filters.modes?.length) {
    rows = rows.filter((product) =>
      filters.modes!.some((mode) => mode === "rent" ? product.isRentable : product.buyPrice !== null),
    );
  }
  if (filters.minPrice !== undefined) rows = rows.filter((product) => (product.buyPrice ?? product.mrp) >= filters.minPrice!);
  if (filters.maxPrice !== undefined) rows = rows.filter((product) => (product.buyPrice ?? product.mrp) <= filters.maxPrice!);
  if (origin && filters.radiusKm && filters.radiusKm > 0) {
    const box = boundingBox(origin, filters.radiusKm);
    rows = rows.filter((product) =>
      product.latitude >= box.minLat && product.latitude <= box.maxLat &&
      product.longitude >= box.minLng && product.longitude <= box.maxLng &&
      product.distanceKm !== null && product.distanceKm <= filters.radiusKm!,
    );
  }

  const price = (product: Product) => product.buyPrice ?? product.mrp;
  switch (filters.sort ?? "relevance") {
    case "distance": rows.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)); break;
    case "price_asc": rows.sort((a, b) => price(a) - price(b)); break;
    case "price_desc": rows.sort((a, b) => price(b) - price(a)); break;
    case "rating": rows.sort((a, b) => (b.seller?.rating ?? 0) - (a.seller?.rating ?? 0)); break;
    case "newest": rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)); break;
    default:
      rows.sort((a, b) => {
        const score = (product: ProductWithDistance) =>
          (product.status === "available" ? 0 : 12) +
          (product.distanceKm === null ? 40 : Math.min(40, product.distanceKm)) * 0.4 -
          product.rating * 2;
        return score(a) - score(b);
      });
  }
  rows.sort((a, b) => Number(a.status !== "available") - Number(b.status !== "available"));
  return rows;
}

export async function hostedQueryProducts(filters: ProductFilters) {
  const rows = await loadProducts(filters);
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 60;
  return { items: rows.slice(offset, offset + limit), total: rows.length };
}

export async function hostedFacetsFor(filters: ProductFilters): Promise<Facets> {
  const rows = await loadProducts({ ...filters, limit: 10_000, offset: 0 });
  const byCategory: Record<string, number> = {};
  const byCondition: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  const sellers = new Set<string>();
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;
  let buy = 0;
  let rent = 0;
  for (const product of rows) {
    byCategory[product.category] = (byCategory[product.category] ?? 0) + 1;
    byCondition[product.condition] = (byCondition[product.condition] ?? 0) + 1;
    byFormat[product.format] = (byFormat[product.format] ?? 0) + 1;
    const itemPrice = product.buyPrice ?? product.mrp;
    priceMin = Math.min(priceMin, itemPrice);
    priceMax = Math.max(priceMax, itemPrice);
    if (product.buyPrice !== null) buy += 1;
    if (product.isRentable) rent += 1;
    sellers.add(product.sellerId);
  }
  return {
    total: rows.length, byCategory, byCondition, byFormat,
    byMode: { buy, rent },
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
    sellerCount: sellers.size,
  };
}

export async function hostedGetProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const product = mapProduct(data as ProductRow);
  const [profileResult, reviewsResult] = await Promise.all([
    supabase.from("public_seller_profiles").select("*").eq("id", product.sellerId).maybeSingle(),
    supabase.from("reviews").select("score,comment,created_at,buyer_id").eq("product_id", id).order("created_at", { ascending: false }).limit(4),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  const profile = profileResult.data as ProfileRow | null;
  const buyerIds = [...new Set((reviewsResult.data ?? []).map((review) => review.buyer_id))];
  const buyersResult = buyerIds.length
    ? await supabase.from("public_seller_profiles").select("id,name").in("id", buyerIds)
    : { data: [], error: null };
  if (buyersResult.error) throw buyersResult.error;
  const buyerNames = new Map((buyersResult.data ?? []).map((buyer) => [buyer.id, buyer.name]));
  const ratings: Rating[] = (reviewsResult.data ?? []).map((review) => ({
    score: review.score,
    comment: review.comment,
    buyerName: buyerNames.get(review.buyer_id) ?? "Verified buyer",
    createdAt: review.created_at,
  }));
  return {
    ...product,
    distanceKm: null,
    seller: profile ? mapSeller(profile) : undefined,
    ratings,
  } satisfies ProductWithDistance;
}

export async function hostedGetProductReviews(productId: string): Promise<(Review & { buyerName: string })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id,product_id,seller_id,buyer_id,score,comment,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  const rows = data ?? [];
  const buyerIds = [...new Set(rows.map((row) => row.buyer_id))];
  const profiles = buyerIds.length
    ? await supabase.from("public_seller_profiles").select("id,name").in("id", buyerIds)
    : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.name]));
  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    sellerId: row.seller_id,
    buyerId: row.buyer_id,
    score: row.score,
    comment: row.comment,
    createdAt: row.created_at,
    buyerName: names.get(row.buyer_id) ?? "Verified buyer",
  }));
}

export async function hostedCreateListing(input: NewListingInput) {
  const supabase = await createClient();
  const baseRate = input.rentalBaseRate ?? Math.max(3, Math.round((input.buyPrice ?? input.mrp) / 90));
  const rentalTiers = input.isRentable
    ? input.rentalTiers?.length ? input.rentalTiers : buildRentalTiers(baseRate, input.buyPrice ?? input.mrp)
    : [];
  const { data, error } = await supabase.from("products").insert({
    seller_id: input.sellerId,
    kind: input.kind,
    title: input.title,
    author: input.author,
    publisher: input.publisher,
    edition: input.edition,
    year: input.year,
    isbn: input.isbn,
    language: input.language,
    pages: input.pages,
    subject: input.subject,
    course: input.course,
    category: input.category,
    format: input.format,
    condition: input.condition,
    condition_notes: input.conditionNotes,
    purchased_on: toPurchaseDate(input.purchasedOn),
    mrp: input.mrp,
    buy_price: input.buyPrice,
    is_rentable: input.isRentable,
    rental_base_rate: input.isRentable ? baseRate : null,
    rental_tiers: rentalTiers,
    deposit_multiplier: input.depositMultiplier,
    tags: input.tags,
    latitude: input.latitude,
    longitude: input.longitude,
    pickup_area: input.pickupArea,
    pickup_city: input.pickupCity,
    pickup_pincode: input.pickupPincode,
    cover_style: Math.floor(Math.random() * 20) + 1,
  }).select("*").single();
  if (error) throw error;
  return mapProduct(data as ProductRow);
}

export async function hostedUpdateListing(id: string, patch: Partial<Product>) {
  const supabase = await createClient();
  const columns: Partial<Record<keyof Product, string>> = {
    title: "title", author: "author", publisher: "publisher", edition: "edition",
    year: "year", isbn: "isbn", language: "language", pages: "pages", subject: "subject",
    course: "course", category: "category", format: "format", condition: "condition",
    conditionNotes: "condition_notes", purchasedOn: "purchased_on", mrp: "mrp",
    buyPrice: "buy_price", isRentable: "is_rentable", rentalBaseRate: "rental_base_rate",
    rentalTiers: "rental_tiers", depositMultiplier: "deposit_multiplier", tags: "tags",
    latitude: "latitude", longitude: "longitude", pickupArea: "pickup_area",
    pickupCity: "pickup_city", pickupPincode: "pickup_pincode", status: "status",
  };
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch) as [keyof Product, unknown][]) {
    const column = columns[key];
    if (column) {
      values[column] = key === "purchasedOn" ? toPurchaseDate(value as string | undefined) : value;
    }
  }
  if (patch.isRentable !== undefined || patch.rentalBaseRate !== undefined || patch.buyPrice !== undefined) {
    const current = await hostedGetProduct(id);
    if (!current) throw new Error("Listing not found");
    const rentable = patch.isRentable ?? current.isRentable;
    const price = patch.buyPrice ?? current.buyPrice ?? current.mrp;
    const rate = patch.rentalBaseRate ?? current.rentalBaseRate ?? Math.max(3, Math.round(price / 90));
    values.rental_base_rate = rentable ? rate : null;
    values.rental_tiers = rentable ? buildRentalTiers(rate, price) : [];
  }
  const { data, error } = await supabase.from("products").update(values).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Listing not found or you do not own it.");
  return mapProduct(data as ProductRow);
}

export async function hostedDeleteListing(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Listing not found or you do not own it.");
  return true;
}

export async function hostedAddReview(input: {
  productId: string;
  buyerId: string;
  score: number;
  comment: string;
}) {
  const supabase = await createClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", input.productId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error("Listing not found");
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: input.productId,
      seller_id: product.seller_id,
      buyer_id: input.buyerId,
      score: Math.min(5, Math.max(1, input.score)),
      comment: input.comment.trim(),
    })
    .select("id,product_id,seller_id,buyer_id,score,comment,created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    productId: data.product_id,
    sellerId: data.seller_id,
    buyerId: data.buyer_id,
    score: data.score,
    comment: data.comment,
    createdAt: data.created_at,
  } satisfies Review;
}

export async function hostedGetCart(userId: string): Promise<Cart> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id,mode,days,added_at")
    .eq("user_id", userId)
    .order("added_at");
  if (error) throw error;
  const lines = (data ?? []).map((row) => ({
    productId: row.product_id,
    mode: row.mode as "buy" | "rent",
    days: row.days ?? undefined,
    addedAt: row.added_at,
  }));
  return { key: userId, lines, updatedAt: lines.at(-1)?.addedAt ?? new Date().toISOString() };
}

export async function hostedMutateCart(
  userId: string,
  productId: string | null,
  mode: "buy" | "rent" | null,
  days?: number,
  operation: "add" | "update" | "remove" | "clear" = "add",
) {
  const supabase = await createClient();
  if (operation === "clear") {
    const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
    if (error) throw error;
    return;
  }
  if (!productId) throw new Error("A product is required for cart changes.");
  if (operation === "remove") {
    let request = supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", productId);
    if (mode) request = request.eq("mode", mode);
    const { error } = await request;
    if (error) throw error;
    return;
  }
  if (operation === "update") {
    const { error } = await supabase.from("cart_items").update({ days }).eq("user_id", userId).eq("product_id", productId);
    if (error) throw error;
    return;
  }
  if (!mode) throw new Error("Choose buy or rent for this cart item.");
  const { error } = await supabase.from("cart_items").upsert(
    { user_id: userId, product_id: productId, mode, days: mode === "rent" ? days ?? 7 : null },
    { onConflict: "user_id,product_id,mode" },
  );
  if (error) throw error;
}

function mapRental(row: Record<string, unknown>): RentalOrder {
  return {
    id: String(row.id),
    buyerId: String(row.buyer_id),
    sellerId: String(row.seller_id),
    productId: String(row.product_id),
    days: Number(row.days),
    tierLabel: String(row.tier_label),
    depositPaid: Number(row.deposit_paid),
    rentalFee: Number(row.rental_fee),
    lateFee: Number(row.late_fee),
    penaltyPct: Number(row.penalty_pct),
    penaltyAmount: Number(row.penalty_amount),
    refundAmount: Number(row.refund_amount),
    startDate: String(row.start_date),
    dueDate: String(row.due_date),
    returnRequestedAt: (row.return_requested_at as string | null) ?? undefined,
    returnedAt: (row.returned_at as string | null) ?? undefined,
    refundedAt: (row.refunded_at as string | null) ?? undefined,
    refundMethod: (row.refund_method as RentalOrder["refundMethod"]) ?? undefined,
    inspectionGrade: (row.inspection_grade as RentalOrder["inspectionGrade"]) ?? undefined,
    inspectionNotes: (row.inspection_notes as string | null) ?? undefined,
    status: row.status as RentalOrder["status"],
    createdAt: String(row.created_at),
    timeline: (row.timeline as RentalOrder["timeline"]) ?? [],
  };
}

function mapPurchase(row: Record<string, unknown>): PurchaseOrder {
  return {
    id: String(row.id),
    buyerId: String(row.buyer_id),
    sellerId: String(row.seller_id),
    productId: String(row.product_id),
    amount: Number(row.amount),
    deliveryMode: row.delivery_mode as PurchaseOrder["deliveryMode"],
    courierFee: Number(row.courier_fee),
    address: String(row.address),
    paymentMethod: row.payment_method as PurchaseOrder["paymentMethod"],
    status: row.status as PurchaseOrder["status"],
    createdAt: String(row.created_at),
  };
}

function mapProfile(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    provider: row.provider as User["provider"],
    phone: (row.phone as string | null) ?? undefined,
    role: row.role as User["role"],
    sellerKind: row.seller_kind as SellerKind,
    occupation: (row.occupation as User["occupation"]) ?? "Other",
    age: (row.age as number | null) ?? undefined,
    gender: (row.gender as User["gender"]) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    city: (row.city as string | null) ?? undefined,
    pincode: (row.pincode as string | null) ?? undefined,
    latitude: (row.latitude as number | null) ?? undefined,
    longitude: (row.longitude as number | null) ?? undefined,
    rating: Number(row.rating),
    ratingsCount: Number(row.ratings_count),
    walletBalance: Number(row.wallet_balance),
    avatarColor: String(row.avatar_color ?? "#4f46e5"),
    verifiedSeller: Boolean(row.verified_seller),
    verification: {
      status: row.verification_status as User["verification"]["status"],
      gstin: (row.gstin as string | null) ?? undefined,
      registrationId: (row.registration_id as string | null) ?? undefined,
      submittedAt: (row.verification_submitted_at as string | null) ?? undefined,
      reviewedAt: (row.verified_at as string | null) ?? undefined,
      note: (row.verification_note as string | null) ?? undefined,
    },
    createdAt: String(row.created_at),
  };
}

function toPurchaseDate(value?: string) {
  const date = value?.trim();
  if (!date) return null;
  return /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date;
}

export async function hostedRentalsForBuyer(buyerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rental_orders").select("*").eq("buyer_id", buyerId).order("created_at", { ascending: false });
  if (error) throw error;
  const rentals = (data ?? []).map(mapRental);
  const productIds = [...new Set(rentals.map((rental) => rental.productId))];
  const sellerIds = [...new Set(rentals.map((rental) => rental.sellerId))];
  const [products, sellers] = await Promise.all([
    productIds.length ? supabase.from("products").select("*").in("id", productIds) : { data: [], error: null },
    sellerIds.length ? supabase.from("public_seller_profiles").select("*").in("id", sellerIds) : { data: [], error: null },
  ]);
  if (products.error) throw products.error;
  if (sellers.error) throw sellers.error;
  const productsById = new Map((products.data ?? []).map((row) => [row.id, mapProduct(row as ProductRow)]));
  const sellersById = new Map((sellers.data ?? []).map((row) => [row.id, mapSeller(row as ProfileRow)]));
  return rentals.map((rental) => ({
    ...rental,
    product: productsById.get(rental.productId),
    seller: sellersById.get(rental.sellerId),
    daysToDue: Math.ceil((Date.parse(rental.dueDate) - Date.now()) / 86_400_000),
  }));
}

export async function hostedPurchasesForBuyer(buyerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").select("*").eq("buyer_id", buyerId).order("created_at", { ascending: false });
  if (error) throw error;
  const orders = (data ?? []).map(mapPurchase);
  const productIds = [...new Set(orders.map((order) => order.productId))];
  const sellerIds = [...new Set(orders.map((order) => order.sellerId))];
  const [products, sellers] = await Promise.all([
    productIds.length ? supabase.from("products").select("*").in("id", productIds) : { data: [], error: null },
    sellerIds.length ? supabase.from("public_seller_profiles").select("*").in("id", sellerIds) : { data: [], error: null },
  ]);
  if (products.error) throw products.error;
  if (sellers.error) throw sellers.error;
  const productsById = new Map((products.data ?? []).map((row) => [row.id, mapProduct(row as ProductRow)]));
  const sellersById = new Map((sellers.data ?? []).map((row) => [row.id, mapSeller(row as ProfileRow)]));
  return orders.map((order) => ({
    ...order,
    product: productsById.get(order.productId),
    seller: sellersById.get(order.sellerId),
  }));
}

export async function hostedListingsBySeller(sellerId: string) {
  return hostedQueryProducts({ sellerId, includeUnavailable: true, limit: 200, sort: "newest" });
}

export async function hostedRentalsForSeller(sellerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rental_orders").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false });
  if (error) throw error;
  const rentals = (data ?? []).map(mapRental);
  const productIds = [...new Set(rentals.map((rental) => rental.productId))];
  const buyerIds = [...new Set(rentals.map((rental) => rental.buyerId))];
  const [products, buyers] = await Promise.all([
    productIds.length ? supabase.from("products").select("*").in("id", productIds) : { data: [], error: null },
    buyerIds.length ? supabase.from("public_seller_profiles").select("*").in("id", buyerIds) : { data: [], error: null },
  ]);
  if (products.error) throw products.error;
  if (buyers.error) throw buyers.error;
  const productsById = new Map((products.data ?? []).map((row) => [row.id, mapProduct(row as ProductRow)]));
  const buyersById = new Map((buyers.data ?? []).map((row) => [row.id, mapSeller(row as ProfileRow)]));
  return rentals.map((rental) => ({
    ...rental,
    product: productsById.get(rental.productId),
    buyer: buyersById.get(rental.buyerId),
    daysToDue: Math.ceil((Date.parse(rental.dueDate) - Date.now()) / 86_400_000),
  }));
}

export async function hostedSalesForSeller(sellerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false });
  if (error) throw error;
  const orders = (data ?? []).map(mapPurchase);
  const productIds = [...new Set(orders.map((order) => order.productId))];
  const buyerIds = [...new Set(orders.map((order) => order.buyerId))];
  const [products, buyers] = await Promise.all([
    productIds.length ? supabase.from("products").select("*").in("id", productIds) : { data: [], error: null },
    buyerIds.length ? supabase.from("public_seller_profiles").select("*").in("id", buyerIds) : { data: [], error: null },
  ]);
  if (products.error) throw products.error;
  if (buyers.error) throw buyers.error;
  const productsById = new Map((products.data ?? []).map((row) => [row.id, mapProduct(row as ProductRow)]));
  const buyersById = new Map((buyers.data ?? []).map((row) => [row.id, mapSeller(row as ProfileRow)]));
  return orders.map((order) => ({
    ...order,
    product: productsById.get(order.productId),
    buyer: buyersById.get(order.buyerId),
  }));
}

export async function hostedCheckout(input: {
  lines: { productId: string; mode: "buy" | "rent"; days?: number }[];
  address: string;
  paymentMethod: "upi" | "card" | "cod" | "wallet";
  deliveryMode: "pickup" | "courier";
  courierFee: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("checkout_bookart", {
    p_lines: input.lines,
    p_address: input.address,
    p_payment_method: input.paymentMethod,
    p_delivery_mode: input.deliveryMode,
    p_courier_fee: input.courierFee,
  });
  if (error) throw error;
  const result = data as {
    purchase_ids: string[];
    rental_ids: string[];
    wallet_balance: number;
  };
  return {
    purchaseIds: result.purchase_ids ?? [],
    rentalIds: result.rental_ids ?? [],
    walletBalance: Number(result.wallet_balance ?? 0),
  };
}

export async function hostedRequestReturn(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_rental_return", { p_rental_id: orderId });
  if (error) throw error;
}

export async function hostedInspectAndSettle(
  orderId: string,
  grade: RentalOrder["inspectionGrade"] & ("ok" | "minor" | "major" | "lost"),
  notes?: string,
) {
  const supabase = await createClient();
  const { data: row, error: readError } = await supabase.from("rental_orders").select("*").eq("id", orderId).maybeSingle();
  if (readError) throw readError;
  if (!row) throw new Error("Rental not found");
  const order = mapRental(row);
  const product = await hostedGetProduct(order.productId);
  const decision = settleRental({
    depositPaid: order.depositPaid,
    rentalFee: order.rentalFee,
    grade,
    lateDays: Math.max(0, daysBetween(order.dueDate, new Date())),
    baseRatePerDay: product?.rentalBaseRate ?? 8,
  });
  const { data: refundAmount, error } = await supabase.rpc("inspect_rental_return", {
    p_rental_id: orderId,
    p_grade: grade,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return { order, refundAmount: Number(refundAmount), breakdown: decision.breakdown };
}

export async function hostedReviewVerification(userId: string, approve: boolean, note?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_seller", {
    p_user: userId,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function hostedAdminSnapshot(): Promise<DBShape> {
  const supabase = await createClient();
  const [users, products, rentals, purchases, reviews, searches] = await Promise.all([
    supabase.from("users").select("*").limit(5000),
    supabase.from("products").select("*").limit(5000),
    supabase.from("rental_orders").select("*").limit(5000),
    supabase.from("purchase_orders").select("*").limit(5000),
    supabase.from("reviews").select("*").limit(5000),
    supabase.from("search_logs").select("query,created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  for (const result of [users, products, rentals, purchases, reviews, searches]) {
    if (result.error) throw result.error;
  }
  return {
    users: (users.data ?? []).map(mapProfile),
    products: (products.data ?? []).map((row) => mapProduct(row as ProductRow)),
    rentals: (rentals.data ?? []).map(mapRental),
    purchases: (purchases.data ?? []).map(mapPurchase),
    reviews: (reviews.data ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      sellerId: row.seller_id,
      buyerId: row.buyer_id,
      score: row.score,
      comment: row.comment,
      createdAt: row.created_at,
    })),
    carts: [],
    sessions: [],
    meta: {
      seededAt: new Date().toISOString(),
      version: 1,
      searchLog: (searches.data ?? []).map((row) => ({ q: row.query, at: row.created_at })),
    },
  };
}

export async function hostedLogSearch(query: string) {
  if (!query.trim()) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_bookart_search", { p_query: query.trim() });
  if (error) throw error;
}

export function isSupabaseConfigured() {
  return isConfigured();
}

export type { Coordinates };
