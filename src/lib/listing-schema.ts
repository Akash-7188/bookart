import { z } from "zod";

/**
 * Client-side wizard schema. Numbers are kept as strings in the form and
 * parsed once on submit — mirrors the server-side zod schema in
 * app/actions/marketplace.ts so both agree.
 */
export const listingFormSchema = z.object({
  kind: z.enum(["book", "notes", "bundle"]),
  category: z.enum(["competitive_exams", "college_notes", "school_textbooks", "fiction_nonfiction", "rare_books"]),
  format: z.enum(["hardcover", "paperback", "spiral_notes", "digital_pack"]),

  title: z.string().min(3, "Add the title"),
  author: z.string().min(2, "Add the author or faculty name"),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  year: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1800 && Number(v) <= 2100), "Use a 4-digit year"),
  isbn: z.string().optional(),
  language: z.string().min(2, "Add the language"),
  pages: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) > 0, "Enter a valid page count"),
  subject: z.string().optional(),
  course: z.string().optional(),

  condition: z.enum(["brand_new", "like_new", "gently_used", "heavily_annotated"]),
  conditionNotes: z.array(z.string()),
  purchasedOn: z.string().optional(),

  mrp: z.string().min(1, "Enter the MRP").refine((v) => Number(v) > 0, "MRP must be greater than 0"),
  buyPrice: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) > 0, "Enter a valid price"),
  isRentable: z.boolean(),
  rentalBaseRate: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) > 0, "Enter the daily rental rate"),
  depositMultiplier: z.string(),

  latitude: z.number(),
  longitude: z.number(),
  pickupArea: z.string().min(3, "Add a pickup area / shop name"),
  pickupCity: z.string().min(2, "Add the city"),
  pickupPincode: z.string().regex(/^\d{6}$/, "6-digit pincode"),
  tags: z.array(z.string()),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export const WIZARD_STEPS = [
  { id: "type", label: "Category & type", fields: ["kind", "category", "format"] as const },
  {
    id: "details",
    label: "Item details",
    fields: ["title", "author", "publisher", "edition", "year", "isbn", "language", "pages", "subject", "course"] as const,
  },
  { id: "condition", label: "Condition", fields: ["condition", "conditionNotes", "purchasedOn"] as const },
  {
    id: "pricing",
    label: "Pricing & rental",
    fields: ["mrp", "buyPrice", "isRentable", "rentalBaseRate", "depositMultiplier"] as const,
  },
  {
    id: "location",
    label: "Pickup location",
    fields: ["latitude", "longitude", "pickupArea", "pickupCity", "pickupPincode"] as const,
  },
];

export const DEFECT_PRESETS = [
  "Pen markings on pages",
  "Highlighter throughout",
  "Missing dust jacket",
  "Water stain on few pages",
  "Torn/creased cover",
  "Name written on first page",
  "Binding slightly loose",
  "Access code / CD missing",
  "Some pages dog-eared",
  "Solved exercises in pencil",
];

export const SUBJECT_SUGGESTIONS = [
  "Polity",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "Computer Science",
  "DBMS",
  "Operating Systems",
  "Economics",
  "Accountancy",
  "Hindi Literature",
  "English",
];
