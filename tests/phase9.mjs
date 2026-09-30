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

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
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

// Inline copy of src/lib/schedule-cell.ts cellToTaskDraft
function parseTime(s) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function formatHM(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(h, m, mins) {
  const total = h * 60 + m + mins;
  if (total >= 24 * 60) return "23:59";
  return formatHM(Math.floor(total / 60), total % 60);
}

function cellToTaskDraft(dateStr, slot) {
  const start = parseTime(slot.start_time);
  const startTime = start ? formatHM(start.h, start.m) : "08:00";
  const end = parseTime(slot.end_time);
  let endTime;
  if (end) {
    endTime = formatHM(end.h, end.m);
  } else {
    const s = start ?? { h: 8, m: 0 };
    endTime = addMinutes(s.h, s.m, 45);
  }
  return { date: dateStr, start_time: startTime, end_time: endTime };
}

async function main() {
  console.log("Phase 9: 课表空白时段点击新建待办");

  // ── A. cellToTaskDraft pure function (6 tests) ──
  console.log("\n  A. cellToTaskDraft 纯函数");

  const r1 = cellToTaskDraft("2026-09-28", { start_time: "08:00", end_time: "08:45" });
  check("第1节 08:00–08:45", eq(r1, { date: "2026-09-28", start_time: "08:00", end_time: "08:45" }));

  const r2 = cellToTaskDraft("2026-09-30", { start_time: "09:50", end_time: "10:35" });
  check("第3节 09:50–10:35 原样透传", eq(r2, { date: "2026-09-30", start_time: "09:50", end_time: "10:35" }));

  const r3 = cellToTaskDraft("2026-10-01", { start_time: "14:00", end_time: "14:45" });
  check("第6节 14:00–14:45 跨午休首节", eq(r3, { date: "2026-10-01", start_time: "14:00", end_time: "14:45" }));

  const r4 = cellToTaskDraft("2026-10-05", { start_time: "21:30", end_time: "22:15" });
  check("第14节 21:30–22:15", eq(r4, { date: "2026-10-05", start_time: "21:30", end_time: "22:15" }));

  const r5 = cellToTaskDraft("2026-10-06", { start_time: "10:40", end_time: "" });
  check("end_time缺失兜底 +45min → 11:25", eq(r5, { date: "2026-10-06", start_time: "10:40", end_time: "11:25" }));

  const r6 = cellToTaskDraft("2026-10-07", { start_time: "23:40", end_time: "" });
  check("start_time=23:40 兜底截断 → 23:59", eq(r6, { date: "2026-10-07", start_time: "23:40", end_time: "23:59" }));

  // ── B. task.save with time fields (5 tests) ──
  console.log("\n  B. task.save 携带时段");

  // Seed semester for task operations
  await request("seed.ifEmpty");

  const task1 = await request("task.save", {
    title: "时段测试1",
    date: "2026-10-15",
    start_time: "09:50",
    end_time: "10:35",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    note: "",
  });
  check("新建带时段任务返回id", task1.id != null && (typeof task1.id === "string" || typeof task1.id === "number"));
  check("时段字段原样返回", task1.start_time === "09:50" && task1.end_time === "10:35");

  const task1Updated = await request("task.save", {
    id: task1.id,
    title: "时段测试1-改",
    date: "2026-10-15",
    start_time: "14:00",
    end_time: "14:45",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    note: "",
  });
  check("更新时段为新值", task1Updated.start_time === "14:00" && task1Updated.end_time === "14:45");

  const task2 = await request("task.save", {
    title: "无时段任务",
    date: "2026-10-16",
    category: "生活",
    priority: "低",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    note: "",
  });
  check("不传时段仍保存成功", task2.id != null && (typeof task2.id === "string" || typeof task2.id === "number"));

  let dateErr = false;
  try {
    await request("task.save", {
      title: "坏日期",
      date: "2026-9-3",
      category: "学习",
      priority: "中",
      repeat_rule: '{"type":"none"}',
      reminder: "none",
      note: "",
    });
  } catch {
    dateErr = true;
  }
  check("非法日期抛错", dateErr);

  // Bootstrap and verify
  const boot = await request("bootstrap");
  const found = boot.tasks.find(t => t.id === task1.id);
  check("bootstrap读回时段一致", found && found.start_time === "14:00" && found.end_time === "14:45");

  // ── C. Regression (3 tests) ──
  console.log("\n  C. 回归对照");

  const task3 = await request("task.save", {
    title: "旧式无时段",
    date: "2026-10-17",
    category: "作业",
    priority: "高",
    note: "regression",
  });
  check("旧式task.save默认字段正常", task3.category === "作业" && task3.priority === "高");

  const boot2 = await request("bootstrap");
  const found3 = boot2.tasks.find(t => t.id === task3.id);
  const rule = JSON.parse(found3.repeat_rule || '{"type":"none"}');
  check("repeat_rule未传不误判为重复", rule.type === "none");
  check("campaign_id未传为null", found3.campaign_id == null);

  // Cleanup
  await request("task.delete", { id: task1.id });
  await request("task.delete", { id: task2.id });
  await request("task.delete", { id: task3.id });

  console.log(`\n  Phase 9 结果: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error("Phase 9 error:", err.message);
  process.exit(1);
});
