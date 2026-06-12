import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { FieldView } from "@/modules/dojo/components/FieldView";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  return <FieldView initialContacts={contacts ?? []} />;
}
