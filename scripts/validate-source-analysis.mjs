#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PROJECT_PATH_CONTRACT } from "./project-path-contract.mjs";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const rootArgument = rootIndex >= 0 ? args[rootIndex + 1] : args[0];

if (!rootArgument) {
  process.stderr.write("Usage: validate-source-analysis.mjs --root <故事项目/源作解析>\n");
  process.exit(1);
}

const root = path.resolve(rootArgument);
const errors = [];
const statuses = [
  "uninitialized",
  "received",
  "indexed",
  "reconnaissance_complete",
  "extraction_spec_approved",
  "extracting",
  "synthesized",
  "audited",
  "transfer_gate",
  "completed"
];
const coverageStatuses = ["present", "absent", "uncertain", "not_applicable"];
const evidenceLevels = ["explicit", "strong_inference", "tentative"];
const auditStatuses = ["pending", "clear", "needs_repair", "blocked"];
const defaultCoverageCategories = [
  "reader_promise_and_serial_rewards",
  "protagonist_engine",
  "supporting_character_agency",
  "relationship_networks",
  "romance_intimacy_and_multi_partner_dynamics",
  "organization_power_and_resource_flows",
  "event_causality",
  "suspense_plant_and_payoff",
  "world_rules_and_terminology",
  "themes_voice_and_tone"
];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validTimestamp(value) {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/iu.test(value);
}

function atLeast(status, threshold) {
  return statuses.indexOf(status) >= statuses.indexOf(threshold);
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return left.length === right.length && new Set(left).size === left.length
    && left.every((value) => right.includes(value));
}

function uniqueStringArray(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) errors.push(`${label} must not be empty`);
  if (value.some((entry) => !nonEmptyString(entry))) errors.push(`${label} must contain only non-empty strings`);
  if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
  return value;
}

function readJson(file, label) {
  if (!fs.existsSync(file)) {
    errors.push(`${label} is missing: ${file}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${label} cannot be parsed: ${error.message}`);
    return null;
  }
}

function runtimePath(entry) {
  return path.join(root, entry.runtime);
}

function containsDecisionKey(value, currentPath = "") {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findings.push(...containsDecisionKey(entry, `${currentPath}[${index}]`)));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  for (const [key, entry] of Object.entries(value)) {
    const keyPath = currentPath ? `${currentPath}.${key}` : key;
    if (["decision", "transfer_decision", "keep", "distill", "discard"].includes(key)
      || key.startsWith("target_")) {
      findings.push(keyPath);
    }
    findings.push(...containsDecisionKey(entry, keyPath));
  }
  return findings;
}

const files = PROJECT_PATH_CONTRACT.sourceAnalysisFiles;
const manifest = readJson(runtimePath(files.manifest), "source manifest");
const structureIndex = readJson(runtimePath(files.structureIndex), "source structure index");
const state = readJson(runtimePath(files.state), "source analysis state");
const reconnaissance = readJson(runtimePath(files.reconnaissance), "source reconnaissance");
const extractionSpec = readJson(runtimePath(files.extractionSpec), "source extraction specification");
const synthesis = readJson(runtimePath(files.synthesis), "source synthesis");
const audit = readJson(runtimePath(files.audit), "source audit");

const status = state?.status;
if (!statuses.includes(status)) errors.push(`invalid source analysis status: ${status}`);

if (manifest && Object.hasOwn(manifest, "authorization_ref")) {
  errors.push("source manifest must not contain an authorization confirmation field");
}
if (state?.pending_gate === "source_authorization") {
  errors.push("source analysis must not create a source authorization gate");
}
if (manifest?.access_basis !== "user_supplied_full_project_use") {
  errors.push("source manifest access_basis must be user_supplied_full_project_use");
}

if (status && atLeast(status, "received")) {
  if (!nonEmptyString(manifest?.source_id)) errors.push("received source requires manifest source_id");
  if (!nonEmptyString(manifest?.title)) errors.push("received source requires manifest title");
  if (!nonEmptyString(manifest?.source_path)) errors.push("received source requires manifest source_path");
  if (!nonEmptyString(manifest?.encoding)) errors.push("received source requires manifest encoding");
  if (!Number.isInteger(manifest?.size_bytes) || manifest.size_bytes < 0) {
    errors.push("received source requires a non-negative integer size_bytes");
  }
  if (!isSha256(manifest?.sha256)) errors.push("received source requires a SHA-256 fingerprint");
  if (manifest?.status !== "registered") errors.push("received source requires manifest status registered");
  if (state?.source_id !== manifest?.source_id) errors.push("state source_id must match manifest");
  if (state?.source_sha256 !== manifest?.sha256) errors.push("state source_sha256 must match manifest");
}

