# Evaluation policy

Creative writing has no deterministic ground truth. Use evaluation to expose reader effects, route responsibility, and detect regressions; never turn it into a universal quality score.

## Independent evidence layers

1. **Cold reading** records immersion, confusion, character distinction, subtext, manipulation, and desire to continue.
2. **Literary diagnosis** interprets that evidence and routes the smallest responsible revision.
3. **Continuity review** checks established truth after literary readiness.
4. **User acceptance** decides taste and major creative direction.

Keep each state independently visible.

## Deterministic signals

Scripts may report sentence-length distribution, dialogue ratio, repeated openings, punctuation density, or explanatory-marker concentration. Label all results `signals`, never `pass`, `fail`, or `score`. A signal is a prompt for close reading, not proof of a defect.

## Calibration

Prefer task-specific comparisons using user-approved and user-rejected samples. Use pairwise or bounded pass/fail questions only for defined properties. Calibrate automated or model judgments against human decisions and keep held-out cases.

## Evaluation suites

- context-boundary cases test packet contamination;
- first-reader cases test blindness and evidence anchoring;
- editorial-routing cases test root-level responsibility;
- continuity cases test conflicts and state updates;
- taste-regression cases compare explicit approved and rejected tendencies;
- end-to-end cases test state transitions and invalidation.

Synthetic fixtures validate contracts only. They do not establish the user's taste baseline.
