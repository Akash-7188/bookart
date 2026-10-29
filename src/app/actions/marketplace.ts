"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addReview,
  adjustWallet,
  cartAdd,
  cartClear,
  cartRemove,
  cartUpdate,
  createListing,
  deleteListing,
  findUserById,
  getProductBySlugOrId,
  inspectAndSettle,
  logSearch,
  placePurchaseOrders,
  queryProducts,
  rentItem,
  requestReturn,
  reviewVerification,
  trendingSearches,
  updateListing,
  type ProductFilters,
} from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/session";
import { quoteRental } from "@/lib/rental";
import {
  hostedCheckout,
  hostedCreateListing,
  hostedDeleteListing,
  hostedInspectAndSettle,
  hostedAddReview,
  hostedGetProduct,
  hostedLogSearch,
  hostedMutateCart,
  hostedQueryProducts,
  hostedRequestReturn,
  hostedReviewVerification,
  hostedUpdateListing,
  isSupabaseConfigured,
} from "@/lib/hosted-data";

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

export async function searchProductsAction(filters: ProductFilters) {
  if (isSupabaseConfigured()) {
    await hostedLogSearch(filters.q ?? "");
    return hostedQueryProducts(filters);
  }
  await logSearch(filters.q ?? "");
  return queryProducts(filters);
}

export async function trendingSearchesAction() {
  if (isSupabaseConfigured()) {
    return ["UPSC polity", "handwritten notes", "JEE physics", "NCERT class 10", "GATE CSE", "rare Hindi books"];
  }
  return trendingSearches();
}

/** Hydrates cart lines with live listing data (price, status, distance). */
export async function productsByIdsAction(ids: string[], origin?: { latitude: number; longitude: number } | null) {
  if (!ids.length) return [];
  const query = isSupabaseConfigured() ? hostedQueryProducts : queryProducts;
  const { items } = await query({ origin: origin ?? null, limit: 500, includeUnavailable: true });
  return items.filter((item) => ids.includes(item.id));
}

/* ------------------------------------------------------------------ */
/* Cart (mirrored server-side so checkout validates live prices)       */
/* ------------------------------------------------------------------ */

export async function cartAddAction(productId: string, mode: "buy" | "rent", days?: number) {
  const user = await getCurrentUserSafe();
  if (isSupabaseConfigured()) {
    if (user) await hostedMutateCart(user.id, productId, mode, days, "add");
    revalidatePath("/cart");
    return { ok: true };
  }
  const key = user?.id ?? "guest_demo";
  await cartAdd(key, productId, mode, days);
  revalidatePath("/cart");
  return { ok: true };
}

export async function cartUpdateAction(productId: string, days: number) {
  const user = await getCurrentUserSafe();
  if (isSupabaseConfigured()) {
    if (user) await hostedMutateCart(user.id, productId, null, days, "update");
    return { ok: true };
  }
  await cartUpdate(user?.id ?? "guest_demo", productId, { days });
  return { ok: true };
}

export async function cartRemoveAction(productId: string, mode?: "buy" | "rent") {
  const user = await getCurrentUserSafe();
  if (isSupabaseConfigured()) {
    if (user) await hostedMutateCart(user.id, productId, mode ?? null, undefined, "remove");
    revalidatePath("/cart");
    return { ok: true };
  }
  await cartRemove(user?.id ?? "guest_demo", productId, mode);
  revalidatePath("/cart");
  return { ok: true };
}

export async function cartClearAction() {
  const user = await getCurrentUserSafe();
  if (isSupabaseConfigured()) {
    if (user) await hostedMutateCart(user.id, null, null, undefined, "clear");
    revalidatePath("/cart");
    return { ok: true };
  }
  await cartClear(user?.id ?? "guest_demo");
  revalidatePath("/cart");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Checkout                                                            */
/* ------------------------------------------------------------------ */

const checkoutSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string(),
        mode: z.enum(["buy", "rent"]),
        days: z.number().int().positive().optional(),
      }),
    )
    .min(1, "Your cart is empty"),
  address: z.string().min(6, "Add a delivery / pickup address"),
  paymentMethod: z.enum(["upi", "card", "cod", "wallet"]),
  deliveryMode: z.enum(["pickup", "courier"]),
  referralCommission: z.number().optional(),
});

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  purchaseIds: string[];
  rentalIds: string[];
  walletBalance?: number;
  message?: string;
}

