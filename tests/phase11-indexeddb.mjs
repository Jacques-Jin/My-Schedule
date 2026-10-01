// Phase 4.1: IndexedDB 单元测试
// 在浏览器控制台运行

import * as db from "../src/lib/db.ts";

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.error(`❌ ${name}`);
  }
}

async function runTests() {
  console.log("=== Phase 4.1: IndexedDB 单元测试 ===\n");

  // 清理
  await db.clearAllData();

  // 1. 数据库初始化
  console.log("--- 1. 数据库初始化 ---");
  const dbInstance = await db.getDB();
  assert(dbInstance !== null, "getDB() 返回实例");
  assert(dbInstance.objectStoreNames.length === 13, `13 个 object store (实际: ${dbInstance.objectStoreNames.length})`);
  assert(dbInstance.objectStoreNames.contains("_sync_queue"), "_sync_queue store 存在");
  assert(dbInstance.objectStoreNames.contains("_sync_meta"), "_sync_meta store 存在");

  // 2. 基础 CRUD
  console.log("\n--- 2. 基础 CRUD ---");
  await db.put("homework", { id: "1", title: "测试作业", course_id: "1" });
  const all = await db.getAll("homework");
  assert(all.length === 1, "put + getAll 写入读取");
  assert(all[0].title === "测试作业", "数据内容正确");

  await db.put("homework", { id: "2", title: "作业2", course_id: "2" });
  const all2 = await db.getAll("homework");
  assert(all2.length === 2, "put 追加记录");

  await db.remove("homework", "1");
  const afterRemove = await db.getAll("homework");
  assert(afterRemove.length === 1, "remove 删除记录");
  assert(afterRemove[0].id === "2", "删除后剩余记录正确");

  await db.clearStore("homework");
  const afterClear = await db.getAll("homework");
  assert(afterClear.length === 0, "clearStore 清空 store");

  await db.putMany("homework", [
    { id: "1", title: "批量1" },
    { id: "2", title: "批量2" },
    { id: "3", title: "批量3" },
  ]);
  const batch = await db.getAll("homework");
  assert(batch.length === 3, "putMany 批量写入");

  // 3. 键名映射
  console.log("\n--- 3. 键名映射 ---");
  await db.clearAllCache();
  const testData = {
    semesters: [{ id: "1", name: "测试学期" }],
    periodSlots: [{ id: "1", slot_no: 1 }],
    completions: [{ id: "1", task_id: "1", date: "2026-10-01" }],
    dayOverrides: [{ id: "1", date: "2026-10-01", kind: "holiday" }],
    courses: [], tasks: [], campaigns: [], countdowns: [],
    homework: [], holidays: [], settings: [],
  };
  await db.cacheBootstrap(testData);
  const cached = await db.loadFromCache();
  assert(cached !== null, "loadFromCache 返回数据");
  assert(cached.periodSlots !== undefined, "period_slots → periodSlots 映射");
  assert(cached.completions !== undefined, "task_completions → completions 映射");
  assert(cached.dayOverrides !== undefined, "day_overrides → dayOverrides 映射");
  assert(cached.semesters !== undefined, "semesters 无映射保持原名");

  // 4. 缓存操作
  console.log("\n--- 4. 缓存操作 ---");
  await db.clearAllCache();
  const empty = await db.loadFromCache();
  assert(empty === null, "空缓存返回 null");

  await db.cacheBootstrap(testData);
  const loaded = await db.loadFromCache();
  assert(loaded.semesters.length === 1, "cacheBootstrap 写入数据");

  await db.clearAllCache();
  const afterClearAll = await db.loadFromCache();
  assert(afterClearAll === null, "clearAllCache 清空所有数据");

  // 5. 同步队列
  console.log("\n--- 5. 同步队列 ---");
  await db.clearSyncQueue();
  let pending = await db.getPendingSync();
  assert(pending.length === 0, "初始队列为空");

  await db.enqueueSync("homework.save", { id: "1", title: "同步测试" });
  pending = await db.getPendingSync();
  assert(pending.length === 1, "enqueueSync 入队");
  assert(pending[0].action === "homework.save", "action 正确");

  await db.enqueueSync("task.save", { id: "2", title: "任务" });
  pending = await db.getPendingSync();
  assert(pending.length === 2, "多次入队");

  await db.removeFromSyncQueue(pending[0].id);
  pending = await db.getPendingSync();
  assert(pending.length === 1, "removeFromSyncQueue 出队");

  await db.clearSyncQueue();
  pending = await db.getPendingSync();
  assert(pending.length === 0, "clearSyncQueue 清空队列");

  // 6. 数据导入/导出
  console.log("\n--- 6. 数据导入/导出 ---");
  await db.clearAllData();
  await db.cacheBootstrap(testData);
  const exported = await db.exportAllData();
  assert(exported !== null, "exportAllData 导出数据");
  assert(exported.semesters.length === 1, "导出数据包含学期");

  await db.clearAllData();
  await db.importAllData(testData);
  const imported = await db.loadFromCache();
  assert(imported !== null, "importAllData 导入数据");
  assert(imported.semesters.length === 1, "导入后数据正确");

  await db.clearAllData();
  const afterClearAllData = await db.loadFromCache();
  assert(afterClearAllData === null, "clearAllData 清除所有数据");

  // 7. 边界情况
  console.log("\n--- 7. 边界情况 ---");
  await db.clearAllCache();
  await db.cacheBootstrap({ semesters: [], courses: [] });
  const emptyData = await db.loadFromCache();
  assert(emptyData === null, "空数组数据返回 null");

  await db.cacheBootstrap(undefined);
  const undefinedData = await db.loadFromCache();
  assert(undefinedData === null, "undefined 数据不崩溃");

  // 汇总
  console.log(`\n=== 测试结果 ===`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);

  if (failed === 0) {
    console.log("\n🎉 全部测试通过！");
  } else {
    console.log("\n⚠️ 有测试失败，请检查");
  }
}

runTests().catch(err => {
  console.error("测试运行出错:", err);
});
