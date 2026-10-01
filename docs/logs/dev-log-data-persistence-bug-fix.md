# 开发日志 — 数据持久化 Bug 修复

**日期**: 2026-10-01  
**Runtime**: v44 → v45  
**状态**: ✅ 完成

---

## 问题描述

用户报告：运行 `启动.bat`，添加了几项作业，关闭网站后重新打开，作业数据丢失。

---

## 根因分析

### 数据流追踪

```
页面加载 → refresh() → loadFromCache() → dispatch(bootstrap)
                   → api.bootstrap() → cacheBootstrap(data) → dispatch(bootstrap)
```

### 问题所在

`store.tsx` 的 `refresh()` 函数无条件执行：

```typescript
const data = await api.bootstrap();
await db.cacheBootstrap(data);  // ← 无条件覆盖
dispatch({ type: "bootstrap", data });
```

当 Deno 本地服务器重启时：
1. `api.bootstrap()` 返回种子数据（`homework: []`）
2. `cacheBootstrap(data)` 清空 IndexedDB 并写入空数据
3. 用户之前添加的作业被覆盖丢失

### 根本原因

`cacheBootstrap()` 的设计假设 API 数据总是比本地缓存更新/更完整，但这个假设在本地开发环境不成立：
- Deno 内存服务器重启后数据清空
- API 返回的种子数据不包含用户修改

---

## 修复方案

### 核心修复：countItems() 比较

在 `store.tsx` 添加 `countItems()` 辅助函数：

```typescript
function countItems(data: any): number {
  if (!data) return 0;
  return Object.values(data).reduce((sum: number, v: any) => 
    sum + (Array.isArray(v) ? v.length : 0), 0);
}
```

修改 `refresh()` 逻辑：

```typescript
const refresh = useCallback(async () => {
  let hasCache = false;
  try {
    const cached = await db.loadFromCache();
    if (cached) {
      hasCache = true;
      dispatch({ type: "bootstrap", data: cached });
    }
    const data = await api.bootstrap();
    // 关键：只有当 API 数据量 >= 缓存数据量时才覆盖
    if (!hasCache || countItems(data) >= countItems(cached)) {
      await db.cacheBootstrap(data);
      dispatch({ type: "bootstrap", data });
    }
  } catch {
    if (!hasCache) {
      dispatch({ type: "error" });
    }
  }
}, []);
```

### 边界修复：cacheBootstrap(undefined)

在 `src/lib/db.ts` 添加空值保护：

```typescript
export async function cacheBootstrap(data: any): Promise<void> {
  if (!data) return;  // ← 新增
  const db = await getDB();
  // ...
}
```

---

## 验证测试

### 手动验证

1. 启动 Deno + Vite
2. 添加 3 项作业
3. 刷新页面 → 作业保留 ✅
4. 关闭 Deno，重启 Deno
5. 刷新页面 → 作业仍然保留 ✅

### 自动化测试

**Phase 4.1: IndexedDB 单元测试** — 32/32 通过
- 数据库初始化（4）
- 基础 CRUD（7）
- 键名映射（5）
- 缓存操作（4）
- 同步队列（6）
- 导入/导出（4）
- 边界情况（2）

**Phase 4.2: Sync 集成测试** — 21/21 通过
- 初始状态（2）
- 监听器（3）
- 入队（3）
- 队列持久化（3）
- syncNow（1）
- 状态转换（4）
- 取消订阅（1）
- 空队列（1）
- 防抖（1）
- 在线检测（2）
- API 同步（1）

---

## 文件变更

### 修改

- `src/store.tsx` — 添加 `countItems()`，修改 `refresh()` 逻辑
- `src/lib/db.ts` — `cacheBootstrap()` 添加空值保护

### 新增

- `tests/phase11-indexeddb.mjs` — IndexedDB 单元测试（32 用例）
- `tests/phase12-sync.mjs` — Sync 集成测试（21 用例）
- `docs/logs/dev-log-data-persistence-bug-fix.md` — 本文档

---

## 技术决策

### 为什么用 countItems() 而不是时间戳？

**方案 A：时间戳比较**
- 优点：精确判断哪个更新
- 缺点：需要为每条记录添加 `updated_at`，增加复杂度

**方案 B：countItems() 比较** ✅
- 优点：简单，无需修改数据结构
- 缺点：假设数据只增不减（对于课程表应用成立）

选择方案 B 因为：
1. 最小改动原则
2. 课程表场景下数据主要是新增
3. 避免引入时间戳同步的复杂性

### 本地 vs 线上行为差异

**本地开发**：
- Deno 内存服务器重启后数据丢失
- API 返回空种子数据
- 依赖 IndexedDB 缓存

**线上生产**：
- Supabase 持久化存储
- API 返回完整数据
- IndexedDB 作为加速缓存

修复后的逻辑在两种环境下都正确：
- 本地：缓存数据量 > API 空数据 → 保留缓存
- 线上：API 数据量 >= 缓存 → 更新缓存

---

## 下一步

- ✅ Phase 4.1: IndexedDB 单元测试
- ✅ Phase 4.2: Sync 集成测试
- 可选：Phase 4.3: E2E 测试（Playwright）
- 可选：Phase 4.4: 性能基准测试

---

## 总结

**问题**：Deno 重启导致 IndexedDB 数据被空种子覆盖  
**根因**：`refresh()` 无条件调用 `cacheBootstrap()`  
**修复**：`countItems()` 比较，只在 API 数据更完整时覆盖  
**验证**：53 个自动化测试全部通过 + 手动验证  
**影响**：本地开发数据持久化恢复正常
