import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { mapContacts, parseCsv } from "@/modules/dojo/lib/csv";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return new Response("No file", { status: 400 });

  const text = await file.text();
  const contacts = mapContacts(parseCsv(text));
  if (!contacts.length) {
    return new Response("No contacts found — needs a header row with a name column", {
      status: 400,
    });
  }

  const { error } = await supabase
    .from("contacts")
    .insert(contacts.map((c) => ({ ...c, user_id: user.id })));
  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ imported: contacts.length });
}
