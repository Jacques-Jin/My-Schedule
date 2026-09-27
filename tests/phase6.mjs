import { strict as assert } from "node:assert";

const BASE = "http://127.0.0.1:8000/functions/v1/app";

async function request(action, payload) {
  const init = payload === undefined
    ? { method: "GET", headers: { Accept: "application/json" } }
    : { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) };
  const res = await fetch(`${BASE}?action=${encodeURIComponent(action)}`, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `http_${res.status}`);
  return json.data;
}

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
}

async function bootstrap() {
  return await request("bootstrap");
}

async function main() {
  console.log("=== Phase 6: 战役计划 ===");

  const initial = await bootstrap();
  const initialCampaignCount = initial.campaigns.length;
  const initialTaskCount = initial.tasks.length;

  // Test 1: Create a campaign
  console.log("\n--- 战役 CRUD ---");
  const campaign1 = await request("campaign.save", {
    name: "备考四级",
    goal: "通过大学英语四级考试",
    deadline: "2026-12-15",
    color: "#3b82f6",
  });
  check("Create campaign returns id", !!campaign1.id);
  check("Campaign name correct", campaign1.name === "备考四级");
  check("Campaign goal correct", campaign1.goal === "通过大学英语四级考试");
  check("Campaign deadline correct", campaign1.deadline === "2026-12-15");
  check("Campaign color correct", campaign1.color === "#3b82f6");

  // Test 2: Create another campaign
  const campaign2 = await request("campaign.save", {
    name: "期末考试",
    goal: "",
    deadline: "2027-01-10",
    color: "#ef4444",
  });
  check("Create second campaign", !!campaign2.id && campaign2.id !== campaign1.id);

  // Test 3: Update campaign
  const updated = await request("campaign.save", {
    id: campaign1.id,
    name: "备考四级（已更新）",
    goal: "目标550分",
    deadline: "2026-12-20",
    color: "#10b981",
  });
  check("Update campaign name", updated.name === "备考四级（已更新）");
  check("Update campaign goal", updated.goal === "目标550分");
  check("Update campaign deadline", updated.deadline === "2026-12-20");
  check("Update campaign color", updated.color === "#10b981");

  // Test 4: Bootstrap includes campaigns
  const bs1 = await bootstrap();
  check("Bootstrap includes new campaigns", bs1.campaigns.length === initialCampaignCount + 2);
  const found = bs1.campaigns.find(c => c.id === campaign1.id);
  check("Bootstrap has updated campaign", found && found.name === "备考四级（已更新）" && found.goal === "目标550分");

  // Test 5: Create tasks attached to campaign
  console.log("\n--- 战役子计划 ---");
  const task1 = await request("task.save", {
    title: "背单词 30 个",
    date: "2026-09-26",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    campaign_id: campaign1.id,
    note: "",
  });
  check("Task created with campaign_id", task1.campaign_id === campaign1.id);

  const task2 = await request("task.save", {
    title: "做听力练习",
    date: "2026-09-27",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    campaign_id: campaign1.id,
    note: "",
  });
  check("Second task attached to campaign", task2.campaign_id === campaign1.id);

  const task3 = await request("task.save", {
    title: "阅读理解训练",
    date: "2026-09-28",
    category: "学习",
    priority: "高",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    campaign_id: campaign1.id,
    note: "",
  });
  check("Third task attached to campaign", task3.campaign_id === campaign1.id);

  // Test 6: Verify tasks in bootstrap
  const bs2 = await bootstrap();
  const campaignTasks = bs2.tasks.filter(t => t.campaign_id === campaign1.id);
  check("Bootstrap shows 3 tasks in campaign", campaignTasks.length === 3);

  // Test 7: Campaign progress (0/3 done initially)
  console.log("\n--- 战役进度 ---");
  const doneCount1 = campaignTasks.filter(t => t.done).length;
  check("Initial progress 0/3", doneCount1 === 0 && campaignTasks.length === 3);

  // Test 8: Complete a task, progress becomes 1/3
  await request("task.complete", { id: task1.id, date: task1.date, done: true });
  const bs3 = await bootstrap();
  const updatedTask1 = bs3.tasks.find(t => t.id === task1.id);
  check("Task marked done", updatedTask1.done === true);
  const campaignTasks2 = bs3.tasks.filter(t => t.campaign_id === campaign1.id);
  const doneCount2 = campaignTasks2.filter(t => t.done).length;
  check("Progress 1/3 after completing one", doneCount2 === 1 && campaignTasks2.length === 3);

  // Test 9: Batch move tasks to a different date
  console.log("\n--- 批量操作 ---");
  await request("task.batch", {
    ids: [task2.id, task3.id],
    op: "move",
    payload: { date: "2026-10-01" },
  });
  const bs4 = await bootstrap();
  const moved2 = bs4.tasks.find(t => t.id === task2.id);
  const moved3 = bs4.tasks.find(t => t.id === task3.id);
  check("Batch move task2 date", moved2.date === "2026-10-01");
  check("Batch move task3 date", moved3.date === "2026-10-01");

  // Test 10: Batch change category
  await request("task.batch", {
    ids: [task2.id, task3.id],
    op: "category",
    payload: { category: "考试" },
  });
  const bs5 = await bootstrap();
  const cat2 = bs5.tasks.find(t => t.id === task2.id);
  const cat3 = bs5.tasks.find(t => t.id === task3.id);
  check("Batch category task2", cat2.category === "考试");
  check("Batch category task3", cat3.category === "考试");

  // Test 11: Batch mark done
  await request("task.batch", {
    ids: [task2.id],
    op: "done",
    payload: { date: "2026-10-01" },
  });
  const bs6 = await bootstrap();
  const done2 = bs6.tasks.find(t => t.id === task2.id);
  check("Batch done task2", done2.done === true);

  // Test 12: Batch mark undone
  await request("task.batch", {
    ids: [task2.id],
    op: "undone",
    payload: { date: "2026-10-01" },
  });
  const bs7 = await bootstrap();
  const undone2 = bs7.tasks.find(t => t.id === task2.id);
  check("Batch undone task2", undone2.done === false);

  // Test 13: Attach existing unattached task to campaign
  console.log("\n--- 拉入已有日程 ---");
  const unattached = await request("task.save", {
    title: "模拟测试",
    date: "2026-09-29",
    category: "考试",
    priority: "高",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    campaign_id: null,
    note: "",
  });
  check("Task created without campaign", unattached.campaign_id === null);

  await request("campaign.attach", {
    campaignId: campaign1.id,
    taskIds: [unattached.id],
  });
  const bs8 = await bootstrap();
  const attached = bs8.tasks.find(t => t.id === unattached.id);
  check("Attach task to campaign", attached.campaign_id === campaign1.id);

  // Test 14: Detach task from campaign
  await request("campaign.attach", {
    campaignId: null,
    taskIds: [unattached.id],
  });
  const bs9 = await bootstrap();
  const detached = bs9.tasks.find(t => t.id === unattached.id);
  check("Detach task from campaign", detached.campaign_id === null);

  // Test 15: Batch delete tasks
  console.log("\n--- 批量删除 ---");
  await request("task.batch", {
    ids: [task3.id],
    op: "delete",
    payload: {},
  });
  const bs10 = await bootstrap();
  const deleted = bs10.tasks.find(t => t.id === task3.id);
  check("Batch delete removes task", !deleted);

  // Test 16: Delete campaign detaches tasks
  console.log("\n--- 删除战役 ---");
  const campaign3 = await request("campaign.save", {
    name: "临时战役",
    goal: "",
    deadline: null,
    color: "#8b5cf6",
  });
  const tempTask = await request("task.save", {
    title: "临时任务",
    date: "2026-09-30",
    category: "学习",
    priority: "中",
    repeat_rule: '{"type":"none"}',
    reminder: "none",
    campaign_id: campaign3.id,
    note: "",
  });
  check("Task in temp campaign", tempTask.campaign_id === campaign3.id);

  await request("campaign.delete", { id: campaign3.id });
  const bs11 = await bootstrap();
  const orphanTask = bs11.tasks.find(t => t.id === tempTask.id);
  check("Delete campaign detaches task", orphanTask.campaign_id === null);
  const campaignGone = bs11.campaigns.find(c => c.id === campaign3.id);
  check("Campaign removed from list", !campaignGone);

  // Test 17: Campaign with no deadline
  console.log("\n--- 边界情况 ---");
  const noDeadline = await request("campaign.save", {
    name: "无截止日期",
    goal: "长期目标",
    deadline: null,
    color: "#f59e0b",
  });
  check("Campaign with null deadline", noDeadline.deadline === null);

  // Test 18: Campaign with empty goal
  const noGoal = await request("campaign.save", {
    name: "无目标描述",
    goal: "",
    deadline: "2026-12-31",
    color: "#ec4899",
  });
  check("Campaign with empty goal", noGoal.goal === "");

  // Test 19: Multiple tasks batch operations
  console.log("\n--- 多任务批量 ---");
  const batchTasks = [];
  for (let i = 0; i < 5; i++) {
    const t = await request("task.save", {
      title: `批量任务${i + 1}`,
      date: "2026-10-05",
      category: "学习",
      priority: "中",
      repeat_rule: '{"type":"none"}',
      reminder: "none",
      campaign_id: campaign2.id,
      note: "",
    });
    batchTasks.push(t);
  }
  check("Created 5 tasks in batch", batchTasks.length === 5);

  const bs12 = await bootstrap();
  const c2Tasks = bs12.tasks.filter(t => t.campaign_id === campaign2.id);
  check("Campaign2 has 5 tasks", c2Tasks.length === 5);

  await request("task.batch", {
    ids: batchTasks.map(t => t.id),
    op: "done",
    payload: { date: "2026-10-05" },
  });
  const bs13 = await bootstrap();
  const allDone = batchTasks.every(t => {
    const found = bs13.tasks.find(x => x.id === t.id);
    return found && found.done;
  });
  check("Batch done all 5 tasks", allDone);

  const doneCount = bs13.tasks.filter(t => t.campaign_id === campaign2.id && t.done).length;
  check("Campaign2 progress 5/5", doneCount === 5);

  // Test 20: Verify campaign list in bootstrap
  console.log("\n--- 最终验证 ---");
  const final = await bootstrap();
  check("Final campaign count correct", final.campaigns.length === initialCampaignCount + 4);
  const c1Final = final.campaigns.find(c => c.id === campaign1.id);
  check("Campaign1 still exists", !!c1Final);
  const c2Final = final.campaigns.find(c => c.id === campaign2.id);
  check("Campaign2 still exists", !!c2Final);

  // Cleanup: delete test campaigns and tasks
  console.log("\n--- 清理测试数据 ---");
  await request("campaign.delete", { id: campaign1.id });
  await request("campaign.delete", { id: campaign2.id });
  await request("campaign.delete", { id: noDeadline.id });
  await request("campaign.delete", { id: noGoal.id });

  const cleanupIds = [task1.id, task2.id, unattached.id, ...batchTasks.map(t => t.id)];
  for (const id of cleanupIds) {
    try { await request("task.delete", { id }); } catch {}
  }

  const afterCleanup = await bootstrap();
  check("Cleanup: campaigns restored", afterCleanup.campaigns.length === initialCampaignCount);

  console.log(`\n=== 结果：${passed} 通过，${failed} 失败 ===`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
