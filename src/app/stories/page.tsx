import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { StoriesView } from "@/modules/dojo/components/StoriesView";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: stories } = await supabase
    .from("case_stories")
    .select("*")
    .eq("user_id", user.id)
    .order("region");

  return <StoriesView initialStories={stories ?? []} />;
}
