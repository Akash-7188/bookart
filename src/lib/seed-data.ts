/**
 * Deterministic mock database seed.
 *
 * Represents real inventory patterns: competitive-exam sets, handwritten
 * college notes, board textbooks, fiction and rare/out-of-print titles, listed
 * by individuals, registered bookstores and lending libraries around Pithampur,
 * Indore, Bhopal, Delhi and Pune — each with real geo-coordinates so the
 * distance engine has something meaningful to chew on.
 */

import { buildRentalTiers } from "./rental";
import type {
  Cart,
  Category,
  Condition,
  DBShape,
  Format,
  Gender,
  ItemKind,
  Occupation,
  PenaltyGrade,
  Product,
  PurchaseOrder,
  RentalOrder,
  SellerKind,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/* Deterministic randomness                                            */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#0f766e"];

/* ------------------------------------------------------------------ */
/* Sellers                                                             */
/* ------------------------------------------------------------------ */

interface SellerSeed {
  name: string;
  email: string;
  kind: SellerKind;
  occupation: Occupation;
  city: string;
  pincode: string;
  area: string;
  latitude: number;
  longitude: number;
  rating: number;
  ratingsCount: number;
  verifiedSeller: boolean;
  gstin?: string;
  registrationId?: string;
  gender?: Gender;
  age?: number;
}

const SELLERS: SellerSeed[] = [
  {
    name: "Aarav Sharma", email: "aarav@bookart.in", kind: "individual", occupation: "Student",
    city: "Pithampur", pincode: "454775", area: "Sector 3, Pithampur", latitude: 22.6204, longitude: 75.6951,
    rating: 4.7, ratingsCount: 38, verifiedSeller: true, gender: "Male", age: 21,
  },
  {
    name: "Meera Jain", email: "meera@bookart.in", kind: "individual", occupation: "Teacher",
    city: "Pithampur", pincode: "454775", area: "Sanwer Road, Pithampur", latitude: 22.6122, longitude: 75.6874,
    rating: 4.9, ratingsCount: 74, verifiedSeller: true, gender: "Female", age: 34,
  },
  {
    name: "Rohit Verma", email: "rohit@bookart.in", kind: "individual", occupation: "Reader",
    city: "Mhow", pincode: "453441", area: "Main Bazaar, Mhow", latitude: 22.5548, longitude: 75.7592,
    rating: 4.5, ratingsCount: 21, verifiedSeller: true, gender: "Male", age: 29,
  },
  {
    name: "Sanjana Patel", email: "sanjana@bookart.in", kind: "individual", occupation: "Student",
    city: "Dhar", pincode: "454001", area: "Chhatri Chowk, Dhar", latitude: 22.5998, longitude: 75.3015,
    rating: 4.3, ratingsCount: 12, verifiedSeller: true, gender: "Female", age: 20,
  },
  {
    name: "Shree Ganesh Book Depot", email: "store.indore@bookart.in", kind: "bookstore", occupation: "Shop Owner",
    city: "Indore", pincode: "452001", area: "Jawahar Marg, Indore", latitude: 22.7185, longitude: 75.8601,
    rating: 4.8, ratingsCount: 412, verifiedSeller: true, gstin: "23AABCS1429P1ZQ", registrationId: "MP/IND/BS/2009/3391", age: 46, gender: "Male",
  },
  {
    name: "Wisdom Reading Library", email: "library.indore@bookart.in", kind: "library", occupation: "Shop Owner",
    city: "Indore", pincode: "452010", area: "Vijay Nagar, Indore", latitude: 22.7551, longitude: 75.8942,
    rating: 4.6, ratingsCount: 268, verifiedSeller: true, registrationId: "MP/LIB/IND/2014/0772",
  },
  {
    name: "Central Book House", email: "store.bhopal@bookart.in", kind: "bookstore", occupation: "Shop Owner",
    city: "Bhopal", pincode: "462001", area: "Chowk Bazaar, Bhopal", latitude: 23.2607, longitude: 77.4189,
    rating: 4.7, ratingsCount: 331, verifiedSeller: true, gstin: "23AAECC5512L1ZP", registrationId: "MP/BHO/BS/2004/1180",
  },
  {
    name: "Bhopal Public Reading Library", email: "library.bhopal@bookart.in", kind: "library", occupation: "Shop Owner",
    city: "Bhopal", pincode: "462001", area: "New Market, Bhopal", latitude: 23.2532, longitude: 77.4045,
    rating: 4.4, ratingsCount: 156, verifiedSeller: true, registrationId: "MP/LIB/BHO/2011/0455",
  },
  {
    name: "Kunal Mehta", email: "kunal@bookart.in", kind: "individual", occupation: "Reader",
    city: "Delhi", pincode: "110006", area: "Nai Sarak, Delhi", latitude: 28.6112, longitude: 77.2114,
    rating: 4.6, ratingsCount: 44, verifiedSeller: true, gender: "Male", age: 37,
  },
  {
    name: "Books & Beyond Store", email: "store.delhi@bookart.in", kind: "bookstore", occupation: "Shop Owner",
    city: "Delhi", pincode: "110006", area: "Nai Sarak, Delhi", latitude: 28.6151, longitude: 77.2077,
    rating: 4.9, ratingsCount: 522, verifiedSeller: true, gstin: "07AAFCB9911K1Z4", registrationId: "DL/BS/2001/2204",
  },
  {
    name: "Aditi Rao", email: "aditi@bookart.in", kind: "individual", occupation: "Teacher",
    city: "Pune", pincode: "411001", area: "FC Road, Pune", latitude: 18.5221, longitude: 73.8432,
    rating: 4.8, ratingsCount: 63, verifiedSeller: true, gender: "Female", age: 41,
  },
  {
    name: "Pune Study Circle Library", email: "library.pune@bookart.in", kind: "library", occupation: "Shop Owner",
    city: "Pune", pincode: "411001", area: "Deccan, Pune", latitude: 18.5142, longitude: 73.8393,
    rating: 4.5, ratingsCount: 187, verifiedSeller: true, registrationId: "MH/LIB/PUN/2016/1093",
  },
];

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

interface Row {
  t: string;
  a: string;
  c: Category;
  k: ItemKind;
  f: Format;
  mrp: number;
  pub?: string;
  subject?: string;
  course?: string;
  isbn?: string;
  pages?: number;
  notes?: string[];
}

const CATALOG: Row[] = [
  // ---- Competitive exams -------------------------------------------------
  { t: "Indian Polity (7th Edition)", a: "M. Laxmikanth", c: "competitive_exams", k: "book", f: "paperback", mrp: 899, pub: "McGraw Hill", subject: "Polity", isbn: "9789389949117", pages: 848 },
  { t: "Indian Economy", a: "Ramesh Singh", c: "competitive_exams", k: "book", f: "paperback", mrp: 795, pub: "McGraw Hill", subject: "Economy", isbn: "9789390165544", pages: 760 },
  { t: "Modern India: A History for UPSC", a: "Spectrum Editorial Board", c: "competitive_exams", k: "book", f: "paperback", mrp: 615, pub: "Spectrum Books", subject: "Modern History", isbn: "9788179306871", pages: 620 },
  { t: "UPSC Prelims 10 Year Solved Papers", a: "Arihant Experts", c: "competitive_exams", k: "bundle", f: "paperback", mrp: 540, pub: "Arihant", subject: "General Studies", pages: 480 },
  { t: "CSAT Paper II Complete Guide", a: "Vipin Kaushik", c: "competitive_exams", k: "book", f: "paperback", mrp: 420, pub: "Disha", subject: "Aptitude", pages: 392 },
  { t: "Concepts of Physics — Volume 1", a: "H. C. Verma", c: "competitive_exams", k: "book", f: "paperback", mrp: 525, pub: "Bharati Bhawan", subject: "Physics", isbn: "9788177091878", pages: 462, notes: ["Solved examples filled in with pencil"] },
  { t: "Concepts of Physics — Volume 2", a: "H. C. Verma", c: "competitive_exams", k: "book", f: "paperback", mrp: 549, pub: "Bharati Bhawan", subject: "Physics", isbn: "9788177092325", pages: 478 },
  { t: "Understanding Physics: Mechanics Part 1", a: "D. C. Pandey", c: "competitive_exams", k: "book", f: "paperback", mrp: 620, pub: "Arihant", subject: "Physics", pages: 520 },
  { t: "Organic Chemistry for JEE (Advanced)", a: "M. S. Chouhan", c: "competitive_exams", k: "bundle", f: "paperback", mrp: 1099, pub: "Cengage", subject: "Chemistry", pages: 890, notes: ["Some practice pages ripped out", "Pen markings on 10 pages"] },
  { t: "Cengage Maths for JEE Main & Advanced", a: "G. Tewani", c: "competitive_exams", k: "book", f: "paperback", mrp: 950, pub: "Cengage", subject: "Mathematics", pages: 812 },
  { t: "NEET Champion Biology", a: "MTG Editorial Board", c: "competitive_exams", k: "book", f: "paperback", mrp: 899, pub: "MTG Learning", subject: "Biology", pages: 724 },
  { t: "NCERT Biology Class 12 (Set of 2)", a: "NCERT", c: "competitive_exams", k: "bundle", f: "paperback", mrp: 350, pub: "NCERT", subject: "Biology", pages: 640, notes: ["Highlighted definitions throughout"] },
  { t: "GATE Computer Science Solved Papers (2010-2024)", a: "Made Easy Faculty", c: "competitive_exams", k: "bundle", f: "paperback", mrp: 1150, pub: "Made Easy", subject: "Computer Science", pages: 940 },
  { t: "GATE Mechanical Engineering Previous Year Papers", a: "GK Publications", c: "competitive_exams", k: "bundle", f: "paperback", mrp: 980, pub: "GKP", subject: "Mechanical", pages: 860 },
  { t: "Quantitative Aptitude for Competitive Exams", a: "R. S. Aggarwal", c: "competitive_exams", k: "book", f: "paperback", mrp: 720, pub: "S. Chand", subject: "Aptitude", isbn: "9789352534029", pages: 968, notes: ["Spine has a crease", "Few dog-eared corners"] },
  { t: "Bank PO Reasoning Ability Bundle", a: "Adda247 Faculty", c: "competitive_exams", k: "bundle", f: "digital_pack", mrp: 640, pub: "Adda247", subject: "Reasoning", pages: 410 },
  { t: "SSC CGL Tier 1 & 2 Complete Set", a: "Kiran Prakashan", c: "competitive_exams", k: "bundle", f: "paperback", mrp: 1180, pub: "Kiran", subject: "General Studies", pages: 1104 },
  { t: "Pathfinder for NDA & NA", a: "Arihant Experts", c: "competitive_exams", k: "book", f: "paperback", mrp: 695, pub: "Arihant", subject: "General Ability", pages: 700 },

  // ---- College & academic notes -----------------------------------------
  { t: "Engineering Mathematics Unit-wise Handwritten Notes", a: "Aarav Sharma", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 899, subject: "Mathematics", course: "B.Tech Sem 1", pages: 210 },
  { t: "Data Structures & Algorithms Handwritten Notes", a: "Seniors of RGPV", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 1200, subject: "DSA", course: "B.Tech Sem 3", pages: 268, notes: ["Includes 2023 semester question patterns"] },
  { t: "Operating Systems Xerox Bundle (Units 1-5)", a: "Study Point Xerox", c: "college_notes", k: "notes", f: "digital_pack", mrp: 450, subject: "Operating Systems", course: "B.Tech Sem 5", pages: 320 },
  { t: "DBMS Semester Notes + Question Bank", a: "Meera Jain", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 599, subject: "DBMS", course: "BCA Sem 4", pages: 182 },
  { t: "Thermodynamics Handwritten Notes", a: "Rohit Verma", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 500, subject: "Thermodynamics", course: "B.Tech Sem 3", pages: 156 },
  { t: "Organic Chemistry Reaction Map Notes", a: "Neha Deshpande", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 780, subject: "Organic Chemistry", course: "B.Sc Sem 5", pages: 144 },
  { t: "Digital Electronics Notes + Lab Records", a: "Kunal Mehta", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 850, subject: "Digital Electronics", course: "B.Tech Sem 4", pages: 196 },
  { t: "Human Anatomy Notes — MBBS Year 1", a: "Dr. S. Kulkarni", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 1600, subject: "Anatomy", course: "MBBS Year 1", pages: 340, notes: ["Labelled diagrams in coloured ink"] },
  { t: "Financial Accounting Notes & Solved Papers", a: "Sanjana Patel", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 420, subject: "Accounting", course: "B.Com Sem 2", pages: 160 },
  { t: "Machine Learning Class Notes + Assignments", a: "Aditi Rao", c: "college_notes", k: "bundle", f: "digital_pack", mrp: 1100, subject: "Machine Learning", course: "M.Tech Sem 1", pages: 224 },
  { t: "Civil Engineering Surveying Field Notes", a: "Govt. Polytechnic Students", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 380, subject: "Surveying", course: "Diploma Sem 4", pages: 130 },
  { t: "Microeconomics Semester Guide", a: "Central Book House", c: "college_notes", k: "notes", f: "paperback", mrp: 460, subject: "Microeconomics", course: "B.A. Sem 3", pages: 210 },
  { t: "Nursing Anatomy & Physiology Notes", a: "Sister Anjana", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 720, subject: "Anatomy", course: "GNM Year 1", pages: 188 },
  { t: "Compiler Design Full Semester Notes", a: "IIT-JEE Toppers Notes", c: "college_notes", k: "notes", f: "spiral_notes", mrp: 640, subject: "Compiler Design", course: "B.Tech Sem 6", pages: 172 },

  // ---- School textbooks ---------------------------------------------------
  { t: "NCERT Science Class 10", a: "NCERT", c: "school_textbooks", k: "book", f: "paperback", mrp: 215, pub: "NCERT", subject: "Science", isbn: "9788174506542", pages: 320 },
  { t: "NCERT Mathematics Class 9", a: "NCERT", c: "school_textbooks", k: "book", f: "paperback", mrp: 195, pub: "NCERT", subject: "Mathematics", pages: 350 },
  { t: "NCERT Physics Class 12 Part 1 & 2", a: "NCERT", c: "school_textbooks", k: "bundle", f: "paperback", mrp: 420, pub: "NCERT", subject: "Physics", pages: 620, notes: ["Name written on inner cover"] },
  { t: "NCERT Chemistry Class 11", a: "NCERT", c: "school_textbooks", k: "book", f: "paperback", mrp: 210, pub: "NCERT", subject: "Chemistry", pages: 380 },
  { t: "RD Sharma Mathematics Class 9", a: "R. D. Sharma", c: "school_textbooks", k: "book", f: "paperback", mrp: 560, pub: "Dhanpat Rai", subject: "Mathematics", pages: 700 },
  { t: "R S Aggarwal Mathematics Class 10", a: "R. S. Aggarwal", c: "school_textbooks", k: "book", f: "paperback", mrp: 495, pub: "Bharati Bhawan", subject: "Mathematics", pages: 640 },
  { t: "High School English Grammar & Composition", a: "Wren & Martin", c: "school_textbooks", k: "book", f: "hardcover", mrp: 385, pub: "S. Chand", subject: "English", isbn: "9789352530144", pages: 416 },
  { t: "Lakhmir Singh Science Class 8", a: "Lakhmir Singh & Manjit Kaur", c: "school_textbooks", k: "book", f: "paperback", mrp: 599, pub: "S. Chand", subject: "Science", pages: 552 },
  { t: "Selina Concise Chemistry Class 10 (ICSE)", a: "Selina Publishers", c: "school_textbooks", k: "book", f: "paperback", mrp: 450, pub: "Selina", subject: "Chemistry", pages: 400 },
  { t: "Oswaal CBSE Question Bank Class 12 Physics", a: "Oswaal Editorial Board", c: "school_textbooks", k: "book", f: "paperback", mrp: 699, pub: "Oswaal", subject: "Physics", pages: 588 },
  { t: "Cambridge IGCSE Mathematics Coursebook", a: "Ric Pimentel", c: "school_textbooks", k: "book", f: "paperback", mrp: 1250, pub: "Cambridge University Press", subject: "Mathematics", pages: 512 },
  { t: "MP Board Hindi Vyakaran Class 11", a: "MP Board Faculty", c: "school_textbooks", k: "book", f: "paperback", mrp: 240, pub: "MPBSE", subject: "Hindi", pages: 280 },
  { t: "Social Science Class 7 — History & Civics", a: "NCERT", c: "school_textbooks", k: "book", f: "paperback", mrp: 175, pub: "NCERT", subject: "Social Science", pages: 260 },
  { t: "Together With Science Lab Manual Class 10", a: "Rachna Sagar", c: "school_textbooks", k: "book", f: "paperback", mrp: 340, pub: "Rachna Sagar", subject: "Science", pages: 240 },
  { t: "ICSE Total History & Civics Class 9", a: "Morning Star", c: "school_textbooks", k: "book", f: "paperback", mrp: 480, pub: "Morning Star", subject: "History", pages: 330 },
  { t: "Kannada Balake Class 6 Textbook", a: "Karnataka Textbook Society", c: "school_textbooks", k: "book", f: "paperback", mrp: 120, pub: "KTBS", subject: "Language", pages: 180 },

  // ---- Fiction & non-fiction ---------------------------------------------
  { t: "The Alchemist", a: "Paulo Coelho", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 350, pub: "HarperCollins", isbn: "9780061122415", pages: 208 },
  { t: "Ikigai: The Japanese Secret to a Long and Happy Life", a: "Héctor García", c: "fiction_nonfiction", k: "book", f: "hardcover", mrp: 499, pub: "Penguin", pages: 208 },
  { t: "Atomic Habits", a: "James Clear", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 799, pub: "Random House", isbn: "9780735211292", pages: 320 },
  { t: "Sapiens: A Brief History of Humankind", a: "Yuval Noah Harari", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 699, pub: "Vintage", pages: 512, notes: ["Highlighting in first 40 pages"] },
  { t: "The Palace of Illusions", a: "Chitra Banerjee Divakaruni", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 399, pub: "Anchor", pages: 360 },
  { t: "The White Tiger", a: "Aravind Adiga", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 450, pub: "Free Press", pages: 320 },
  { t: "Godan (Hindi)", a: "Munshi Premchand", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 250, pub: "Rajkamal", pages: 400 },
  { t: "Feluda Samagra — Volume 1", a: "Satyajit Ray", c: "fiction_nonfiction", k: "book", f: "hardcover", mrp: 899, pub: "Ananda Publishers", pages: 620 },
  { t: "Malgudi Days", a: "R. K. Narayan", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 299, pub: "Indian Thought Publications", pages: 264 },
  { t: "The Silent Patient", a: "Alex Michaelides", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 399, pub: "Celadon", pages: 336 },
  { t: "Norwegian Wood", a: "Haruki Murakami", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 450, pub: "Vintage", pages: 400 },
  { t: "Rich Dad Poor Dad", a: "Robert T. Kiyosaki", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 340, pub: "Plata", pages: 336, notes: ["Underlined key passages"] },
  { t: "Ponniyin Selvan — Part 1", a: "Kalki Krishnamurthy", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 599, pub: "Vanathi", pages: 480 },
  { t: "Five Point Someone", a: "Chetan Bhagat", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 250, pub: "Rupa", pages: 268 },
  { t: "Champak Annual 2024 (Bound)", a: "Champak Editorial", c: "fiction_nonfiction", k: "bundle", f: "hardcover", mrp: 800, pub: "Delhi Press", pages: 520 },
  { t: "Wings of Fire", a: "A. P. J. Abdul Kalam", c: "fiction_nonfiction", k: "book", f: "paperback", mrp: 295, pub: "Universities Press", pages: 180 },
  { t: "The Complete Short Stories of Ruskin Bond", a: "Ruskin Bond", c: "fiction_nonfiction", k: "book", f: "hardcover", mrp: 899, pub: "Aleph", pages: 640 },

  // ---- Rare / out of print ------------------------------------------------
  { t: "The Discovery of India (1946 First Edition)", a: "Jawaharlal Nehru", c: "rare_books", k: "book", f: "hardcover", mrp: 4500, pub: "Signet Press", pages: 580, notes: ["Original cloth binding", "Owner stamp on flyleaf"] },
  { t: "Advanced Engineering Mathematics (1972)", a: "Erwin Kreyszig", c: "rare_books", k: "book", f: "hardcover", mrp: 1500, pub: "Wiley Eastern", pages: 892, notes: ["Some foxing on page edges"] },
  { t: "Abhijnanashakuntalam with Commentary (1958)", a: "Kalidasa", c: "rare_books", k: "book", f: "hardcover", mrp: 2200, pub: "Motilal Banarsidass", subject: "Sanskrit", pages: 460, notes: ["Sanskrit text with Hindi tika"] },
  { t: "Complete Works of Premchand (1960s Set)", a: "Munshi Premchand", c: "rare_books", k: "bundle", f: "hardcover", mrp: 2600, pub: "Hind Pocket Books", pages: 1400, notes: ["Missing dust jacket on volume 2"] },
  { t: "NCERT Physics Class 11 (1985 Print)", a: "NCERT", c: "rare_books", k: "book", f: "paperback", mrp: 900, pub: "NCERT", subject: "Physics", pages: 340, notes: ["Historic edition, brittle pages"] },
  { t: "Chanakya Niti: Original Sanskrit Text (1962)", a: "Pandit Vishnu Sharma", c: "rare_books", k: "book", f: "hardcover", mrp: 1200, pub: "Chaukhamba", subject: "Ethics", pages: 220 },
  { t: "Hindi Sahitya Sammelan Ki Ruprekha (1959)", a: "Dr. Ram Vinay Pathak", c: "rare_books", k: "book", f: "hardcover", mrp: 1800, pub: "Sahitya Sammelan", subject: "Hindi Literature", pages: 380 },
  { t: "Old Hindi Comics Bundle — Bahadur & Sunil (1970s)", a: "Manoj Comics", c: "rare_books", k: "bundle", f: "paperback", mrp: 3200, pub: "Manoj Comics", pages: 600, notes: ["Collector's bundle of 22 issues", "Tape repair on 2 covers"] },
  { t: "Calcutta: A Cultural History (1949 Print)", a: "Shib Nath Bhattacharya", c: "rare_books", k: "book", f: "hardcover", mrp: 3400, pub: "Cultural Publishing House", pages: 420 },
  { t: "Atlas of Indian History (1968)", a: "Dr. R. C. Majumdar", c: "rare_books", k: "book", f: "hardcover", mrp: 2800, pub: "Bharatiya Vidya Bhavan", subject: "History", pages: 260, notes: ["Fold-out maps intact"] },
];

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

const CITY_DISTRIBUTION = [
  "Pithampur", "Pithampur", "Pithampur", "Mhow", "Indore", "Indore", "Pithampur", "Bhopal",
  "Indore", "Mhow", "Indore", "Bhopal", "Dhar", "Indore", "Mhow", "Bhopal",
  "Dhar", "Indore", "Delhi", "Pune",
];

const CONDITION_SEQUENCE: Condition[] = [
  "brand_new", "like_new", "gently_used", "gently_used", "like_new", "heavily_annotated",
  "gently_used", "like_new", "brand_new", "gently_used",
];

const PURCHASE_MONTHS = ["2021-06", "2022-01", "2022-07", "2023-04", "2023-09", "2024-03", "2024-11", "2025-06"];

const AVATAR = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

function idFor(prefix: string, i: number) {
  return `${prefix}_${(1000 + i).toString(36)}${i % 7}${(i * 31) % 97}`;
}

function conditionPriceFactor(condition: Condition) {
  switch (condition) {
    case "brand_new": return 0.86;
    case "like_new": return 0.68;
    case "gently_used": return 0.5;
    default: return 0.34;
  }
}

function buildUsers(): User[] {
  const now = new Date().toISOString();
  const sellers = SELLERS.map((s, i): User => ({
    id: idFor("usr", i * 3 + 1),
    name: s.name,
    email: s.email,
    passwordHash: undefined,
    provider: "password",
    phone: `98${(12000000 + i * 357111).toString().slice(0, 8)}`,
    role: "seller",
    sellerKind: s.kind,
    occupation: s.occupation,
    age: s.age,
    gender: s.gender,
    address: s.area,
    city: s.city,
    pincode: s.pincode,
    latitude: s.latitude,
    longitude: s.longitude,
    rating: s.rating,
    ratingsCount: s.ratingsCount,
    walletBalance: 0,
    avatarColor: AVATAR(i),
    verifiedSeller: s.verifiedSeller,
    verification: {
      status: s.kind === "individual" ? "approved" : "approved",
      gstin: s.gstin,
      registrationId: s.registrationId,
      submittedAt: now,
      reviewedAt: now,
    },
    createdAt: now,
  }));

  const buyer: User = {
    id: "usr_buyer_1",
    name: "Priya Nair",
    email: "buyer@bookart.in",
    provider: "password",
    phone: "9876500123",
    role: "buyer",
    sellerKind: "individual",
    occupation: "Student",
    age: 22,
    gender: "Female",
    address: "212, Scheme 54, Vijay Nagar",
    city: "Indore",
    pincode: "452010",
    latitude: 22.7533,
    longitude: 75.8937,
    rating: 4.8,
    ratingsCount: 6,
    walletBalance: 640,
    avatarColor: "#0ea5e9",
    verifiedSeller: false,
    verification: { status: "none" },
    createdAt: now,
  };

  const sellerDemo: User = {
    id: "usr_seller_demo",
    name: "Aarav Sharma",
    email: "seller@bookart.in",
    provider: "password",
    phone: "9826711234",
    role: "seller",
    sellerKind: "individual",
    occupation: "Student",
    age: 21,
    gender: "Male",
    address: "Sector 3, Pithampur",
    city: "Pithampur",
    pincode: "454775",
    latitude: 22.6204,
    longitude: 75.6951,
    rating: 4.7,
    ratingsCount: 38,
    walletBalance: 2150,
    avatarColor: "#4f46e5",
    verifiedSeller: true,
    verification: { status: "approved", submittedAt: now, reviewedAt: now, note: "Individual seller — KYC complete" },
    createdAt: now,
  };

  const pendingStore: User = {
    id: "usr_store_pending",
    name: "Nalanda Books & Stationery",
    email: "nalanda@bookart.in",
    provider: "password",
    phone: "9755512340",
    role: "seller",
    sellerKind: "bookstore",
    occupation: "Shop Owner",
    age: 38,
    gender: "Male",
    address: "Sadar Bazaar, Mhow",
    city: "Mhow",
    pincode: "453441",
    latitude: 22.5526,
    longitude: 75.7612,
    rating: 0,
    ratingsCount: 0,
    walletBalance: 0,
    avatarColor: "#f59e0b",
    verifiedSeller: false,
    verification: {
      status: "pending",
      gstin: "23AAJCN7712M1ZX",
      registrationId: "MP/MHW/BS/2019/0451",
      submittedAt: now,
      note: "Waiting for GST + shop licence verification",
    },
    createdAt: now,
  };

  const admin: User = {
    id: "usr_admin",
    name: "Bookart Trust & Safety",
    email: "admin@bookart.in",
    provider: "password",
    phone: "9800000001",
    role: "admin",
    sellerKind: "individual",
    occupation: "Other",
    age: 30,
    gender: "Prefer not to say",
    address: "Bookart HQ, Indore",
    city: "Indore",
    pincode: "452001",
    latitude: 22.7196,
    longitude: 75.8577,
    rating: 5,
    ratingsCount: 0,
    walletBalance: 0,
    avatarColor: "#0f766e",
    verifiedSeller: true,
    verification: { status: "approved", submittedAt: now, reviewedAt: now },
    createdAt: now,
  };

  return [...sellers, buyer, sellerDemo, pendingStore, admin];
}

/** Demo accounts used by the login screen's "one-click demo" buttons. */
export const DEMO_ACCOUNTS = [
  { label: "Buyer", email: "buyer@bookart.in", password: "demo1234", hint: "Priya Nair · Indore" },
  { label: "Seller", email: "seller@bookart.in", password: "demo1234", hint: "Aarav Sharma · Pithampur" },
  { label: "Admin", email: "admin@bookart.in", password: "demo1234", hint: "Trust & Safety" },
];

function buildProducts(users: User[]): Product[] {
  const sellers = users.filter((u) => u.role !== "admin" && u.id !== "usr_buyer_1");
  const byCity = new Map<string, User[]>();
  for (const s of sellers) {
    if (!s.city) continue;
    byCity.set(s.city, [...(byCity.get(s.city) ?? []), s]);
  }
  const now = Date.now();

  return CATALOG.map((row, i) => {
    const rnd = mulberry32(1000 + i * 17);
    const city = CITY_DISTRIBUTION[i % CITY_DISTRIBUTION.length];
    const pool = byCity.get(city) ?? sellers;
    const seller = pool[Math.floor(rnd() * pool.length)];
    const condition = row.notes?.length
      ? CONDITION_SEQUENCE[(i + 5) % CONDITION_SEQUENCE.length]
      : CONDITION_SEQUENCE[i % CONDITION_SEQUENCE.length];

    const isLibrary = seller.sellerKind === "library";
    const isStore = seller.sellerKind === "bookstore";
    const rentChance = isLibrary ? 0.95 : isStore ? 0.6 : row.k === "notes" ? 0.7 : 0.4;
    const rentable = row.c === "rare_books" ? isLibrary : rnd() < rentChance;

    const price = Math.max(40, Math.round((row.mrp * conditionPriceFactor(condition)) / 5) * 5);
    const buyPrice = row.c === "rare_books" ? Math.round((row.mrp * 0.9) / 50) * 50 : price;
    const baseRate = Math.max(3, Math.round((buyPrice * (row.c === "rare_books" ? 0.035 : 0.06)) / 1));

    const product: Product = {
      id: idFor("prd", i * 5 + 3),
      sellerId: seller.id,
      kind: row.k,
      title: row.t,
      author: row.a,
      publisher: row.pub,
      edition: row.c === "rare_books" ? "Vintage print" : `${1 + (i % 6)}${["st", "nd", "rd", "th", "th", "th"][i % 6]} Edition`,
      year: row.c === "rare_books" ? 1946 + (i % 30) : 2016 + (i % 9),
      isbn: row.isbn ?? `978-93-${(5000 + i * 37).toString().padStart(4, "0")}-${(10 + (i % 89)).toString().padStart(2, "0")}-${(i % 9) + 1}`,
      language: row.t.includes("(Hindi)") || row.subject === "Hindi" || row.a.includes("Premchand") ? "Hindi" : row.a.includes("Kalki") ? "Tamil" : "English",
      pages: row.pages,
      subject: row.subject,
      course: row.course,
      category: row.c,
      format: row.f,
      condition,
      conditionNotes: row.notes?.length
        ? row.notes
        : condition === "heavily_annotated"
          ? ["Pen markings on 10 pages", "Margin notes in pencil"]
          : condition === "gently_used"
            ? ["Light crease on spine"]
            : [],
      purchasedOn: condition === "brand_new" ? undefined : PURCHASE_MONTHS[i % PURCHASE_MONTHS.length],
      mrp: row.mrp,
      buyPrice: rentable && !isStore && rnd() < 0.12 ? null : buyPrice,
      isRentable: rentable,
      rentalBaseRate: rentable ? baseRate : null,
      rentalTiers: rentable ? buildRentalTiers(baseRate, buyPrice ?? row.mrp) : [],
      depositMultiplier: row.c === "rare_books" ? 1.15 : 1,
      tags: [
        row.subject?.toLowerCase(),
        row.course?.toLowerCase(),
        seller.sellerKind,
        condition.replace(/_/g, " "),
        row.c === "competitive_exams" ? "upsc jee neet gate" : undefined,
        row.f.replace(/_/g, " "),
      ].filter(Boolean) as string[],
      latitude: seller.latitude ?? 22.6197,
      longitude: seller.longitude ?? 75.6926,
      pickupArea: seller.address ?? "",
      pickupCity: seller.city ?? "Pithampur",
      pickupPincode: seller.pincode ?? "454775",
      status: "available",
      rating: Math.round((3.9 + (rnd() * 1.1)) * 10) / 10,
      ratingCount: 3 + Math.floor(rnd() * 48),
      views: 20 + Math.floor(rnd() * 900),
      createdAt: new Date(now - Math.floor(rnd() * 90) * 86_400_000).toISOString(),
      coverStyle: i,
    };

    return product;
  });
}

function buildActivity(users: User[], products: Product[]) {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const addDays = (days: number) => new Date(now.getTime() + days * 86_400_000);

  const buyer = users.find((u) => u.id === "usr_buyer_1")!;
  const sellerDemo = users.find((u) => u.id === "usr_seller_demo")!;
  const pick = (predicate: (p: Product) => boolean, offset = 0) =>
    products.filter(predicate)[offset] ?? products[offset];

  const polity = pick((p) => p.title.includes("Indian Polity"));
  const hcv1 = pick((p) => p.title.includes("Concepts of Physics — Volume 1"));
  const notes = pick((p) => p.kind === "notes");
  const dsa = pick((p) => p.title.includes("Data Structures"));
  const os = pick((p) => p.title.includes("Operating Systems"));
  const thermodynamics = pick((p) => p.title.includes("Thermodynamics"));
  const alchemist = pick((p) => p.title.includes("Alchemist"));
  const ownListing = pick((p) => p.sellerId === sellerDemo.id);

  const purchases: PurchaseOrder[] = [
    {
      id: "ord_p1", buyerId: buyer.id, sellerId: polity.sellerId, productId: polity.id,
      amount: polity.buyPrice ?? polity.mrp, deliveryMode: "courier", courierFee: 49,
      address: "212, Scheme 54, Vijay Nagar, Indore 452010", paymentMethod: "upi",
      status: "delivered", createdAt: iso(addDays(-26)),
    },
    {
      id: "ord_p2", buyerId: buyer.id, sellerId: alchemist.sellerId, productId: alchemist.id,
      amount: alchemist.buyPrice ?? alchemist.mrp, deliveryMode: "pickup", courierFee: 0,
      address: "212, Scheme 54, Vijay Nagar, Indore 452010", paymentMethod: "wallet",
      status: "out_for_delivery", createdAt: iso(addDays(-3)),
    },
    {
      id: "ord_p3", buyerId: buyer.id, sellerId: hcv1.sellerId, productId: hcv1.id,
      amount: hcv1.buyPrice ?? hcv1.mrp, deliveryMode: "courier", courierFee: 49,
      address: "212, Scheme 54, Vijay Nagar, Indore 452010", paymentMethod: "cod",
      status: "placed", createdAt: iso(addDays(-1)),
    },
  ];

  const baseRate = (p: Product) => p.rentalBaseRate ?? 8;

  // Buyer-side rental: active
  const activeDays = 30;
  const activeFee = dsa.rentalTiers.find((t) => t.days === activeDays)?.fee ?? 150;
  const activeDeposit = dsa.buyPrice ?? dsa.mrp;
  const activeStart = addDays(-9);
  const activeDue = addDays(21);

  // Buyer-side rental: overdue
  const overdueDays = 15;
  const overdueFee = os.rentalTiers.find((t) => t.days === overdueDays)?.fee ?? 120;
  const overdueDeposit = os.buyPrice ?? os.mrp;
  const overdueStart = addDays(-23);
  const overdueDue = addDays(-8);

  const rentals: RentalOrder[] = [
    {
      id: "rent_1", buyerId: buyer.id, sellerId: dsa.sellerId, productId: dsa.id,
      days: activeDays, tierLabel: "1 semester / 90 days",
      depositPaid: activeDeposit, rentalFee: activeFee, refundAmount: activeDeposit - activeFee,
      lateFee: 0, penaltyPct: 0, penaltyAmount: 0,
      startDate: iso(activeStart), dueDate: iso(activeDue), status: "active",
      createdAt: iso(activeStart), timeline: [{ at: iso(activeStart), label: `Deposit of ₹${activeDeposit} held in escrow · rental fee ₹${activeFee}` }],
    },
    {
      id: "rent_2", buyerId: buyer.id, sellerId: os.sellerId, productId: os.id,
      days: overdueDays, tierLabel: "15 days",
      depositPaid: overdueDeposit, rentalFee: overdueFee, refundAmount: overdueDeposit - overdueFee,
      lateFee: 0, penaltyPct: 0, penaltyAmount: 0,
      startDate: iso(overdueStart), dueDate: iso(overdueDue), status: "overdue",
      createdAt: iso(overdueStart), timeline: [{ at: iso(overdueStart), label: `Deposit of ₹${overdueDeposit} held in escrow` }, { at: iso(overdueDue), label: "Due date passed — late fee accruing at 10% of daily rate" }],
    },
    {
      id: "rent_3", buyerId: buyer.id, sellerId: thermodynamics.sellerId, productId: thermodynamics.id,
      days: 7, tierLabel: "7 days",
      depositPaid: thermodynamics.buyPrice ?? thermodynamics.mrp,
      rentalFee: thermodynamics.rentalTiers.find((t) => t.days === 7)?.fee ?? 40,
      refundAmount: 0, lateFee: 0, penaltyPct: 0.1,
      penaltyAmount: Math.round((thermodynamics.buyPrice ?? thermodynamics.mrp) * 0.1),
      inspectionGrade: "minor" as PenaltyGrade, inspectionNotes: "Pencil notes added on 12 pages; light coffee stain on back cover.",
      startDate: iso(addDays(-40)), dueDate: iso(addDays(-33)), returnedAt: iso(addDays(-34)),
      refundedAt: iso(addDays(-33)), refundMethod: "wallet", status: "refunded",
      createdAt: iso(addDays(-40)),
      timeline: [
        { at: iso(addDays(-40)), label: "Rental started, deposit held in escrow" },
        { at: iso(addDays(-35)), label: "Return requested by buyer" },
        { at: iso(addDays(-33)), label: "Inspected — minor wear, 10% penalty applied & deposit refunded to wallet" },
      ],
    },
    {
      id: "rent_4", buyerId: buyer.id, sellerId: sellerDemo.id, productId: ownListing.id,
      days: 30, tierLabel: "30 days",
      depositPaid: ownListing.buyPrice ?? ownListing.mrp,
      rentalFee: ownListing.rentalTiers.find((t) => t.days === 30)?.fee ?? 200,
      refundAmount: 0, lateFee: 0, penaltyPct: 0, penaltyAmount: 0,
      startDate: iso(addDays(-12)), dueDate: iso(addDays(4)), returnRequestedAt: iso(addDays(-1)),
      refundMethod: undefined, status: "return_requested",
      createdAt: iso(addDays(-12)),
      timeline: [
        { at: iso(addDays(-12)), label: "Rental started, deposit held in escrow" },
        { at: iso(addDays(-1)), label: "Buyer requested return — awaiting seller inspection" },
      ],
    },
  ];

  // Seller-side incoming orders (so the seller dashboard has live work).
  const sellerOrderProduct = ownListing;
  rentals.push({
    id: "rent_5", buyerId: buyer.id, sellerId: sellerDemo.id, productId: sellerOrderProduct.id,
    days: 15, tierLabel: "15 days",
    depositPaid: sellerOrderProduct.buyPrice ?? sellerOrderProduct.mrp,
    rentalFee: sellerOrderProduct.rentalTiers.find((t) => t.days === 15)?.fee ?? 150,
    refundAmount: 0, lateFee: 0, penaltyPct: 0, penaltyAmount: 0,
    startDate: iso(addDays(-6)), dueDate: iso(addDays(9)), status: "active",
    createdAt: iso(addDays(-6)),
    timeline: [{ at: iso(addDays(-6)), label: "Rental started, deposit held in escrow" }],
  });

  for (const order of rentals) {
    const product = products.find((p) => p.id === order.productId);
    if (!product) continue;
    if (order.status === "active" || order.status === "overdue" || order.status === "return_requested") {
      product.status = "rented";
      product.rentedBy = order.buyerId;
    }
  }

  const reviews = products.slice(0, 14).map((p, i) => ({
    id: `rev_${i + 1}`,
    productId: p.id,
    sellerId: p.sellerId,
    buyerId: buyer.id,
    score: 4 + (i % 2),
    comment: [
      "Exactly as described, condition matched the photos. Pickup was smooth.",
      "Seller packed it well and answered my questions quickly. Recommended.",
      "Good value for the price. Pages were clean apart from the disclosed markings.",
      "Reached a day late but well maintained. Would rent again.",
    ][i % 4],
    createdAt: iso(addDays(-(5 + i * 3))),
  }));

  const carts: Cart[] = [
    {
      key: buyer.id,
      lines: [{ productId: notes.id, mode: "buy", addedAt: iso(addDays(-2)) }],
      updatedAt: iso(addDays(-2)),
    },
  ];

  return { purchases, rentals, reviews, carts };
}

export function buildSeed(): DBShape {
  const users = buildUsers();
  const products = buildProducts(users);
  const { purchases, rentals, reviews, carts } = buildActivity(users, products);

  return {
    users,
    products,
    purchases,
    rentals,
    carts,
    sessions: [],
    reviews,
    meta: { seededAt: new Date().toISOString(), version: 1, searchLog: [] },
  };
}