const expectedBatchIds = uniqueStringArray(state?.expected_batch_ids, "state expected_batch_ids");
const completedBatchIds = uniqueStringArray(state?.completed_batch_ids, "state completed_batch_ids");
if (completedBatchIds.some((batchId) => !expectedBatchIds.includes(batchId))) {
  errors.push("state completed_batch_ids must be a subset of expected_batch_ids");
}

if (status && atLeast(status, "indexed")) {
  if (structureIndex?.source_id !== manifest?.source_id) errors.push("structure index source_id must match manifest");
  if (structureIndex?.source_sha256 !== manifest?.sha256) errors.push("structure index source_sha256 must match manifest");
  if (!nonEmptyString(structureIndex?.unit_type)) errors.push("indexed source requires unit_type");
  const units = Array.isArray(structureIndex?.units) ? structureIndex.units : [];
  if (units.length === 0) errors.push("indexed source requires at least one structural unit");
  const unitIds = units.map((unit) => unit?.unit_id);
  if (unitIds.some((unitId) => !nonEmptyString(unitId)) || new Set(unitIds).size !== unitIds.length) {
    errors.push("structure index units require unique non-empty unit_id values");
  }
  const indexedBatchIds = uniqueStringArray(
    structureIndex?.expected_batch_ids,
    "structure index expected_batch_ids",
    { allowEmpty: false }
  );
  if (!sameStringSet(indexedBatchIds, expectedBatchIds)) {
    errors.push("state and structure index expected_batch_ids must match");
  }
  if (structureIndex?.coverage_complete !== true) errors.push("indexed source requires coverage_complete true");
}

if (status && atLeast(status, "reconnaissance_complete")) {
  if (reconnaissance?.source_id !== manifest?.source_id) errors.push("reconnaissance source_id must match manifest");
  if (reconnaissance?.source_sha256 !== manifest?.sha256) errors.push("reconnaissance source_sha256 must match manifest");
  if (!Array.isArray(reconnaissance?.structural_coverage) || reconnaissance.structural_coverage.length === 0) {
    errors.push("reconnaissance_complete requires structural_coverage");
  }
  if (!Array.isArray(reconnaissance?.candidate_categories) || reconnaissance.candidate_categories.length === 0) {
    errors.push("reconnaissance_complete requires candidate_categories");
  }
  if (Array.isArray(reconnaissance?.transfer_decisions) && reconnaissance.transfer_decisions.length > 0) {
    errors.push("reconnaissance must not contain transfer decisions");
  }
}

const coverageCategories = uniqueStringArray(
  extractionSpec?.coverage_categories,
  "extraction specification coverage_categories",
  { allowEmpty: status ? !atLeast(status, "extraction_spec_approved") : true }
);
const riskCategories = uniqueStringArray(extractionSpec?.risk_categories, "extraction specification risk_categories");
if (coverageCategories.some((category) => riskCategories.includes(category))) {
  errors.push("coverage and risk categories must use separate namespaces");
}

if (status && atLeast(status, "extraction_spec_approved")) {
  if (extractionSpec?.source_id !== manifest?.source_id) errors.push("extraction specification source_id must match manifest");
  if (!Number.isInteger(extractionSpec?.revision) || extractionSpec.revision < 1) {
    errors.push("approved extraction specification requires a positive revision");
  }
  if (state?.taxonomy_revision !== extractionSpec?.revision) {
    errors.push("state taxonomy_revision must match extraction specification revision");
  }
  if (extractionSpec?.status !== "approved") errors.push("extraction_spec_approved requires specification status approved");
  if (!nonEmptyString(extractionSpec?.granularity)) errors.push("approved extraction specification requires granularity");
  if (!extractionSpec?.user_confirmation || typeof extractionSpec.user_confirmation !== "object") {
    errors.push("approved extraction specification requires user_confirmation evidence");
  } else if (!nonEmptyString(extractionSpec.user_confirmation.user_message_ref)) {
    errors.push("extraction specification user_confirmation requires user_message_ref");
  }

  const exclusions = Array.isArray(extractionSpec?.explicit_exclusions) ? extractionSpec.explicit_exclusions : [];
  for (const category of defaultCoverageCategories) {
    if (coverageCategories.includes(category)) continue;
    const exclusion = exclusions.find((entry) => entry?.category === category);
    if (!exclusion || !nonEmptyString(exclusion.user_message_ref)) {
      errors.push(`default coverage category ${category} requires an explicit user-confirmed exclusion`);
    }
  }
}

