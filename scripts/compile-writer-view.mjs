#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function arg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  } catch (error) {
    fail(`Cannot read ${file}: ${error.message}`);
  }
}

function sections(markdown) {
  const result = new Map();
  const matches = [...markdown.matchAll(/^## ([^\n]+)\n/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    result.set(matches[index][1].trim(), markdown.slice(start, end).trim());
  }
  return result;
}

function metadata(markdown, key) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^"|"$/g, "");
}

const commissionPath = arg("--commission");
const outputPath = arg("--output");
const recentPath = arg("--recent-prose");
const voicePath = arg("--voice-anchor");

if (!commissionPath || !outputPath) {
  fail("Usage: compile-writer-view.mjs --commission <file> --output <file> [--recent-prose <file>] [--voice-anchor <file>]");
}

const commission = readText(commissionPath);
const sourceSections = sections(commission);
const exported = [
  "Reader-facing promise",
  "POV boundary",
  "Immediate lived state",
  "Immediate desire",
  "Counterforce desire",
  "Dramatic pressure",
  "Canon facts",
  "Required state change",
  "Protected information",
  "Creative freedom"
];
const required = [
  "Reader-facing promise",
  "POV boundary",
  "Immediate lived state",
  "Immediate desire",
  "Counterforce desire",
  "Dramatic pressure",
  "Required state change",
  "Creative freedom"
];

for (const name of required) {
  if (!sourceSections.get(name)) fail(`Commission section is missing or empty: ${name}`);
}

const chapterId = metadata(commission, "chapter_id");
const commissionRevision = metadata(commission, "commission_revision");
if (!chapterId) fail("Commission metadata is missing chapter_id");
if (!commissionRevision || !/^\d+$/.test(commissionRevision)) fail("commission_revision must be a non-negative integer");

const recent = recentPath ? readText(recentPath).slice(-12000).trim() : "_None supplied._";
const voice = voicePath ? readText(voicePath).slice(0, 4000).trim() : "_None supplied._";

const lines = [
  "# Writer View",
  "",
  `chapter_id: "${chapterId.replaceAll('"', '\\"')}"`,
  `commission_revision: ${commissionRevision}`,
  "status: writer_view_compiled",
  ""
];

for (const name of exported) {
  lines.push(`## ${name}`, "", sourceSections.get(name) || "_None established._", "");
}

lines.push("## Recent approved prose", "", recent || "_None supplied._", "");
lines.push("## Voice anchors", "", voice || "_None supplied._", "");

fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  written: path.resolve(outputPath),
  chapter_id: chapterId,
  commission_revision: Number(commissionRevision),
  exported_sections: exported,
  recent_prose_chars: recentPath ? recent.length : 0,
  voice_anchor_chars: voicePath ? voice.length : 0
}, null, 2)}\n`);
