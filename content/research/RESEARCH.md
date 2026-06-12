# RESEARCH.md — evidence base and curriculum additions

Pre-build research review (June 2026): validated the learning-science design of the spec and
identified two gaps in the five-book curriculum. Two playbook layers were added as a result.

## 1. Learning-science foundation (validates SPEC.md design choices)

- **Practice testing + distributed practice are the two highest-utility techniques.**
  Dunlosky et al. (2013), *Psychological Science in the Public Interest* — ten popular
  techniques reviewed across hundreds of studies; practice testing and distributed practice
  were the only two rated "high utility". Re-reading and highlighting rated low.
  → justifies the FSRS drill queue as the retention core (Loop 1).
- **242-study meta-analysis (2021), 1,619 effects, 169k participants** reconfirmed distributed
  practice and practice testing as the most effective techniques.
- **Retrieval beats restudy** — Roediger & Karpicke (2006) testing effect; spaced retrieval
  with feedback is the strongest combination.
- **AI roleplay for interpersonal-skills training**: 2025 meta-analysis across 12 studies /
  907 participants found roleplay training effect size d ≈ 0.82 (large) vs traditional
  instruction; AI roleplay uniquely delivers the three deliberate-practice requirements at
  scale — high-frequency repetition, immediate objective feedback, progressive difficulty.
  → justifies the persona simulator + structured grading (Loop 2).
- **Transfer requires field application** — roleplay performance alone doesn't predict live
  results; per-meeting deliberate-practice goals with debrief feedback close the gap.
  → justifies the pre-brief/debrief loop wired to the CRM (Loop 3).

Sources reviewed:
- https://www.apa.org/pubs/journals/features/stl-0000024.pdf (practice tests + spaced practice)
- https://evidencebased.education/resource/retrieval-and-spaced-practice-study-strategies-that-must-be-combined/
- https://www.zenobits.co.uk/blog/ai-roleplay-training/ (roleplay meta-analysis, d=0.82)
- https://blog.umu.com/2024/12/02/Transforming-Sales-Training-with-AI-Roleplay/

## 2. Gap analysis of the five-book curriculum

| Layer | Covered by |
|---|---|
| Operating model (trust) | The Trusted Advisor |
| Conversation method | SPIN Selling Fieldbook |
| Psychology of influence | Influence (Cialdini) |
| Interpersonal fundamentals | How to Win Friends |
| Network architecture | Never Eat Alone |
| **Negotiation / late-stage tension** | **— gap** |
| **Insight selling / buyer indecision** | **— gap** |

### Addition 1 — Never Split the Difference (Chris Voss) → `06-never-split-the-difference.md`
None of the five books covers the moment the incumbent bank tables a retention counter-offer,
the rate conversation, or a family member digging in. Voss's toolkit (tactical empathy,
mirroring, labeling, accusation audit, calibrated questions, anchoring) is built for
emotionally charged negotiation and converges cleanly with the trust frame (tactical empathy
= low self-orientation under pressure). It is also unusually well suited to a VOICE training
app: tone (the "late-night FM DJ voice", mirrors, labels) is a spoken skill.

### Addition 2 — The Challenger Sale + The JOLT Effect (Dixon, Adamson & McKenna)
→ `07-challenger-jolt.md`
- Challenger (CEB/Gartner, 6,000+ reps): top performers in complex sales teach the customer a
  commercial insight, tailor it per stakeholder, and take control of the process. Repeatedly
  cited as the most influential B2B sales research of the last 20 years.
- JOLT (2.5M recorded sales calls, 2022): 40–60% of lost complex deals are lost to NO DECISION
  driven by fear of messing up — and piling on more value makes it worse. Agri lending is the
  canonical no-decision market ("switching is a hassle", "Dad banked with them", "after
  harvest"). JOLT (Judge indecision, Offer a recommendation, Limit exploration, Take risk off
  the table) is the playbook for the exact objection pattern in the seed personas.

Sources reviewed:
- https://challengerinc.com/what-is-challenger-sales-methodology/
- https://challengerinc.com/challenger-jolt-effect-selling-playbooks/
- https://theb2bplaybook.com/best-sales-books (Challenger "take control" vs Voss "make them
  feel heard" operate at different deal stages — both included, sequenced)

Considered and not added (v1): *The Trusted Advisor Fieldbook* (Green & Howe) and *Let's Get
Real or Let's Not Play* (Khalsa) — both strong, but they substantially overlap layers already
covered by Maister + SPIN; better used later as drill-generator source variety than as new
curriculum sessions.

## 3. What the additions change in the app

- 2 new playbook files (06, 07) — injected into AI context like the original five
- 4 new curriculum sessions (15–17 new material; capstone renumbered to 18 and now graded
  across all seven frameworks)
- 2 new roleplay personas: `retention-counter` (trains Voss under a live incumbent
  counter-offer) and `indecisive-operator` (trains JOLT against agreement-without-commitment)
- 12 new seed drills (d25–d36) covering the new drillable concepts
- Skill radar gains Negotiation and Decision axes
- The voice coach (added per build brief) leans on Voss deliberately: mirrors, labels and tone
  are voice-first skills — the Web Speech loop trains delivery, not just wording