/** Re-prices every line against the live listing before creating orders. */
export async function checkoutAction(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Checkout failed",
      purchaseIds: [],
      rentalIds: [],
    };
  }
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in to complete checkout.", purchaseIds: [], rentalIds: [] };

  const { lines, address, paymentMethod, deliveryMode } = parsed.data;

  if (isSupabaseConfigured()) {
    try {
      const products = await Promise.all(lines.map((line) => hostedGetProduct(line.productId)));
      if (products.some((product) => !product)) {
        return { ok: false, error: "A listing in your cart is no longer available.", purchaseIds: [], rentalIds: [] };
      }
      const courierFee = deliveryMode === "courier"
        ? lines.filter((line) => line.mode === "buy").length * 49
        : 0;
      const result = await hostedCheckout({
        lines: lines.map((line) => ({ productId: line.productId, mode: line.mode, days: line.days })),
        address,
        paymentMethod,
        deliveryMode,
        courierFee,
      });
      await hostedMutateCart(user.id, null, null, undefined, "clear");
      revalidatePath("/orders");
      revalidatePath("/rentals");
      revalidatePath("/cart");
      return {
        ok: true,
        purchaseIds: result.purchaseIds,
        rentalIds: result.rentalIds,
        walletBalance: result.walletBalance,
        message: "Order recorded. Online payment collection is not configured yet.",
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Checkout failed",
        purchaseIds: [],
        rentalIds: [],
      };
    }
  }

  const buyLines: { productId: string; amount: number; sellerId: string }[] = [];
  const rentLines: { productId: string; days: number; total: number }[] = [];
  let courierFee = 0;

  for (const line of lines) {
    const product = getProductBySlugOrId(line.productId);
    if (!product) return { ok: false, error: "A listing in your cart is no longer available.", purchaseIds: [], rentalIds: [] };
    if (product.status !== "available") {
      return { ok: false, error: `"${product.title}" is no longer available (${product.status}).`, purchaseIds: [], rentalIds: [] };
    }
    if (line.mode === "buy") {
      if (product.buyPrice === null) {
        return { ok: false, error: `"${product.title}" is rent-only.`, purchaseIds: [], rentalIds: [] };
      }
      const distant = Boolean(product.pickupCity) && deliveryMode === "courier";
      if (distant) courierFee += 49;
      buyLines.push({ productId: product.id, amount: product.buyPrice, sellerId: product.sellerId });
    } else {
      const quote = quoteRental({ product, days: line.days ?? 7 });
      rentLines.push({ productId: product.id, days: line.days ?? 7, total: quote.deposit });
    }
  }

  const buyTotal = buyLines.reduce((sum, l) => sum + l.amount, 0) + courierFee;
  const depositTotal = rentLines.reduce((sum, l) => sum + l.total, 0);
  const grandTotal = buyTotal + depositTotal;

  if (paymentMethod === "wallet") {
    const buyer = findUserById(user.id);
    if (!buyer || buyer.walletBalance < grandTotal) {
      return {
        ok: false,
        error: `Wallet balance is ₹${buyer?.walletBalance ?? 0}. Short by ₹${Math.max(0, grandTotal - (buyer?.walletBalance ?? 0))}. Choose UPI or top up.`,
        purchaseIds: [],
        rentalIds: [],
      };
    }
  }

  const purchaseIds: string[] = [];
  if (buyLines.length) {
    const orders = await placePurchaseOrders({
      buyerId: user.id,
      address,
      paymentMethod,
      deliveryMode,
      courierFee,
      lines: buyLines.map((l) => ({ productId: l.productId, amount: l.amount })),
    });
    purchaseIds.push(...orders.map((o) => o.id));
  }

  const rentalIds: string[] = [];
  for (const line of rentLines) {
    const rental = await rentItem({ buyerId: user.id, productId: line.productId, days: line.days });
    rentalIds.push(rental.id);
  }

  if (paymentMethod === "wallet" && grandTotal > 0) {
    await adjustWallet(user.id, -grandTotal);
  }

  revalidatePath("/orders");
  revalidatePath("/rentals");

  return {
    ok: true,
    purchaseIds,
    rentalIds,
    walletBalance: findUserById(user.id)?.walletBalance,
    message:
      rentLines.length > 0
        ? `Security deposit of ₹${depositTotal} held in escrow. Refund is processed after the seller inspects the returned item.`
        : "Order placed. The seller will confirm dispatch shortly.",
  };
}

