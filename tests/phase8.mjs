const BASE = "http://127.0.0.1:8000/functions/v1/app";

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

async function request(action, payload) {
  const isGet = payload === undefined;
  const init = isGet
    ? { method: "GET", headers: { Accept: "application/json" } }
    : { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) };
  const res = await fetch(`${BASE}?action=${encodeURIComponent(action)}`, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `http_${res.status}`);
  return json.data;
}

// Inline copy of src/lib/homework.ts groupHomework
function groupHomework(list, todayStr) {
  const d = new Date(todayStr + "T00:00:00");
  const daysUntilSunday = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntilSunday);
  const weekEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const groups = { overdue: [], today: [], thisWeek: [], later: [], noDue: [], completed: [] };
  for (const hw of list) {
    if (hw.completed) { groups.completed.push(hw); continue; }
    if (!hw.due_date) { groups.noDue.push(hw); continue; }
    if (hw.due_date < todayStr) groups.overdue.push(hw);
    else if (hw.due_date === todayStr) groups.today.push(hw);
    else if (hw.due_date <= weekEnd) groups.thisWeek.push(hw);
    else groups.later.push(hw);
  }
  const byDue = (a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  };
  for (const k of Object.keys(groups)) groups[k].sort(byDue);
  return groups;
}

async function main() {
  console.log("=== Phase 8: 作业汇总页 ===\n");

  const boot = await request("bootstrap");
  check("bootstrap ok", Array.isArray(boot.homework));
  const initialCount = boot.homework.length;
  const course = boot.courses[0];
  const course2 = boot.courses[1];
  check("bootstrap has courses for homework", !!course && !!course2);

  // --- homework.save ---
  console.log("--- homework.save ---");

  const hw1 = await request("homework.save", {
    title: "预习第三课", course_id: course.id, due_date: "2026-10-02", description: "第3章", completed: false,
  });
  check("Create homework returns id", !!hw1.id);
  check("Title correct", hw1.title === "预习第三课");
  check("course_id correct", hw1.course_id === course.id);
  check("due_date correct", hw1.due_date === "2026-10-02");
  check("completed defaults false", hw1.completed === false);
  check("created_at present", !!hw1.created_at);

  const hw2 = await request("homework.save", {
    title: "无截止日期作业", course_id: course2.id, due_date: null, description: "",
  });
  check("Create homework without due_date", !!hw2.id && hw2.due_date === null);

  let missingCourseErr = null;
  try { await request("homework.save", { title: "缺课程", course_id: "" }); } catch (e) { missingCourseErr = e.message; }
  check("Reject missing course_id", missingCourseErr === "missing_course_id");

  let missingTitleErr = null;
  try { await request("homework.save", { title: "", course_id: course.id }); } catch (e) { missingTitleErr = e.message; }
  check("Reject empty title", missingTitleErr === "invalid_title");

  const bootAfterCreate = await request("bootstrap");
  check("Bootstrap includes new homework", bootAfterCreate.homework.length === initialCount + 2);

  // --- update via homework.save ---
  const updated = await request("homework.save", {
    id: hw1.id, title: "预习第三课（改）", course_id: course.id, due_date: "2026-10-03", completed: false,
  });
  check("Update title via save", updated.title === "预习第三课（改）");
  check("Update due_date via save", updated.due_date === "2026-10-03");

  // --- homework.complete ---
  console.log("\n--- homework.complete ---");
  const completed = await request("homework.complete", { id: hw1.id, completed: true });
  check("Complete sets completed true", completed.completed === true);
  const bootAfterComplete = await request("bootstrap");
  const hw1Row = bootAfterComplete.homework.find(h => h.id === hw1.id);
  check("Bootstrap reflects completed", hw1Row?.completed === true);

  let badCompletedErr = null;
  try { await request("homework.complete", { id: hw1.id, completed: "yes" }); } catch (e) { badCompletedErr = e.message; }
  check("Reject non-boolean completed", badCompletedErr === "invalid_completed");

  // --- grouping logic (today = 2026-09-30 Wed, week end = 2026-10-04 Sun) ---
  console.log("\n--- 分组逻辑 ---");
  const T = "2026-09-30";
  const mk = (id, due, done = false) => ({ id, title: "t" + id, course_id: course.id, due_date: due, completed: done });

  const groups = groupHomework([
    mk("a", "2026-09-29"),
    mk("b", T),
    mk("c", "2026-10-02"),
    mk("d", "2026-10-04"),
    mk("e", "2026-10-05"),
    mk("f", null),
    mk("g", "2026-09-01", true),
  ], T);

  check("Overdue: before today", groups.overdue.map(h => h.id).join() === "a");
  check("Today: equal today", groups.today.map(h => h.id).join() === "b");
  check("This week includes Fri and Sun", groups.thisWeek.map(h => h.id).join() === "c,d");
  check("Later: after Sunday", groups.later.map(h => h.id).join() === "e");
  check("No due date group", groups.noDue.map(h => h.id).join() === "f");
  check("Completed group", groups.completed.map(h => h.id).join() === "g");
  check("Total preserved", groups.overdue.length + groups.today.length + groups.thisWeek.length + groups.later.length + groups.noDue.length + groups.completed.length === 7);

  const sortedGroups = groupHomework([mk("x", "2026-10-03"), mk("y", "2026-10-01")], T);
  check("Sort by due_date asc within group", sortedGroups.thisWeek.map(h => h.id).join() === "y,x");

  // Week boundary: Sunday 2026-10-04 is last day of current week
  const boundary = groupHomework([mk("s", "2026-10-04"), mk("m", "2026-10-05")], T);
  check("Sunday is this week, Monday is later", boundary.thisWeek.length === 1 && boundary.later.length === 1);

  // Sunday as today: week end = same day
  const sundayGroups = groupHomework([mk("sun", "2026-10-04")], "2026-10-04");
  check("When today is Sunday, due Sunday is today", sundayGroups.today.length === 1);

  // --- course filter semantics ---
  console.log("\n--- 课程筛选 ---");
  const real = bootAfterComplete.homework;
  const byCourse1 = real.filter(h => h.course_id === course.id);
  const byCourse2 = real.filter(h => h.course_id === course2.id);
  check("Filter isolates course 1 items", byCourse1.some(h => h.id === hw1.id) && !byCourse1.some(h => h.id === hw2.id));
  check("Filter isolates course 2 items", byCourse2.some(h => h.id === hw2.id) && !byCourse2.some(h => h.id === hw1.id));

  // --- homework.delete ---
  console.log("\n--- homework.delete ---");
  await request("homework.delete", { id: hw1.id });
  await request("homework.delete", { id: hw2.id });
  const bootAfterDelete = await request("bootstrap");
  check("Both homework deleted", bootAfterDelete.homework.length === initialCount);
  check("Deleted items gone", !bootAfterDelete.homework.some(h => h.id === hw1.id || h.id === hw2.id));

  let missingIdErr = null;
  try { await request("homework.delete", {}); } catch (e) { missingIdErr = e.message; }
  check("Reject missing id on delete", missingIdErr === "missing_id");

  console.log(`\n=== 结果：${passed} 通过，${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
