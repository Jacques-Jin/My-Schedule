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

async function main() {
  console.log("=== Phase 7: 设置页与提醒系统 ===\n");

  const initial = await request("bootstrap");
  const initialSemesterCount = initial.semesters.length;
  const initialHolidayCount = initial.holidays.length;
  const initialPeriodCount = initial.periodSlots.length;

  // --- 学期管理 ---
  console.log("--- 学期管理 ---");

  const newSem = await request("semester.save", {
    name: "2027春", start_monday: "2027-02-22", total_weeks: 18, is_current: false,
  });
  check("Create semester returns id", !!newSem.id);
  check("Semester name correct", newSem.name === "2027春");
  check("Semester start_monday correct", newSem.start_monday === "2027-02-22");
  check("Semester total_weeks correct", newSem.total_weeks === 18);
  check("Semester is_current false", newSem.is_current === false);

  const updatedSem = await request("semester.save", {
    id: newSem.id, name: "2027春改", start_monday: "2027-02-22", total_weeks: 20, is_current: false,
  });
  check("Update semester name", updatedSem.name === "2027春改");
  check("Update semester total_weeks", updatedSem.total_weeks === 20);

  const currentSem = initial.semesters.find(s => s.is_current);
  const switched = await request("semester.setCurrent", { id: newSem.id });
  check("Set current semester", switched.is_current === true);

  const bootAfterSwitch = await request("bootstrap");
  const newCurrent = bootAfterSwitch.semesters.find(s => s.id === newSem.id);
  check("Bootstrap reflects new current", newCurrent?.is_current === true);
  const oldCurrent = bootAfterSwitch.semesters.find(s => s.id === currentSem?.id);
  check("Old semester no longer current", oldCurrent?.is_current === false);

  await request("semester.setCurrent", { id: currentSem.id });

  let deleteErr = null;
  try { await request("semester.delete", { id: currentSem.id }); } catch (e) { deleteErr = e.message; }
  check("Cannot delete current semester", deleteErr === "cannot_delete_current");

  await request("semester.delete", { id: newSem.id });
  const bootAfterDelete = await request("bootstrap");
  check("Semester deleted from list", bootAfterDelete.semesters.length === initialSemesterCount);

  // --- 节假日管理 ---
  console.log("\n--- 节假日管理 ---");

  const newHoliday = await request("holiday.save", {
    name: "测试假期", start_date: "2026-12-25", end_date: "2026-12-26",
  });
  check("Create holiday returns id", !!newHoliday.id);
  check("Holiday name correct", newHoliday.name === "测试假期");
  check("Holiday dates correct", newHoliday.start_date === "2026-12-25" && newHoliday.end_date === "2026-12-26");

  const updatedHoliday = await request("holiday.save", {
    id: newHoliday.id, name: "测试假期改", start_date: "2026-12-25", end_date: "2026-12-27",
  });
  check("Update holiday name", updatedHoliday.name === "测试假期改");
  check("Update holiday end_date", updatedHoliday.end_date === "2026-12-27");

  await request("holiday.delete", { id: newHoliday.id });
  const bootAfterHoliday = await request("bootstrap");
  check("Holiday deleted from list", bootAfterHoliday.holidays.length === initialHolidayCount);

  // --- 节次时间编辑 ---
  console.log("\n--- 节次时间编辑 ---");

  const firstSlot = initial.periodSlots[0];
  const periodResult = await request("period.save", {
    slots: [{ id: firstSlot.id, slot_no: 1, start_time: "08:10", end_time: "08:55" }],
  });
  check("Period save returns array", Array.isArray(periodResult));
  check("Period updated start_time", periodResult[0].start_time === "08:10");
  check("Period updated end_time", periodResult[0].end_time === "08:55");

  await request("period.save", {
    slots: [{ id: firstSlot.id, slot_no: 1, start_time: firstSlot.start_time, end_time: firstSlot.end_time }],
  });
  const bootAfterPeriod = await request("bootstrap");
  const restoredSlot = bootAfterPeriod.periodSlots.find(p => p.slot_no === 1);
  check("Period restored to original", restoredSlot.start_time === firstSlot.start_time && restoredSlot.end_time === firstSlot.end_time);

  // --- 提醒设置 ---
  console.log("\n--- 提醒设置 ---");

  const origSettings = initial.settings;
  const savedSettings = await request("settings.save", {
    remind_minutes: 15, overlay_repeat: false,
  });
  check("Settings save remind_minutes", savedSettings.remind_minutes === 15);
  check("Settings save overlay_repeat", savedSettings.overlay_repeat === false);

  const bootAfterSettings = await request("bootstrap");
  check("Bootstrap reflects settings", bootAfterSettings.settings.remind_minutes === 15 && bootAfterSettings.settings.overlay_repeat === false);

  await request("settings.save", {
    remind_minutes: origSettings.remind_minutes, overlay_repeat: origSettings.overlay_repeat,
  });

  // --- 数据导出 ---
  console.log("\n--- 数据导出 ---");

  const exported = await request("data.export");
  check("Export has semesters", Array.isArray(exported.semesters));
  check("Export has tasks", Array.isArray(exported.tasks));
  check("Export has courses", Array.isArray(exported.courses));
  check("Export has campaigns", Array.isArray(exported.campaigns));
  check("Export has holidays", Array.isArray(exported.holidays));
  check("Export has period_slots", Array.isArray(exported.period_slots));
  check("Export has settings", Array.isArray(exported.settings));
  check("Export has task_completions", Array.isArray(exported.task_completions));
  check("Export has countdowns", Array.isArray(exported.countdowns));
  check("Export semester count matches", exported.semesters.length === initialSemesterCount);

  // --- 数据导入 ---
  console.log("\n--- 数据导入 ---");

  const snapshot = JSON.parse(JSON.stringify(exported));

  const testCampaign = await request("campaign.save", { name: "导入测试战役" });
  const testTask = await request("task.save", { title: "导入测试日程", date: "2026-10-01" });

  const afterAdd = await request("bootstrap");
  check("Campaign added before import test", afterAdd.campaigns.length === initial.semesters.length > 0 ? exported.campaigns.length + 1 : 1);

  await request("data.import", snapshot);
  const afterImport = await request("bootstrap");
  check("Import restores semester count", afterImport.semesters.length === snapshot.semesters.length);
  check("Import restores holiday count", afterImport.holidays.length === snapshot.holidays.length);
  check("Import restores period count", afterImport.periodSlots.length === snapshot.period_slots.length);
  check("Import restores campaign count", afterImport.campaigns.length === snapshot.campaigns.length);
  check("Import restores task count", afterImport.tasks.length === snapshot.tasks.length);

  const importedCampaign = afterImport.campaigns.find(c => c.name === "导入测试战役");
  check("Imported data does not have test campaign", !importedCampaign);

  // --- 导出→清空→导入 数据一致性 ---
  console.log("\n--- 导出→清空→导入一致性 ---");

  const export1 = await request("data.export");
  await request("data.import", export1);
  const afterReimport = await request("bootstrap");

  check("Reimport semester count matches", afterReimport.semesters.length === export1.semesters.length);
  check("Reimport task count matches", afterReimport.tasks.length === export1.tasks.length);
  check("Reimport course count matches", afterReimport.courses.length === export1.courses.length);
  check("Reimport holiday count matches", afterReimport.holidays.length === export1.holidays.length);
  check("Reimport period count matches", afterReimport.periodSlots.length === export1.period_slots.length);
  check("Reimport settings match", afterReimport.settings.remind_minutes === export1.settings[0].remind_minutes);

  // --- 结果 ---
  console.log(`\n=== 结果：${passed} 通过，${failed} 失败 ===`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error("Test error:", e); process.exit(1); });
