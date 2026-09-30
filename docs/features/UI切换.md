# UI 主题切换功能 — 技术方案

> 状态：计划中（未实施）
> 创建：2026-09-30
> 目标：让用户在设置页中选择不同 UI 设计，并为后续 UI 设计 agent 提供标准化的主题接入通道

---

## 1. 现状分析

### 1.1 当前样式架构

| 文件 | 行数 | 作用 |
|------|------|------|
| `src/styles.css` | ~1355 | 应用主样式表，全局 class 选择器，**无作用域隔离** |
| `src/globals.css` | ~138 | shadcn/Tailwind 4 层，有 `prefers-color-scheme: dark` 媒体查询，但仅影响 shadcn token |

**关键发现**：`styles.css` 的 `:root`（第 1–17 行）定义了 ~15 个 CSS 变量（`--color-bg`、`--color-primary`、`--radius`、`--shadow-sm` 等），整个文件的颜色、圆角、阴影几乎全部通过 `var()` 引用。这意味着 **仅覆盖这些变量即可改变全站配色**，无需重写组件样式。

### 1.2 当前设置系统

- **前端**：`src/store.tsx` 中 `Settings` 接口仅有 `id`、`remind_minutes`、`overlay_repeat` 三个字段
- **后端**：`functions/handler.mjs` 的 `settings.save` action 白名单为 `["remind_minutes", "overlay_repeat"]`
- **数据库**：`settings` 表为单行表（`id = 1`），schema v4
- **加载**：设置随 `bootstrap` action 一并返回，无独立 `settings.get`

### 1.3 当前设置页

`src/pages/SettingsPage.tsx`（436 行）使用 tab 切换 5 个区域：学期、假期、节次、提醒、数据。其中「提醒」区域（`ReminderSection`）是唯一读写 settings 的地方。

---

## 2. 设计目标

1. **用户侧**：设置页新增「外观」选项，可预览并切换 UI 主题
2. **开发者侧**：后续 UI 设计 agent 只需按约定创建 CSS 文件 + 注册，即可接入新主题
3. **零破坏**：默认主题 = 当前样式，不影响现有功能
4. **持久化**：主题选择同步到数据库，跨设备生效；同时写入 localStorage 防止首屏闪烁

---

## 3. 技术方案

### 3.1 主题系统架构

```
┌─────────────────────────────────────────────────┐
│                  <html data-theme="xxx">         │
│                                                  │
│  ┌──────────────┐   ┌──────────────────────────┐ │
│  │ styles.css   │   │ themes/dark.css          │ │
│  │ (基础样式)    │   │ themes/xxx.css           │ │
│  │ :root {      │   │ [data-theme="dark"] {    │ │
│  │   --color-*  │   │   --color-*: 覆盖值      │ │
│  │ }            │   │ }                        │ │
│  └──────────────┘   │ [data-theme="dark"] .xxx │ │
│                      │   额外样式覆盖           │ │
│                      └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**原理**：
- `styles.css` 保持不变，作为基础层
- 每个主题是一个独立 CSS 文件，通过 `[data-theme="xxx"]` 属性选择器覆盖 CSS 变量和/或添加额外样式
- 切换主题 = 修改 `<html>` 的 `data-theme` 属性
- 默认主题（`default`）= 无 `data-theme` 属性 = 当前样式

### 3.2 主题注册表

新建 `src/themes/registry.ts`：

```typescript
export interface ThemeInfo {
  id: string;           // 唯一标识，如 "dark", "ocean", "minimal"
  name: string;         // 显示名称，如 "深色模式", "海洋"
  description: string;  // 简短描述
  cssFile: string;      // CSS 文件路径（相对于 src/themes/）
  preview?: string;     // 预览图路径（可选）
}

export const THEMES: ThemeInfo[] = [
  {
    id: "default",
    name: "默认",
    description: "当前默认样式",
    cssFile: "",  // 默认主题无需额外 CSS
  },
  // 后续 agent 在此追加新主题 ↓
];

export function getTheme(id: string): ThemeInfo | undefined {
  return THEMES.find(t => t.id === id);
}
```

**后续 agent 添加主题只需两步**：
1. 在 `src/themes/` 下创建 CSS 文件
2. 在 `THEMES` 数组中追加一条注册信息

### 3.3 CSS 文件加载策略

使用 Vite 的 `import()` 动态加载，确保只加载当前主题的 CSS：

```typescript
// src/themes/loader.ts
const cssCache = new Map<string, HTMLStyleElement>();

