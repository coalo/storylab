# Context separation

Isolation is enforced by allowlisted handoffs, not by asking a context-rich model to forget.

## Access matrix

| Role | Allowed | Excluded |
|---|---|---|
| Storylab host | statuses, artifact paths, consultations, user answers, gate decisions | creative authorship and independent literary verdicts |
| Source reader | one user-supplied source batch, manifest/index entry, approved extraction specification | target plans, user transfer preferences, other readers' conclusions |
| Source synthesizer | validated source batch reports, manifest/index, extraction specification | target plans, user transfer preferences, raw source except bounded evidence lookup |
| Source auditor | source-analysis artifacts, bounded disputed raw-source lookups | authority to decide taste or inheritance |
| Story editor | all project direction, taste evidence, audited source synthesis and transfer-gate record | broad raw source by default, novel drafting, final literary acceptance |
| Chapter editor | current plans, canon, continuity preflight | cold-read notes before routing, raw legacy, scoring controls |
| Author | validated writer view, included approved prose, problem-focused editorial letter | all other project files |
| First reader | draft, reader-facing promise, later approved taste anchors | commission, plan, rationale, continuity accounts |
| Literary editor | draft, frozen first read, public promise, current commission if needed | future arcs, raw legacy, numeric success models |
| Continuity editor | draft, canon, continuity state, revision id | authority to judge prose quality |

## Communication boundary

Only the Storylab host communicates with the user. Every specialist role returns one of:

- a completed professional artifact;
- a consultation containing findings and recommendations;
- a bounded decision request containing `needs_user_decision`, question candidates, impact, and blocking scope;
- a missing-input status directed to the host.

The host may clarify wording and merge truly equivalent duplicates, but must preserve distinct taste dimensions and preserve which statements are source observations, professional risks, specialist recommendations, and user decisions. User replies are relayed back to the same role context when continuing its reasoning is useful.

## `章节任务书.md` contract

The commission may contain upstream context, but the compiler exports only these sections:

- Reader-facing promise
- POV boundary
- Immediate lived state
- Immediate desire
- Counterforce desire
- Dramatic pressure
- Canon facts
- Required state change
- Protected information
- Creative freedom

The compiler exports the packet as `作者视图.md` and may append bounded recent approved prose and approved voice anchors supplied as separate files.

## Contamination classes

Reject an author packet containing:

- commercial factor names or numeric literary scores;
- relationship ranks or proof chains;
- evaluator checks, failure history, or acceptance language;
- exact dialogue, required gestures, ordered beats, or a fixed event sequence;
- reasons a future character or event was scheduled;
- specific long-range outcomes beyond protected-information boundaries;
- direct excerpts from raw legacy control files.

## Fresh-context rule

Run author, first reader, and literary editor in separate fresh contexts. Give each context explicit readable paths rather than a broad project directory. If a role requests an excluded fact, send the request upstream; do not widen permissions silently.

Run source readers, the source synthesizer, and the source auditor in separate fresh contexts. A source reader never receives target-project preferences; this prevents target convenience, moral preference, or an anticipated recommendation from changing what the source report says exists.

## Revision feedback

Before sending an editorial letter to the author, keep only the observed problem, reader effect, evidence, and priority. Remove routing analysis, planned solutions, and future-story reasoning.
