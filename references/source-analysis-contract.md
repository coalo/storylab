# Source analysis contract

Use this contract whenever Storylab reads a user-supplied source novel for adaptation, reconstruction, or selective inheritance. It is the single authority for source-analysis stages, roles, evidence, and transfer gates.

## User-supplied means fully available

When the user supplies a source file, places it in the project, or explicitly identifies it for Storylab, treat that act as an immediate project-scoped grant to read, segment, index, quote within bounded evidence records, analyze, extract, compare, transform, adapt, and create derivative project material.

Do not ask whether Storylab is authorized. Do not create an authorization agenda item, warning, pending status, or confirmation gate. Record only the source path, fingerprint, version, and the deterministic access basis `user_supplied_full_project_use` for provenance and cache invalidation.

## Separate the three states

Keep these states independent:

1. **Source observation** — what is materially present in the source, with locators and neutral narrative function.
2. **Professional risk assessment** — concerns such as objectification, coercion, stereotype, repetition, audience mismatch, or identifiability.
3. **User transfer decision** — whether an observed asset is kept, distilled, discarded, or deferred for the target project.

A risk assessment never changes an observation from `present` to `absent`. A specialist recommendation never becomes a transfer decision. Only explicit user evidence may close a transfer decision.

Examples:

- A sustained multi-partner relationship engine remains an observed source asset even when some scenes also create objectification or exploitation risks.
- A recurring event pattern remains present even when direct replication would be derivative.
- “Not recommended” means `present + risk_assessed`; it never means “not found.”

## Content neutrality and creative authority

Storylab observes fiction before judging transfer. No role may suppress, sanitize, euphemize, downgrade, or merge a source element merely because the role considers it immoral, politically sensitive, unfashionable, commercially risky, or inconsistent with its own editorial taste.

This rule applies equally to material involving romance, sexuality, intimacy, harem or other multi-partner structures, gendered fantasy, power fantasy, coercive or dark relationships, violence, hierarchy, religion, politics, and social taboo. A role must record what is materially present and its narrative function. It may then record audience, representation, continuity, or craft risks in the separate risk layer.

For a core user-taste dimension:

- expose the complete materially supported range, including combinations and a free-form alternative;
- describe consequences and risks without assigning a default or preferred answer;
- do not use “best practice,” political correctness, market positioning, or character-protection language to pre-delete an option;
- do not compress distinct relationship or fantasy engines into a single sanitized category;
- recommend only if the user explicitly asks for a recommendation on that taste decision.

## Stages

| Status | Required evidence | Next owner |
|---|---|---|
| `uninitialized` | source-analysis assets only; no source registered yet | deterministic intake |
| `received` | user-supplied source path and deterministic access basis | deterministic intake |
| `indexed` | source manifest and structure index | source readers |
| `reconnaissance_complete` | coverage-oriented reconnaissance | Storylab host |
| `extraction_spec_approved` | user-confirmed categories, granularity, exclusions, and batch policy | source readers |
| `extracting` | one or more validated batch reports | source readers |
| `synthesized` | cross-batch source synthesis | source auditor |
| `audited` | independent audit with no blocking omissions | Storylab host |
| `transfer_gate` | complete observed-asset list and audit | user |
| `completed` | explicit keep/distill/discard/defer decisions | story editor |

Do not jump from raw source or reconnaissance directly to target story assets.

## Default coverage taxonomy

Every extraction specification must contain these categories unless the user explicitly removes or supersedes one:

- `reader_promise_and_serial_rewards`
- `protagonist_engine`
- `supporting_character_agency`
- `relationship_networks`
- `romance_intimacy_and_multi_partner_dynamics`
- `organization_power_and_resource_flows`
- `event_causality`
- `suspense_plant_and_payoff`
- `world_rules_and_terminology`
- `themes_voice_and_tone`

Risk assessment is an optional, separate namespace defined in the user-confirmed extraction specification. Storylab has no mandatory moral, ideological, or political risk checklist. A risk category may be added because the user requested it or because reconnaissance exposed a concrete craft, audience, continuity, representation, or adaptation question. Do not place risk categories in the coverage taxonomy as substitutes for observed assets, and never require a risk judgment before recording an observation.

For every approved coverage category, every batch report records one of:

- `present`
- `absent`
- `uncertain`
- `not_applicable`

An omitted category is invalid. `absent` requires a completed read of the assigned batch, not an editorial preference.

## Observation record

Each observed element contains:

- stable `observation_id`;
- approved `category`;
- `source_ref` with source, batch, volume or section, chapter or segment, and stable locator;
- neutral `observation`;
- `narrative_function`;
- `evidence_level`: `explicit`, `strong_inference`, or `tentative`;
- optional cross-record links;
- no target-project decision.

Do not copy long source passages. Use a concise paraphrase, stable locator, and optional bounded excerpt hash. Raw source and observation evidence never enter author or first-reader packets.

Observation records must not contain `keep`, `distill`, `discard`, target character names, target event sequences, or target prose requirements.

## Reconnaissance

Reconnaissance reads enough of every structural unit to discover candidate element families before the user approves the formal extraction specification. It produces:

- structural coverage;
- candidate categories actually indicated by the source;
- representative locators;
- uncertain or under-sampled areas;
- no transfer decisions.

The host presents reconnaissance findings and starts a normal Storylab decision round for extraction scope. Formal batch extraction waits for explicit clearance and confirmed agenda items.

## Batch extraction

Assign each source reader one non-overlapping batch in a fresh context. Give it only:

- the assigned user-supplied source batch;
- source manifest and structure entry;
- the approved extraction specification;
- this contract.

Do not give source readers target outlines, future target plot, user migration preferences, or another reader's conclusions. This prevents target convenience from erasing source evidence.

## Synthesis

The source synthesizer consumes validated batch reports, not broad target plans. It produces:

- recurring and changing patterns;
- cross-volume development;
- exceptions and contradictions;
- unresolved identity or causality questions;
- evidence references for every claim.

It does not decide whether an asset belongs in the target project.

## Independent audit

The source auditor checks:

- structural coverage and batch gaps;
- required taxonomy coverage;
- unsupported synthesis claims;
- contradictions hidden by summary;
- observations silently removed after a risk flag;
- relationship, intimacy, sexuality, or multi-partner dynamics collapsed into an objectification warning;
- any transfer decision made without user evidence;
- raw-source leakage into downstream creative packets.

An audit may flag risk or insufficient evidence. It may not make the user's taste decision.

## Transfer gate

Only after audit may the story editor propose `keep`, `distill`, `discard`, or `defer` options. The Storylab host presents them through the normal discussion protocol.

Confirmed decisions are recorded in `故事项目/旧资料继承决策.md`. Target story assets cite those decisions rather than reopening raw source observations.

## Invalidation and recovery

- A source hash change invalidates index, reconnaissance, batches, synthesis, and audit.
- An extraction-spec revision invalidates only categories or batches it changes.
- A batch-report revision invalidates dependent synthesis and audit.
- A synthesis revision invalidates the audit and transfer gate.
- Confirmed transfer decisions are immutable; supersede them with a new decision record.

Resume from `故事项目/源作解析/解析状态.json` and return to the earliest invalid stage.
