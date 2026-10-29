/**
 * Bookart — domain types.
 * These mirror the production Postgres/PostGIS schema in /prisma/schema.prisma
 * and /supabase/schema.sql.
 */

export type UserRole = "buyer" | "seller" | "admin";
export type SellerKind = "individual" | "bookstore" | "library";

export type Occupation = "Student" | "Teacher" | "Reader" | "Shop Owner" | "Other";
export type Gender = "Female" | "Male" | "Non-binary" | "Prefer not to say";

export type Category =
  | "competitive_exams"
  | "college_notes"
  | "school_textbooks"
  | "fiction_nonfiction"
  | "rare_books";

export type ItemKind = "book" | "notes" | "bundle";

export type Condition = "brand_new" | "like_new" | "gently_used" | "heavily_annotated";

export type Format = "hardcover" | "paperback" | "spiral_notes" | "digital_pack";

export type ListingMode = "buy" | "rent" | "both";

export type ListingStatus = "available" | "rented" | "sold" | "draft";

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  provider: "password" | "google";
  phone?: string;
  role: UserRole;
  sellerKind: SellerKind;
  occupation: Occupation;
  age?: number;
  gender?: Gender;
  address?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  /** Seller reputation (0–5) and count of received ratings. */
  rating: number;
  ratingsCount: number;
  walletBalance: number;
  avatarColor: string;
  verifiedSeller: boolean;
  verification: {
    status: VerificationStatus;
    gstin?: string;
    registrationId?: string;
    submittedAt?: string;
    reviewedAt?: string;
    note?: string;
  };
  createdAt: string;
}

export interface RentalTier {
  days: number;
  label: string;
  fee: number;
}

export interface Product {
  id: string;
  sellerId: string;
  kind: ItemKind;
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  year?: number;
  isbn?: string;
  language: string;
  pages?: number;
  subject?: string;
  course?: string;
  category: Category;
  format: Format;
  condition: Condition;
  /** Explicit defect disclosure, e.g. "Pen markings on 10 pages". */
  conditionNotes: string[];
  purchasedOn?: string;
  mrp: number;
  buyPrice: number | null;
  isRentable: boolean;
  /** Base rate in ₹ per day used to derive tier pricing. */
  rentalBaseRate: number | null;
  rentalTiers: RentalTier[];
  /** Deposit = buyPrice (or MRP) × multiplier. Bookart holds the full value. */
  depositMultiplier: number;
  tags: string[];
  latitude: number;
  longitude: number;
  pickupArea: string;
  pickupCity: string;
  pickupPincode: string;
  status: ListingStatus;
  /** Buyer who currently holds the item on rent (drives `rented` status). */
  rentedBy?: string;
  rating: number;
  ratingCount: number;
  views: number;
  createdAt: string;
  coverStyle: number;
}

export interface Rating {
  score: number;
  comment: string;
  buyerName: string;
  createdAt: string;
}

export interface ProductWithDistance extends Product {
  distanceKm: number | null;
  seller?: User;
  ratings?: Rating[];
}

export type RentalStatus =
  | "active"
  | "return_requested"
  | "returned_inspected"
  | "refunded"
  | "overdue"
  | "cancelled";

export type PenaltyGrade = "ok" | "minor" | "major" | "lost";

export interface RentalOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  days: number;
  tierLabel: string;
  depositPaid: number;
  rentalFee: number;
  /** Deposit − rental fee − penalties + late fee. Computed by the refund engine. */
  refundAmount: number;
  lateFee: number;
  penaltyPct: number;
  penaltyAmount: number;
  inspectionGrade?: PenaltyGrade;
  inspectionNotes?: string;
  startDate: string;
  dueDate: string;
  returnRequestedAt?: string;
  returnedAt?: string;
  refundedAt?: string;
  refundMethod?: "wallet" | "original_payment_method";
  status: RentalStatus;
  createdAt: string;
  timeline: { at: string; label: string }[];
}

export type PurchaseStatus = "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";

export interface PurchaseOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  deliveryMode: "pickup" | "courier";
  courierFee: number;
  address: string;
  paymentMethod: "upi" | "card" | "cod" | "wallet";
  status: PurchaseStatus;
  createdAt: string;
}

export interface CartLine {
  productId: string;
  mode: "buy" | "rent";
  days?: number;
  addedAt: string;
}

export interface Cart {
  key: string;
  lines: CartLine[];
  updatedAt: string;
}

export interface Session {
  token: string;
  userId?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface DBShape {
  users: User[];
  products: Product[];
  rentals: RentalOrder[];
  purchases: PurchaseOrder[];
  carts: Cart[];
  sessions: Session[];
  reviews: Review[];
  meta: { seededAt: string; version: number; searchLog: { q: string; at: string }[] };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sellerKind: SellerKind;
  walletBalance: number;
  verifiedSeller: boolean;
  avatarColor: string;
  rating: number;
  ratingsCount: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  pincode?: string;
  verification: User["verification"];
}