export async function rentNowAction(productId: string, days: number) {
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in to rent this item." };
  if (isSupabaseConfigured()) {
    try {
      const product = await hostedGetProduct(productId);
      if (!product) return { ok: false, error: "Listing not found." };
      const quote = quoteRental({ product, days });
      if (user.walletBalance < quote.deposit) {
        return {
          ok: false,
          error: `Wallet balance is ₹${user.walletBalance}. Add ₹${quote.deposit - user.walletBalance} to rent this item.`,
        };
      }
      const result = await hostedCheckout({
        lines: [{ productId, mode: "rent", days }],
        address: "Local pickup",
        paymentMethod: "wallet",
        deliveryMode: "pickup",
        courierFee: 0,
      });
      revalidatePath("/rentals");
      revalidatePath(`/product/${productId}`);
      return {
        ok: true,
        rentalId: result.rentalIds[0],
        deposit: quote.deposit,
        dueDate: new Date(Date.now() + days * 86_400_000).toISOString(),
        walletUsed: quote.deposit,
        payNow: 0,
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not start the rental" };
    }
  }
  const product = getProductBySlugOrId(productId);
  if (!product) return { ok: false, error: "Listing not found" };
  try {
    const order = await rentItem({ buyerId: user.id, productId, days });
    const quote = quoteRental({ product, days });
    // Wallet covers whatever it can; the remainder is charged to the payment method.
    const fromWallet = Math.min(user.walletBalance, quote.deposit);
    if (fromWallet > 0) await adjustWallet(user.id, -fromWallet);
    revalidatePath("/rentals");
    revalidatePath(`/product/${productId}`);
    return {
      ok: true,
      rentalId: order.id,
      deposit: order.depositPaid,
      dueDate: order.dueDate,
      walletUsed: fromWallet,
      payNow: Math.max(0, quote.deposit - fromWallet),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not start the rental" };
  }
}

/* ------------------------------------------------------------------ */
/* Rental lifecycle                                                    */
/* ------------------------------------------------------------------ */

export async function requestReturnAction(orderId: string) {
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in." };
  try {
    if (isSupabaseConfigured()) {
      await hostedRequestReturn(orderId);
      revalidatePath("/rentals");
      return { ok: true };
    }
    await requestReturn(orderId, user.id);
    revalidatePath("/rentals");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not request return" };
  }
}

export async function inspectRentalAction(orderId: string, grade: string, notes?: string) {
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in." };
  const allowed = ["ok", "minor", "major", "lost"] as const;
  if (!allowed.includes(grade as (typeof allowed)[number])) {
    return { ok: false, error: "Pick a valid condition grade" };
  }
  try {
    if (isSupabaseConfigured()) {
      const result = await hostedInspectAndSettle(orderId, grade as (typeof allowed)[number], notes);
      revalidatePath("/seller");
      revalidatePath("/rentals");
      return { ok: true, refundAmount: result.refundAmount, breakdown: result.breakdown };
    }
    const result = await inspectAndSettle(orderId, grade as (typeof allowed)[number], notes);
    revalidatePath("/seller");
    revalidatePath("/rentals");
    return { ok: true, refundAmount: result.refundAmount, breakdown: result.breakdown };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Inspection failed" };
  }
}

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

const listingSchema = z.object({
  kind: z.enum(["book", "notes", "bundle"]),
  category: z.enum(["competitive_exams", "college_notes", "school_textbooks", "fiction_nonfiction", "rare_books"]),
  title: z.string().min(3, "Add the title"),
  author: z.string().min(2, "Add the author or faculty name"),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  isbn: z.string().optional(),
  language: z.string().min(2),
  pages: z.coerce.number().int().positive().optional(),
  subject: z.string().optional(),
  course: z.string().optional(),
  format: z.enum(["hardcover", "paperback", "spiral_notes", "digital_pack"]),
  condition: z.enum(["brand_new", "like_new", "gently_used", "heavily_annotated"]),
  conditionNotes: z.array(z.string()).default([]),
  purchasedOn: z.string().optional(),
  mrp: z.coerce.number().positive("Enter the MRP"),
  buyPrice: z.coerce.number().positive().nullable().optional(),
  isRentable: z.boolean().default(false),
  rentalBaseRate: z.coerce.number().positive().nullable().optional(),
  depositMultiplier: z.coerce.number().min(1).max(2).default(1),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  pickupArea: z.string().min(3, "Add a pickup area"),
  pickupCity: z.string().min(2),
  pickupPincode: z.string().regex(/^\d{6}$/, "6-digit pincode"),
  tags: z.array(z.string()).default([]),
});

export async function createListingAction(raw: unknown) {
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Please complete the listing details" };
  }
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false as const, error: "Please sign in to list an item." };

  const data = parsed.data;
  if (data.kind !== "book" && !data.subject) {
    return { ok: false as const, error: "Add the subject / course for notes and study bundles." };
  }
  if (!data.isRentable && (data.buyPrice ?? 0) <= 0) {
    return { ok: false as const, error: "Set a selling price or enable renting." };
  }
  if (data.isRentable && !data.rentalBaseRate) {
    return { ok: false as const, error: "Set a rental price per day to enable renting." };
  }

  const create = isSupabaseConfigured() ? hostedCreateListing : createListing;
  const listing = await create({
    ...data,
    buyPrice: data.buyPrice ?? null,
    rentalBaseRate: data.rentalBaseRate ?? null,
    sellerId: user.id,
    coverStyle: 0,
    tags: [...(data.tags ?? []), data.subject ?? "", data.course ?? ""].filter(Boolean) as string[],
  });
  revalidatePath("/seller");
  revalidatePath("/marketplace");
  return { ok: true as const, listingId: listing.id };
}

