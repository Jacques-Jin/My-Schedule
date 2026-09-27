#!/usr/bin/env node
// Phase 5 verification: Tasks page (CRUD, repeat, batch, completion)
import http from "node:http";

const API = "http://127.0.0.1:8000";
let pass = 0, fail = 0;

function check(name, cond) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name}`); fail++; }
}

function request(action, payload) {
  return new Promise((resolve, reject) => {
    const isGet = payload === undefined;
    const url = `/functions/v1/app?action=${encodeURIComponent(action)}`;
    const opts = {
      hostname: "127.0.0.1",
      port: 8000,
      path: url,
      method: isGet ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    };
    const req = http.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: { error: body } }); }
      });
    });
    req.on("error", reject);
    if (!isGet) req.write(JSON.stringify(payload));
    req.end();
  });
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekIndexOf(date, semester) {
  const start = parseDate(semester.start_monday);
  const mon = mondayOfWeek(date);
  const diffDays = Math.round((mon.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  if (week < 1) return 0;
  if (week > semester.total_weeks) return -1;
  return week;
}

function expandTaskOn(task, date, semester) {
  const rule = JSON.parse(task.repeat_rule);
  if (rule.type === "none") return task.date === formatDate(date);
  const ds = formatDate(date);
  if (ds < task.date) return false;
  const dow = date.getDay() || 7;
  const week = weekIndexOf(date, semester);
  switch (rule.type) {
    case "daily": return true;
    case "weekly": return (rule.weekdays || []).includes(dow);
    case "biweekly": {
      if (dow !== rule.weekday) return false;
      const anchor = parseDate(rule.anchor || task.date);
      const diffDays = Math.round((mondayOfWeek(date).getTime() - mondayOfWeek(anchor).getTime()) / 86400000);
      return diffDays >= 0 && diffDays % 14 === 0;
    }
    case "weeks":
      return dow === rule.weekday && (rule.weeks || []).includes(week);
    default: return false;
  }
}

async function main() {
  console.log("Phase 5: 日程页（清单+编辑表单）");

  // 1. Bootstrap and get initial data
  const r1 = await request("bootstrap");
  const data = r1.json.data;
  check("Bootstrap returns data", data && data.tasks.length > 0);

  const semester = data.semesters[0];
  const seedTasks = data.tasks;
  const seedRepeat = seedTasks.find(t => JSON.parse(t.repeat_rule).type !== "none");
  check("Seed has repeat task", !!seedRepeat);

  // 2. Create a one-time task with all fields
  const today = formatDate(new Date());
  const createRes = await request("task.save", {
    title: "完成数学作业",
    date: today,
    start_time: "19:00",
    end_time: "20:00",
    category: "作业",
    priority: "高",
    repeat_rule: '{"type":"none"}',
    reminder: "10",
    done: false,
    campaign_id: null,
    note: "第三章习题",
  });
  check("Create one-time task succeeds", createRes.json.data && createRes.json.data.id);
  const newTaskId = createRes.json.data?.id;

  // 3. Verify created task has correct fields
  const r2 = await request("bootstrap");
  const created = r2.json.data.tasks.find(t => t.id === newTaskId);
  check("Created task has correct title", created && created.title === "完成数学作业");
  check("Created task has correct category", created && created.category === "作业");
  check("Created task has correct priority", created && created.priority === "高");
  check("Created task has correct date", created && created.date === today);
  check("Created task has correct start_time", created && created.start_time === "19:00");
  check("Created task has correct reminder", created && created.reminder === "10");
  check("Created task has correct note", created && created.note === "第三章习题");
  check("Created task is not done", created && created.done === false);

  // 4. Create a weekly repeat task (every Wednesday = weekday 3)
  const wednesdayDate = (() => {
    const d = new Date();
    const dow = d.getDay() || 7;
    const diff = dow <= 3 ? 3 - dow : 3 - dow + 7;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
  })();

  const createRepeatRes = await request("task.save", {
    title: "每周三复习法语",
    date: wednesdayDate,
    start_time: "20:00",
    end_time: "21:00",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"weekly","weekdays":[3]}',
    reminder: "none",
    done: false,
    campaign_id: null,
    note: "",
  });
  check("Create weekly repeat task succeeds", createRepeatRes.json.data && createRepeatRes.json.data.id);
  const repeatTaskId = createRepeatRes.json.data?.id;

  // 5. Verify repeat task expansion
  const repeatTask = createRepeatRes.json.data;
  const nextWed = parseDate(wednesdayDate);
  check("Repeat task occurs on start date", expandTaskOn(repeatTask, nextWed, semester));

  const weekLater = new Date(nextWed);
  weekLater.setDate(weekLater.getDate() + 7);
  check("Repeat task occurs next Wednesday", expandTaskOn(repeatTask, weekLater, semester));

  const thuAfter = new Date(nextWed);
  thuAfter.setDate(thuAfter.getDate() + 1);
  check("Repeat task does NOT occur on Thursday", !expandTaskOn(repeatTask, thuAfter, semester));

  // 6. Complete a repeat task on a specific date (uses task_completions)
  const completeRes = await request("task.complete", {
    id: repeatTaskId,
    date: wednesdayDate,
    done: true,
  });
  check("Complete repeat task on date succeeds", completeRes.json.data && completeRes.json.data.done === true);

  // 7. Verify completion recorded in completions table
  const r3 = await request("bootstrap");
  const completion = r3.json.data.completions.find(
    c => c.task_id === repeatTaskId && c.date === wednesdayDate
  );
  check("Completion record exists in completions table", !!completion);

  // 8. Undo completion for repeat task
  const undoRes = await request("task.complete", {
    id: repeatTaskId,
    date: wednesdayDate,
    done: false,
  });
  check("Undo repeat task completion succeeds", undoRes.json.data && undoRes.json.data.done === false);

  // 9. Verify completion removed
  const r4 = await request("bootstrap");
  const completionAfterUndo = r4.json.data.completions.find(
    c => c.task_id === repeatTaskId && c.date === wednesdayDate
  );
  check("Completion record removed after undo", !completionAfterUndo);

  // 10. Complete a one-time task (uses tasks.done)
  const completeOneTime = await request("task.complete", {
    id: newTaskId,
    date: today,
    done: true,
  });
  check("Complete one-time task succeeds", completeOneTime.json.data && completeOneTime.json.data.done === true);

  const r5 = await request("bootstrap");
  const doneTask = r5.json.data.tasks.find(t => t.id === newTaskId);
  check("One-time task marked done in tasks table", doneTask && doneTask.done === true);

  // 11. Batch operations: create 3 tasks then batch-done, batch-move, batch-category, batch-delete
  const batchIds = [];
  for (let i = 1; i <= 3; i++) {
    const res = await request("task.save", {
      title: `批量测试${i}`,
      date: today,
      category: "生活",
      priority: "中",
      repeat_rule: '{"type":"none"}',
      reminder: "none",
      done: false,
      campaign_id: null,
      note: "",
    });
    if (res.json.data?.id) batchIds.push(res.json.data.id);
  }
  check("Created 3 tasks for batch test", batchIds.length === 3);

  // Batch done
  const batchDoneRes = await request("task.batch", {
    ids: batchIds,
    op: "done",
    payload: { date: today },
  });
  check("Batch done succeeds", batchDoneRes.json.data && batchDoneRes.json.data.updated.length === 3);

  // Verify all 3 are done
  const r6 = await request("bootstrap");
  const allDone = batchIds.every(id => {
    const t = r6.json.data.tasks.find(t => t.id === id);
    return t && t.done === true;
  });
  check("All 3 batch tasks are done", allDone);

  // Batch undone
  const batchUndoneRes = await request("task.batch", {
    ids: batchIds,
    op: "undone",
    payload: { date: today },
  });
  check("Batch undone succeeds", batchUndoneRes.json.data && batchUndoneRes.json.data.updated.length === 3);

  // Batch move to tomorrow
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  const batchMoveRes = await request("task.batch", {
    ids: batchIds,
    op: "move",
    payload: { date: tomorrow },
  });
  check("Batch move succeeds", batchMoveRes.json.data && batchMoveRes.json.data.updated.length === 3);

  // Verify dates changed
  const r7 = await request("bootstrap");
  const allMoved = batchIds.every(id => {
    const t = r7.json.data.tasks.find(t => t.id === id);
    return t && t.date === tomorrow;
  });
  check("All 3 tasks moved to tomorrow", allMoved);

  // Batch category change
  const batchCatRes = await request("task.batch", {
    ids: batchIds,
    op: "category",
    payload: { category: "作业" },
  });
  check("Batch category change succeeds", batchCatRes.json.data && batchCatRes.json.data.updated.length === 3);

  const r8 = await request("bootstrap");
  const allRecategorized = batchIds.every(id => {
    const t = r8.json.data.tasks.find(t => t.id === id);
    return t && t.category === "作业";
  });
  check("All 3 tasks changed to 作业 category", allRecategorized);

  // Batch delete
  const batchDelRes = await request("task.batch", {
    ids: batchIds,
    op: "delete",
  });
  check("Batch delete succeeds", batchDelRes.json.data && batchDelRes.json.data.updated.length === 3);

  const r9 = await request("bootstrap");
  const allGone = batchIds.every(id => !r9.json.data.tasks.find(t => t.id === id));
  check("All 3 tasks removed after batch delete", allGone);

  // 12. Delete the one-time task and repeat task we created
  if (newTaskId) {
    const delRes = await request("task.delete", { id: newTaskId });
    check("Delete one-time task succeeds", delRes.json.data && delRes.json.data.deleted === true);
  }
  if (repeatTaskId) {
    const delRes2 = await request("task.delete", { id: repeatTaskId });
    check("Delete repeat task succeeds", delRes2.json.data && delRes2.json.data.deleted === true);
  }

  // 13. Verify task.delete also removes completions (for repeat task)
  const r10 = await request("bootstrap");
  const orphanCompletions = r10.json.data.completions.filter(c => c.task_id === repeatTaskId);
  check("No orphan completions after task delete", orphanCompletions.length === 0);

  // 14. Validation: task.save rejects invalid data
  const invalidRes = await request("task.save", {
    title: "",
    date: "not-a-date",
    category: "生活",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    done: false,
    campaign_id: null,
    note: "",
  });
  check("task.save rejects empty title", invalidRes.json.error === "invalid_title");

  const invalidDateRes = await request("task.save", {
    title: "Test",
    date: "bad",
    category: "生活",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    done: false,
    campaign_id: null,
    note: "",
  });
  check("task.save rejects invalid date", invalidDateRes.json.error === "invalid_date");

  // 15. Overdue task detection: create a task with past date
  const pastDate = "2026-09-01";
  const overdueRes = await request("task.save", {
    title: "逾期测试任务",
    date: pastDate,
    category: "学习",
    priority: "高",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    done: false,
    campaign_id: null,
    note: "",
  });
  const overdueId = overdueRes.json.data?.id;
  check("Create overdue task succeeds", !!overdueId);

  const r11 = await request("bootstrap");
  const overdueTask = r11.json.data.tasks.find(t => t.id === overdueId);
  check("Overdue task date is in the past", overdueTask && overdueTask.date < formatDate(new Date()));
  check("Overdue task is not done", overdueTask && overdueTask.done === false);

  // Cleanup overdue task
  if (overdueId) await request("task.delete", { id: overdueId });

  // 16. Biweekly repeat rule expansion
  const biweeklyTask = {
    id: "test-bw",
    title: "Biweekly test",
    date: "2026-09-07",
    repeat_rule: '{"type":"biweekly","weekday":1,"anchor":"2026-09-07"}',
  };
  const anchorMon = parseDate("2026-09-07");
  check("Biweekly task on anchor date", expandTaskOn(biweeklyTask, anchorMon, semester));

  const twoWeeksLater = new Date(anchorMon);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
  check("Biweekly task 2 weeks later", expandTaskOn(biweeklyTask, twoWeeksLater, semester));

  const oneWeekLater = new Date(anchorMon);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  check("Biweekly task NOT 1 week later", !expandTaskOn(biweeklyTask, oneWeekLater, semester));

  // 17. Weeks-type repeat rule
  const weeksTask = {
    id: "test-wk",
    title: "Weeks test",
    date: "2026-09-07",
    repeat_rule: '{"type":"weeks","weekday":3,"weeks":[3,5,7]}',
  };
  const week3Wed = parseDate("2026-09-23");
  check("Weeks task on week 3 Wed", expandTaskOn(weeksTask, week3Wed, semester));

  const week4Wed = parseDate("2026-09-30");
  check("Weeks task NOT on week 4 Wed", !expandTaskOn(weeksTask, week4Wed, semester));

  const week5Wed = parseDate("2026-10-07");
  check("Weeks task on week 5 Wed", expandTaskOn(weeksTask, week5Wed, semester));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
