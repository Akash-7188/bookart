import type { Category, Condition, Format, ItemKind, ListingMode, SellerKind } from "./types";

export const CATEGORIES: {
  slug: Category;
  label: string;
  short: string;
  blurb: string;
  emoji: string;
}[] = [
  {
    slug: "competitive_exams",
    label: "Competitive Exam Material",
    short: "Competitive Exams",
    blurb: "UPSC, JEE, NEET, GATE, SSC, Banking — standard sets, test series & handbooks.",
    emoji: "🎯",
  },
  {
    slug: "college_notes",
    label: "College & Academic Notes",
    short: "College Notes",
    blurb: "Handwritten notes, Xeroxed bundles and semester guides from seniors nearby.",
    emoji: "📝",
  },
  {
    slug: "school_textbooks",
    label: "School Textbooks",
    short: "School Books",
    blurb: "CBSE, ICSE and State Board textbooks, workbooks and lab manuals.",
    emoji: "🎒",
  },
  {
    slug: "fiction_nonfiction",
    label: "Fiction, Non-Fiction & Novels",
    short: "Fiction & More",
    blurb: "Novels, biographies, self-help, comics — read once, pass it on.",
    emoji: "📚",
  },
  {
    slug: "rare_books",
    label: "Rare / Out-of-print Books",
    short: "Rare Books",
    blurb: "Collector editions, first prints and out-of-print academic titles.",
    emoji: "🏺",
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c])) as Record<
  Category,
  (typeof CATEGORIES)[number]
>;

export const CONDITIONS: { value: Condition; label: string; tone: string; help: string }[] = [
  { value: "brand_new", label: "Brand New", tone: "emerald", help: "Sealed / never opened. No marks at all." },
  { value: "like_new", label: "Like New", tone: "sky", help: "Read once. Crisp pages, no writing." },
  { value: "gently_used", label: "Gently Used", tone: "amber", help: "Visible use, spine intact, minor notes possible." },
  { value: "heavily_annotated", label: "Heavily Annotated", tone: "rose", help: "Highlights, underlines or solved exercises throughout." },
];

export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.value, c])) as Record<
  Condition,
  (typeof CONDITIONS)[number]
>;

export const FORMATS: { value: Format; label: string }[] = [
  { value: "hardcover", label: "Hardcover" },
  { value: "paperback", label: "Paperback" },
  { value: "spiral_notes", label: "Spiral-bound Notes" },
  { value: "digital_pack", label: "Digital / Printed Study Pack" },
];

export const FORMAT_MAP = Object.fromEntries(FORMATS.map((f) => [f.value, f.label])) as Record<Format, string>;

export const ITEM_KINDS: { value: ItemKind; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "notes", label: "Notes" },
  { value: "bundle", label: "Study Bundle" },
];

export const MODE_LABEL: Record<ListingMode, string> = {
  buy: "Buy Only",
  rent: "Rent Only",
  both: "Buy & Rent",
};

export const SELLER_KIND_LABEL: Record<SellerKind, string> = {
  individual: "Individual Seller",
  bookstore: "Registered Bookstore",
  library: "Registered Library",
};

export const OCCUPATIONS = ["Student", "Teacher", "Reader", "Shop Owner"] as const;
export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;

export const RENT_DURATIONS = [7, 15, 30, 90] as const;

export const BUDGET_BUCKETS = [
  { label: "Under ₹200", min: 0, max: 200 },
  { label: "₹200 – ₹500", min: 200, max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { label: "₹2,500+", min: 2500, max: 100000 },
];

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "distance", label: "Nearest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated sellers" },
  { value: "newest", label: "Newly listed" },
] as const;

export function listingModeOf(product: { buyPrice: number | null; isRentable: boolean }): ListingMode {
  if (product.buyPrice !== null && product.isRentable) return "both";
  if (product.isRentable) return "rent";
  return "buy";
}
