#!/usr/bin/env node

import fs from "node:fs";

const args = process.argv.slice(2);
const statePath = args[0];
const previousIndex = args.indexOf("--previous");
const previousPath = previousIndex >= 0 ? args[previousIndex + 1] : undefined;

if (!statePath) {
  process.stderr.write("Usage: validate-discussion-state.mjs <讨论议程.json> [--previous <上一版讨论议程.json>]\n");
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

const supportedSchemaVersions = ["2.0", "3.0"];
const agendaStatuses = ["alignment", "draft", "active", "paused", "completed", "cancelled"];
const itemStatuses = ["pending", "in_discussion", "confirmed", "deferred", "removed"];
const closedStatuses = ["confirmed", "deferred", "removed"];
const alignmentScopes = ["project_direction", "volume_direction", "chapter_state", "taste_calibration", "other"];
const alignmentStatuses = ["awaiting_user", "clarifying", "cleared"];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validTimestamp(value) {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateAlignmentGate(agenda, errors) {
  const gate = agenda.alignment_gate;
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    errors.push("alignment_gate is required for schema 3.0");
    return;
  }

  if (!alignmentScopes.includes(gate.scope)) errors.push(`invalid alignment_gate scope: ${gate.scope}`);
  if (!Number.isInteger(gate.summary_revision) || gate.summary_revision < 1) {
    errors.push("alignment_gate summary_revision must be a positive integer");
  }
  if (!nonEmptyString(gate.summary)) errors.push("alignment_gate summary is required");
  if (!Array.isArray(gate.basis_refs) || gate.basis_refs.length === 0 || gate.basis_refs.some((ref) => !nonEmptyString(ref))) {
    errors.push("alignment_gate basis_refs must be a non-empty string array");
  }
  if (!alignmentStatuses.includes(gate.status)) errors.push(`invalid alignment_gate status: ${gate.status}`);

  const turns = Array.isArray(gate.clarification_turns) ? gate.clarification_turns : [];
  if (turns.length === 0) errors.push("alignment_gate clarification_turns must be a non-empty array");
  const turnIds = new Set();
  let unansweredCount = 0;
  let priorPresentedRevision = 0;
  turns.forEach((turn, index) => {
    const label = `clarification turn ${turn?.id || "<missing>"}`;
    if (!nonEmptyString(turn?.id)) errors.push(`${label}: id is required`);
    if (turnIds.has(turn?.id)) errors.push(`${label}: duplicate id`);
    turnIds.add(turn?.id);
    if (!Number.isInteger(turn?.summary_revision_presented)
      || turn.summary_revision_presented < 1
      || turn.summary_revision_presented > gate.summary_revision) {
      errors.push(`${label}: summary_revision_presented must reference the current summary history`);
    }
    if (turn?.summary_revision_presented < priorPresentedRevision) {
      errors.push(`${label}: summary revisions cannot move backward`);
    }
    priorPresentedRevision = turn?.summary_revision_presented || priorPresentedRevision;
    const previousTurn = turns[index - 1];
    if (previousTurn?.needs_clarification === true
      && turn?.summary_revision_presented <= previousTurn.summary_revision_presented) {
      errors.push(`${label}: a clarification must be reflected in a newer summary revision`);
    }
    if (!nonEmptyString(turn?.prompt)) errors.push(`${label}: prompt is required`);

    const unanswered = turn?.user_response === null || turn?.user_response === undefined;
    if (unanswered) {
      unansweredCount += 1;
      if (turn?.needs_clarification !== null
        || turn?.user_message_ref !== null
        || turn?.recorded_at !== null) {
        errors.push(`${label}: unanswered turn must keep decision, message ref, and time null`);
      }
      if (index !== turns.length - 1) errors.push(`${label}: only the final turn may be unanswered`);
    } else {
      if (!nonEmptyString(turn.user_response)) errors.push(`${label}: user_response is required when answered`);
      if (typeof turn.needs_clarification !== "boolean") errors.push(`${label}: needs_clarification must be boolean when answered`);
      if (!nonEmptyString(turn.user_message_ref)) errors.push(`${label}: user_message_ref is required when answered`);
      if (!validTimestamp(turn.recorded_at)) errors.push(`${label}: recorded_at must be a valid timestamp when answered`);
    }
  });
  if (unansweredCount > 1) errors.push("alignment_gate may have at most one unanswered clarification turn");

  const answeredTurns = turns.filter((turn) => turn?.user_response !== null && turn?.user_response !== undefined);
  const lastTurn = turns.at(-1);
  if (gate.status === "awaiting_user") {
    if (!lastTurn || lastTurn.user_response !== null) errors.push("awaiting_user alignment requires a final unanswered turn");
    if (lastTurn?.summary_revision_presented !== gate.summary_revision) {
      errors.push("awaiting_user alignment must present the latest summary revision");
    }
    if (answeredTurns.some((turn) => turn.needs_clarification !== true)) {
      errors.push("all answered turns before alignment clearance must request more clarification");
    }
    if (gate.cleared_by_user_message_ref !== null || gate.cleared_at !== null) {
      errors.push("uncleared alignment must keep clearance evidence null");
    }
  }
  if (gate.status === "clarifying") {
    if (!lastTurn || lastTurn.user_response === null || lastTurn.needs_clarification !== true) {
      errors.push("clarifying alignment requires the latest answered turn to need clarification");
    }
    if (unansweredCount !== 0) errors.push("clarifying alignment cannot contain an unanswered turn");
    if (gate.cleared_by_user_message_ref !== null || gate.cleared_at !== null) {
      errors.push("clarifying alignment must keep clearance evidence null");
    }
  }
  if (gate.status === "cleared") {
    if (!lastTurn || lastTurn.user_response === null || lastTurn.needs_clarification !== false) {
      errors.push("cleared alignment requires an explicit final no-clarification answer");
    }
    if (answeredTurns.slice(0, -1).some((turn) => turn.needs_clarification !== true)) {
      errors.push("all turns before final clearance must continue clarification");
    }
    if (lastTurn?.summary_revision_presented !== gate.summary_revision) {
      errors.push("cleared alignment must reference the latest summary revision");
    }
    if (!nonEmptyString(gate.cleared_by_user_message_ref)
      || gate.cleared_by_user_message_ref !== lastTurn?.user_message_ref) {
      errors.push("alignment clearance must reference the final user message");
    }
    if (!validTimestamp(gate.cleared_at)
      || (validTimestamp(lastTurn?.recorded_at) && Date.parse(gate.cleared_at) < Date.parse(lastTurn.recorded_at))) {
      errors.push("alignment cleared_at must be a valid timestamp at or after the final turn");
    }
    if (unansweredCount !== 0) errors.push("cleared alignment cannot contain an unanswered turn");
  }
}

function validate(agenda) {
  const errors = [];

  if (!supportedSchemaVersions.includes(agenda.schema_version)) errors.push("schema_version must be 2.0 or 3.0");
  const isCurrent = agenda.schema_version === "3.0";
  if (!nonEmptyString(agenda.discussion_id)) errors.push("discussion_id is required");
  if (!nonEmptyString(agenda.title)) errors.push("title is required");
  if (!agendaStatuses.includes(agenda.status) || (!isCurrent && agenda.status === "alignment")) errors.push(`invalid agenda status: ${agenda.status}`);
  if (!Number.isInteger(agenda.revision) || agenda.revision < 1) errors.push("revision must be a positive integer");
  if (!Number.isInteger(agenda.presented_revision) || agenda.presented_revision < 0 || agenda.presented_revision > agenda.revision) {
    errors.push("presented_revision must be an integer between 0 and revision");
  }
  if (!Array.isArray(agenda.items)) errors.push("items must be an array");
  if (!isCurrent && Array.isArray(agenda.items) && agenda.items.length === 0) errors.push("items must be a non-empty array");
  if (isCurrent) {
    validateAlignmentGate(agenda, errors);
    const alignmentCleared = agenda.alignment_gate?.status === "cleared";
    if (agenda.status === "alignment") {
      if (agenda.current_item_id !== null) errors.push("alignment agenda must have current_item_id null");
      if ((agenda.items || []).some((item) => item.status === "in_discussion")) errors.push("alignment agenda cannot discuss concrete items");
      if (agenda.questions_generated_at !== null) errors.push("alignment agenda must keep questions_generated_at null");
    } else {
      if (!alignmentCleared) errors.push("concrete agenda states require explicit alignment clearance");
      if (!validTimestamp(agenda.questions_generated_at)) {
        errors.push("questions_generated_at must be a valid timestamp after alignment clearance");
      } else if (validTimestamp(agenda.alignment_gate?.cleared_at)
        && Date.parse(agenda.questions_generated_at) < Date.parse(agenda.alignment_gate.cleared_at)) {
        errors.push("questions cannot be generated before alignment clearance");
      }
      if (["draft", "active", "paused"].includes(agenda.status) && (agenda.items || []).length === 0) {
        errors.push(`${agenda.status} agenda requires at least one generated item`);
      }
    }
  }

  const ids = new Set();
  const orders = new Set();
  for (const item of agenda.items || []) {
    const label = `item ${item.id || "<missing>"}`;
    if (!nonEmptyString(item.id)) errors.push(`${label}: id is required`);
    if (ids.has(item.id)) errors.push(`${label}: duplicate id`);
    ids.add(item.id);
    if (!Number.isInteger(item.order) || item.order < 1) errors.push(`${label}: order must be a positive integer`);
    if (orders.has(item.order)) errors.push(`${label}: duplicate order`);
    orders.add(item.order);
    for (const field of ["topic", "why", "downstream_effect", "question"]) {
      if (!nonEmptyString(item[field])) errors.push(`${label}: ${field} is required`);
    }
    if (isCurrent) {
      const options = Array.isArray(item.options) ? item.options : [];
      if (options.length < 2 || options.length > 3) errors.push(`${label}: options must contain 2 or 3 choices`);
      const optionIds = new Set();
      for (const option of options) {
        const optionLabel = `${label} option ${option?.id || "<missing>"}`;
        if (!nonEmptyString(option?.id)) errors.push(`${optionLabel}: id is required`);
        if (optionIds.has(option?.id)) errors.push(`${optionLabel}: duplicate id`);
        optionIds.add(option?.id);
        for (const field of ["label", "description", "tradeoff"]) {
          if (!nonEmptyString(option?.[field])) errors.push(`${optionLabel}: ${field} is required`);
        }
      }
      if (!nonEmptyString(item.recommended_option_id) || !optionIds.has(item.recommended_option_id)) {
        errors.push(`${label}: recommended_option_id must reference one option`);
      }
      if (!nonEmptyString(item.recommendation)) errors.push(`${label}: recommendation is required`);
      if (!nonEmptyString(item.recommendation_reason)) errors.push(`${label}: recommendation_reason is required`);
    }
    if (!Array.isArray(item.blocking_scope)) errors.push(`${label}: blocking_scope must be an array`);
    if (!itemStatuses.includes(item.status)) errors.push(`${label}: invalid status ${item.status}`);

    if (["confirmed", "deferred"].includes(item.status)) {
      if (!nonEmptyString(item.user_answer)) errors.push(`${label}: ${item.status} requires user_answer`);
      if (!nonEmptyString(item.confirmation_summary)) errors.push(`${label}: ${item.status} requires confirmation_summary`);
      if (!nonEmptyString(item.explicit_confirmation)) errors.push(`${label}: ${item.status} requires explicit_confirmation`);
      if (!nonEmptyString(item.confirmed_at)) errors.push(`${label}: ${item.status} requires confirmed_at`);
    }
  }

  const inDiscussion = (agenda.items || []).filter((item) => item.status === "in_discussion");
  if (inDiscussion.length > 1) errors.push("only one item may be in_discussion");

  if (agenda.presented_revision < agenda.revision) {
    if (inDiscussion.length) errors.push("no item may be in_discussion before the current revision is presented");
    if (agenda.current_item_id !== null) errors.push("current_item_id must be null before the current revision is presented");
  }

  if (agenda.status === "active") {
    if (agenda.presented_revision !== agenda.revision) errors.push("active agenda must have its current revision presented");
    if (inDiscussion.length !== 1) errors.push("active agenda must have exactly one item in_discussion");
    if (agenda.current_item_id !== inDiscussion[0]?.id) errors.push("current_item_id must match the item in_discussion");
  }

  if (["alignment", "draft", "completed", "cancelled"].includes(agenda.status)) {
    if (inDiscussion.length) errors.push(`${agenda.status} agenda cannot have an item in_discussion`);
    if (agenda.current_item_id !== null) errors.push(`${agenda.status} agenda must have current_item_id null`);
  }

  if (agenda.status === "paused") {
    if (inDiscussion.length === 0 && agenda.current_item_id !== null) errors.push("paused agenda without an active item must have current_item_id null");
    if (inDiscussion.length === 1 && agenda.current_item_id !== inDiscussion[0].id) errors.push("paused agenda current_item_id must match in_discussion item");
  }

  if (agenda.status === "completed" && !(agenda.items || []).every((item) => closedStatuses.includes(item.status))) {
    errors.push("completed agenda requires every item to be confirmed, deferred, or removed");
  }

  if (inDiscussion.length === 1) {
    const current = inDiscussion[0];
    const earlier = (agenda.items || []).filter((item) => item.order < current.order);
    if (earlier.some((item) => !closedStatuses.includes(item.status))) {
      errors.push("all earlier items must close before a later item enters discussion");
    }
  }

  return errors;
}

const agenda = readJson(statePath);
const errors = validate(agenda);

if (previousPath) {
  const previous = readJson(previousPath);
  errors.push(...validate(previous).map((error) => `previous agenda: ${error}`));
  if (agenda.discussion_id !== previous.discussion_id) errors.push("discussion_id cannot change across revisions");
  if (agenda.revision < previous.revision) errors.push("revision cannot decrease");

  const beforeById = new Map((previous.items || []).map((item) => [item.id, item]));
  const added = (agenda.items || []).filter((item) => !beforeById.has(item.id));
  if (added.length && agenda.revision === previous.revision) errors.push("adding agenda items requires a revision increment");

  for (const item of agenda.items || []) {
    const before = beforeById.get(item.id);
    if (!before) continue;
    if (closedStatuses.includes(before.status) && JSON.stringify(item) !== JSON.stringify(before)) {
      errors.push(`item ${item.id}: a closed decision is immutable; add a superseding item instead`);
    }
  }
}

process.stdout.write(`${JSON.stringify({ valid: errors.length === 0, file: statePath, errors }, null, 2)}\n`);
if (errors.length) process.exit(1);
