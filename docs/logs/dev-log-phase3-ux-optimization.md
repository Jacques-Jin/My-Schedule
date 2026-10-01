# 开发日志 - Phase 3: 用户体验优化

**日期**: 2026-10-01  
**阶段**: Phase 3 - UX optimization (3.1-3.5)  
**状态**: ✅ 完成

## 完成内容

### 3.1 首次启动引导 ✅
- **文件**: `src/App.tsx`
- **实现**: 检测 IndexedDB 为空时自动调用 `seedIfEmpty()` 从云端拉取种子数据
- **逻辑**: 当 `state.courses.length === 0 && state.tasks.length === 0 && state.semesters.length === 0` 时触发

### 3.2 数据导出/导入适配 ✅
- **文件**: `src/pages/SettingsPage.tsx`, `src/lib/db.ts`
- **实现**: 
  - 导出功能读取 IndexedDB 本地数据（`db.exportAllData()`）
  - 导入功能写入 IndexedDB（`db.importAllData()`）
  - 修复了 snake_case/camelCase 键名映射问题

### 3.3 存储配额管理 ⏸️ 延期
- **原因**: 单设备使用场景下配额问题不紧急，浏览器会自动提示
- **备注**: 可在后续版本中添加配额检测和清理建议

### 3.4 错误处理与降级 ⏸️ 延期
- **原因**: 当前架构已有完善的错误处理（cache-first + API fallback）
- **备注**: IndexedDB 不可用时的内存降级方案可在后续优化

### 3.5 清除数据功能 ✅
- **文件**: `src/pages/SettingsPage.tsx`, `src/lib/db.ts`, `src/store.tsx`
- **实现**:
  - 新增 `clearAllData()` 函数清除所有 IndexedDB stores（包括 `_sync_queue` 和 `_sync_meta`）
  - 新增 `clearLocalData` store 方法
  - 设置页 → 数据备份 tab 新增"清除本地数据"按钮
  - 带确认对话框，防止误操作
  - 清除后自动从云端重新拉取数据

## 关键修复

### IndexedDB 键名映射问题
**问题**: IndexedDB stores 使用 snake_case（`day_overrides`, `period_slots`），但 State 接口使用 camelCase（`dayOverrides`, `periodSlots`），导致从缓存加载时字段为 undefined，应用崩溃。

**修复**: 
- 在 `db.ts` 中添加 `STORE_KEY_MAP` 和 `REVERSE_KEY_MAP` 进行键名转换
- `loadFromCache()` 返回 camelCase 键名
- `cacheBootstrap()` 和 `importAllData()` 正确处理 camelCase → snake_case 映射

**影响文件**: `src/lib/db.ts`

## 测试验收

### 验收测试 1: 首次启动引导
- ✅ 清除本地数据后刷新页面
- ✅ 应用自动从云端拉取种子数据
- ✅ 首页正常显示课程、日程、倒计时

### 验收测试 2: 数据导出
- ✅ 设置页 → 数据备份 → 导出 JSON
- ✅ 导出的 JSON 包含所有数据（学期、课程、日程等）
- ✅ 文件名格式正确：`schedule-backup-2026-10-01.json`

### 验收测试 3: 数据导入
- ✅ 选择导出的 JSON 文件
- ✅ 数据成功导入 IndexedDB
- ✅ 页面刷新后数据保留

### 验收测试 4: 清除本地数据
- ✅ 点击"清除本地数据"按钮
- ✅ 确认对话框正常显示
- ✅ 确认后 IndexedDB 被清空
- ✅ 应用自动从云端重新拉取数据
- ✅ 首页数据恢复正常

### 验收测试 5: 离线体验
- ✅ 关闭 Deno 服务器模拟离线
- ✅ 应用仍可从 IndexedDB 加载数据
- ✅ 用户操作正常，修改保存到本地
- ✅ SyncIndicator 显示离线状态和待同步数量

## 技术细节

### IndexedDB Store 映射
```typescript
const STORE_KEY_MAP: Record<string, string> = {
  period_slots: "periodSlots",
  task_completions: "completions",
  day_overrides: "dayOverrides",
};

const REVERSE_KEY_MAP: Record<string, string> = {
  periodSlots: "period_slots",
  completions: "task_completions",
  dayOverrides: "day_overrides",
};
```

### 清除数据流程
1. 用户点击"清除本地数据"
2. 显示确认对话框
3. 用户确认后调用 `clearLocalData()`
4. `db.clearAllData()` 清除所有 stores
5. `refresh()` 重新加载数据
6. IndexedDB 为空，触发 API 拉取
7. 数据写入 IndexedDB 并更新 UI

## 下一步

Phase 3 完成，进入 Phase 4: 测试与部署
- 编写单元测试
- 集成测试
- 跨浏览器测试
- 构建与部署
