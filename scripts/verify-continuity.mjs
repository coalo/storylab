#!/usr/bin/env node

import fs from "node:fs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const statePath = value("--state");
const reportPath = value("--report");

if (!statePath || !reportPath) {
  process.stderr.write("Usage: verify-continuity.mjs --state <连续性状态.json> --report <连续性报告.json>\n");
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

const state = readJson(statePath);
const report = readJson(reportPath);
const domains = [
  "time", "location", "money", "inventory", "injury", "knowledge",
  "permission", "contract", "power", "relationship_action", "world_rule"
];
const errors = [];

if (state.schema_version !== "2.0") errors.push("continuity state schema_version must be 2.0");
if (report.schema_version !== "2.0") errors.push("continuity report schema_version must be 2.0");
if (!state.domains || typeof state.domains !== "object") errors.push("continuity state requires domains");
for (const domain of domains) {
  if (!state.domains?.[domain] || typeof state.domains[domain] !== "object" || Array.isArray(state.domains[domain])) {
    errors.push(`continuity state requires object domain: ${domain}`);
  }
}
if (!report.chapter_id) errors.push("report chapter_id is required");
if (!Number.isInteger(report.draft_revision) || report.draft_revision < 0) errors.push("report draft_revision must be a non-negative integer");
if (!Array.isArray(report.checks)) errors.push("report checks must be an array");
if (!Array.isArray(report.proposed_updates)) errors.push("report proposed_updates must be an array");

for (const [index, check] of (report.checks || []).entries()) {
  const label = `check ${index}`;
  if (!domains.includes(check.domain)) errors.push(`${label}: invalid domain ${check.domain}`);
  if (!check.fact_key) errors.push(`${label}: fact_key is required`);
  if (!["clear", "conflict", "unknown"].includes(check.status)) errors.push(`${label}: invalid status ${check.status}`);
  if (!check.evidence) errors.push(`${label}: evidence is required`);
  const stateEntry = state.domains?.[check.domain]?.[check.fact_key];
  if (stateEntry && Object.hasOwn(check, "expected")) {
    const stateValue = Object.hasOwn(stateEntry, "value") ? stateEntry.value : stateEntry;
    if (JSON.stringify(stateValue) !== JSON.stringify(check.expected)) {
      errors.push(`${label}: expected value does not match continuity state`);
    }
  }
}

const checkStatuses = (report.checks || []).map((check) => check.status);
const computedOverall = checkStatuses.includes("conflict")
  ? "conflict"
  : checkStatuses.length === 0 || checkStatuses.includes("unknown")
    ? "insufficient"
    : "clear";

if (report.overall !== computedOverall) errors.push(`overall must be ${computedOverall}, got ${report.overall}`);
if (computedOverall !== "clear" && (report.proposed_updates || []).length) {
  errors.push("proposed_updates must be empty until the report is clear");
}

for (const [index, update] of (report.proposed_updates || []).entries()) {
  const label = `proposed update ${index}`;
  if (!domains.includes(update.domain)) errors.push(`${label}: invalid domain ${update.domain}`);
  if (!update.fact_key) errors.push(`${label}: fact_key is required`);
  if (!Object.hasOwn(update, "value")) errors.push(`${label}: value is required`);
  if (!update.source) errors.push(`${label}: source evidence is required`);
}

process.stdout.write(`${JSON.stringify({
  valid: errors.length === 0,
  state: statePath,
  report: reportPath,
  computed_overall: computedOverall,
  errors
}, null, 2)}\n`);
if (errors.length) process.exit(1);
