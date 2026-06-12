import fs from "fs";
import path from "path";

export const PLAYBOOK_FILES: Record<string, string> = {
  "trusted-advisor": "01-trusted-advisor.md",
  spin: "02-spin-selling.md",
  influence: "03-influence.md",
  carnegie: "04-how-to-win-friends.md",
  "never-eat-alone": "05-never-eat-alone.md",
  negotiation: "06-never-split-the-difference.md",
  "challenger-jolt": "07-challenger-jolt.md",
};

export const BOOK_LABELS: Record<string, string> = {
  "trusted-advisor": "Trust",
  spin: "SPIN",
  influence: "Influence",
  carnegie: "Carnegie",
  "never-eat-alone": "Network",
  negotiation: "Negotiation",
  "challenger-jolt": "Decision",
  capstone: "Capstone",
};

const playbookDir = () => path.join(process.cwd(), "content", "playbook");

export function loadPlaybook(book: string): string {
  const file = PLAYBOOK_FILES[book];
  if (!file) return "";
  return fs.readFileSync(path.join(playbookDir(), file), "utf-8");
}

export function loadPlaybookFile(file: string): string {
  return fs.readFileSync(path.join(playbookDir(), file), "utf-8");
}

export function loadAllPlaybooks(): string {
  return Object.keys(PLAYBOOK_FILES)
    .map((b) => loadPlaybook(b))
    .join("\n\n---\n\n");
}

export function listPlaybooks(): { book: string; file: string; content: string }[] {
  return Object.entries(PLAYBOOK_FILES).map(([book, file]) => ({
    book,
    file,
    content: loadPlaybookFile(file),
  }));
}
