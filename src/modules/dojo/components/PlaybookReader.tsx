"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Card, Input } from "./ui";
import { Zap } from "lucide-react";

export function PlaybookReader({
  content,
  concepts,
}: {
  content: string;
  concepts: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [drilling, setDrilling] = useState<string | null>(null);

  const shown = useMemo(() => {
    if (!query.trim()) return content;
    const q = query.toLowerCase();
    // show sections (## blocks) containing the query
    const sections = content.split(/\n(?=## )/);
    const hits = sections.filter((s) => s.toLowerCase().includes(q));
    return hits.length ? hits.join("\n") : "_No sections match._";
  }, [content, query]);

  async function drillNow(conceptId: string) {
    setDrilling(conceptId);
    try {
      await fetch("/api/generate/drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId, n: 2, difficulty: "normal" }),
      });
      router.push("/drill");
    } finally {
      setDrilling(null);
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search this playbook…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {concepts.length > 0 && (
        <Card>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Drill a concept now
          </p>
          <div className="flex flex-wrap gap-1.5">
            {concepts.map((c) => (
              <button key={c} onClick={() => drillNow(c)} disabled={!!drilling}>
                <Badge
                  tone="blue"
                  className="cursor-pointer hover:bg-flame-500/30"
                >
                  {drilling === c ? (
                    "generating…"
                  ) : (
                    <>
                      <Zap size={9} className="mr-0.5" /> {c}
                    </>
                  )}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="prose-playbook">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{shown}</ReactMarkdown>
      </div>
    </div>
  );
}
