import { notFound } from "next/navigation";
import { PLAYBOOK_FILES, loadPlaybook } from "@/modules/dojo/lib/playbook";
import { PlaybookReader } from "@/modules/dojo/components/PlaybookReader";

export function generateStaticParams() {
  return Object.keys(PLAYBOOK_FILES).map((book) => ({ book }));
}

export default function PlaybookPage({ params }: { params: { book: string } }) {
  if (!PLAYBOOK_FILES[params.book]) notFound();
  const content = loadPlaybook(params.book);

  const conceptSection = content.split(/## DRILLABLE CONCEPT LIST.*/)[1] ?? "";
  const concepts = conceptSection
    .split("|")
    .map((c) => c.trim())
    .filter((c) => /^[a-zA-Z0-9_]+$/.test(c));

  return <PlaybookReader content={content} concepts={concepts} />;
}
