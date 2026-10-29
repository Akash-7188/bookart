/**
 * Bookart rental engine — security deposit, rental fee, damage penalty and
 * refund calculation.
 *
 * Model
 * -----
 *  • Buyer pays the FULL equivalent purchase price upfront as an *active deposit*.
 *  • Rental fee depends on the duration tier (7 / 15 / 30 / 90 days) and the
 *    seller's base rate (₹/day). Longer tiers get an automatic discount.
 *  • On return, the seller inspects the item and grades the condition. The
 *    deposit minus rental fee minus damage penalty (plus any late fee) is
 *    refunded to the original payment method or the Bookart wallet.
 */

import type { PenaltyGrade, Product, RentalTier } from "./types";

/** Duration tiers offered on every rentable listing. */
export const RENT_TIERS: { days: number; label: string; discount: number }[] = [
  { days: 7, label: "7 days", discount: 0 },
  { days: 15, label: "15 days", discount: 0.08 },
  { days: 30, label: "30 days", discount: 0.15 },
  { days: 90, label: "1 semester / 90 days", discount: 0.3 },
];

export function inr(n: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Ceiling on the rental fee as a share of the item's value, per tier.
 * A renter must never pay more in fees than the copy is worth — beyond that
 * they'd simply buy it.
 */
export const TIER_VALUE_CAP: Record<number, number> = { 7: 0.12, 15: 0.22, 30: 0.35, 90: 0.6 };

/** Fee for one duration tier, derived from the seller's base rate. */
export function tierFee(baseRatePerDay: number, days: number, itemValue?: number): number {
  const tier = RENT_TIERS.find((t) => t.days === days) ?? RENT_TIERS[0];
  let raw = baseRatePerDay * days * (1 - tier.discount);
  if (itemValue && itemValue > 0) raw = Math.min(raw, itemValue * (TIER_VALUE_CAP[tier.days] ?? 0.35));
  // Keep it friendly: round to the nearest ₹5, minimum ₹20.
  return Math.max(20, Math.round(raw / 5) * 5);
}

export function buildRentalTiers(baseRatePerDay: number, itemValue?: number): RentalTier[] {
  return RENT_TIERS.map((t) => ({
    days: t.days,
    label: t.label,
    fee: tierFee(baseRatePerDay, t.days, itemValue),
  }));
}

/** Value the deposit/fee ceiling is measured against (list price or MRP). */
export function itemValueOf(product: Pick<Product, "buyPrice" | "mrp">) {
  return product.buyPrice ?? product.mrp;
}

/** Deposit = full equivalent purchase value × multiplier (default 1×). */
export function depositFor(product: Pick<Product, "buyPrice" | "mrp" | "depositMultiplier">) {
  const basis = product.buyPrice ?? product.mrp;
  return Math.round(basis * (product.depositMultiplier || 1));
}

export interface RentalQuoteInput {
  product: Pick<Product, "buyPrice" | "mrp" | "depositMultiplier" | "rentalBaseRate" | "rentalTiers">;
  days: number;
  /** Days past the due date when the quote is generated. */
  lateDays?: number;
  grade?: PenaltyGrade;
}

export interface RentalQuote {
  days: number;
  deposit: number;
  rentalFee: number;
  /** Daily rate the buyer effectively pays for the chosen tier. */
  effectiveDailyRate: number;
  lateFee: number;
  penaltyPct: number;
  penaltyAmount: number;
  refundAmount: number;
  savingsVsBuy: number;
}

/** Damage grade → percentage of the deposit withheld. */
export const PENALTY_GRADES: { grade: PenaltyGrade; label: string; pct: number; description: string }[] = [
  { grade: "ok", label: "Returned in expected condition", pct: 0, description: "No penalty. Full deposit minus rental fee is refunded." },
  { grade: "minor", label: "Minor wear / a few pencil marks", pct: 0.1, description: "10% of deposit withheld for cleaning & reconditioning." },
  { grade: "major", label: "Significant damage or missing pages", pct: 0.35, description: "35% of deposit withheld, listing relisted as Heavily Annotated." },
  { grade: "lost", label: "Not returned / lost in transit", pct: 1, description: "Deposit is forfeited and paid to the seller as compensation." },
];

export function penaltyPctFor(grade: PenaltyGrade | undefined) {
  if (!grade) return 0;
  return PENALTY_GRADES.find((g) => g.grade === grade)?.pct ?? 0;
}

/** Late fee: 10% of the daily rate per overdue day, capped at 60% of the deposit. */
export function lateFeeFor(baseRatePerDay: number, lateDays: number, deposit: number) {
  if (lateDays <= 0) return 0;
  const raw = baseRatePerDay * 0.1 * lateDays;
  return Math.min(Math.round(raw), Math.round(deposit * 0.6));
}

export function daysBetween(from: Date | string, to: Date | string) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDays(date: Date | string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** The core calculation engine. Pure, deterministic and unit-testable. */
export function quoteRental({ product, days, lateDays = 0, grade }: RentalQuoteInput): RentalQuote {
  const deposit = depositFor(product);
  const baseRate = product.rentalBaseRate ?? Math.max(2, Math.round((product.buyPrice ?? product.mrp) / 90));
  const value = itemValueOf(product);
  const tiers = product.rentalTiers?.length ? product.rentalTiers : buildRentalTiers(baseRate, value);
  const storedFee = tiers.find((t) => t.days === days)?.fee;
  const capForTier = Math.round(value * (TIER_VALUE_CAP[days] ?? 0.35));
  // Defensive clamp: imported/hand-edited listings can carry an over-priced
  // tier, which would otherwise push the refund below zero.
  const rentalFee = Math.min(storedFee ?? tierFee(baseRate, days, value), capForTier);
  const penaltyPct = penaltyPctFor(grade);
  const penaltyAmount = Math.round(deposit * penaltyPct);
  const lateFee = lateFeeFor(baseRate, lateDays, deposit);
  const refundAmount = Math.max(0, deposit - rentalFee - penaltyAmount - lateFee);

  return {
    days,
    deposit,
    rentalFee,
    effectiveDailyRate: round2(rentalFee / days),
    lateFee,
    penaltyPct,
    penaltyAmount,
    refundAmount,
    savingsVsBuy: Math.max(0, (product.buyPrice ?? product.mrp) - rentalFee),
  };
}

export type RefundDecision = {
  status: "refunded";
  refundAmount: number;
  breakdown: { label: string; amount: number; kind: "credit" | "debit" }[];
};

/** Applied when a seller verifies a returned item. */
export function settleRental(params: {
  depositPaid: number;
  rentalFee: number;
  grade: PenaltyGrade;
  lateDays: number;
  baseRatePerDay: number;
}): RefundDecision {
  const { depositPaid, rentalFee, grade, lateDays, baseRatePerDay } = params;
  const penaltyAmount = Math.round(depositPaid * penaltyPctFor(grade));
  const lateFee = lateFeeFor(baseRatePerDay, lateDays, depositPaid);
  const refundAmount = Math.max(0, depositPaid - rentalFee - penaltyAmount - lateFee);

  const gradeLabel = PENALTY_GRADES.find((g) => g.grade === grade)?.label ?? "Inspection";
  const breakdown: RefundDecision["breakdown"] = [
    { label: "Deposit held", amount: depositPaid, kind: "credit" },
    { label: "Rental fee payable to seller", amount: -rentalFee, kind: "debit" },
  ];
  if (penaltyAmount > 0) breakdown.push({ label: `Damage penalty — ${gradeLabel}`, amount: -penaltyAmount, kind: "debit" });
  if (lateFee > 0) breakdown.push({ label: `Late fee (${lateDays} day${lateDays > 1 ? "s" : ""})`, amount: -lateFee, kind: "debit" });

  return { status: "refunded", refundAmount, breakdown };
}

/** Escrow-style platform commission shown in the seller dashboard. */
export function platformCommission(amount: number, kind: "sale" | "rental") {
  const rate = kind === "sale" ? 0.05 : 0.12;
  return Math.round(amount * rate);
}
