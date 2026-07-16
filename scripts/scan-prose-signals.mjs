#!/usr/bin/env node

import fs from "node:fs";

const args = process.argv.slice(2);
const input = args[0];
const outputIndex = args.indexOf("--output");
const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;

if (!input) {
  process.stderr.write("Usage: scan-prose-signals.mjs <prose-file> [--output <report.json>]\n");
  process.exit(1);
}

let text;
try {
  text = fs.readFileSync(input, "utf8").replace(/\r\n/g, "\n");
} catch (error) {
  process.stderr.write(`Cannot read ${input}: ${error.message}\n`);
  process.exit(1);
}

const prose = text.replace(/^#{1,6}\s+.*$/gm, "").trim();
const visibleChars = [...prose.replace(/\s/g, "")];
const paragraphs = prose.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
const sentences = prose.split(/(?<=[。！？!?])|…{2,}/u).map((part) => part.trim()).filter(Boolean);
const sentenceLengths = sentences.map((sentence) => [...sentence.replace(/\s/g, "")].length);
const paragraphLengths = paragraphs.map((paragraph) => [...paragraph.replace(/\s/g, "")].length);

function mean(values) {
  return values.length ? values.reduce((sum, current) => sum + current, 0) / values.length : 0;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function deviation(values) {
  if (!values.length) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

const quoted = [...prose.matchAll(/[“「『](.*?)[”」』]/gs)].map((match) => match[1]).join("");
const dialogueChars = [...quoted.replace(/\s/g, "")].length;
const openings = new Map();
for (const sentence of sentences) {
  const opening = [...sentence.replace(/^[“「『\s]+|\s/g, "")].slice(0, 4).join("");
  if (opening.length >= 2) openings.set(opening, (openings.get(opening) || 0) + 1);
}
const repeatedOpenings = [...openings.entries()]
  .filter(([, count]) => count >= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([opening, count]) => ({ opening, count }));

const markerTerms = ["因为", "所以", "这意味着", "也就是说", "显然", "事实上", "可见", "换句话说"];
const explanatoryMarkers = markerTerms.map((term) => ({
  term,
  count: prose.split(term).length - 1
})).filter((entry) => entry.count > 0);
const markerCount = explanatoryMarkers.reduce((sum, entry) => sum + entry.count, 0);
const perThousand = visibleChars.length ? markerCount * 1000 / visibleChars.length : 0;

const signals = [];
if (repeatedOpenings.length) signals.push("Several sentence openings repeat at least three times; inspect local rhythm in context.");
if (perThousand >= 5) signals.push("Explanatory markers are concentrated; inspect whether narration or dialogue over-explains.");
if (sentenceLengths.length >= 8 && deviation(sentenceLengths) < 5) signals.push("Sentence lengths vary little; inspect whether the passage has unintended rhythmic uniformity.");
if (paragraphLengths.length >= 5 && percentile(paragraphLengths, 0.9) > 450) signals.push("Some paragraphs are long relative to the passage; inspect attention and scene movement.");

const report = {
  schema_version: "2.0",
  source: input,
  units: {
    visible_characters: visibleChars.length,
    paragraphs: paragraphs.length,
    sentences: sentences.length
  },
  sentence_length: {
    mean: Number(mean(sentenceLengths).toFixed(2)),
    median: percentile(sentenceLengths, 0.5),
    p90: percentile(sentenceLengths, 0.9),
    standard_deviation: Number(deviation(sentenceLengths).toFixed(2))
  },
  paragraph_length: {
    mean: Number(mean(paragraphLengths).toFixed(2)),
    p90: percentile(paragraphLengths, 0.9)
  },
  dialogue_ratio: visibleChars.length ? Number((dialogueChars / visibleChars.length).toFixed(4)) : 0,
  repeated_openings: repeatedOpenings,
  explanatory_markers: explanatoryMarkers,
  explanatory_markers_per_thousand_chars: Number(perThousand.toFixed(2)),
  signals,
  interpretation: "These are descriptive signals for close reading. They are not a literary grade or acceptance decision."
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (output) fs.writeFileSync(output, serialized, "utf8");
process.stdout.write(serialized);
