# Editorial workflow

Each status identifies a valid artifact and the next accountable role.

## Statuses

| Status | Required evidence | Next owner |
|---|---|---|
| `planned` | accepted project direction | Story editor |
| `commissioned` | chapter commission | Chapter editor |
| `writer_view_validated` | validated writer view | Author |
| `drafted` | draft with revision id | First reader |
| `cold_read_complete` | frozen first-read report | Literary editor |
| `author_revision` | editorial letter routed locally | Author |
| `chapter_recommission` | editorial letter routed to premise | Chapter editor |
| `story_replan` | editorial letter routed to long arc | Story editor |
| `literary_ready` | literary letter for current revision | Continuity editor |
| `continuity_conflict` | conflict report | Author through chapter editor |
| `continuity_clear` | verified clear report | Orchestrator |
| `human_gate` | literary and continuity evidence | User or authorized policy |
| `accepted` | acceptance record | Story editor and continuity editor |

`taste_freeze` is an orthogonal project flag. When true, do not commission or draft new prose.

`故事项目/讨论议程.json` is an orthogonal human-decision state. Its alignment gate must clear before concrete agenda items are generated; a blocking open item then pauses only the affected downstream stage.

`故事项目/源作解析/解析状态.json` governs user-supplied source analysis before any source asset enters a transfer gate. Follow `source-analysis-contract.md`; a source-risk finding never silently removes an observed asset.

## Routing rules

- Route language, dialogue, viewpoint, exposition, embodiment, and local pacing to `author_revision`.
- Route an unusable dramatic question, pressure structure, participant desire, or state delta to `chapter_recommission`.
- Route a broken premise, character route, payoff schedule, or long-range arc to `story_replan`.
- Route established-fact conflicts to `continuity_conflict` only after literary readiness.

Never ask the author to solve a planning failure through prettier sentences.

## Invalidation

- Any prose edit increments `draft_revision`.
- A new revision invalidates first-read, literary, and continuity evidence for the changed scope.
- A recommission invalidates the writer view and all downstream artifacts.
- A story replan invalidates affected commissions but never rewrites accepted canon automatically.
- Canon and continuity updates occur only after acceptance.

## Human gates

Use `pilot` mode for project charter, voice sample, and early chapters: require explicit user acceptance. Use `steady` mode only after the user authorizes a batch policy. Major viewpoint, voice, relationship, premise, or ending-direction changes always return to an explicit gate.

Before generating gate questions, the Storylab host must first describe the achieved story direction or current chapter state and repeat clarification until the user explicitly says nothing remains. It then displays the complete discussion agenda. Professional items use 2-3 mutually exclusive options and one recommendation. User-taste items use 2-7 composable or free-form options, consequences without a default recommendation, and no ideological or moral pre-filtering. Keep exactly one item `in_discussion`. Record the user's answer, restate the proposed decision, obtain explicit confirmation, then advance. Alignment clearance and component decisions remain separate from the final charter or chapter gate.

## Recovery

On resume, validate `故事项目/生产状态.json`, verify the artifact required by the recorded status, and return to the earliest invalid stage. Preserve evidence from failed revisions so causes are auditable, but never expose that history to an isolated author packet.
