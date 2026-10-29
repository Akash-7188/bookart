/**
 * Procedural cover art.
 *
 * Every listing gets four deterministic "photos" — front cover, back cover,
 * spine and a sample inner page — rendered as inline SVG data URIs. This keeps
 * the demo dependency-free (no CDN, no remote image hosts, works offline) while
 * still giving a real multi-image gallery on the PDP with honest condition
 * cues on the sample page.
 */

import type { Category, Condition } from "./types";

export type CoverView = "front" | "back" | "spine" | "page";

const PALETTES: { from: string; to: string; ink: string; accent: string; motif: "grid" | "arcs" | "dots" | "stripes" }[] = [
  { from: "#312e81", to: "#4f46e5", ink: "#ffffff", accent: "#fbbf24", motif: "arcs" },
  { from: "#0f766e", to: "#14b8a6", ink: "#f0fdfa", accent: "#fde68a", motif: "grid" },
  { from: "#7c2d12", to: "#ea580c", ink: "#fff7ed", accent: "#fcd34d", motif: "dots" },
  { from: "#1e293b", to: "#475569", ink: "#f8fafc", accent: "#38bdf8", motif: "stripes" },
  { from: "#701a75", to: "#c026d3", ink: "#fdf4ff", accent: "#fde047", motif: "arcs" },
  { from: "#14532d", to: "#16a34a", ink: "#f0fdf4", accent: "#fef08a", motif: "grid" },
  { from: "#7f1d1d", to: "#dc2626", ink: "#fef2f2", accent: "#fdba74", motif: "stripes" },
  { from: "#1e3a8a", to: "#2563eb", ink: "#eff6ff", accent: "#facc15", motif: "dots" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  competitive_exams: "Competitive Exams",
  college_notes: "College Notes",
  school_textbooks: "School Textbook",
  fiction_nonfiction: "Fiction & Non-fiction",
  rare_books: "Rare / Out of print",
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrap(text: string, maxChars: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (lines.length < maxLines && current) lines.push(current.trim());
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.split(/\s+/).length > 1) lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function motifSvg(motif: string, accent: string) {
  switch (motif) {
    case "arcs":
      return `<g opacity="0.22" fill="none" stroke="${accent}" stroke-width="3">
        <circle cx="470" cy="150" r="70"/><circle cx="470" cy="150" r="110"/><circle cx="470" cy="150" r="150"/>
      </g>`;
    case "grid":
      return `<g opacity="0.18" stroke="${accent}" stroke-width="2">
        ${Array.from({ length: 9 }, (_, i) => `<line x1="${90 + i * 50}" y1="60" x2="${90 + i * 50}" y2="240"/>`).join("")}
        ${Array.from({ length: 5 }, (_, i) => `<line x1="80" y1="${70 + i * 45}" x2="500" y2="${70 + i * 45}"/>`).join("")}
      </g>`;
    case "dots":
      return `<g opacity="0.35" fill="${accent}">
        ${Array.from({ length: 24 }, (_, i) => `<circle cx="${90 + (i % 8) * 52}" cy="${80 + Math.floor(i / 8) * 52}" r="5"/>`).join("")}
      </g>`;
    default:
      return `<g opacity="0.2" stroke="${accent}" stroke-width="10">
        ${Array.from({ length: 14 }, (_, i) => `<line x1="${-200 + i * 60}" y1="700" x2="${100 + i * 60}" y2="-40"/>`).join("")}
      </g>`;
  }
}

export interface CoverSubject {
  id: string;
  title: string;
  author: string;
  category: Category;
  coverStyle: number;
  condition: Condition;
  conditionNotes?: string[];
  publisher?: string;
  isbn?: string;
  buyPrice?: number | null;
  mrp?: number;
}

export function coverSvg(subject: CoverSubject, view: CoverView = "front"): string {
  const palette = PALETTES[Math.abs(subject.coverStyle) % PALETTES.length];
  const gid = `${subject.id}-${view}`.replace(/[^a-zA-Z0-9-]/g, "");
  const titleLines = wrap(subject.title.toUpperCase(), 15, 4);

  const common = `<defs>
      <linearGradient id="bg-${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${palette.from}"/>
        <stop offset="100%" stop-color="${palette.to}"/>
      </linearGradient>
      <linearGradient id="shade-${gid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#000" stop-opacity="0.32"/>
        <stop offset="14%" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
    </defs>`;

  if (view === "spine") {
    return svg(`
      ${common}
      <rect width="600" height="800" fill="url(#bg-${gid})"/>
      ${motifSvg(palette.motif, palette.accent)}
      <rect x="0" y="0" width="600" height="800" fill="url(#shade-${gid})"/>
      <rect x="250" y="40" width="100" height="720" fill="#000" opacity="0.12"/>
      <text x="300" y="740" fill="${palette.ink}" font-family="Georgia, serif" font-size="30" font-weight="700" text-anchor="start" transform="rotate(-90 300 740)" letter-spacing="2">${escapeXml(subject.title.slice(0, 42))}</text>
      <text x="330" y="740" fill="${palette.accent}" font-family="Helvetica, Arial, sans-serif" font-size="20" text-anchor="start" transform="rotate(-90 330 740)" letter-spacing="3">${escapeXml(subject.author.slice(0, 32).toUpperCase())}</text>
      <text x="300" y="90" fill="${palette.ink}" font-family="Helvetica, Arial, sans-serif" font-size="16" opacity="0.75" text-anchor="middle">BOOKART · SPINE VIEW</text>
    `);
  }

  if (view === "back") {
    const barcode = Array.from({ length: 34 }, (_, i) => {
      const w = 2 + ((subject.coverStyle + i * 7) % 4);
      return `<rect x="${92 + i * 12}" y="600" width="${w}" height="70" fill="#0f172a"/>`;
    }).join("");
    return svg(`
      ${common}
      <rect width="600" height="800" fill="url(#bg-${gid})"/>
      <rect x="60" y="60" width="480" height="680" rx="10" fill="#ffffff" opacity="0.94"/>
      <text x="92" y="120" fill="#0f172a" font-family="Georgia, serif" font-size="24" font-weight="700">${escapeXml(CATEGORY_LABEL[subject.category])}</text>
      <g fill="#94a3b8">
        ${Array.from({ length: 9 }, (_, i) => `<rect x="92" y="${160 + i * 26}" width="${i % 3 === 2 ? 250 : 416}" height="10" rx="5"/>`).join("")}
      </g>
      <text x="92" y="430" fill="#334155" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="600">Publisher</text>
      <text x="92" y="456" fill="#64748b" font-family="Helvetica, Arial, sans-serif" font-size="17">${escapeXml(subject.publisher ?? "Independently published")}</text>
      <text x="92" y="500" fill="#334155" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="600">ISBN</text>
      <text x="92" y="526" fill="#64748b" font-family="Helvetica, Arial, sans-serif" font-size="17">${escapeXml(subject.isbn ?? "—")}</text>
      <text x="92" y="572" fill="#334155" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="1">BACK COVER · BOOKART PHOTO CHECK</text>
      ${barcode}
      <rect x="380" y="96" width="140" height="42" rx="21" fill="#4f46e5"/>
      <text x="450" y="123" fill="#fff" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" text-anchor="middle">BOOKART</text>
    `);
  }

  if (view === "page") {
    const notes = subject.conditionNotes?.length
      ? subject.conditionNotes
      : ["Sample inner page captured by the seller", "No major markings reported"];
    const noteLines = notes.map(
      (n, i) => `<g>
        <text x="392" y="${210 + i * 64}" fill="#b45309" font-family="Helvetica, Arial, sans-serif" font-size="15" font-style="italic">${escapeXml(wrap(n, 17, 2)[0])}</text>
        <text x="392" y="${232 + i * 64}" fill="#b45309" font-family="Helvetica, Arial, sans-serif" font-size="15" font-style="italic">${escapeXml(wrap(n, 17, 2)[1] ?? "")}</text>
        <line x1="388" y1="${196 + i * 64}" x2="576" y2="${196 + i * 64}" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
      </g>`,
    );
    const hi = (subject.coverStyle % 3) + 1;
    return svg(`
      ${common}
      <rect width="600" height="800" fill="#efe7d8"/>
      <rect x="70" y="46" width="460" height="708" fill="#fffdf8"/>
      <rect x="70" y="46" width="14" height="708" fill="#e2d8c3"/>
      <line x1="384" y1="46" x2="384" y2="754" stroke="#e7c9c9" stroke-width="2"/>
      <text x="112" y="112" fill="#1f2937" font-family="Georgia, serif" font-size="26" font-weight="700">${escapeXml(wrap(subject.title, 26, 2)[0])}</text>
      <text x="112" y="150" fill="#6b7280" font-family="Georgia, serif" font-size="20">${escapeXml(wrap(subject.title, 26, 2)[1] ?? subject.author)}</text>
      <g fill="#cbd5e1">
        ${Array.from({ length: 13 }, (_, i) => `<rect x="112" y="${196 + i * 32}" width="${i === hi ? 190 : 236}" height="9" rx="4"/>`).join("")}
        ${Array.from({ length: 13 }, (_, i) => `<rect x="112" y="${204 + i * 32}" width="${210 - (i % 4) * 30}" height="9" rx="4"/>`).join("")}
      </g>
      <g opacity="0.9">
        <path d="M120 300 q30 -14 52 2 t54 -4" fill="none" stroke="#2563eb" stroke-width="3"/>
        <path d="M126 430 q40 -10 70 4" fill="none" stroke="#dc2626" stroke-width="3"/>
        <rect x="118" y="540" width="96" height="26" fill="#fde68a" opacity="0.75"/>
      </g>
      ${noteLines.join("")}
      <text x="112" y="726" fill="#94a3b8" font-family="Helvetica, Arial, sans-serif" font-size="14">${escapeXml(subject.condition.toUpperCase().replace(/_/g, " "))} · SAMPLE PAGE ${1 + (subject.coverStyle % 40)}</text>
    `);
  }

  return svg(`
    ${common}
    <rect width="600" height="800" fill="url(#bg-${gid})"/>
    ${motifSvg(palette.motif, palette.accent)}
    <rect x="0" y="0" width="600" height="800" fill="url(#shade-${gid})"/>
    <rect x="34" y="34" width="532" height="732" rx="8" fill="none" stroke="${palette.accent}" stroke-width="3" opacity="0.75"/>
    <text x="60" y="92" fill="${palette.accent}" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="4" opacity="0.95">${escapeXml(CATEGORY_LABEL[subject.category].toUpperCase())}</text>
    <g fill="${palette.ink}" font-family="Georgia, serif" font-weight="700" font-size="${titleLines.length > 3 ? 44 : 52}">
      ${titleLines.map((line, i) => `<text x="60" y="${210 + i * 62}">${escapeXml(line)}</text>`).join("")}
    </g>
    <line x1="62" y1="${228 + titleLines.length * 62}" x2="230" y2="${228 + titleLines.length * 62}" stroke="${palette.accent}" stroke-width="4"/>
    <text x="60" y="${288 + titleLines.length * 62}" fill="${palette.ink}" opacity="0.88" font-family="Helvetica, Arial, sans-serif" font-size="24">${escapeXml(wrap(subject.author, 28, 1)[0])}</text>
    <text x="60" y="726" fill="${palette.ink}" opacity="0.7" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="3">BOOKART · HYPERLOCAL BOOK MARKETPLACE</text>
  `);
}

function svg(inner: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800" role="img">${inner}</svg>`;
}

export function coverDataUri(subject: CoverSubject, view: CoverView = "front"): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coverSvg(subject, view))}`;
}

export const GALLERY_VIEWS: CoverView[] = ["front", "back", "spine", "page"];

export const VIEW_LABELS: Record<CoverView, string> = {
  front: "Front cover",
  back: "Back cover",
  spine: "Spine",
  page: "Sample page",
};