export async function toggleListingStatusAction(listingId: string, status: string) {
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in." };
  const allowed = ["available", "rented", "sold", "draft"];
  if (!allowed.includes(status)) return { ok: false, error: "Invalid status" };
  const listing = isSupabaseConfigured() ? await hostedGetProduct(listingId) : getProductBySlugOrId(listingId);
  if (!listing || (listing.sellerId !== user.id && user.role !== "admin")) {
    return { ok: false, error: "You can only update your own listings." };
  }
  const update = isSupabaseConfigured() ? hostedUpdateListing : updateListing;
  await update(listingId, { status: status as "available" | "rented" | "sold" | "draft" });
  revalidatePath("/seller");
  return { ok: true };
}

export async function deleteListingAction(listingId: string) {
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in." };
  const listing = isSupabaseConfigured() ? await hostedGetProduct(listingId) : getProductBySlugOrId(listingId);
  if (!listing || (listing.sellerId !== user.id && user.role !== "admin")) {
    return { ok: false, error: "You can only remove your own listings." };
  }
  const remove = isSupabaseConfigured() ? hostedDeleteListing : deleteListing;
  await remove(listingId);
  revalidatePath("/seller");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Reviews & admin                                                     */
/* ------------------------------------------------------------------ */

export async function reviewSellerAction(productId: string, score: number, comment: string) {
  const user = await getCurrentUserSafe();
  if (!user) return { ok: false, error: "Please sign in to rate a seller." };
  if (comment.trim().length < 4) return { ok: false, error: "Add a short comment." };
  const createReview = isSupabaseConfigured() ? hostedAddReview : addReview;
  await createReview({ productId, buyerId: user.id, score, comment });
  revalidatePath(`/product/${productId}`);
  return { ok: true };
}

export async function reviewVerificationAction(userId: string, approve: boolean, note?: string) {
  const user = await getCurrentUserSafe();
  if (!user || user.role !== "admin") return { ok: false, error: "Admins only." };
  if (isSupabaseConfigured()) await hostedReviewVerification(userId, approve, note);
  else await reviewVerification(userId, approve, note);
  revalidatePath("/admin");
  return { ok: true };
}
