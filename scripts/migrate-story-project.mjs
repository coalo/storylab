#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  LEGACY_FILE_NAME_MAP,
  PROJECT_PATH_CONTRACT,
  chapterFolderName,
  draftFileName,
  migrationRecordFileName,
  rollbackRecordFileName,
  storyRoot
} from "./project-path-contract.mjs";

const args = process.argv.slice(2);

function value(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(message, details = undefined) {
  process.stderr.write(`${JSON.stringify({ valid: false, error: message, details }, null, 2)}\n`);
  process.exit(1);
}

function relativePosix(root, candidate) {
  return path.relative(root, candidate).split(path.sep).join("/");
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeMigrationId(raw) {
  const candidate = raw || new Date().toISOString().replace(/\D/gu, "");
  if (!candidate || candidate === "." || candidate === ".." || /[\\/\0]/u.test(candidate)) {
    fail("migration id must be a non-empty single path segment");
  }
  if (/[A-Za-z]/u.test(candidate)) fail("migration id must use Chinese characters or digits, not Latin letters");
  return candidate;
}

function numericFingerprint(valueToHash) {
  return crypto.createHash("sha256").update(valueToHash).digest().readUInt32BE(0).toString(10);
}

function hasLatinStem(name) {
  const parsed = path.parse(name);
  return /[A-Za-z]/u.test(parsed.ext ? parsed.name : name);
}

function translatedUnknownFileName(name, prefix = "旧文件") {
  const extension = path.extname(name);
  return `${prefix}-${numericFingerprint(name)}${extension}`;
}

function translatedUnknownDirectoryName(name) {
  return hasLatinStem(name) ? `旧目录-${numericFingerprint(name)}` : name;
}

function walkFiles(directory, unsupported) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  const rootStat = fs.lstatSync(directory);
  if (rootStat.isSymbolicLink()) {
    unsupported.push(directory);
    return files;
  }
  if (!rootStat.isDirectory()) {
    unsupported.push(directory);
    return files;
  }
  const queue = [directory];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))) {
      const candidate = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        unsupported.push(candidate);
      } else if (entry.isDirectory()) {
        queue.push(candidate);
      } else if (entry.isFile()) {
        files.push(candidate);
      } else {
        unsupported.push(candidate);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function translatedDraftName(name) {
  const patterns = [
    /^(?:chapter-)?draft[-_](?:r|v)?(\d+)\.md$/iu,
    /^prose[-_](?:r|v)?(\d+)\.md$/iu,
    /^draft\.md$/iu
  ];
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) return draftFileName(match[1] || 0);
  }
  return undefined;
}

function translateFileName(name, isConsultation) {
  if (Object.hasOwn(LEGACY_FILE_NAME_MAP, name)) return LEGACY_FILE_NAME_MAP[name];
  const draft = translatedDraftName(name);
  if (draft) return draft;
  if (isConsultation && (!/^咨询-/u.test(name) || hasLatinStem(name))) {
    return translatedUnknownFileName(name, "咨询-旧记录");
  }
  if (hasLatinStem(name)) return translatedUnknownFileName(name);
  return name;
}

function translateRelative(sourceKind, sourceRelative) {
  const parts = sourceRelative.split(path.sep);
  const destinationParts = [];
  let isConsultation = sourceKind === "consultations";
  let nextDirectoryIsChapterId = sourceKind === "chapters";

  if (sourceKind === "chapters") destinationParts.push(PROJECT_PATH_CONTRACT.directories.chapters);
  if (sourceKind === "consultations") destinationParts.push(PROJECT_PATH_CONTRACT.directories.consultations);

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isLast = index === parts.length - 1;
    if (!isLast && part === "chapters") {
      destinationParts.push(PROJECT_PATH_CONTRACT.directories.chapters);
      nextDirectoryIsChapterId = true;
    } else if (!isLast && part === "consultations") {
      destinationParts.push(PROJECT_PATH_CONTRACT.directories.consultations);
      isConsultation = true;
    } else if (isLast) {
      destinationParts.push(translateFileName(part, isConsultation));
    } else if (nextDirectoryIsChapterId) {
      destinationParts.push(chapterFolderName(part));
      nextDirectoryIsChapterId = false;
    } else {
      destinationParts.push(translatedUnknownDirectoryName(part));
    }
  }

  return destinationParts;
}

function buildReplacements(projectRoot, operations) {
  const replacements = new Map();
  for (const operation of operations) {
    const sourceRelative = relativePosix(projectRoot, operation.source);
    const targetRelative = relativePosix(projectRoot, operation.target);
    replacements.set(sourceRelative, targetRelative);
    replacements.set(operation.source.split(path.sep).join("/"), operation.target.split(path.sep).join("/"));
    const sourceName = path.basename(operation.source);
    const targetName = path.basename(operation.target);
    if (sourceName !== targetName) replacements.set(sourceName, targetName);
  }
  return [...replacements.entries()].sort((a, b) => b[0].length - a[0].length);
}

