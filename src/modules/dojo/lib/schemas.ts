import { z } from "zod";

export const drillGradeSchema = z.object({
  score: z.number().int().min(1).max(4),
  feedback: z.string(),
  fsrs_rating: z.enum(["again", "hard", "good", "easy"]),
});
export type DrillGrade = z.infer<typeof drillGradeSchema>;

export const roleplayGradeSchema = z.object({
  overall: z.number().int().min(1).max(10),
  advance_secured: z.boolean(),
  advance_quality: z.enum(["advance", "continuation", "none"]),
  framework_scores: z.array(
    z.object({
      framework: z.string(),
      score: z.number().int().min(1).max(10),
      evidence: z.string(),
    })
  ),
  question_mix: z
    .object({
      situation: z.number(),
      problem: z.number(),
      implication: z.number(),
      need_payoff: z.number(),
      talk_ratio_estimate: z.string(),
    })
    .partial()
    .passthrough(),
  self_orientation_incidents: z.array(z.string()),
  premature_solving_incidents: z.array(z.string()),
  best_moment: z.string(),
  one_thing: z.string(),
  drill_seeds: z.array(z.string()),
});
export type RoleplayGrade = z.infer<typeof roleplayGradeSchema>;

export const generatedDrillSchema = z.object({
  concept_id: z.string(),
  type: z.enum(["classify", "spot", "produce", "rewrite", "plan"]),
  prompt: z.string(),
  options: z.array(z.string()).nullish(),
  answer: z.number().int().nullish(),
  grading_focus: z.string().nullish(),
  explain: z.string().nullish(),
});
export const generatedDrillsSchema = z.array(generatedDrillSchema);
export type GeneratedDrill = z.infer<typeof generatedDrillSchema>;

export const prebriefSchema = z.object({
  technique: z.object({ concept_id: z.string(), instruction: z.string() }),
  best_case_advance: z.string(),
  minimum_advance: z.string(),
  prepared_questions: z.array(z.string()),
  personal_loadout: z.array(z.string()),
});
export type Prebrief = z.infer<typeof prebriefSchema>;

export const debriefSchema = z.object({
  technique_score: z.number().int().min(1).max(4),
  technique_feedback: z.string(),
  outcome: z.enum(["advance", "continuation", "setback"]),
  outcome_reason: z.string(),
  new_personal_details: z.record(z.string()).default({}),
  implied_or_explicit_needs: z.array(z.string()).default([]),
  reflection_question: z.string(),
  next_touch_suggestion: z.string().nullish(),
});
export type Debrief = z.infer<typeof debriefSchema>;

export const remixedPersonaSchema = z.object({
  name: z.string(),
  archetype: z.string(),
  context: z.string(),
  disposition: z.string(),
  hidden_needs: z.array(z.string()),
  objections: z.array(z.string()),
});
