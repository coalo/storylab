#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHORITY_ENTRIES,
  PROJECT_PATH_CONTRACT,
  SOURCE_ANALYSIS_ENTRIES,
  chapterDirectory,
  consultationFileName,
  sourceAnalysisRoot,
  sourceBatchDirectory,
  storyRoot
} from "./project-path-contract.mjs";

const args = process.argv.slice(2);
const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatesRoot = path.join(scriptRoot, "assets", "templates");

function value(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function safeIdentifier(valueToCheck, label) {
  if (!valueToCheck || valueToCheck === "." || valueToCheck === ".." || /[\\/\0]/u.test(valueToCheck)) {
    fail(`${label} must be a non-empty single path segment`);
  }
  return valueToCheck;
}

const projectRoot = path.resolve(value("--project-root") || process.cwd());
const withDiscussion = args.includes("--with-discussion");
const sourceBatchId = value("--source-batch");
const withSourceAnalysis = args.includes("--with-source-analysis") || Boolean(sourceBatchId);
const chapterId = value("--chapter");
const chapterStage = value("--chapter-stage");
const consultationId = value("--consultation");

if (chapterStage && !chapterId) fail("--chapter-stage requires --chapter <chapter-id>");
if (chapterId && !chapterStage) fail("--chapter requires --chapter-stage <stage>");
if (chapterId) safeIdentifier(chapterId, "chapter id");
if (sourceBatchId) safeIdentifier(sourceBatchId, "source batch id");
if (consultationId) {
  safeIdentifier(consultationId, "consultation id");
  if (/[A-Za-z]/u.test(consultationId)) fail("consultation id must use Chinese characters or digits, not Latin letters");
}

const stageEntries = {
  commission: PROJECT_PATH_CONTRACT.chapterFiles.commission,
  "writer-view": PROJECT_PATH_CONTRACT.chapterFiles.writerView,
  "first-read": PROJECT_PATH_CONTRACT.chapterFiles.firstRead,
  "editorial-letter": PROJECT_PATH_CONTRACT.chapterFiles.editorialLetter,
  "continuity-report": PROJECT_PATH_CONTRACT.chapterFiles.continuityReport,
  "acceptance-record": PROJECT_PATH_CONTRACT.chapterFiles.acceptanceRecord
};

if (chapterStage && !Object.hasOwn(stageEntries, chapterStage)) {
  fail(`Unknown chapter stage: ${chapterStage}. Expected one of: ${Object.keys(stageEntries).join(", ")}`);
}

const targetRoot = storyRoot(projectRoot);
const migrationRecords = path.join(targetRoot, PROJECT_PATH_CONTRACT.directories.migrationRecords);
const legacyRoots = ["story", "chapters", "consultations"]
  .map((name) => path.join(projectRoot, name))
  .filter((candidate) => fs.existsSync(candidate));
const hasMigrationRecord = fs.existsSync(migrationRecords)
  && fs.readdirSync(migrationRecords).some((name) => /^迁移清单-.+\.json$/u.test(name));

if (legacyRoots.length && !hasMigrationRecord) {
  fail(`Legacy Storylab layout detected. Preview and apply migrate-story-project.mjs before initialization: ${legacyRoots.join(", ")}`);
}

const created = [];
const skipped = [];

function ensureDirectory(directory) {
  if (fs.existsSync(directory)) {
    if (!fs.statSync(directory).isDirectory()) fail(`Path exists but is not a directory: ${directory}`);
    return;
  }
  fs.mkdirSync(directory, { recursive: true });
  created.push(path.relative(projectRoot, directory));
}

function copyMissing(entry, destinationDirectory) {
  const source = path.join(templatesRoot, entry.template);
  const destination = path.join(destinationDirectory, entry.runtime);
  if (!fs.existsSync(source)) fail(`Template is missing: ${source}`);
  if (fs.existsSync(destination)) {
    if (!fs.statSync(destination).isFile()) fail(`Target exists but is not a file: ${destination}`);
    skipped.push(path.relative(projectRoot, destination));
    return;
  }
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  created.push(path.relative(projectRoot, destination));
}

ensureDirectory(projectRoot);
ensureDirectory(targetRoot);
ensureDirectory(path.join(targetRoot, PROJECT_PATH_CONTRACT.directories.chapters));
ensureDirectory(path.join(targetRoot, PROJECT_PATH_CONTRACT.directories.consultations));

for (const entry of AUTHORITY_ENTRIES) copyMissing(entry, targetRoot);

if (withDiscussion) {
  for (const entry of Object.values(PROJECT_PATH_CONTRACT.discussionFiles)) copyMissing(entry, targetRoot);
}

if (withSourceAnalysis) {
  const directory = sourceAnalysisRoot(projectRoot);
  ensureDirectory(directory);
  ensureDirectory(path.join(directory, PROJECT_PATH_CONTRACT.directories.sourceBatches));
  for (const entry of SOURCE_ANALYSIS_ENTRIES) copyMissing(entry, directory);
}

if (sourceBatchId) {
  const directory = sourceBatchDirectory(projectRoot, sourceBatchId);
  ensureDirectory(directory);
  copyMissing(PROJECT_PATH_CONTRACT.sourceBatch, directory);
}

if (chapterId) {
  const directory = chapterDirectory(projectRoot, chapterId);
  ensureDirectory(directory);
  copyMissing(stageEntries[chapterStage], directory);
}

if (consultationId) {
  const directory = path.join(targetRoot, PROJECT_PATH_CONTRACT.directories.consultations);
  const entry = {
    template: PROJECT_PATH_CONTRACT.consultation.template,
    runtime: consultationFileName(consultationId)
  };
  copyMissing(entry, directory);
}

process.stdout.write(`${JSON.stringify({
  valid: true,
  project_root: projectRoot,
  story_root: targetRoot,
  created,
  skipped,
  overwritten: []
}, null, 2)}\n`);
