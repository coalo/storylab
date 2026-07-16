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

const agendaStatuses = ["draft", "active", "paused", "completed", "cancelled"];
const itemStatuses = ["pending", "in_discussion", "confirmed", "deferred", "removed"];
const closedStatuses = ["confirmed", "deferred", "removed"];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validate(agenda) {
  const errors = [];

  if (agenda.schema_version !== "2.0") errors.push("schema_version must be 2.0");
  if (!nonEmptyString(agenda.discussion_id)) errors.push("discussion_id is required");
  if (!nonEmptyString(agenda.title)) errors.push("title is required");
  if (!agendaStatuses.includes(agenda.status)) errors.push(`invalid agenda status: ${agenda.status}`);
  if (!Number.isInteger(agenda.revision) || agenda.revision < 1) errors.push("revision must be a positive integer");
  if (!Number.isInteger(agenda.presented_revision) || agenda.presented_revision < 0 || agenda.presented_revision > agenda.revision) {
    errors.push("presented_revision must be an integer between 0 and revision");
  }
  if (!Array.isArray(agenda.items) || agenda.items.length === 0) errors.push("items must be a non-empty array");

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

  if (["draft", "completed", "cancelled"].includes(agenda.status)) {
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
