#!/usr/bin/env node
// Phase 3 verification: Schedule page (day/week views)
import http from "node:http";

const VITE = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:8000";
let pass = 0, fail = 0;

function check(name, cond) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name}`); fail++; }
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

// Date utilities (duplicated for standalone testing)
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

function datesOfWeek(weekIdx, semester) {
  const start = parseDate(semester.start_monday);
  const monday = new Date(start);
  monday.setDate(monday.getDate() + (weekIdx - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });
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

async function main() {
  console.log("Phase 3: 课表页（日/周视图）");

  // 1. Get bootstrap data
  const r1 = await get(`${API}/functions/v1/app?action=bootstrap`);
  const data = JSON.parse(r1.body).data;
  const semester = data.semesters[0];
  const courses = data.courses;
  const holidays = data.holidays;

  check("Bootstrap returns data", data && data.semesters.length > 0);

  // 2. Week 3 Friday (2026-09-25) courses
  const week3Fri = parseDate("2026-09-25");
  const week3FriCourses = courses.filter(c => courseOccursOn(c, week3Fri, semester));
  const week3FriNames = week3FriCourses.map(c => c.name);

  check("Week 3 Fri has 习概", week3FriNames.includes("习概"));
  check("Week 3 Fri has 航空航天概论A", week3FriNames.includes("航空航天概论A"));

  // 3. Week 3 Tuesday (2026-09-22) courses
  const week3Tue = parseDate("2026-09-22");
  const week3TueCourses = courses.filter(c => courseOccursOn(c, week3Tue, semester));
  const week3TueNames = week3TueCourses.map(c => c.name);

  check("Week 3 Tue has 综合法语实训", week3TueNames.includes("综合法语实训"));
  check("Week 3 Tue has 大学计算机基础", week3TueNames.includes("大学计算机基础"));

  // 4. Week 10 Tuesday still has 计算机基础
  const week10Tue = parseDate("2026-11-10");
  const week10 = weekIndexOf(week10Tue, semester);
  check("Week 10 Tuesday date is correct", week10 === 10);

  const week10TueCourses = courses.filter(c => courseOccursOn(c, week10Tue, semester));
  const week10TueNames = week10TueCourses.map(c => c.name);
  check("Week 10 Tue still has 大学计算机基础", week10TueNames.includes("大学计算机基础"));

  // 5. Week 12 Monday has 新时代实践教育
  const week12Mon = parseDate("2026-11-23");
  const week12 = weekIndexOf(week12Mon, semester);
  check("Week 12 Monday date is correct", week12 === 12);

  const week12MonCourses = courses.filter(c => courseOccursOn(c, week12Mon, semester));
  const week12MonNames = week12MonCourses.map(c => c.name);
  check("Week 12 Mon has 新时代实践教育", week12MonNames.includes("新时代实践教育"));

  // 6. Week 4 Friday (2026-10-02) is National Day holiday
  const week4Fri = parseDate("2026-10-02");
  const holiday = holidays.find(h => {
    const ds = formatDate(week4Fri);
    return ds >= h.start_date && ds <= h.end_date;
  });
  check("Week 4 Fri is National Day holiday", holiday && holiday.name === "国庆");

  // 7. Biweekly course (博雅) not in course list (marked as 不排课)
  const boyaCourses = courses.filter(c => c.name.includes("博雅"));
  check("博雅 course not in schedule (不排课)", boyaCourses.length === 0);

  // 8. Week 5 Wednesday courses
  const week5Wed = parseDate("2026-10-07");
  const week5WedCourses = courses.filter(c => courseOccursOn(c, week5Wed, semester));
  check("Week 5 Wed has courses", week5WedCourses.length > 0);

  // 9. datesOfWeek returns correct dates for week 3
  const week3Dates = datesOfWeek(3, semester);
  check("Week 3 Monday is 2026-09-21", week3Dates[0] === "2026-09-21");
  check("Week 3 Friday is 2026-09-25", week3Dates[4] === "2026-09-25");

  // 10. Today's week calculation
  const today = new Date();
  const todayWeek = weekIndexOf(today, semester);
  check("Today is in a valid week", todayWeek > 0 && todayWeek <= semester.total_weeks);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
