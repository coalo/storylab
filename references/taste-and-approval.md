# Taste and approval

The user is Storylab's final taste authority. Models provide evidence and diagnosis, not a substitute preference.

## Valid taste evidence

Record only explicit user statements tied to a sample, chapter, passage, or named tendency:

- approved positive anchors;
- rejected tendencies with evidence;
- approved range of variation;
- unresolved preferences;
- date, scope, and superseding decision.

Do not infer approval from silence, task continuation, factual acceptance, or acceptance of a different chapter.

## Production modes

- `pilot`: explicit approval for the charter, voice sample, and each pilot chapter.
- `steady`: chapters may advance under a user-approved batch policy; named gates remain explicit.

Major changes to viewpoint, narrative distance, voice, core relationship direction, premise, or ending promise always require an explicit gate.

## Rejection freeze

When the user explicitly rejects voice, style, or reading experience:

1. Set `taste_freeze` to true.
2. Stop new prose and expansion of affected plans.
3. Preserve the rejected sample and exact feedback.
4. Update the taste dossier only with what the user actually stated.
5. Produce a bounded new calibration sample when requested.
6. Clear the freeze only after explicit approval.

“Continue” authorizes the workflow to proceed. It never clears a taste freeze or marks a sample approved.