const batchesRoot = path.join(root, PROJECT_PATH_CONTRACT.directories.sourceBatches);
const batchReports = [];
if (fs.existsSync(batchesRoot)) {
  for (const directoryEntry of fs.readdirSync(batchesRoot, { withFileTypes: true })) {
    if (!directoryEntry.isDirectory() || !directoryEntry.name.startsWith("批次-")) continue;
    const reportPath = path.join(batchesRoot, directoryEntry.name, PROJECT_PATH_CONTRACT.sourceBatch.runtime);
    const report = readJson(reportPath, `batch ${directoryEntry.name}`);
    if (report) batchReports.push({ report, reportPath, folderBatchId: directoryEntry.name.slice("批次-".length) });
  }
}

const allObservationIds = new Set();
const reportByBatchId = new Map();
for (const { report, reportPath, folderBatchId } of batchReports) {
  const label = path.relative(root, reportPath);
  if (status && !atLeast(status, "extraction_spec_approved") && !nonEmptyString(report.batch_id)) {
    continue;
  }
  if (!nonEmptyString(report.batch_id)) errors.push(`${label}: batch_id is required`);
  if (report.batch_id !== folderBatchId) errors.push(`${label}: batch_id must match its directory`);
  if (reportByBatchId.has(report.batch_id)) errors.push(`${label}: duplicate batch_id`);
  reportByBatchId.set(report.batch_id, report);
  if (!expectedBatchIds.includes(report.batch_id)) errors.push(`${label}: batch_id is not expected by state`);
  if (report.source_id !== manifest?.source_id) errors.push(`${label}: source_id must match manifest`);
  if (report.source_sha256 !== manifest?.sha256) errors.push(`${label}: source_sha256 must match manifest`);
  if (report.taxonomy_revision !== extractionSpec?.revision) {
    errors.push(`${label}: taxonomy_revision must match extraction specification`);
  }
  uniqueStringArray(report.assigned_unit_ids, `${label}: assigned_unit_ids`, { allowEmpty: false });

  const coverageMatrix = Array.isArray(report.coverage_matrix) ? report.coverage_matrix : [];
  const matrixCategories = coverageMatrix.map((entry) => entry?.category);
  if (!sameStringSet(matrixCategories, coverageCategories)) {
    errors.push(`${label}: coverage_matrix must contain every approved category exactly once`);
  }

  const localObservationIds = new Set();
  const observations = Array.isArray(report.observations) ? report.observations : [];
  for (const observation of observations) {
    const observationLabel = `${label}: observation ${observation?.observation_id || "<missing>"}`;
    if (!nonEmptyString(observation?.observation_id)) errors.push(`${observationLabel}: observation_id is required`);
    if (localObservationIds.has(observation?.observation_id) || allObservationIds.has(observation?.observation_id)) {
      errors.push(`${observationLabel}: observation_id must be globally unique`);
    }
    localObservationIds.add(observation?.observation_id);
    allObservationIds.add(observation?.observation_id);
    if (!coverageCategories.includes(observation?.category)) errors.push(`${observationLabel}: category is not approved`);
    if (!nonEmptyString(observation?.observation)) errors.push(`${observationLabel}: neutral observation is required`);
    if (!nonEmptyString(observation?.narrative_function)) errors.push(`${observationLabel}: narrative_function is required`);
    if (!evidenceLevels.includes(observation?.evidence_level)) errors.push(`${observationLabel}: invalid evidence_level`);
    if (!observation?.source_ref || typeof observation.source_ref !== "object"
      || !nonEmptyString(observation.source_ref.locator)) {
      errors.push(`${observationLabel}: source_ref.locator is required`);
    }
    for (const keyPath of containsDecisionKey(observation)) {
      errors.push(`${observationLabel}: transfer or target decision key is forbidden at ${keyPath}`);
    }
  }

  for (const matrixEntry of coverageMatrix) {
    const matrixLabel = `${label}: coverage ${matrixEntry?.category || "<missing>"}`;
    if (!coverageStatuses.includes(matrixEntry?.status)) errors.push(`${matrixLabel}: invalid status`);
    const observationIds = uniqueStringArray(matrixEntry?.observation_ids, `${matrixLabel}: observation_ids`);
    if (observationIds.some((observationId) => !localObservationIds.has(observationId))) {
      errors.push(`${matrixLabel}: observation_ids must reference observations in the same batch`);
    }
    if (matrixEntry?.status === "present" && observationIds.length === 0) {
      errors.push(`${matrixLabel}: present requires at least one observation`);
    }
    if (["absent", "not_applicable"].includes(matrixEntry?.status) && observationIds.length > 0) {
      errors.push(`${matrixLabel}: ${matrixEntry.status} must not reference observations`);
    }
    if (matrixEntry?.status === "absent" && report.read_complete !== true) {
      errors.push(`${matrixLabel}: absent requires read_complete true`);
    }
    if (["uncertain", "not_applicable"].includes(matrixEntry?.status) && !nonEmptyString(matrixEntry?.notes)) {
      errors.push(`${matrixLabel}: ${matrixEntry.status} requires notes`);
    }
  }

  const riskAssessments = Array.isArray(report.risk_assessments) ? report.risk_assessments : [];
  for (const risk of riskAssessments) {
    const riskLabel = `${label}: risk ${risk?.risk_id || "<missing>"}`;
    if (!nonEmptyString(risk?.risk_id)) errors.push(`${riskLabel}: risk_id is required`);
    if (!riskCategories.includes(risk?.category)) errors.push(`${riskLabel}: category is not approved`);
    const observationIds = uniqueStringArray(risk?.observation_ids, `${riskLabel}: observation_ids`, { allowEmpty: false });
    if (observationIds.some((observationId) => !localObservationIds.has(observationId))) {
      errors.push(`${riskLabel}: observation_ids must reference observations in the same batch`);
    }
    for (const keyPath of containsDecisionKey(risk)) {
      errors.push(`${riskLabel}: transfer or target decision key is forbidden at ${keyPath}`);
    }
  }
}

