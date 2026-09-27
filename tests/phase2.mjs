#!/usr/bin/env node
// Phase 2 verification: data layer, seed data, date engine, CRUD actions
import http from "node:http";

const BASE = "http://127.0.0.1:5173/functions/v1/app";
let pass = 0, fail = 0;

function check(name, cond) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name}`); fail++; }
}

function request(method, action, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}?action=${encodeURIComponent(action)}`);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { "Content-Type": "application/json", Accept: "application/json" },
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, json: null }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const get = (action) => request("GET", action);
const post = (action, body) => request("POST", action, body);

// ---- date.ts logic (duplicated for testing) ----
function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function mondayOfWeek(date) {
  const d = new Date(date); const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0); return d;
}
function weekIndexOf(date, sem) {
  const start = parseDate(sem.start_monday);
  const mon = mondayOfWeek(date);
  const diff = Math.round((mon.getTime() - start.getTime()) / 86400000);
  const w = Math.floor(diff / 7) + 1;
  if (w < 1) return 0; if (w > sem.total_weeks) return -1; return w;
}
function holidayOn(date, holidays) {
  const ds = formatDate(date);
  return holidays.find(h => ds >= h.start_date && ds <= h.end_date) || null;
}
function courseOccursOn(course, date, sem) {
  const week = weekIndexOf(date, sem);
  if (week < 1) return false;
  const dow = date.getDay();
  const weekday = dow === 0 ? 7 : dow;
  if (weekday !== course.weekday) return false;
  const rule = JSON.parse(course.week_rule);
  if (!rule.ranges.some(([lo, hi]) => week >= lo && week <= hi)) return false;
  if (rule.parity === "odd" && week % 2 === 0) return false;
  if (rule.parity === "even" && week % 2 !== 0) return false;
  return true;
}
function expandTaskOn(task, date, sem) {
  const rule = JSON.parse(task.repeat_rule);
  if (rule.type === "none") return task.date === formatDate(date);
  if (formatDate(date) < task.date) return false;
  const dow = date.getDay() || 7;
  if (rule.type === "daily") return true;
  if (rule.type === "weekly") return (rule.weekdays || []).includes(dow);
  return false;
}