export async function applyTheme(themeId: string): Promise<void> {
  // 1. 设置 data-theme 属性
  if (themeId === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeId);
  }

  // 2. 动态加载 CSS（仅非默认主题需要）
  if (themeId === "default") return;

  if (!cssCache.has(themeId)) {
    // Vite 支持动态 import CSS，会生成独立 chunk
    await import(`./themes/${themeId}.css`);
  }
}
```

> **备选方案**：如果主题数量少（≤5），也可以在 `main.tsx` 中静态 import 所有主题 CSS，依靠 `[data-theme]` 选择器自动匹配。这样更简单，但会增加初始包体积。推荐在主题数 >3 时切换到动态加载。

### 3.4 首屏防闪烁（FOUC Prevention）

在 `index.html` 的 `<head>` 中注入一段同步脚本，在 React 加载前就设置 `data-theme`：

```html
<script>
  (function() {
    var t = localStorage.getItem('app-theme');
    if (t && t !== 'default') {
      document.documentElement.setAttribute('data-theme', t);
    }
  })();
</script>
```

应用启动后从 bootstrap 数据中获取服务端保存的主题值，若与 localStorage 不一致则以服务端为准并更新 localStorage。

### 3.5 数据流

```
用户选择主题
    │
    ├─→ localStorage.setItem('app-theme', id)     // 即时生效，防刷新闪烁
    ├─→ document.documentElement.dataset.theme     // 即时切换 CSS
    └─→ saveSettings({ theme: id })               // 持久化到数据库
         └─→ api.settingsSave → handler.mjs → Supabase
              └─→ dispatch({ type: "update_settings", data: row })
```

页面加载时：
```
index.html 内联脚本 → 读 localStorage → 设置 data-theme（防闪烁）
    ↓
React mount → bootstrap → settings.theme
    ↓
若 settings.theme ≠ localStorage → 以服务端为准 → 更新 data-theme + localStorage
```

---

## 4. 开发步骤

### Phase 1：基础设施（本阶段实施）

| # | 任务 | 涉及文件 | 说明 |
|---|------|----------|------|
| 1.1 | 数据库迁移 | Supabase migration | `ALTER TABLE settings ADD COLUMN theme text NOT NULL DEFAULT 'default'` |
| 1.2 | 后端适配 | `functions/handler.mjs` | bootstrap 列选择加 `theme`；`settings.save` 白名单加 `theme`；SEED 加 `theme: "default"` |
| 1.3 | 本地开发适配 | `functions/local-dev-index.ts` | 内存 settings 对象加 `theme` 字段 |
| 1.4 | 前端类型 | `src/store.tsx` | `Settings` 接口加 `theme: string`；`defaultSettings` 加 `theme: "default"` |
| 1.5 | 主题注册表 | `src/themes/registry.ts`（新建） | 定义 `ThemeInfo` 接口和 `THEMES` 数组 |
| 1.6 | 主题加载器 | `src/themes/loader.ts`（新建） | `applyTheme()` 函数 |
| 1.7 | 防闪烁脚本 | `index.html` | `<head>` 中注入 localStorage 读取脚本 |
| 1.8 | 应用启动集成 | `src/main.tsx` 或 `App.tsx` | bootstrap 后调用 `applyTheme(settings.theme)` |
| 1.9 | 设置页 UI | `src/pages/SettingsPage.tsx` | 新增「外观」tab，渲染主题选择卡片 |
| 1.10 | 主题卡片组件 | `src/components/settings/ThemeCard.tsx`（新建） | 单个主题的预览卡片 |
| 1.11 | 外观区域样式 | `src/styles.css` | `.settings-theme-*` 相关样式 |
| 1.12 | 测试 | `tests/phase11.mjs`（新建） | 主题切换 + 持久化 + 防闪烁测试 |

### Phase 2：首个示例主题（可选，由后续 agent 执行）

创建一个 `dark` 主题作为参考实现，验证整个管道可用：

| # | 任务 | 说明 |
|---|------|------|
| 2.1 | 创建 `src/themes/dark.css` | 覆盖 `:root` 变量为深色系配色 |
| 2.2 | 注册到 `THEMES` 数组 | `{ id: "dark", name: "深色模式", ... }` |
| 2.3 | 验证全站效果 | 逐页检查：首页、日程、课表、战役、设置 |
| 2.4 | 处理硬编码颜色 | 排查 `styles.css` 中少量硬编码 hex 值，改为 `var()` |

### Phase 3+：后续 UI 设计 agent 接入

每个新主题的开发流程：

1. 在 `src/themes/` 下创建 `{theme-id}.css`
2. 在 `registry.ts` 的 `THEMES` 数组中追加注册信息
3. （可选）添加预览图到 `src/themes/previews/`
4. 本地验证：切换主题 → 逐页检查 → 确认无样式冲突
5. 提交部署

**主题 CSS 编写规范**：

```css
/* src/themes/{theme-id}.css */

