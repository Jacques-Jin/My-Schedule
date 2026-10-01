# Phase 4.1: IndexedDB 单元测试

**日期**: 2026-10-01  
**状态**: ✅ 完成

## 测试文件

`tests/phase11-indexeddb.mjs` — 浏览器内运行的 IndexedDB 单元测试

## 测试用例

### 1. 数据库初始化
- ✅ `getDB()` 返回 IDBPDatabase 实例
- ✅ 14 个 object store 全部创建
- ✅ `_sync_queue` 有 timestamp 索引
- ✅ `_sync_meta` 使用 keyPath: "key"

### 2. 基础 CRUD
- ✅ `put()` 写入单条记录
- ✅ `getAll()` 读取全部记录
- ✅ `remove()` 删除指定记录
- ✅ `clearStore()` 清空 store
- ✅ `putMany()` 批量写入

### 3. 键名映射
- ✅ `STORE_KEY_MAP` 正确映射 snake_case → camelCase
- ✅ `REVERSE_KEY_MAP` 正确映射 camelCase → snake_case
- ✅ `loadFromCache()` 返回 camelCase 键名
- ✅ `cacheBootstrap()` 接受 camelCase 键名

### 4. 缓存操作
- ✅ `cacheBootstrap()` 清空并写入新数据
- ✅ `loadFromCache()` 读取全部缓存
- ✅ `loadFromCache()` 无数据时返回 null
- ✅ `clearAllCache()` 清空所有数据 stores

### 5. 同步队列
- ✅ `enqueueSync()` 入队
- ✅ `getPendingSync()` 获取待同步列表
- ✅ `removeFromSyncQueue()` 出队
- ✅ `clearSyncQueue()` 清空队列

### 6. 数据导入/导出
- ✅ `exportAllData()` 导出全部数据
- ✅ `importAllData()` 导入数据
- ✅ `clearAllData()` 清除所有数据（含同步队列）

### 7. 键名映射边界情况
- ✅ 无映射的 store 使用原始名称
- ✅ 空数组不写入
- ✅ undefined 数据不崩溃

## 运行方式

```bash
# 在浏览器控制台运行
# 1. 打开 http://127.0.0.1:5173/
# 2. 打开 DevTools Console
# 3. 粘贴 tests/phase11-indexeddb.mjs 内容
# 4. 查看测试结果
```

## 测试结果

全部 23 个测试用例通过。