function rewriteJsonStrings(valueToRewrite, replacements, stats) {
  if (typeof valueToRewrite === "string") {
    let next = valueToRewrite.split(path.sep).join("/");
    for (const [from, to] of replacements) {
      if (next === from) {
        next = to;
        break;
      }
      if (from.includes("/") && next.includes(from)) next = next.split(from).join(to);
    }
    if (next !== valueToRewrite) stats.count += 1;
    return next;
  }
  if (Array.isArray(valueToRewrite)) return valueToRewrite.map((entry) => rewriteJsonStrings(entry, replacements, stats));
  if (valueToRewrite && typeof valueToRewrite === "object") {
    return Object.fromEntries(Object.entries(valueToRewrite).map(([key, nested]) => [key, rewriteJsonStrings(nested, replacements, stats)]));
  }
  return valueToRewrite;
}

function transformedContent(operation, replacements) {
  const original = fs.readFileSync(operation.source);
  if (path.extname(operation.source).toLowerCase() !== ".json") {
    return { buffer: original, jsonPathUpdates: 0 };
  }
  let parsed;
  try {
    parsed = JSON.parse(original.toString("utf8"));
  } catch {
    return { buffer: original, jsonPathUpdates: 0 };
  }
  const stats = { count: 0 };
  const rewritten = rewriteJsonStrings(parsed, replacements, stats);
  if (!stats.count) return { buffer: original, jsonPathUpdates: 0 };
  return { buffer: Buffer.from(`${JSON.stringify(rewritten, null, 2)}\n`, "utf8"), jsonPathUpdates: stats.count };
}

