/* eslint-disable no-console */
// Seed script: loads playbooks (concepts), curriculum, personas and the drill
// bank into Supabase, ensures the single user exists, and creates review rows
// so the app boots with the full seed drill queue due. Run: npm run seed
import { createClient } from "@supabase/supabase-js";
import { createEmptyCard } from "ts-fsrs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!email || !password) {
  console.error("Missing SEED_USER_EMAIL / SEED_USER_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PLAYBOOK_FILES: Record<string, string> = {
  "trusted-advisor": "01-trusted-advisor.md",
  spin: "02-spin-selling.md",
  influence: "03-influence.md",
  carnegie: "04-how-to-win-friends.md",
  "never-eat-alone": "05-never-eat-alone.md",
  negotiation: "06-never-split-the-difference.md",
  "challenger-jolt": "07-challenger-jolt.md",
};

function readJson(file: string) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "content", "seed", file), "utf-8")
  );
}

function conceptsFromPlaybooks() {
  const rows: { id: string; book: string; name: string; playbook_file: string }[] = [];
  for (const [book, file] of Object.entries(PLAYBOOK_FILES)) {
    const content = fs.readFileSync(
      path.join(process.cwd(), "content", "playbook", file),
      "utf-8"
    );
    const section = content.split(/## DRILLABLE CONCEPT LIST.*/)[1];
    if (!section) continue;
    for (const raw of section.split("|")) {
      const id = raw.trim();
      if (/^[a-zA-Z0-9_]+$/.test(id)) {
        rows.push({ id, book, name: id.replace(/_/g, " "), playbook_file: file });
      }
    }
  }
  // capstone session references convergence_mapping (carnegie) — already present
  return rows;
}

async function ensureUser(): Promise<string> {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabase.auth.admin.createUser({
    email: email!,
    password: password!,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  console.log("Created user", email);
  return data.user.id;
}

async function main() {
  const userId = await ensureUser();

  // concepts
  const concepts = conceptsFromPlaybooks();
  let res = await supabase.from("concepts").upsert(concepts, { onConflict: "id" });
  if (res.error) throw res.error;
  console.log(`Concepts: ${concepts.length}`);

  // sessions
  const curriculum = readJson("curriculum.json");
  res = await supabase.from("sessions").upsert(curriculum.sessions, { onConflict: "id" });
  if (res.error) throw res.error;
  console.log(`Sessions: ${curriculum.sessions.length}`);

  // personas
  const personasJson = readJson("personas.json");
  const personaRows = personasJson.personas.map((p: { id: string }) => ({
    id: p.id,
    sheet: p,
  }));
  res = await supabase.from("personas").upsert(personaRows, { onConflict: "id" });
  if (res.error) throw res.error;
  console.log(`Personas: ${personaRows.length}`);

  // drills (idempotent via legacy_id)
  const drillBank = readJson("drill-bank.json");
  const conceptIds = new Set(concepts.map((c) => c.id));
  const drillRows = drillBank.drills
    .filter((d: { concept_id: string }) => {
      if (!conceptIds.has(d.concept_id)) {
        console.warn(`Skipping drill with unknown concept: ${d.concept_id}`);
        return false;
      }
      return true;
    })
    .map((d: Record<string, unknown>) => ({
      legacy_id: d.id,
      concept_id: d.concept_id,
      type: d.type,
      prompt: d.prompt,
      options: d.options ?? null,
      answer: d.answer ?? null,
      grading_focus: d.grading_focus ?? null,
      explain: d.explain ?? null,
      source: "seed",
    }));
  res = await supabase.from("drills").upsert(drillRows, { onConflict: "legacy_id" });
  if (res.error) throw res.error;
  console.log(`Drills: ${drillRows.length}`);

  // profile + first session unlocked
  await supabase.from("profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
  await supabase
    .from("session_progress")
    .upsert(
      { user_id: userId, session_id: 1, status: "available" },
      { onConflict: "user_id,session_id", ignoreDuplicates: true }
    );

  // reviews: every drill reviewable, due now
  const { data: allDrills, error: drillsErr } = await supabase
    .from("drills")
    .select("id");
  if (drillsErr) throw drillsErr;
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("drill_id")
    .eq("user_id", userId);
  const have = new Set((existingReviews ?? []).map((r) => r.drill_id));
  const newReviews = (allDrills ?? [])
    .filter((d) => !have.has(d.id))
    .map((d) => {
      const card = createEmptyCard(new Date());
      return {
        drill_id: d.id,
        user_id: userId,
        fsrs_state: card,
        due: card.due.toISOString(),
      };
    });
  if (newReviews.length) {
    res = await supabase.from("reviews").insert(newReviews);
    if (res.error) throw res.error;
  }
  console.log(`Reviews created: ${newReviews.length} (existing kept: ${have.size})`);

  console.log("Seed complete ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
