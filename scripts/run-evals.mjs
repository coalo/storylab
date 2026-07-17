#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ALL_TEMPLATE_ENTRIES, PROJECT_PATH_CONTRACT, chapterFolderName } from "./project-path-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const results = [];

function run(name, script, args, expectedExit = 0) {
  const command = spawnSync(node, [path.join(root, "scripts", script), ...args], { encoding: "utf8" });
  const passed = command.status === expectedExit;
  results.push({ name, passed, expected_exit: expectedExit, actual_exit: command.status, stdout: command.stdout.trim(), stderr: command.stderr.trim() });
  return command;
}

run("writer view accepts allowlisted packet", "validate-writer-view.mjs", [path.join(root, "evals/context-boundary/valid.md")]);
run("writer view rejects score leakage", "validate-writer-view.mjs", [path.join(root, "evals/context-boundary/invalid-score.md")], 1);
run("writer view rejects choreography leakage", "validate-writer-view.mjs", [path.join(root, "evals/context-boundary/invalid-steps.md")], 1);
run("continuity accepts clear evidence", "verify-continuity.mjs", ["--state", path.join(root, "evals/continuity/state.json"), "--report", path.join(root, "evals/continuity/report-clear.json")]);
run("continuity rejects false overall", "verify-continuity.mjs", ["--state", path.join(root, "evals/continuity/state.json"), "--report", path.join(root, "evals/continuity/report-invalid.json")], 1);
run("production state contract is valid", "validate-story-state.mjs", [path.join(root, "evals/end-to-end/state-valid.json")]);
run("production state rejects premature canon", "validate-story-state.mjs", [path.join(root, "evals/end-to-end/state-invalid.json")], 1);
run("production state accepts planned to commissioned", "validate-story-state.mjs", [path.join(root, "evals/end-to-end/state-commissioned.json"), "--previous", path.join(root, "evals/end-to-end/state-valid.json")]);
run("production state rejects skipped stages", "validate-story-state.mjs", [path.join(root, "evals/end-to-end/state-invalid-transition.json"), "--previous", path.join(root, "evals/end-to-end/state-valid.json")], 1);
run("discussion agenda accepts one presented current item", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/valid-active.json")]);
run("discussion agenda rejects parallel questions", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-two-current.json")], 1);
run("discussion agenda rejects a closed decision without evidence", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-unconfirmed.json")], 1);
run("discussion agenda rejects asking before list presentation", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-unpresented.json")], 1);
run("discussion agenda advances after explicit item confirmation", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/valid-next-item.json"), "--previous", path.join(root, "evals/conversation/valid-active.json")]);
run("discussion agenda advances after a direct option selection", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/valid-direct-selection.json"), "--previous", path.join(root, "evals/conversation/valid-active.json")]);
run("discussion agenda rejects skipping an earlier open item", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-skip-first.json")], 1);
run("discussion alignment accepts the initial achieved-state summary", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/valid-alignment-awaiting.json")]);
run("discussion agenda accepts explicit alignment clearance and option contracts", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/valid-alignment-cleared-agenda.json")]);
run("discussion agenda rejects questions before alignment clearance", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-questions-before-clearance.json")], 1);
run("discussion agenda rejects false alignment clearance", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-false-alignment-clearance.json")], 1);
run("discussion agenda rejects incomplete option contracts", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-option-contract.json")], 1);
run("discussion agenda accepts a neutral composable user-taste decision", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/valid-user-taste-neutral.json")]);
run("discussion agenda rejects an unsolicited recommendation on user taste", "validate-discussion-state.mjs", [path.join(root, "evals/conversation/invalid-user-taste-recommendation.json")], 1);
run("source analysis accepts complete audited extraction evidence", "validate-source-analysis.mjs", ["--root", path.join(root, "evals/source-analysis/valid")]);

const authorSkill = fs.readFileSync(path.join(root, "skills/storylab-author/SKILL.md"), "utf8");
const firstReaderSkill = fs.readFileSync(path.join(root, "skills/storylab-first-reader/SKILL.md"), "utf8");
results.push({
  name: "isolated role skills contain no sensitive reference paths",
  passed: !/\.\.\/\.\.\/references|故事弧线图|旧资料继承决策|连续性状态/.test(authorSkill + firstReaderSkill)
});

const specialistSkills = [
  "storylab-story-editor",
  "storylab-chapter-editor",
  "storylab-author",
  "storylab-first-reader",
  "storylab-literary-editor",
  "storylab-continuity-editor",
  "storylab-source-reader",
  "storylab-source-synthesizer",
  "storylab-source-auditor"
].map((name) => fs.readFileSync(path.join(root, `skills/${name}/SKILL.md`), "utf8"));
results.push({
  name: "every specialist returns through the host",
  passed: specialistSkills.every((content) => content.includes("Never address the user directly."))
});

const hostSkill = fs.readFileSync(path.join(root, "skills/storylab/SKILL.md"), "utf8");
const conversationProtocol = fs.readFileSync(path.join(root, "references/conversation-protocol.md"), "utf8");
results.push({
  name: "host declares its role before any project action",
  passed: hostSkill.includes("## Introduce the Storylab host")
    && hostSkill.includes("first user-visible response")
    && hostSkill.includes("before any workspace inspection, tool call, delegation, state recovery, or discussion work")
    && hostSkill.indexOf("## Introduce the Storylab host") < hostSkill.indexOf("## Load the operating rules")
});
results.push({
  name: "conversation protocol preserves the startup role boundary",
  passed: conversationProtocol.includes("## Open with the host declaration")
    && conversationProtocol.includes("first user-visible response")
    && conversationProtocol.includes("workflow coordination, specialist relay, decision recording, and gates")
    && conversationProtocol.includes("behind the scenes, without direct user conversation or decision authority")
    && conversationProtocol.indexOf("## Open with the host declaration") < conversationProtocol.indexOf("## Build the agenda")
});
results.push({
  name: "host presents an agenda and accepts direct selections without a second confirmation",
  passed: hostSkill.includes("Show the user the complete numbered discussion list")
    && hostSkill.includes("Treat an unambiguous selection as confirmation in that same message")
    && hostSkill.includes("do not ask the user to repeat “confirm.”")
    && conversationProtocol.includes("Resolve selected items without redundant confirmation")
    && conversationProtocol.includes("When one message unambiguously answers several items")
    && hostSkill.includes("讨论议程.json")
});
results.push({
  name: "host clears the achieved-state alignment gate before generating questions",
  passed: hostSkill.includes("alignment_gate")
    && hostSkill.includes("explicitly says that nothing remains to clarify")
    && hostSkill.includes("Only after explicit clearance")
    && hostSkill.includes("2-3 mutually exclusive options")
    && hostSkill.indexOf("alignment_gate") < hostSkill.indexOf("Only after explicit clearance")
});
results.push({
  name: "conversation protocol orders iterative clarification before agenda generation",
  passed: conversationProtocol.includes("## Align the achieved story state before building the agenda")
    && conversationProtocol.includes("Do not reveal question candidates, options, or recommendations yet")
    && conversationProtocol.includes("2-3 mutually exclusive options")
    && conversationProtocol.indexOf("## Align the achieved story state before building the agenda") < conversationProtocol.indexOf("## Build the agenda")
});
results.push({
  name: "host separates professional recommendations from user taste",
  passed: hostSkill.includes("Classify each item as `professional` or `user_taste`")
    && hostSkill.includes("set no default or recommendation")
    && hostSkill.includes("Do not minimize away distinct relationship configurations")
    && conversationProtocol.includes("never pre-delete an option because of moral, ideological, political, commercial, or editorial preference")
});

const discussionTemplate = JSON.parse(fs.readFileSync(path.join(root, "assets/templates/discussion-agenda.json"), "utf8"));
results.push({
  name: "new discussion rounds start with an empty schema 3.1 alignment gate",
  passed: discussionTemplate.schema_version === "3.1"
    && discussionTemplate.status === "alignment"
    && discussionTemplate.current_item_id === null
    && discussionTemplate.alignment_gate?.status === "awaiting_user"
    && discussionTemplate.alignment_gate?.clarification_turns?.length === 1
    && discussionTemplate.alignment_gate?.clarification_turns?.[0]?.needs_clarification === null
    && discussionTemplate.questions_generated_at === null
    && discussionTemplate.items?.length === 0
});

const consultationTemplate = JSON.parse(fs.readFileSync(path.join(root, "assets/templates/editor-consultation.json"), "utf8"));
results.push({
  name: "specialist consultation exposes decision candidates to the host",
  passed: consultationTemplate.needs_user_decision === true
    && Array.isArray(consultationTemplate.question_candidates)
    && ["topic", "why", "downstream_effect", "question", "decision_kind", "selection_mode", "option_candidates", "recommendation", "blocking_scope"]
      .every((key) => Object.hasOwn(consultationTemplate.question_candidates[0], key))
});

const sourceContract = fs.readFileSync(path.join(root, "references/source-analysis-contract.md"), "utf8");
const sourceReaderSkill = fs.readFileSync(path.join(root, "skills/storylab-source-reader/SKILL.md"), "utf8");
const sourceAuditorSkill = fs.readFileSync(path.join(root, "skills/storylab-source-auditor/SKILL.md"), "utf8");
const sourceManifestTemplate = JSON.parse(fs.readFileSync(path.join(root, "assets/templates/source-manifest.json"), "utf8"));
const sourceStateTemplate = JSON.parse(fs.readFileSync(path.join(root, "assets/templates/source-analysis-state.json"), "utf8"));
const extractionSpecTemplate = JSON.parse(fs.readFileSync(path.join(root, "assets/templates/source-extraction-spec.json"), "utf8"));
results.push({
  name: "user-supplied source access is automatic and never an authorization gate",
  passed: sourceContract.includes("Do not ask whether Storylab is authorized")
    && sourceManifestTemplate.access_basis === "user_supplied_full_project_use"
    && !Object.hasOwn(sourceManifestTemplate, "authorization_ref")
    && sourceStateTemplate.status === "uninitialized"
    && sourceStateTemplate.pending_gate === null
});
results.push({
  name: "source analysis has no mandatory moral risk checklist",
  passed: Array.isArray(extractionSpecTemplate.risk_categories)
    && extractionSpecTemplate.risk_categories.length === 0
    && sourceContract.includes("Storylab has no mandatory moral, ideological, or political risk checklist")
});
results.push({
  name: "Storylab adds no secondary legal or platform-safety content gate",
  passed: !/platform safety|applicable law|legal or safety consequences|法律与安全|平台安全/iu.test(
    [
      sourceContract,
      hostSkill,
      conversationProtocol,
      fs.readFileSync(path.join(root, "references/creative-governance.md"), "utf8"),
      fs.readFileSync(path.join(root, "references/taste-and-approval.md"), "utf8")
    ].join("\n")
  )
});
results.push({
  name: "source roles preserve multi-partner evidence separately from risk",
  passed: sourceReaderSkill.includes("multi-partner or harem relationship engine")
    && sourceReaderSkill.includes("Record the observed asset first")
    && sourceAuditorSkill.includes("multi-partner dynamics collapsed into an objectification or exploitation warning")
    && sourceContract.includes("A risk assessment never changes an observation from `present` to `absent`")
});

const sourceRegressionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "storylab-source-regression-"));
try {
  const silentOmissionRoot = path.join(sourceRegressionRoot, "silent-omission");
  fs.cpSync(path.join(root, "evals/source-analysis/valid"), silentOmissionRoot, { recursive: true });
  const auditPath = path.join(silentOmissionRoot, "提取审计.json");
  const invalidAudit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  invalidAudit.silent_omission_findings = [{
    finding_id: "F-001",
    summary: "Multi-partner relationship evidence was replaced by an editorial risk label."
  }];
  fs.writeFileSync(auditPath, `${JSON.stringify(invalidAudit, null, 2)}\n`, "utf8");
  run(
    "source analysis rejects a falsely clear audit with silent editorial omission",
    "validate-source-analysis.mjs",
    ["--root", silentOmissionRoot],
    1
  );

  const prematureDecisionRoot = path.join(sourceRegressionRoot, "premature-decision");
  fs.cpSync(path.join(root, "evals/source-analysis/valid"), prematureDecisionRoot, { recursive: true });
  const batchPath = path.join(prematureDecisionRoot, "批次", "批次-001", "批次报告.json");
  const invalidBatch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  invalidBatch.observations[1].decision = "discard";
  fs.writeFileSync(batchPath, `${JSON.stringify(invalidBatch, null, 2)}\n`, "utf8");
  run(
    "source analysis rejects a transfer decision hidden in source observation",
    "validate-source-analysis.mjs",
    ["--root", prematureDecisionRoot],
    1
  );
} finally {
  fs.rmSync(sourceRegressionRoot, { recursive: true, force: true });
}

const routes = JSON.parse(fs.readFileSync(path.join(root, "evals/editorial-routing/cases.json"), "utf8"));
const expectedByLevel = { prose: "author_revision", chapter: "chapter_recommission", story: "story_replan", ready: "literary_ready" };
results.push({
  name: "editorial routing fixtures follow responsibility contract",
  passed: routes.every((entry) => expectedByLevel[entry.problem_level] === entry.expected_route)
});

const firstReaderCase = JSON.parse(fs.readFileSync(path.join(root, "evals/first-reader/case.json"), "utf8"));
results.push({
  name: "first-reader fixture preserves cold-read blindness",
  passed: firstReaderCase.allowed_inputs.every((entry) => ["draft", "reader-facing promise"].includes(entry))
    && firstReaderCase.forbidden_outputs.includes("prescriptive rewrite")
});

const tastePairs = JSON.parse(fs.readFileSync(path.join(root, "evals/taste-regression/pairs.json"), "utf8"));
results.push({
  name: "taste fixtures require explicit evidence",
  passed: tastePairs.every((entry) => entry.approved_evidence && entry.rejected_evidence && entry.property)
});

const signalScan = spawnSync(node, [path.join(root, "scripts/scan-prose-signals.mjs"), path.join(root, "evals/end-to-end/prose.md")], { encoding: "utf8" });
let signalReport;
try {
  signalReport = JSON.parse(signalScan.stdout);
} catch {
  signalReport = null;
}
results.push({
  name: "prose scanner emits signals without a literary verdict",
  passed: signalScan.status === 0
    && signalReport
    && Array.isArray(signalReport.signals)
    && !["pass", "fail", "score", "grade"].some((key) => Object.hasOwn(signalReport, key))
});

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "storylab-eval-"));
try {
  const compiled = path.join(temporary, "作者视图.md");
  run("compiler emits a valid writer view", "compile-writer-view.mjs", ["--commission", path.join(root, "evals/end-to-end/chapter-commission.md"), "--output", compiled]);
  run("compiled writer view passes firewall", "validate-writer-view.mjs", [compiled]);
  const compiledText = fs.readFileSync(compiled, "utf8");
  results.push({
    name: "compiler omits private story purpose and imagined solutions",
    passed: !/Story-purpose context|Optional private possibilities|barter/i.test(compiledText)
  });
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

results.push({
  name: "project path contract exposes only Chinese runtime names",
  passed: PROJECT_PATH_CONTRACT.rootDirectory === "故事项目"
    && PROJECT_PATH_CONTRACT.directories.chapters === "章节"
    && PROJECT_PATH_CONTRACT.directories.consultations === "专家咨询"
    && PROJECT_PATH_CONTRACT.directories.sourceAnalysis === "源作解析"
    && PROJECT_PATH_CONTRACT.directories.sourceBatches === "批次"
    && chapterFolderName("001") === "第001章"
    && ALL_TEMPLATE_ENTRIES.every((entry) => /^[\p{Script=Han}]/u.test(entry.runtime))
});

const initializationProject = fs.mkdtempSync(path.join(os.tmpdir(), "storylab-init-eval-"));
try {
  const firstInitialization = run(
    "initializer creates Chinese project, discussion, source-analysis, chapter, and consultation paths",
    "initialize-story-project.mjs",
    [
      "--project-root", initializationProject,
      "--with-discussion",
      "--with-source-analysis",
      "--source-batch", "001",
      "--chapter", "001",
      "--chapter-stage", "commission",
      "--consultation", "001"
    ]
  );
  const storyDirectory = path.join(initializationProject, "故事项目");
  const expectedFiles = [
    "项目章程.md",
    "旧资料继承决策.md",
    "故事圣经.md",
    "故事弧线图.md",
    "人物路线图.md",
    "关系路线图.md",
    "审美档案.md",
    "连续性状态.json",
    "生产状态.json",
    "讨论议程.json",
    "用户决策记录.md",
    path.join("源作解析", "源作清单.json"),
    path.join("源作解析", "源作结构索引.json"),
    path.join("源作解析", "解析状态.json"),
    path.join("源作解析", "侦察报告.json"),
    path.join("源作解析", "提取方案.json"),
    path.join("源作解析", "全书综合.json"),
    path.join("源作解析", "提取审计.json"),
    path.join("源作解析", "批次", "批次-001", "批次报告.json"),
    path.join("章节", "第001章", "章节任务书.md"),
    path.join("专家咨询", "咨询-001.json")
  ];
  results.push({
    name: "initializer output matches the centralized Chinese path contract",
    passed: firstInitialization.status === 0
      && expectedFiles.every((relative) => fs.existsSync(path.join(storyDirectory, relative)))
  });
  run(
    "fresh source-analysis assets validate without an authorization decision",
    "validate-source-analysis.mjs",
    ["--root", path.join(storyDirectory, "源作解析")]
  );

  const charterPath = path.join(storyDirectory, "项目章程.md");
  fs.writeFileSync(charterPath, "用户内容不得覆盖\n", "utf8");
  const repeat = run(
    "initializer can be repeated without overwriting user files",
    "initialize-story-project.mjs",
    ["--project-root", initializationProject, "--with-discussion"]
  );
  results.push({
    name: "initializer preserves existing user-authored content",
    passed: repeat.status === 0 && fs.readFileSync(charterPath, "utf8") === "用户内容不得覆盖\n"
  });
} finally {
  fs.rmSync(initializationProject, { recursive: true, force: true });
}

const migrationProject = fs.mkdtempSync(path.join(os.tmpdir(), "storylab-migration-eval-"));
try {
  fs.mkdirSync(path.join(migrationProject, "story", "consultations"), { recursive: true });
  fs.mkdirSync(path.join(migrationProject, "chapters", "001"), { recursive: true });
  fs.writeFileSync(path.join(migrationProject, "story", "project-charter.md"), "# Legacy charter\n", "utf8");
  fs.writeFileSync(path.join(migrationProject, "story", "consultations", "story-editor-intake.json"), "{\n  \"schema_version\": \"2.0\"\n}\n", "utf8");
  fs.writeFileSync(path.join(migrationProject, "chapters", "001", "chapter-commission.md"), "# Legacy commission\n", "utf8");
  fs.writeFileSync(path.join(migrationProject, "chapters", "001", "draft-r2.md"), "正文\n", "utf8");
  fs.writeFileSync(path.join(migrationProject, "story", "production-state.json"), `${JSON.stringify({
    schema_version: "2.0",
    project_id: "migration-test",
    production_mode: "pilot",
    taste_freeze: false,
    chapters: [{
      chapter_id: "001",
      status: "commissioned",
      commission_revision: 1,
      draft_revision: 0,
      evidence: {
        commission: "chapters/001/chapter-commission.md",
        writer_view: null,
        draft: null,
        first_read: null,
        editorial_letter: null,
        continuity_report: null,
        acceptance_record: null
      },
      canon_committed: false
    }]
  }, null, 2)}\n`, "utf8");

  const preview = run(
    "legacy migration defaults to a no-write preview",
    "migrate-story-project.mjs",
    ["--project-root", migrationProject, "--migration-id", "评测"]
  );
  results.push({
    name: "migration preview leaves the workspace untouched",
    passed: preview.status === 0 && !fs.existsSync(path.join(migrationProject, "故事项目"))
  });

  const migration = run(
    "legacy migration creates the Chinese layout without deleting sources",
    "migrate-story-project.mjs",
    ["--project-root", migrationProject, "--migration-id", "评测", "--apply"]
  );
  const migratedStatePath = path.join(migrationProject, "故事项目", "生产状态.json");
  const migratedState = fs.existsSync(migratedStatePath) ? JSON.parse(fs.readFileSync(migratedStatePath, "utf8")) : null;
  const manifestPath = path.join(migrationProject, "故事项目", "迁移记录", "迁移清单-评测.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
  const migratedConsultation = manifest?.operations?.find((operation) => operation.source.endsWith("story-editor-intake.json"));
  const everyRuntimeNameIsChineseOrNumeric = manifest?.operations?.every((operation) => operation.target
    .split("/")
    .every((segment) => !/[A-Za-z]/u.test(path.parse(segment).ext ? path.parse(segment).name : segment)));
  results.push({
    name: "migration translates known files, chapter directory, draft revision, and JSON evidence paths",
    passed: migration.status === 0
      && fs.existsSync(path.join(migrationProject, "story", "project-charter.md"))
      && fs.existsSync(path.join(migrationProject, "故事项目", "项目章程.md"))
      && fs.existsSync(path.join(migrationProject, "故事项目", "章节", "第001章", "章节任务书.md"))
      && fs.existsSync(path.join(migrationProject, "故事项目", "章节", "第001章", "正文-修订-2.md"))
      && /^故事项目\/专家咨询\/咨询-旧记录-\d+\.json$/u.test(migratedConsultation?.target || "")
      && fs.existsSync(path.join(migrationProject, migratedConsultation?.target || "missing"))
      && manifest?.source_assets_preserved === true
      && manifest?.operations?.every((operation) => operation.source_sha256 && operation.target_sha256)
      && everyRuntimeNameIsChineseOrNumeric
      && migratedState?.chapters?.[0]?.evidence?.commission === "故事项目/章节/第001章/章节任务书.md"
  });
  run(
    "migration stops before writing when Chinese targets collide",
    "migrate-story-project.mjs",
    ["--project-root", migrationProject, "--migration-id", "碰撞", "--apply"],
    1
  );
  const rollback = run(
    "migration manifest supports a hash-guarded rollback",
    "migrate-story-project.mjs",
    ["--rollback", manifestPath, "--apply"]
  );
  results.push({
    name: "rollback removes only migrated copies and preserves legacy sources and audit records",
    passed: rollback.status === 0
      && fs.existsSync(path.join(migrationProject, "story", "project-charter.md"))
      && !fs.existsSync(path.join(migrationProject, "故事项目", "项目章程.md"))
      && fs.existsSync(manifestPath)
      && fs.existsSync(path.join(migrationProject, "故事项目", "迁移记录", "回滚清单-评测.json"))
  });
} finally {
  fs.rmSync(migrationProject, { recursive: true, force: true });
}

const failures = results.filter((result) => !result.passed);
process.stdout.write(`${JSON.stringify({ passed: failures.length === 0, total: results.length, failed: failures.length, results }, null, 2)}\n`);
if (failures.length) process.exit(1);
