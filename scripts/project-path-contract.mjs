#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Storylab project-runtime path contract.
 *
 * This module is the single source of truth for every path that Storylab
 * creates, restores, validates, or migrates inside a user's fiction project.
 * Codex plugin package paths are intentionally outside this contract.
 */
export const PROJECT_PATH_CONTRACT = Object.freeze({
  schemaVersion: "1.0",
  rootDirectory: "故事项目",
  directories: Object.freeze({
    chapters: "章节",
    consultations: "专家咨询",
    migrationRecords: "迁移记录"
  }),
  authorityFiles: Object.freeze({
    projectCharter: Object.freeze({ template: "project-charter.md", runtime: "项目章程.md" }),
    legacyDecisions: Object.freeze({ template: "legacy-decisions.md", runtime: "旧资料继承决策.md" }),
    storyBible: Object.freeze({ template: "story-bible.md", runtime: "故事圣经.md" }),
    arcMap: Object.freeze({ template: "arc-map.md", runtime: "故事弧线图.md" }),
    characterRouteMap: Object.freeze({ template: "character-route-map.md", runtime: "人物路线图.md" }),
    relationshipRouteMap: Object.freeze({ template: "relationship-route-map.md", runtime: "关系路线图.md" }),
    tasteDossier: Object.freeze({ template: "taste-dossier.md", runtime: "审美档案.md" }),
    continuityState: Object.freeze({ template: "continuity-state.json", runtime: "连续性状态.json" }),
    productionState: Object.freeze({ template: "production-state.json", runtime: "生产状态.json" })
  }),
  discussionFiles: Object.freeze({
    agenda: Object.freeze({ template: "discussion-agenda.json", runtime: "讨论议程.json" }),
    userDecisionRecord: Object.freeze({ template: "user-decision-record.md", runtime: "用户决策记录.md" })
  }),
  chapterFiles: Object.freeze({
    commission: Object.freeze({ template: "chapter-commission.md", runtime: "章节任务书.md" }),
    writerView: Object.freeze({ template: "writer-view.md", runtime: "作者视图.md" }),
    firstRead: Object.freeze({ template: "first-read.md", runtime: "首读记录.md" }),
    editorialLetter: Object.freeze({ template: "editorial-letter.md", runtime: "编辑诊断书.md" }),
    continuityReport: Object.freeze({ template: "continuity-report.json", runtime: "连续性报告.json" }),
    acceptanceRecord: Object.freeze({ template: "acceptance-record.json", runtime: "验收记录.json" })
  }),
  consultation: Object.freeze({
    template: "editor-consultation.json",
    runtimePattern: "咨询-{咨询编号}.json"
  }),
  draft: Object.freeze({
    runtimePattern: "正文-修订-{修订号}.md"
  }),
  migration: Object.freeze({
    recordPattern: "迁移清单-{迁移编号}.json",
    rollbackRecordPattern: "回滚清单-{迁移编号}.json"
  })
});

export const AUTHORITY_ENTRIES = Object.freeze(Object.values(PROJECT_PATH_CONTRACT.authorityFiles));
export const DISCUSSION_ENTRIES = Object.freeze(Object.values(PROJECT_PATH_CONTRACT.discussionFiles));
export const CHAPTER_ENTRIES = Object.freeze(Object.values(PROJECT_PATH_CONTRACT.chapterFiles));
export const ALL_TEMPLATE_ENTRIES = Object.freeze([
  ...AUTHORITY_ENTRIES,
  ...DISCUSSION_ENTRIES,
  ...CHAPTER_ENTRIES
]);

export const LEGACY_FILE_NAME_MAP = Object.freeze(Object.fromEntries([
  ...ALL_TEMPLATE_ENTRIES.map(({ template, runtime }) => [template, runtime]),
  [PROJECT_PATH_CONTRACT.consultation.template, "专家咨询.json"]
]));

export function storyRoot(projectRoot) {
  return path.join(path.resolve(projectRoot), PROJECT_PATH_CONTRACT.rootDirectory);
}

export function chapterDirectory(projectRoot, chapterId) {
  return path.join(storyRoot(projectRoot), PROJECT_PATH_CONTRACT.directories.chapters, chapterFolderName(chapterId));
}

export function chapterFolderName(chapterId) {
  const value = String(chapterId);
  return /^第.+章$/u.test(value) ? value : `第${value}章`;
}

export function consultationFileName(consultationId) {
  const value = String(consultationId);
  if (/[A-Za-z]/u.test(value)) {
    throw new Error("咨询编号必须使用中文或数字，不能包含英文字母");
  }
  return `咨询-${value}.json`;
}

export function draftFileName(revision) {
  return `正文-修订-${String(revision)}.md`;
}

export function migrationRecordFileName(migrationId) {
  return `迁移清单-${String(migrationId)}.json`;
}

export function rollbackRecordFileName(migrationId) {
  return `回滚清单-${String(migrationId)}.json`;
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  process.stdout.write(`${JSON.stringify(PROJECT_PATH_CONTRACT, null, 2)}\n`);
}
