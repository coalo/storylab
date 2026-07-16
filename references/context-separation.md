# Context separation

Isolation is enforced by allowlisted handoffs, not by asking a context-rich model to forget.

## Access matrix

| Role | Allowed | Excluded |
|---|---|---|
| Storylab host | statuses, artifact paths, consultations, user answers, gate decisions | creative authorship and independent literary verdicts |
| Story editor | all project direction, taste evidence, authorized legacy | novel drafting and final literary acceptance |
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

The host may clarify wording and remove duplicates, but must preserve which statements are user decisions and which are specialist recommendations. User replies are relayed back to the same role context when continuing its reasoning is useful.

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

## Revision feedback

Before sending an editorial letter to the author, keep only the observed problem, reader effect, evidence, and priority. Remove routing analysis, planned solutions, and future-story reasoning.