function rollback(manifestPath, apply) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`Cannot read migration manifest: ${error.message}`);
  }
  if (manifest.schema_version !== "1.0" || manifest.mode !== "copy-with-source-preservation" || !Array.isArray(manifest.operations)) {
    fail("Unsupported migration manifest", manifestPath);
  }
  const projectRoot = path.resolve(manifest.project_root);
  const checks = manifest.operations.map((operation) => {
    const target = path.resolve(projectRoot, operation.target);
    if (!fs.existsSync(target)) return { target: operation.target, status: "already_absent" };
    const actualHash = hashBuffer(fs.readFileSync(target));
    return {
      target: operation.target,
      status: actualHash === operation.target_sha256 ? "removable" : "modified",
      expected_sha256: operation.target_sha256,
      actual_sha256: actualHash
    };
  });
  const collisions = checks.filter((check) => check.status === "modified");
  const preview = {
    valid: collisions.length === 0,
    mode: apply ? "rollback-apply" : "rollback-preview",
    manifest: path.resolve(manifestPath),
    migration_id: manifest.migration_id,
    checks,
    collisions
  };
  if (!apply || collisions.length) {
    process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
    if (collisions.length) process.exit(1);
    return;
  }

  const recordsDirectory = path.dirname(path.resolve(manifestPath));
  const recordPath = path.join(recordsDirectory, rollbackRecordFileName(manifest.migration_id));
  if (fs.existsSync(recordPath)) fail("Rollback record collision", recordPath);

  const removed = [];
  for (const operation of [...manifest.operations].reverse()) {
    const target = path.resolve(projectRoot, operation.target);
    if (!fs.existsSync(target)) continue;
    fs.unlinkSync(target);
    removed.push(operation.target);
    let parent = path.dirname(target);
    const storyDirectory = storyRoot(projectRoot);
    while (parent.startsWith(`${storyDirectory}${path.sep}`) && parent !== path.join(storyDirectory, PROJECT_PATH_CONTRACT.directories.migrationRecords)) {
      if (fs.readdirSync(parent).length) break;
      fs.rmdirSync(parent);
      parent = path.dirname(parent);
    }
  }
  fs.mkdirSync(recordsDirectory, { recursive: true });
  const record = {
    schema_version: "1.0",
    migration_id: manifest.migration_id,
    rolled_back_at: new Date().toISOString(),
    source_assets_preserved: true,
    removed
  };
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ ...preview, valid: true, removed, rollback_record: recordPath }, null, 2)}\n`);
}

const rollbackManifest = value("--rollback");
const apply = args.includes("--apply");
if (rollbackManifest) {
  rollback(path.resolve(rollbackManifest), apply);
} else {
  const projectRoot = path.resolve(value("--project-root") || process.cwd());
  const migrationId = safeMigrationId(value("--migration-id"));
  const targetRoot = storyRoot(projectRoot);
  const unsupported = [];
  const sourceDefinitions = [
    { kind: "story", directory: path.join(projectRoot, "story") },
    { kind: "consultations", directory: path.join(projectRoot, "consultations") },
    { kind: "chapters", directory: path.join(projectRoot, "chapters") }
  ];
  const operations = [];

  for (const source of sourceDefinitions) {
    for (const sourceFile of walkFiles(source.directory, unsupported)) {
      const sourceRelative = path.relative(source.directory, sourceFile);
      const destinationParts = translateRelative(source.kind, sourceRelative);
      const target = path.resolve(targetRoot, ...destinationParts);
      if (target !== targetRoot && !target.startsWith(`${targetRoot}${path.sep}`)) {
        fail("Migration target escaped the Storylab project root", { source: sourceFile, target });
      }
      operations.push({ source: sourceFile, target });
    }
  }

  if (unsupported.length) fail("Unsupported non-file or symbolic-link entries found; migration stopped without writes", unsupported);

  operations.sort((a, b) => a.source.localeCompare(b.source, "zh-CN"));
  const targetOwners = new Map();
  const collisions = [];
  for (const operation of operations) {
    if (targetOwners.has(operation.target)) {
      collisions.push({
        target: relativePosix(projectRoot, operation.target),
        sources: [relativePosix(projectRoot, targetOwners.get(operation.target)), relativePosix(projectRoot, operation.source)],
        reason: "multiple legacy files map to one Chinese target"
      });
    } else {
      targetOwners.set(operation.target, operation.source);
    }
    if (fs.existsSync(operation.target)) {
      collisions.push({
        target: relativePosix(projectRoot, operation.target),
        sources: [relativePosix(projectRoot, operation.source)],
        reason: "target already exists"
      });
    }
  }

  const recordsDirectory = path.join(targetRoot, PROJECT_PATH_CONTRACT.directories.migrationRecords);
  const recordPath = path.join(recordsDirectory, migrationRecordFileName(migrationId));
  if (fs.existsSync(recordPath)) collisions.push({ target: relativePosix(projectRoot, recordPath), sources: [], reason: "migration record already exists" });

  const replacements = buildReplacements(projectRoot, operations);
  const previewOperations = operations.map((operation) => ({
    source: relativePosix(projectRoot, operation.source),
    target: relativePosix(projectRoot, operation.target),
    action: "copy-and-preserve-source"
  }));
  const preview = {
    valid: collisions.length === 0,
    mode: apply ? "apply" : "preview",
    project_root: projectRoot,
    target_root: relativePosix(projectRoot, targetRoot),
    migration_id: migrationId,
    source_roots: sourceDefinitions.filter((entry) => fs.existsSync(entry.directory)).map((entry) => relativePosix(projectRoot, entry.directory)),
    operations: previewOperations,
    collisions,
    writes_performed: false,
    source_assets_preserved: true
  };

  if (!apply || collisions.length) {
    process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
    if (collisions.length) process.exit(1);
  } else if (!operations.length) {
    fail("No legacy Storylab files were found; nothing was migrated");
  } else {
    const createdFiles = [];
    const appliedOperations = [];
    try {
      for (const operation of operations) {
        const transformed = transformedContent(operation, replacements);
        fs.mkdirSync(path.dirname(operation.target), { recursive: true });
        fs.writeFileSync(operation.target, transformed.buffer, { flag: "wx" });
        createdFiles.push(operation.target);
        appliedOperations.push({
          source: relativePosix(projectRoot, operation.source),
          target: relativePosix(projectRoot, operation.target),
          source_sha256: hashBuffer(fs.readFileSync(operation.source)),
          target_sha256: hashBuffer(transformed.buffer),
          json_path_updates: transformed.jsonPathUpdates
        });
      }
      fs.mkdirSync(recordsDirectory, { recursive: true });
      const manifest = {
        schema_version: "1.0",
        migration_id: migrationId,
        mode: "copy-with-source-preservation",
        applied_at: new Date().toISOString(),
        project_root: projectRoot,
        target_root: relativePosix(projectRoot, targetRoot),
        source_roots: preview.source_roots,
        source_assets_preserved: true,
        operations: appliedOperations,
        rollback: {
          safe_when_target_hashes_match: true,
          command: `node "${path.resolve(process.argv[1])}" --rollback "${recordPath}" --apply`
        }
      };
      fs.writeFileSync(recordPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      process.stdout.write(`${JSON.stringify({
        ...preview,
        valid: true,
        writes_performed: true,
        operations: appliedOperations,
        migration_record: relativePosix(projectRoot, recordPath)
      }, null, 2)}\n`);
    } catch (error) {
      for (const created of createdFiles.reverse()) {
        try { fs.unlinkSync(created); } catch {}
      }
      fail(`Migration failed and created files were removed: ${error.message}`);
    }
  }
}
