import Link from "next/link";
import { listPlaybooks, BOOK_LABELS } from "@/modules/dojo/lib/playbook";
import { Badge, Card, PageTitle } from "@/modules/dojo/components/ui";

export default function PlaybookIndex() {
  const playbooks = listPlaybooks();
  return (
    <div>
      <PageTitle
        title="Playbook"
        subtitle="The seven source frameworks, distilled for agri origination"
      />
      <div className="space-y-2">
        {playbooks.map(({ book, content }) => {
          const title = content.split("\n")[0].replace(/^#\s*/, "");
          const conceptCount = (content.match(/DRILLABLE CONCEPT LIST/)
            ? content.split("DRILLABLE CONCEPT LIST")[1]?.split("|").length
            : 0) ?? 0;
          return (
            <Link key={book} href={`/playbook/${book}`} className="block">
              <Card className="transition-colors hover:border-flame-500/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{title}</p>
                  <Badge tone="blue">{BOOK_LABELS[book]}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {conceptCount} drillable concepts
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
