#!/usr/bin/env node

import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  process.stderr.write("Usage: validate-writer-view.mjs <作者视图.md>\n");
  process.exit(1);
}

let markdown;
try {
  markdown = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
} catch (error) {
  process.stderr.write(`Cannot read ${file}: ${error.message}\n`);
  process.exit(1);
}

const allowedSections = [
  "Reader-facing promise",
  "POV boundary",
  "Immediate lived state",
  "Immediate desire",
  "Counterforce desire",
  "Dramatic pressure",
  "Canon facts",
  "Required state change",
  "Protected information",
  "Creative freedom",
  "Recent approved prose",
  "Voice anchors"
];
const requiredSections = [
  "Reader-facing promise",
  "POV boundary",
  "Immediate lived state",
  "Immediate desire",
  "Counterforce desire",
  "Dramatic pressure",
  "Required state change",
  "Creative freedom"
];

function parseSections(text) {
  const result = new Map();
  const matches = [...text.matchAll(/^## ([^\n]+)\n/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? text.length;
    result.set(matches[index][1].trim(), text.slice(start, end).trim());
  }
  return { result, names: matches.map((match) => match[1].trim()) };
}

const errors = [];
const { result: sectionMap, names } = parseSections(markdown);

if (!/^# Writer View\s*$/m.test(markdown)) errors.push("Top-level heading must be '# Writer View'");
if (!/^chapter_id:\s*"?.+"?\s*$/m.test(markdown)) errors.push("chapter_id is required");
if (!/^commission_revision:\s*\d+\s*$/m.test(markdown)) errors.push("commission_revision must be an integer");

for (const name of names) {
  if (!allowedSections.includes(name)) errors.push(`Disallowed section: ${name}`);
}
for (const name of requiredSections) {
  if (!sectionMap.get(name)) errors.push(`Required section is missing or empty: ${name}`);
}

const metadataOnly = allowedSections
  .filter((name) => !["Recent approved prose", "Voice anchors"].includes(name))
  .map((name) => sectionMap.get(name) || "")
  .join("\n");

const forbidden = [
  [/(?:爆款|综合分|评分|打分|因子权重|留存率)/i, "commercial or scoring control"],
  [/(?:关系等级|行为证明链|行为因果表|验收(?:条件|标准|语言)|审稿(?:条件|标准)|失败原因)/i, "evaluation or proof-chain control"],
  [/(?:精确对白|事件步骤|必须逐项|读者必须看到|每个人必须)/i, "prescribed performance"],
  [/(?:旧插件|遗产库|原始遗产|legacy\s+(?:vault|control|file))/i, "legacy control material"],
  [/(?:后面|未来)(?:\d+|[一二三四五六七八九十百]+)章/i, "specific long-range outcome"],
  [/\bR\d+\b/i, "relationship rank"],
  [/\b(?:rubric|acceptance criteria|failure history|ordered beats?|exact dialogue|literary score)\b/i, "evaluation or choreography language"],
  [/^\s*(?:\d+[.)]|第[一二三四五六七八九十]+步)\s+/m, "ordered instruction sequence"]
];

for (const [pattern, label] of forbidden) {
  if (pattern.test(metadataOnly)) errors.push(`Detected ${label}: ${pattern}`);
}

if (new Set(names).size !== names.length) errors.push("Duplicate section headings are not allowed");
const orderedNames = names.filter((name) => allowedSections.includes(name));
const expectedOrder = allowedSections.filter((name) => orderedNames.includes(name));
if (orderedNames.join("|") !== expectedOrder.join("|")) errors.push("Writer-view sections are out of contract order");

const result = { valid: errors.length === 0, file, errors };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length) process.exit(1);
