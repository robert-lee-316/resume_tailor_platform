import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSummaryHistory, recordSummaryEdit, undoSummaryEdit, redoSummaryEdit } from "./lib/summary-history.ts";
import { formatSkillCategories, parseLegacySkills, toRenderPayload, initialResume } from "./lib/resume.ts";

test("Ctrl+B formatting can be undone and redone without losing selected words", () => {
  const history = makeSummaryHistory("Built APIs with Python");
  const original = {value:"Built APIs with Python",start:16,end:22};
  const formatted = "Built APIs with **Python**";
  recordSummaryEdit(history,original,formatted,"format",1000);
  assert.deepEqual(undoSummaryEdit(history,{value:formatted,start:18,end:24}),original);
  assert.deepEqual(redoSummaryEdit(history,original),{value:formatted,start:18,end:24});
});

test("typing is grouped, formatting remains an independent undo step", () => {
  const history = makeSummaryHistory("Hello");
  recordSummaryEdit(history,{value:"Hello",start:5,end:5},"Hello!","typing",1000);
  recordSummaryEdit(history,{value:"Hello!",start:6,end:6},"Hello!!","typing",1110);
  recordSummaryEdit(history,{value:"Hello!!",start:0,end:5},"**Hello**!!","format",1120);
  assert.equal(undoSummaryEdit(history,{value:"**Hello**!!",start:2,end:7}).value,"Hello!!");
  assert.equal(undoSummaryEdit(history,{value:"Hello!!",start:5,end:5}).value,"Hello");
  assert.equal(redoSummaryEdit(history,{value:"Hello",start:5,end:5}).value,"Hello!!");
});

test("editing after undo clears redo; external resume replacement resets history", () => {
  const history = makeSummaryHistory("a");
  recordSummaryEdit(history,{value:"a",start:1,end:1},"ab","typing",1000);
  undoSummaryEdit(history,{value:"ab",start:2,end:2});
  recordSummaryEdit(history,{value:"a",start:1,end:1},"ax","typing",2000);
  assert.equal(redoSummaryEdit(history,{value:"ax",start:2,end:2}),null);
  assert.equal(undoSummaryEdit(history,{value:"Imported",start:8,end:8}),null);
});

test("every skill category has one bullet and older exported data remains parseable", () => {
  const skills = [{id:"1",name:"Languages",skills:["Python","Java"]},{id:"2",name:"Tools",skills:["Docker"]}];
  const formatted = formatSkillCategories(skills);
  assert.equal(formatted, "• Languages: Python, Java\n• Tools: Docker");
  const legacy = parseLegacySkills(formatted);
  assert.deepEqual(legacy.map(c=>[c.name,c.skills]),[["Languages",["Python","Java"]],["Tools",["Docker"]]]);
  assert.equal(toRenderPayload({...initialResume,skill_categories:skills}).skills_text,formatted);
});
