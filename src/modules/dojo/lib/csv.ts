/** Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "contact", "contact name", "full name"],
  firm: ["firm", "company", "organisation", "organization", "business"],
  type: ["type", "category", "contact type"],
  glue: ["glue", "relationship glue", "shared interest", "interests"],
  cadence_days: ["cadence_days", "cadence", "frequency", "touch cadence"],
  ladder_level: ["ladder_level", "ladder", "level", "relationship level"],
  priority: ["priority", "rank", "tier"],
  last_touch: ["last_touch", "last contact", "last touch", "last meeting"],
  super_connector: ["super_connector", "super connector", "connector"],
};

export type ContactRow = {
  name: string;
  firm: string | null;
  type: "referrer" | "client";
  glue: string | null;
  cadence_days: number;
  ladder_level: number;
  priority: number;
  last_touch: string | null;
  super_connector: boolean;
  personal_notes: Record<string, string>;
};

/** Map a CSV with arbitrary-ish headers to contact rows; unmapped columns land in personal_notes. */
export function mapContacts(rows: string[][]): ContactRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const colFor = (key: string) =>
    headers.findIndex((h) => HEADER_ALIASES[key]?.includes(h));
  const mapped: Record<string, number> = {};
  for (const key of Object.keys(HEADER_ALIASES)) mapped[key] = colFor(key);
  const knownCols = new Set(Object.values(mapped).filter((i) => i >= 0));

  return rows
    .slice(1)
    .map((row) => {
      const get = (key: string) =>
        mapped[key] >= 0 ? (row[mapped[key]] ?? "").trim() : "";
      const notes: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (!knownCols.has(i) && (row[i] ?? "").trim()) notes[h] = row[i].trim();
      });
      const typeRaw = get("type").toLowerCase();
      const dateRaw = get("last_touch");
      const parsedDate = dateRaw ? new Date(dateRaw) : null;
      return {
        name: get("name") || row[0]?.trim() || "",
        firm: get("firm") || null,
        type: (typeRaw.includes("client") ? "client" : "referrer") as
          | "referrer"
          | "client",
        glue: get("glue") || null,
        cadence_days: parseInt(get("cadence_days")) || 30,
        ladder_level: Math.min(4, Math.max(1, parseInt(get("ladder_level")) || 1)),
        priority: parseInt(get("priority")) || 3,
        last_touch:
          parsedDate && !isNaN(parsedDate.getTime())
            ? parsedDate.toISOString().slice(0, 10)
            : null,
        super_connector: ["true", "yes", "y", "1"].includes(
          get("super_connector").toLowerCase()
        ),
        personal_notes: notes,
      };
    })
    .filter((c) => c.name);
}