/* 第一层：覆盖 CSS 变量（必做） */
[data-theme="{theme-id}"] {
  --color-bg: ...;
  --color-surface: ...;
  --color-text: ...;
  --color-text-secondary: ...;
  --color-primary: ...;
  --color-primary-light: ...;
  --color-border: ...;
  --color-success: ...;
  --color-warning: ...;
  --color-danger: ...;
  --radius: ...;        /* 可选：改变圆角风格 */
  --shadow-sm: ...;     /* 可选：改变阴影风格 */
  --shadow-md: ...;
}

/* 第二层：额外样式覆盖（按需） */
[data-theme="{theme-id}"] .task-item {
  /* 如需改变特定组件的布局/样式 */
}

/* 注意事项：
 * - 不要使用 !important，利用 [data-theme] 选择器的优先级即可
 * - 不要修改 styles.css 基础文件
 * - 课程颜色（Course.color）是数据驱动的 hex 值，主题无法覆盖
 *   如需处理，可在主题 CSS 中降低 .course-block 的饱和度或添加 overlay
 * - globals.css 中的 shadcn dark media query 需要考虑是否同步
 */
```

---

## 5. 交付成果清单

### Phase 1 交付物

| 类型 | 文件 | 状态 |
|------|------|------|
| 新建 | `src/themes/registry.ts` | 主题注册表 |
| 新建 | `src/themes/loader.ts` | 主题加载/切换逻辑 |
| 新建 | `src/components/settings/ThemeCard.tsx` | 主题预览卡片组件 |
| 新建 | `tests/phase11.mjs` | 自动化测试 |
| 修改 | `index.html` | 防闪烁内联脚本 |
| 修改 | `src/store.tsx` | Settings 类型 + 默认值 |
| 修改 | `src/pages/SettingsPage.tsx` | 新增「外观」tab |
| 修改 | `src/styles.css` | 外观区域样式 |
| 修改 | `src/main.tsx` 或 `App.tsx` | 启动时应用主题 |
| 修改 | `functions/handler.mjs` | bootstrap + settings.save 适配 |
| 修改 | `functions/local-dev-index.ts` | 本地开发适配 |
| 数据库 | migration: `settings` 表加 `theme` 列 | schema v4 → v5 |

### 后续 agent 交付物（每个主题）

| 类型 | 文件 |
|------|------|
| 新建 | `src/themes/{theme-id}.css` |
| 修改 | `src/themes/registry.ts`（追加一条） |
| 可选 | `src/themes/previews/{theme-id}.png` |

---

## 6. 验收清单

### 6.1 基础功能

- [ ] 设置页出现「外观」tab
- [ ] 显示至少一个主题选项（默认主题）
- [ ] 点击主题卡片可即时切换 UI，无需刷新页面
- [ ] 切换后刷新页面，主题保持不变
- [ ] 切换后关闭浏览器重新打开，主题保持不变（数据库持久化）
- [ ] 默认主题 = 当前样式，无任何视觉变化

### 6.2 防闪烁

- [ ] 已选择非默认主题时，刷新页面无白屏闪烁（首帧即为正确主题）
- [ ] localStorage 被清除后，从数据库恢复主题（可能有一帧闪烁，可接受）

### 6.3 主题接入通道

- [ ] `src/themes/registry.ts` 存在且导出 `ThemeInfo` 接口和 `THEMES` 数组
- [ ] 新主题只需：① 创建 CSS 文件 ② 在 THEMES 追加一条 — 无需修改其他文件
- [ ] 主题 CSS 编写规范文档存在（本文档 §4 Phase 3）

### 6.4 后端兼容

- [ ] `settings.save` 白名单包含 `theme` 字段
- [ ] `bootstrap` 返回的 settings 包含 `theme` 字段
- [ ] 数据库 `settings` 表有 `theme` 列，默认值 `'default'`
- [ ] 数据导出/导入包含 theme 字段
- [ ] 旧数据（无 theme 列）升级后自动填充 `'default'`

### 6.5 测试

- [ ] `tests/phase11.mjs` 覆盖：主题切换、持久化、默认值回退
- [ ] 现有测试（phase1–10）全部通过，无回归
- [ ] `npm run build` 成功，无类型错误

### 6.6 示例主题验证（Phase 2 完成后）

- [ ] 深色主题下所有页面可读性良好（首页、日程、课表、战役、设置）
- [ ] 深色主题下课程颜色色块仍可辨识
- [ ] 深色主题下弹窗/对话框/底部 sheet 样式正确
- [ ] 主题切换时过渡自然（可选：添加 CSS transition）

---

## 7. 风险与注意事项

### 7.1 硬编码颜色

`styles.css` 中存在少量硬编码 hex 值（如 `.task-priority.priority-高 { background: #fef2f2 }`）。这些不会随 CSS 变量切换而改变。后续主题 agent 需要在主题 CSS 中用 `[data-theme="xxx"] .task-priority.priority-高` 选择器单独覆盖。

**建议**：Phase 1 中排查所有硬编码颜色，尽量替换为 CSS 变量，降低后续主题开发成本。

### 7.2 globals.css 的 shadcn dark 模式

`globals.css` 第 97–131 行有 `@media (prefers-color-scheme: dark)` 自动深色模式。这与手动主题切换可能冲突（用户选了浅色主题但系统是深色模式）。

**建议**：将 shadcn 的 dark media query 改为 `[data-theme="dark"]` 属性选择器，与主题系统统一。

### 7.3 课程颜色

课程颜色（`Course.color`）是用户在数据中设置的 hex 值（如 `#3b82f6`），不受 CSS 变量控制。深色主题下可能需要：
- 在课程色块上叠加半透明遮罩降低亮度
- 或用 `filter: brightness(0.8)` 处理

### 7.4 包体积

每个主题 CSS 是独立 chunk。如果主题数量多（>5），建议：
- 使用动态 `import()` 按需加载
- 或在构建时合并为一个 themes.css（靠 `[data-theme]` 选择器隔离，体积可控）

### 7.5 主题预览图

设置页的主题卡片最好有预览缩略图。方案：
- **简单**：用 CSS 渐变色块模拟（零成本）
- **精确**：每个主题截一张图放 `src/themes/previews/`（需手动维护）
- **自动**：构建时生成（复杂度高，不推荐初期实施）

建议初期用 CSS 色块预览，后续按需升级为截图。

---

## 8. 文件结构预览

```
src/
├── themes/
│   ├── registry.ts          # 主题注册表
│   ├── loader.ts            # 主题加载/切换
│   ├── dark.css             # 深色主题（Phase 2）
│   ├── ocean.css            # 示例：海洋主题（后续）
│   └── previews/            # 预览图（可选）
│       ├── dark.png
│       └── ocean.png
├── components/
│   └── settings/
│       └── ThemeCard.tsx    # 主题预览卡片
├── pages/
│   └── SettingsPage.tsx     # 新增「外观」tab
├── store.tsx                # Settings 类型扩展
└── styles.css               # 外观区域样式

tests/
└── phase11.mjs              # 主题切换测试
```

---

## 9. 给后续 UI 设计 agent 的快速指引

> **你是谁**：负责为「我的日程」应用创建新 UI 主题的 agent。
>
> **你需要做的**：
> 1. 阅读 `src/themes/registry.ts` 了解注册格式
> 2. 阅读 `src/styles.css` 前 17 行了解可用的 CSS 变量
> 3. 在 `src/themes/` 下创建你的主题 CSS 文件
> 4. 在 `registry.ts` 的 `THEMES` 数组中追加注册信息
> 5. 本地运行 `npm run dev`，在设置页切换到你的主题验证效果
> 6. 逐页检查：首页、日程、课表、战役、设置、所有弹窗和 sheet
>
> **你不需要做的**：
> - 不需要修改 `styles.css`、`store.tsx`、`handler.mjs` 或任何组件文件
> - 不需要处理数据库、API 或持久化逻辑
> - 不需要修改 `index.html` 或构建配置
>
> **约束**：
> - 不要使用 `!important`
> - 不要修改基础样式文件
> - 课程颜色是数据驱动的，无法通过 CSS 变量覆盖
> - 参考本文档 §4 Phase 3 的 CSS 编写规范