for (const batchId of completedBatchIds) {
  if (reportByBatchId.get(batchId)?.read_complete !== true) {
    errors.push(`completed batch ${batchId} requires a read_complete batch report`);
  }
}
if (status && atLeast(status, "extracting") && completedBatchIds.length === 0) {
  errors.push("extracting requires at least one completed batch");
}

if (status && atLeast(status, "synthesized")) {
  if (!sameStringSet(completedBatchIds, expectedBatchIds)) {
    errors.push("synthesis requires every expected batch to be complete");
  }
  if (synthesis?.source_id !== manifest?.source_id) errors.push("synthesis source_id must match manifest");
  if (synthesis?.source_sha256 !== manifest?.sha256) errors.push("synthesis source_sha256 must match manifest");
  if (synthesis?.taxonomy_revision !== extractionSpec?.revision) {
    errors.push("synthesis taxonomy_revision must match extraction specification");
  }
  if (!sameStringSet(synthesis?.included_batch_ids, expectedBatchIds)) {
    errors.push("synthesis included_batch_ids must match every expected batch");
  }
  const synthesisCoverage = Array.isArray(synthesis?.category_coverage)
    ? synthesis.category_coverage.map((entry) => entry?.category)
    : [];
  if (!sameStringSet(synthesisCoverage, coverageCategories)) {
    errors.push("synthesis category_coverage must contain every approved category exactly once");
  }
  for (const pattern of synthesis?.observed_patterns || []) {
    const references = uniqueStringArray(pattern?.observation_ids, "synthesis pattern observation_ids", { allowEmpty: false });
    if (references.some((observationId) => !allObservationIds.has(observationId))) {
      errors.push("synthesis pattern references an unknown observation");
    }
  }
  if (Array.isArray(synthesis?.transfer_decisions) && synthesis.transfer_decisions.length > 0) {
    errors.push("source synthesis must not contain transfer decisions");
  }
}

if (audit && !auditStatuses.includes(audit.status)) errors.push(`invalid source audit status: ${audit?.status}`);
if (status && atLeast(status, "audited")) {
  if (audit?.source_id !== manifest?.source_id) errors.push("audit source_id must match manifest");
  if (audit?.source_sha256 !== manifest?.sha256) errors.push("audit source_sha256 must match manifest");
  if (audit?.taxonomy_revision !== extractionSpec?.revision) errors.push("audit taxonomy_revision must match extraction specification");
  if (audit?.status !== "clear") errors.push("audited and later states require a clear audit");
  if (!Array.isArray(audit?.blocking_repairs) || audit.blocking_repairs.length > 0) {
    errors.push("clear audit requires no blocking repairs");
  }
  if (!Array.isArray(audit?.silent_omission_findings) || audit.silent_omission_findings.length > 0) {
    errors.push("clear audit requires no silent omission findings");
  }
  if (!Array.isArray(audit?.risk_decision_separation_findings)
    || audit.risk_decision_separation_findings.length > 0) {
    errors.push("clear audit requires no risk-decision separation findings");
  }
  if (!validTimestamp(audit?.audited_at)) errors.push("clear audit requires audited_at");
}
if (status === "transfer_gate" && state?.pending_gate !== "source_transfer_decisions") {
  errors.push("transfer_gate requires pending_gate source_transfer_decisions");
}
if (status === "completed" && state?.pending_gate !== null) {
  errors.push("completed source analysis must not retain a pending gate");
}

process.stdout.write(`${JSON.stringify({
  valid: errors.length === 0,
  root,
  status,
  batches: batchReports.length,
  observations: allObservationIds.size,
  errors
}, null, 2)}\n`);
if (errors.length) process.exit(1);
