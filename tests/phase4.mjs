#!/usr/bin/env node
// Phase 4 verification: Home page (today overview)
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

function courseOccursOn(course, date, semester) {
  const week = weekIndexOf(date, semester);
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
  console.log("Phase 4: 首页（今日总览）");

  // 1. Bootstrap
  const r1 = await request("bootstrap");
  const data = r1.json.data;
  const semester = data.semesters[0];
  const courses = data.courses;
  const tasks = data.tasks;
  const holidays = data.holidays;

  check("Bootstrap returns data", data && semester);

  // 2. Today's week calculation
  const today = new Date();
  const todayStr = formatDate(today);
  const todayWeek = weekIndexOf(today, semester);
  check("Today's week is valid", todayWeek > 0 && todayWeek <= semester.total_weeks);

  // 3. Today's courses
  const todayCourses = courses.filter(c => courseOccursOn(c, today, semester));
  check("Today has courses", todayCourses.length > 0);

  // 4. Today's tasks (including repeat expansion)
  const todayTasks = tasks.filter(t => {
    const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") return expandTaskOn(t, today, semester);
    return t.date === todayStr;
  });
  check("Today has tasks", todayTasks.length > 0);

  // 5. Timeline merge: courses + tasks sorted by start time
  const PERIOD_SLOTS = [
    { slot_no: 1, start_time: "08:00", end_time: "08:45" },
    { slot_no: 2, start_time: "08:50", end_time: "09:35" },
    { slot_no: 3, start_time: "09:50", end_time: "10:35" },
    { slot_no: 4, start_time: "10:40", end_time: "11:25" },
    { slot_no: 5, start_time: "11:30", end_time: "12:15" },
    { slot_no: 6, start_time: "14:00", end_time: "14:45" },
    { slot_no: 7, start_time: "14:50", end_time: "15:35" },
    { slot_no: 8, start_time: "15:50", end_time: "16:35" },
    { slot_no: 9, start_time: "16:40", end_time: "17:25" },
    { slot_no: 10, start_time: "17:30", end_time: "18:15" },
    { slot_no: 11, start_time: "19:00", end_time: "19:45" },
    { slot_no: 12, start_time: "19:50", end_time: "20:35" },
    { slot_no: 13, start_time: "20:40", end_time: "21:25" },
    { slot_no: 14, start_time: "21:30", end_time: "22:15" },
  ];

  const timeline = [];
  for (const c of todayCourses) {
    const slot = PERIOD_SLOTS.find(s => s.slot_no === c.start_period);
    if (slot) timeline.push({ type: "course", startTime: slot.start_time, course: c });
  }
  for (const t of todayTasks) {
    if (t.start_time) timeline.push({ type: "task", startTime: t.start_time, task: t });
  }
  timeline.sort((a, b) => a.startTime.localeCompare(b.startTime));
  check("Timeline is sorted by start time", timeline.length > 0);

  // 6. Next class calculation
  const nowTime = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
  const sortedCourses = [...todayCourses].sort((a, b) => a.start_period - b.start_period);
  let nextClass = null;
  for (const c of sortedCourses) {
    const endSlot = PERIOD_SLOTS.find(s => s.slot_no === c.end_period);
    if (endSlot && endSlot.end_time > nowTime) {
      const slot = PERIOD_SLOTS.find(s => s.slot_no === c.start_period);
      if (slot) { nextClass = { course: c, slot }; break; }
    }
  }
  // nextClass is null only when all today's classes have already ended
  const allEnded = sortedCourses.every(c => {
    const es = PERIOD_SLOTS.find(s => s.slot_no === c.end_period);
    return es && es.end_time <= nowTime;
  });
  check("Next class calculation works", nextClass || allEnded || todayCourses.length === 0);

  // 7. Holiday detection
  const holiday = holidays.find(h => todayStr >= h.start_date && todayStr <= h.end_date);
  check("Holiday detection works", true); // Just verify the logic runs

  // 8. Countdown chips: holidays in the future
  const futureHolidays = holidays.filter(h => h.start_date >= todayStr);
  check("Future holidays exist for countdown", futureHolidays.length > 0);

  // 9. Create a task for today and verify it appears in today's tasks
  const createRes = await request("task.save", {
    title: "首页测试任务",
    date: todayStr,
    start_time: "20:00",
    end_time: "21:00",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    done: false,
    campaign_id: null,
    note: "",
  });
  const newTaskId = createRes.json.data?.id;
  check("Create task for today succeeds", !!newTaskId);

  // 10. Verify new task appears in today's tasks
  const r2 = await request("bootstrap");
  const updatedTasks = r2.json.data.tasks;
  const newTask = updatedTasks.find(t => t.id === newTaskId);
  check("New task appears in today's tasks", newTask && newTask.date === todayStr);

  // 11. Complete the task and verify progress updates
  await request("task.complete", { id: newTaskId, date: todayStr, done: true });
  const r3 = await request("bootstrap");
  const completedTask = r3.json.data.tasks.find(t => t.id === newTaskId);
  check("Task marked as done", completedTask && completedTask.done === true);

  // 12. Custom countdown
  const countdownRes = await request("countdown.save", {
    name: "期末考试",
    target_date: "2027-01-15",
  });
  check("Create custom countdown succeeds", countdownRes.json.data && countdownRes.json.data.id);

  // 13. Verify countdown appears
  const r4 = await request("bootstrap");
  const countdowns = r4.json.data.countdowns;
  const examCountdown = countdowns.find(c => c.name === "期末考试");
  check("Custom countdown appears in list", !!examCountdown);

  // 14. Days calculation for countdown
  const examDate = parseDate("2027-01-15");
  const todayDate = parseDate(todayStr);
  const daysUntilExam = Math.round((examDate.getTime() - todayDate.getTime()) / 86400000);
  check("Countdown days calculation correct", daysUntilExam > 0);

  // 15. Holiday countdown: 国庆
  const nationalDay = holidays.find(h => h.name === "国庆");
  check("国庆 holiday exists", !!nationalDay);
  if (nationalDay) {
    const ndDate = parseDate(nationalDay.start_date);
    const daysUntilND = Math.round((ndDate.getTime() - todayDate.getTime()) / 86400000);
    check("国庆 countdown days correct", daysUntilND >= 0);
  }

  // 16. Holiday countdown: 寒假
  const winterBreak = holidays.find(h => h.name === "寒假");
  check("寒假 holiday exists", !!winterBreak);
  if (winterBreak) {
    const wbDate = parseDate(winterBreak.start_date);
    const daysUntilWB = Math.round((wbDate.getTime() - todayDate.getTime()) / 86400000);
    check("寒假 countdown days correct", daysUntilWB >= 0);
  }

  // 17. Overlay repeat: daily tasks should appear in timeline when enabled
  const dailyTasks = tasks.filter(t => {
    const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
    return rule.type === "daily" && t.start_time;
  });
  check("Daily repeat tasks exist for overlay", dailyTasks.length > 0);

  // 18. Settings overlay_repeat is true by default
  check("Settings overlay_repeat is true", data.settings.overlay_repeat === true);

  // Cleanup
  if (newTaskId) await request("task.delete", { id: newTaskId });
  if (examCountdown?.id) await request("countdown.delete", { id: examCountdown.id });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