async function main() {
  console.log("Phase 2: 数据层、种子数据与日期引擎\n");

  // 1. Bootstrap returns seed data
  console.log("--- Bootstrap seed data ---");
  const r = await get("bootstrap");
  check("bootstrap returns 200", r.status === 200);
  check("bootstrap ok:true", r.json?.ok === true);
  const d = r.json?.data;
  check("semesters not empty", d?.semesters?.length >= 1);
  check("semester is 2026秋", d?.semesters?.[0]?.name === "2026秋");
  check("semester start_monday", d?.semesters?.[0]?.start_monday === "2026-09-07");
  check("semester total_weeks=19", d?.semesters?.[0]?.total_weeks === 19);
  check("semester is_current", d?.semesters?.[0]?.is_current === true);
  check("period_slots = 14", d?.periodSlots?.length === 14);
  check("period slot 1 starts 08:00", d?.periodSlots?.[0]?.start_time === "08:00");
  check("period slot 14 ends 22:15", d?.periodSlots?.[13]?.end_time === "22:15");
  check("holidays = 5", d?.holidays?.length === 5);
  check("courses >= 20", d?.courses?.length >= 20);
  check("tasks = 3 (routines)", d?.tasks?.length === 3);
  check("settings remind_minutes=10", d?.settings?.remind_minutes === 10);
  check("settings overlay_repeat=true", d?.settings?.overlay_repeat === true);

  // 2. seed.ifEmpty should not re-seed
  console.log("\n--- seed.ifEmpty idempotent ---");
  const sr = await post("seed.ifEmpty", {});
  check("seed.ifEmpty returns ok", sr.json?.ok === true);
  check("seed reports not seeded", sr.json?.data?.seeded === false);

  // 3. Date engine tests
  console.log("\n--- date.ts key cases ---");
  const sem = d.semesters[0];
  const holidays = d.holidays;
  const courses = d.courses;

  // 2026-09-25 = week 3 Friday
  const sep25 = parseDate("2026-09-25");
  const w3 = weekIndexOf(sep25, sem);
  check("2026-09-25 = week 3", w3 === 3);
  check("2026-09-25 = Friday (dow=5)", sep25.getDay() === 5);

  // 10/1 hits 国庆
  const oct1 = parseDate("2026-10-01");
  const hol = holidayOn(oct1, holidays);
  check("10/1 = 国庆 holiday", hol?.name === "国庆");

  // 9/20 = 中秋
  const sep20 = parseDate("2026-09-20");
  const hol2 = holidayOn(sep20, holidays);
  check("9/20 = 中秋 holiday", hol2?.name === "中秋");

  // 新时代实践教育 is weekday=1 (Monday), week 12
  // Week 12 Mon = 2026-11-23
  const w12Mon = parseDate("2026-11-23");
  check("2026-11-23 = week 12", weekIndexOf(w12Mon, sem) === 12);
  check("2026-11-23 = Monday", w12Mon.getDay() === 1);

  const w12MonCourses = courses.filter(c => courseOccursOn(c, w12Mon, sem));
  const w12MonNames = w12MonCourses.map(c => c.name);
  check("week12 Mon has 新时代实践教育", w12MonNames.includes("新时代实践教育"));

  // Week 12 Tue: 计算机基础 has gap at week 12 (weeks 2-11 and 13-15)
  const w12Tue = parseDate("2026-11-24");
  check("2026-11-24 = week 12 Tue", weekIndexOf(w12Tue, sem) === 12 && w12Tue.getDay() === 2);
  const w12TueCourses = courses.filter(c => courseOccursOn(c, w12Tue, sem));
  const w12TueNames = w12TueCourses.map(c => c.name);
  check("week12 Tue no 大学计算机基础 (gap week)", !w12TueNames.includes("大学计算机基础"));
  check("week12 Tue no 新时代实践教育", !w12TueNames.includes("新时代实践教育"));

  // Wednesday periods 3-4 in week 4 = 综合法语 (蔡小燕)
  // Week 4 Mon = 2026-09-28, Wed = 2026-09-30
  const w4Wed = parseDate("2026-09-30");
  check("2026-09-30 = week 4", weekIndexOf(w4Wed, sem) === 4);
  const w4WedCourses = courses.filter(c => courseOccursOn(c, w4Wed, sem));
  check("week4 Wed has 综合法语", w4WedCourses.some(c => c.name === "综合法语"));

  // 习概 only in specific weeks (Friday = weekday 5)
  // Week 2: Mon=2026-09-14, Fri=2026-09-18
  const week2Fri = parseDate("2026-09-18");
  check("2026-09-18 = week 2", weekIndexOf(week2Fri, sem) === 2);
  const week2Xi = courses.filter(c => courseOccursOn(c, week2Fri, sem) && c.name === "习概");
  check("week2 Fri has 习概 (孙润南)", week2Xi.length === 1 && week2Xi[0].teacher === "孙润南");

  // Week 3: Mon=2026-09-21, Fri=2026-09-25
  const week3Fri = parseDate("2026-09-25");
  check("2026-09-25 = week 3", weekIndexOf(week3Fri, sem) === 3);
  const week3Xi = courses.filter(c => courseOccursOn(c, week3Fri, sem) && c.name === "习概");
  check("week3 Fri has 习概 (董卓宁)", week3Xi.length === 1 && week3Xi[0].teacher === "董卓宁");

  // Week 13 Tue should have 计算机基础 (weeks 13-15 range)
  // Week 13 Mon = 2026-11-30, Tue = 2026-12-01
  const w13Tue = parseDate("2026-12-01");
  check("2026-12-01 = week 13", weekIndexOf(w13Tue, sem) === 13);
  const w13Courses = courses.filter(c => courseOccursOn(c, w13Tue, sem));
  check("week13 Tue has 大学计算机基础", w13Courses.some(c => c.name === "大学计算机基础"));

  // 4. Repeat task expansion
  console.log("\n--- Repeat task expansion ---");
  const dailyTask = d.tasks.find(t => t.title === "起床早餐");
  check("daily task exists", !!dailyTask);
  if (dailyTask) {
    check("daily task on week4 Wed", expandTaskOn(dailyTask, w4Wed, sem) === true);
    check("daily task on any date", expandTaskOn(dailyTask, parseDate("2026-10-15"), sem) === true);
  }

  // 5. CRUD actions
  console.log("\n--- CRUD actions ---");

  // Create semester
  const newSem = await post("semester.save", { name: "2027春", start_monday: "2027-02-22", total_weeks: 18, is_current: false });
  check("semester.save returns ok", newSem.json?.ok === true);
  check("semester.save returns id", !!newSem.json?.data?.id);
  const semId = newSem.json?.data?.id;

  // Create holiday
  const newHol = await post("holiday.save", { name: "测试假", start_date: "2026-12-25", end_date: "2026-12-25" });
  check("holiday.save returns ok", newHol.json?.ok === true);
  const holId = newHol.json?.data?.id;

  // Create course
  const newCourse = await post("course.save", { semester_id: semId, name: "测试课", teacher: "测试", weekday: 1, start_period: 1, end_period: 2, week_rule: '{"ranges":[[1,5]],"parity":null}', location: "测试教室", color: "#000", note: "" });
  check("course.save returns ok", newCourse.json?.ok === true);
  const courseId = newCourse.json?.data?.id;

  // Create task
  const newTask = await post("task.save", { title: "测试日程", date: "2026-09-28", category: "学习", priority: "高" });
  check("task.save returns ok", newTask.json?.ok === true);
  const taskId = newTask.json?.data?.id;

  // Complete task
  const comp = await post("task.complete", { id: taskId, date: "2026-09-28", done: true });
  check("task.complete returns ok", comp.json?.ok === true);

  // Create campaign
  const newCamp = await post("campaign.save", { name: "测试战役", goal: "测试目标", deadline: "2026-12-31", color: "#ff0000" });
  check("campaign.save returns ok", newCamp.json?.ok === true);
  const campId = newCamp.json?.data?.id;

  // Attach task to campaign
  const attach = await post("campaign.attach", { campaignId: campId, taskIds: [taskId] });
  check("campaign.attach returns ok", attach.json?.ok === true);

  // Create countdown
  const newCd = await post("countdown.save", { name: "测试倒计时", target_date: "2027-01-01" });
  check("countdown.save returns ok", newCd.json?.ok === true);
  const cdId = newCd.json?.data?.id;

  // Update settings
  const newSettings = await post("settings.save", { remind_minutes: 15, overlay_repeat: false });
  check("settings.save returns ok", newSettings.json?.ok === true);
  check("settings updated remind_minutes", newSettings.json?.data?.remind_minutes === 15);

  // Verify bootstrap reflects changes
  const r2 = await get("bootstrap");
  const d2 = r2.json?.data;
  check("bootstrap has new semester", d2?.semesters?.some(s => s.id === semId));
  check("bootstrap has new holiday", d2?.holidays?.some(h => h.id === holId));
  check("bootstrap has new course", d2?.courses?.some(c => c.id === courseId));
  check("bootstrap has new task", d2?.tasks?.some(t => t.id === taskId));
  check("bootstrap has new campaign", d2?.campaigns?.some(c => c.id === campId));
  check("bootstrap has new countdown", d2?.countdowns?.some(c => c.id === cdId));
  check("task attached to campaign", d2?.tasks?.find(t => t.id === taskId)?.campaign_id === campId);

  // Delete operations
  const delCourse = await post("course.delete", { id: courseId });
  check("course.delete returns ok", delCourse.json?.ok === true);

  const delHol = await post("holiday.delete", { id: holId });
  check("holiday.delete returns ok", delHol.json?.ok === true);

  const delCd = await post("countdown.delete", { id: cdId });
  check("countdown.delete returns ok", delCd.json?.ok === true);

  const delTask = await post("task.delete", { id: taskId });
  check("task.delete returns ok", delTask.json?.ok === true);

  const delCamp = await post("campaign.delete", { id: campId });
  check("campaign.delete returns ok", delCamp.json?.ok === true);

  const delSem = await post("semester.delete", { id: semId });
  check("semester.delete returns ok", delSem.json?.ok === true);

  // Cannot delete current semester
  const currentSemId = d.semesters[0].id;
  const delCurrent = await post("semester.delete", { id: currentSemId });
  check("cannot delete current semester", delCurrent.json?.error === "cannot_delete_current");

  // 6. Validation tests
  console.log("\n--- Validation ---");
  const badSem = await post("semester.save", { name: "", start_monday: "bad", total_weeks: 0 });
  check("semester.save rejects invalid data", badSem.json?.error === "invalid_name");

  const badTask = await post("task.save", { title: "", date: "bad" });
  check("task.save rejects empty title", badTask.json?.error === "invalid_title");

  const badCourse = await post("course.save", { name: "test", weekday: 8, start_period: 1, end_period: 2, week_rule: '{}' });
  check("course.save rejects weekday=8", badCourse.json?.error === "invalid_weekday");

  // 7. Batch operations
  console.log("\n--- Batch operations ---");
  const t1 = await post("task.save", { title: "批量1", date: "2026-09-28" });
  const t2 = await post("task.save", { title: "批量2", date: "2026-09-28" });
  const t1id = t1.json?.data?.id;
  const t2id = t2.json?.data?.id;

  const batchDone = await post("task.batch", { ids: [t1id, t2id], op: "done", payload: {} });
  check("task.batch done returns ok", batchDone.json?.ok === true);

  const batchMove = await post("task.batch", { ids: [t1id], op: "move", payload: { date: "2026-09-29" } });
  check("task.batch move returns ok", batchMove.json?.ok === true);

  const batchCat = await post("task.batch", { ids: [t1id], op: "category", payload: { category: "工作" } });
  check("task.batch category returns ok", batchCat.json?.ok === true);

  const batchDel = await post("task.batch", { ids: [t1id, t2id], op: "delete", payload: {} });
  check("task.batch delete returns ok", batchDel.json?.ok === true);

  // 8. Period save
  console.log("\n--- Period save ---");
  const periods = d.periodSlots;
  if (periods.length > 0) {
    const ps = await post("period.save", { slots: [{ id: periods[0].id, slot_no: 1, start_time: "08:05", end_time: "08:50" }] });
    check("period.save returns ok", ps.json?.ok === true);
    // Restore original
    await post("period.save", { slots: [{ id: periods[0].id, slot_no: 1, start_time: "08:00", end_time: "08:45" }] });
  }

  // 9. Semester setCurrent
  console.log("\n--- Semester setCurrent ---");
  const newSem2 = await post("semester.save", { name: "2027春test", start_monday: "2027-02-22", total_weeks: 18, is_current: false });
  const sem2Id = newSem2.json?.data?.id;
  const setCur = await post("semester.setCurrent", { id: sem2Id });
  check("semester.setCurrent returns ok", setCur.json?.ok === true);
  // Restore
  await post("semester.setCurrent", { id: d.semesters[0].id });
  // Cleanup
  await post("settings.save", { remind_minutes: 10, overlay_repeat: true });
  await post("semester.delete", { id: sem2Id });

  // 10. TypeScript compiles
  console.log("\n--- TypeScript ---");
  const { execSync } = await import("node:child_process");
  try {
    execSync("C:/Users/Jack/.qoder-cn/bin/node/node.exe node_modules/typescript/bin/tsc --noEmit", { cwd: "D:/AI_WorkStation/my-schedule", stdio: "pipe" });
    check("TypeScript compiles cleanly", true);
  } catch (e) {
    check("TypeScript compiles cleanly", false);
    const stderr = e.stderr?.toString() || "";
    if (stderr) console.log(stderr.slice(0, 500));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
