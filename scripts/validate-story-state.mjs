#!/usr/bin/env node

import fs from "node:fs";

const args = process.argv.slice(2);
const statePath = args[0];
const previousIndex = args.indexOf("--previous");
const previousPath = previousIndex >= 0 ? args[previousIndex + 1] : undefined;

if (!statePath) {
  process.stderr.write("Usage: validate-story-state.mjs <生产状态.json> [--previous <上一版生产状态.json>]\n");
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    process.stderr.write(`Cannot parse ${file}: ${error.message}\n`);
    process.exit(1);
  }
}

const statuses = [
  "planned",
  "commissioned",
  "writer_view_validated",
  "drafted",
  "cold_read_complete",
  "author_revision",
  "chapter_recommission",
  "story_replan",
  "literary_ready",
  "continuity_conflict",
  "continuity_clear",
  "human_gate",
  "accepted"
];

const transitions = {
  planned: ["planned", "commissioned"],
  commissioned: ["commissioned", "writer_view_validated", "planned"],
  writer_view_validated: ["writer_view_validated", "drafted", "commissioned"],
  drafted: ["drafted", "cold_read_complete"],
  cold_read_complete: ["cold_read_complete", "author_revision", "chapter_recommission", "story_replan", "literary_ready"],
  author_revision: ["author_revision", "drafted"],
  chapter_recommission: ["chapter_recommission", "commissioned"],
  story_replan: ["story_replan", "planned"],
  literary_ready: ["literary_ready", "continuity_conflict", "continuity_clear"],
  continuity_conflict: ["continuity_conflict", "drafted", "chapter_recommission"],
  continuity_clear: ["continuity_clear", "human_gate", "accepted"],
  human_gate: ["human_gate", "accepted", "author_revision", "chapter_recommission", "story_replan"],
  accepted: ["accepted"]
};

const evidenceRequired = {
  commissioned: ["commission"],
  writer_view_validated: ["commission", "writer_view"],
  drafted: ["draft"],
  cold_read_complete: ["draft", "first_read"],
  author_revision: ["draft", "first_read", "editorial_letter"],
  chapter_recommission: ["draft", "first_read", "editorial_letter"],
  story_replan: ["draft", "first_read", "editorial_letter"],
  literary_ready: ["draft", "first_read", "editorial_letter"],
  continuity_conflict: ["draft", "editorial_letter", "continuity_report"],
  continuity_clear: ["draft", "editorial_letter", "continuity_report"],
  human_gate: ["draft", "editorial_letter", "continuity_report"],
  accepted: ["draft", "editorial_letter", "continuity_report", "acceptance_record"]
};

function validate(state) {
  const errors = [];
  if (state.schema_version !== "2.0") errors.push("schema_version must be 2.0");
  if (!state.project_id && state.project_id !== "") errors.push("project_id is required");
  if (!["pilot", "steady"].includes(state.production_mode)) errors.push("production_mode must be pilot or steady");
  if (typeof state.taste_freeze !== "boolean") errors.push("taste_freeze must be boolean");
  if (!Array.isArray(state.chapters)) errors.push("chapters must be an array");

  const ids = new Set();
  for (const chapter of state.chapters || []) {
    const label = `chapter ${chapter.chapter_id ?? "<missing>"}`;
    if (!chapter.chapter_id) errors.push(`${label}: chapter_id is required`);
    if (ids.has(chapter.chapter_id)) errors.push(`${label}: duplicate chapter_id`);
    ids.add(chapter.chapter_id);
    if (!statuses.includes(chapter.status)) errors.push(`${label}: invalid status ${chapter.status}`);
    if (!Number.isInteger(chapter.commission_revision) || chapter.commission_revision < 0) errors.push(`${label}: invalid commission_revision`);
    if (!Number.isInteger(chapter.draft_revision) || chapter.draft_revision < 0) errors.push(`${label}: invalid draft_revision`);
    if (!chapter.evidence || typeof chapter.evidence !== "object") errors.push(`${label}: evidence object is required`);
    for (const key of evidenceRequired[chapter.status] || []) {
      if (!chapter.evidence?.[key]) errors.push(`${label}: ${chapter.status} requires evidence.${key}`);
    }
    if (chapter.canon_committed && chapter.status !== "accepted") errors.push(`${label}: canon can be committed only when accepted`);
  }
  return errors;
}

const state = readJson(statePath);
const errors = validate(state);

if (previousPath) {
  const previous = readJson(previousPath);
  const previousErrors = validate(previous);
  errors.push(...previousErrors.map((error) => `previous state: ${error}`));
  const previousById = new Map((previous.chapters || []).map((chapter) => [chapter.chapter_id, chapter]));

  for (const chapter of state.chapters || []) {
    const before = previousById.get(chapter.chapter_id);
    if (!before) continue;
    if (!transitions[before.status]?.includes(chapter.status)) {
      errors.push(`chapter ${chapter.chapter_id}: invalid transition ${before.status} -> ${chapter.status}`);
    }
    if (chapter.draft_revision < before.draft_revision) errors.push(`chapter ${chapter.chapter_id}: draft_revision cannot decrease`);
    if (chapter.commission_revision < before.commission_revision) errors.push(`chapter ${chapter.chapter_id}: commission_revision cannot decrease`);
    if (chapter.draft_revision > before.draft_revision && chapter.status !== "drafted") {
      errors.push(`chapter ${chapter.chapter_id}: a new draft revision must reset status to drafted`);
    }
    if (chapter.commission_revision > before.commission_revision && !["commissioned", "writer_view_validated"].includes(chapter.status)) {
      errors.push(`chapter ${chapter.chapter_id}: a new commission revision must reset the chapter to commissioned or writer_view_validated`);
    }
    const changed = JSON.stringify(chapter) !== JSON.stringify(before);
    if (previous.taste_freeze && changed) errors.push(`chapter ${chapter.chapter_id}: production cannot advance while the previous state is taste-frozen`);
    if (state.taste_freeze && changed && !previous.taste_freeze) errors.push(`chapter ${chapter.chapter_id}: do not advance production in the transition that activates taste freeze`);
  }
}

process.stdout.write(`${JSON.stringify({ valid: errors.length === 0, file: statePath, errors }, null, 2)}\n`);
if (errors.length) process.exit(1);
