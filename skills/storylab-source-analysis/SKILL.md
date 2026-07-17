---
name: storylab-source-analysis
description: Orchestrate evidence-backed analysis of a user-supplied source novel before Storylab adaptation or inheritance, including indexing, reconnaissance, user-approved extraction scope, isolated batch reading, cross-volume synthesis, independent omission audit, and transfer decisions. Use whenever a fiction project needs to read, extract, compare, adapt, or inherit material from a source novel.
---

# Storylab Source Analysis

Run as a module under the Storylab host. Do not create a second user-facing voice.

## Load the contract

Read:

- `../../references/source-analysis-contract.md`
- `../../references/creative-governance.md`
- `../../references/context-separation.md`
- `../../references/conversation-protocol.md`

## Route source-driven work

Before source analysis:

1. Treat the user-supplied source as immediately available under `user_supplied_full_project_use`; do not ask for authorization or create a confirmation gate.
2. Initialize source-analysis assets with `../../scripts/initialize-story-project.mjs --project-root <root> --with-source-analysis`.
3. Validate `故事项目/源作解析/解析状态.json`.
4. Preserve the original source and record its stable path, encoding, size, and SHA-256.

Do not treat source reading as an informal prelude to story planning. It is a governed stage with evidence and recovery state.

## Run reconnaissance before extraction choices

Create a structural index, divide the source into non-overlapping batches, and ask fresh source-reader contexts to perform coverage-oriented reconnaissance.

Reconnaissance answers “what materially exists here?” It does not decide what the target project should inherit.

Synthesize candidate element families and representative locators in `故事项目/源作解析/侦察报告.json`. The Storylab host then runs an alignment gate and discussion agenda for:

- extraction categories;
- granularity;
- explicit exclusions;
- batch size and checkpoint policy.

Do not start formal extraction until those decisions are confirmed.

## Extract in isolated batches

For each batch:

1. Initialize `故事项目/源作解析/批次/批次-<id>/批次报告.json`.
2. Start a fresh source-reader context.
3. Provide only the assigned source range, approved extraction specification, manifest/index entries, and source-analysis contract.
4. Validate the batch report.
5. Mark a batch complete only when every approved category has a coverage state.

Multiple readers may process non-overlapping batches. They must not edit shared state directly; the Storylab host integrates validated outputs.

## Synthesize and audit

After every expected batch is valid:

1. Start a fresh source-synthesizer context with batch reports and the extraction specification.
2. Write `故事项目/源作解析/全书综合.json`.
3. Start a different fresh source-auditor context.
4. Write `故事项目/源作解析/提取审计.json`.
5. Run `../../scripts/validate-source-analysis.mjs --root 故事项目/源作解析`.

If the audit finds a blocking omission, reopen the smallest affected batch or synthesis scope.

## Enter the transfer gate

Only after a clear audit may the existing story editor propose transfer options. Preserve all three layers:

- source observation;
- professional risk assessment;
- user transfer decision.

Never let a risk label silently delete a source asset. Never write source observations directly into the story bible, routes, arc map, or author packet.

If fresh role contexts are unavailable, stop at the affected handoff instead of simulating isolation.
