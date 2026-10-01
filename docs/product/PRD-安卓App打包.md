# PRD · 安卓 App 打包（My Schedule Android）

- 文档版本：v1.0
- 创建时间：2026-10-01
- 项目：我的日程（My Schedule）
- 目标产物：一个可直接安装运行的安卓 APK（侧载安装，无需上架应用商店）
- 优先级：🟡 中（在现有 Web 版稳定基础上的形态扩展）
- 状态：📝 规划中（**本 PRD 只做规划，不含执行**）

---

## 1. 问题陈述与目标

### 1.1 用户需求
将现有「我的日程」Web 应用打包成**安卓系统能直接安装运行的 App**，要求：
1. **数据同步可靠**：手机端与电脑端（Web）数据一致，离线可用、联网自动同步。
2. **美观**：原生级外观（图标、启动屏、状态栏、安全区），无明显「网页套壳」廉价感。
3. **流畅**：冷启动快、交互跟手、无白屏闪烁、离线也能秒开。

### 1.2 现状分析（复用资产）

| 维度 | 现状 | 对打包的影响 |
|------|------|--------------|
| 前端框架 | React 19 + Vite 8 + TS，产物 `dist/`（单 JS ~670KB / gzip ~213KB） | 可直接被 WebView 承载，零重写 |
| 后端 | Qoder Sites 边缘函数 `/functions/v1/app`（Deno + Supabase，read_write，schema v4，匿名无鉴权） | App 复用同一云端；**全设备共享同一份数据**（无账号体系） |
| 数据层 | IndexedDB 离线优先 + 写队列同步 + `notifyDirectSync` 反馈（已修复，runtime v53） | 同步逻辑**原样复用**，无需重做 |
| API 基址 | `src/lib/api.ts` 使用**相对路径** `/functions/v1/app` | ⚠️ 原生 WebView 源为 `https://localhost`，相对路径会打到本地壳、请求失败 → **必须改为绝对地址或走原生 HTTP 桥** |
| 字体 | `index.html` 通过 **Google Fonts CDN** 加载 5 款字体 | ⚠️ 离线/弱网时字体丢失、首屏阻塞渲染 → **建议自托管字体** |
| 主题 | 4 套主题（Liquid Glass / Dark Glass / Neo-Brutalism / Paper Terminal），`data-theme` + localStorage | 状态栏/启动屏颜色需与主题联动，避免白闪 |
| 部署 | 线上 `https://my-schedule-akzzfsdx3vh.qoder.zone`（public） | 可作为远程模式的 server.url，或仅作后端 API |

### 1.3 目标（Must Have）

| # | 目标 | 成功标准 |
|---|------|----------|
| G1 | **可安装的 APK** | 产出签名 release APK，安卓手机开启「未知来源」后可直接安装、正常启动 |
| G2 | **数据同步不回归** | App 与 Web 端增删改查互通；离线可写、联网自动同步；同步提示正常 |
| G3 | **离线秒开** | 飞行模式下冷启动，App 可用并展示本地缓存数据，不白屏、不报错 |
| G4 | **原生观感** | 独立图标（自适应图标）、主题化启动屏、状态栏配色正确、手势导航安全区无遮挡 |
| G5 | **流畅性达标** | 冷启动到可交互 < 2.5s（中端机）；页面切换无卡顿；无首屏白闪 |

### 1.4 非目标（Out of Scope）

- 上架 Google Play / 国内应用商店（本次仅侧载 APK；AAB 与商店流程列为后续扩展）
- iOS App（本 PRD 只覆盖安卓；iOS 需 Mac + 开发者账号，另议）
- 账号/登录体系与多用户隔离（沿用现有「匿名共享一份云数据」模型）
- 原生推送通知（FCM）、桌面小组件（Widget）——列为后续扩展
- React Native / 原生 Kotlin 重写（明确不采用，成本过高）

---

## 2. 方案选型

### 2.1 三条候选路线

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **A. Capacitor 套壳（推荐）** | 用 Capacitor 把现有 `dist/` 打包进安卓 WebView，产出 APK；Web 资源**内置于 APK** | 复用 100% 代码；离线最稳（不依赖站点可达）；可用原生插件（状态栏/启动屏/网络/原生 HTTP 绕 CORS）；完全掌控 | Web 内容更新需**重新打 APK**（除非启用远程/热更新）；需装 Android Studio + JDK | ⭐⭐⭐⭐⭐ |
| **B. TWA（Bubblewrap）** | 把线上站点做成 PWA，再用 Trusted Web Activity 包成 APK，运行时**加载远程站点** | 打包最轻；Web 更新即生效（无需重装 APK）；接近全屏原生体验 | 强依赖站点 HTTPS 可达 + 完整 PWA（manifest + Service Worker + Digital Asset Links 校验）；离线能力取决于 SW；调试链路更长 | ⭐⭐⭐ |
| **C. React Native 重写** | 用 RN 重做 UI | 纯原生性能 | 需重写全部界面、重做主题系统，成本极高，与现有代码不兼容 | ⭐ |

### 2.2 决策：采用 **方案 A（Capacitor）**

**理由**：
1. **离线可靠性最高**：Web 资源内置于 APK，飞行模式也能秒开，不依赖站点是否在线——契合日程 App「随时打开」的高频场景。
2. **零代码重写**：直接复用现有 React 工程与已修复的同步逻辑，风险最低。
3. **原生观感可控**：通过官方插件精确控制图标、启动屏、状态栏、安全区，满足「美观」。
4. **绕开 CORS**：Capacitor 内置 `CapacitorHttp` 可将 `fetch` 桥接到原生网络层，规避 WebView 跨域限制（详见 §3.4）。

**TWA 保留为备选**：若后续更看重「Web 更新免重装」，可在把站点升级为合格 PWA 后切换到 TWA；两者的 Web 代码可共用。

### 2.3 Web 内容分发/更新策略（Capacitor 下）

| 模式 | 机制 | 优点 | 缺点 | 采用 |
|------|------|------|------|------|
| **内置模式（bundled）** | `dist/` 打进 APK，WebView 从本地加载 | 离线最稳、启动最快、不依赖网络 | Web 改动需重打 APK | ✅ **v1 默认** |
| 远程模式（server.url） | `capacitor.config` 设 `server.url` 指向线上站点 | Web 更新即生效 | 首屏依赖网络、离线靠 SW、体验受站点可用性影响 | ❌（可选后续） |
| 热更新（Live Update） | 用 Capgo / 自建 OTA 下发 Web 包 | 免重装更新 | 引入第三方/额外基建与合规考量 | ⏳ 后续扩展 |

> **v1 结论**：采用**内置模式**，后端 API 仍指向线上边缘函数。Web 内容更新时，重跑「构建 → 同步 → 打 APK」流程即可（脚本化，见 §4）。

---

## 3. 技术架构与关键难点

### 3.1 总体架构

```
┌──────────────────────────── 安卓设备 ───────────────────────────┐
│  原生外壳 (Capacitor Runtime / Kotlin)                          │
│   ├─ 启动屏 SplashScreen（主题色，防白闪）                        │
│   ├─ StatusBar（配色随主题）                                      │
│   ├─ 自适应图标 (mipmap-anydpi)                                   │
│   └─ WebView (Chromium)                                          │
│        └─ 内置 Web 应用 (React dist/)                             │
│             ├─ UI 层（页面/主题，原样复用）                        │
│             ├─ 数据层 store.tsx（原样复用）                        │
│             ├─ IndexedDB 离线缓存（WebView 原生支持）             │
│             ├─ sync.ts 写队列 + notifyDirectSync（原样复用）      │
│             └─ api.ts → 绝对基址 / CapacitorHttp 桥               │
│                  │（原生网络层，绕过 WebView CORS）               │
└──────────────────┼───────────────────────────────────────────────┘
                   │ HTTPS
        ┌──────────▼───────────────────────────────┐
        │ Qoder Sites 边缘函数 /functions/v1/app     │
        │   └─ Supabase（read_write, schema v4）     │
        │      全设备共享同一份数据（匿名，无登录）    │
        └───────────────────────────────────────────┘
```

### 3.2 关键难点 1：API 基址（相对 → 绝对）

- **问题**：Capacitor 安卓 WebView 默认源为 `https://localhost`（`androidScheme: 'https'`）。`api.ts` 的相对路径 `/functions/v1/app` 会解析为 `https://localhost/functions/v1/app`，本地壳无此路由 → 所有云端请求失败。
- **方案**：引入运行时环境判定，仅在原生环境切换到绝对基址。
  - 新增 `src/lib/config.ts`，导出 `API_BASE`：
    - Web（浏览器）：`"/functions/v1/app"`（保持现状，走同源）
    - 原生（Capacitor）：`"https://my-schedule-akzzfsdx3vh.qoder.zone/functions/v1/app"`
  - 判定方式：`@capacitor/core` 的 `Capacitor.isNativePlatform()`（或 `getPlatform() !== 'web'`）。
  - `api.ts` 把常量 `BASE` 改为从 `config.ts` 读取；其余请求逻辑不变。
- **验收点**：原生 App 内所有 `bootstrap/save/delete` 请求命中线上域名，返回 200。

### 3.3 关键难点 2：CORS 跨域

- **问题**：改为绝对基址后，请求从 `https://localhost` 跨域发往 `qoder.zone`，触发浏览器同源策略；若边缘函数未返回 CORS 头，WebView 内 `fetch` 会被拦截。
- **首选方案（推荐）：启用 Capacitor 内置 `CapacitorHttp`**
  - 在 `capacitor.config.ts` 设 `plugins: { CapacitorHttp: { enabled: true } }`。
  - 该开关会把 WebView 内的 `fetch`/`XHR` **透明桥接到原生网络层**，原生请求不受 CORS 约束，`api.ts` 代码几乎无需改动。
- **兜底方案：后端补 CORS 头**
  - 在 `functions/handler.mjs` 响应中加 `Access-Control-Allow-Origin`（原生源 `https://localhost` 或按需 `*`）、`Access-Control-Allow-Headers`、`Access-Control-Allow-Methods`，并正确响应 `OPTIONS` 预检。
  - 注意：该改动会同时作用于 Web 部署（无害，仅增加响应头），需回归验证 Web 端不受影响。
- **决策**：v1 优先用 `CapacitorHttp`（改动面最小、不触碰已稳定的后端）；如遇插件兼容问题再走后端 CORS 兜底。
- **前置调研任务（Phase 0）**：先探测边缘函数当前是否已返回 CORS 头、`OPTIONS` 行为，据此确定是否需要兜底。

### 3.4 关键难点 3：字体自托管（美观 + 流畅 + 离线）

- **问题**：`index.html` 依赖 Google Fonts CDN；离线/弱网时字体加载失败 → 首屏文字回退、布局跳动（FOUT），且 CDN 阻塞渲染拖慢启动。国内网络访问 Google Fonts 尤其不稳定。
- **方案**：
  1. 下载并自托管 5 款字体的 `woff2`：Space Grotesk、DotGothic16、JetBrains Mono、Inter、Noto Sans SC。
  2. 放入 `public/fonts/`，用本地 `@font-face` 声明（`font-display: swap`）。
  3. 移除 `index.html` 中的 Google Fonts `<link>`（保留 `preconnect` 可删）。
  4. **Noto Sans SC 体积优化**：全量中文字体极大（数 MB）。采用**子集化**（仅打包常用汉字子集，如 GB2312/通用规范字表）或按 `unicode-range` 分片，控制包体。
- **验收点**：飞行模式下冷启动，所有主题字体正确渲染，无 CDN 请求、无 FOUT。

### 3.5 关键难点 4：同步与连接状态（数据同步可靠性）

- **复用**：`store.tsx` + `sync.ts` + IndexedDB 逻辑**原样保留**，安卓 WebView（Chromium）完整支持 IndexedDB。
- **增强连接感知**：WebView 的 `navigator.onLine` 在部分安卓设备上不够可靠。引入 `@capacitor/network`，把网络状态事件接到 `sync.ts`：
  - 监听 `networkStatusChange`，联网时主动 `syncNow()`，离线时置 `offline` 态。
  - 保留 `navigator.onLine` 作为 Web 端回退，二者择一生效（原生用插件、Web 用事件）。
- **共享数据模型说明**：后端匿名无鉴权，App 与 Web 写入**同一份云数据**，天然实现「多设备同步」，无需登录。
  - ⚠️ **隐私风险提示**：站点为 public，任何知道 URL 的人都能读写同一份数据。此为现有 Web 版既有模型，本 PRD 不改动；如需隔离，须在后续引入账号体系（见 §7）。
- **回归重点**：本轮刚修复的 upsert 语义、id 采纳、队列保留、`notifyDirectSync` 提示，在原生环境需**完整回归**（原生网络层的行为与浏览器可能有细微差异）。

### 3.6 关键难点 5：原生观感（图标 / 启动屏 / 状态栏 / 安全区）

| 项 | 方案 | 插件 |
|----|------|------|
| 应用图标 | 用一张 1024×1024 母版生成各密度 mipmap + **自适应图标**（前景/背景层） | `@capacitor/assets` |
| 启动屏 | 主题色背景 + 居中 Logo，避免启动白闪；启动完成再隐藏 | `@capacitor/splash-screen` |
| 状态栏 | 配色随主题（浅色主题用深色图标，深色主题用浅色图标）；应用内切主题时同步更新 | `@capacitor/status-bar` |
| 安全区 | `index.html` 已有 `viewport-fit=cover`；核对底部导航/悬浮元素使用 `env(safe-area-inset-*)`，避免手势条遮挡 | — |
| WebView 背景 | 设 WebView 背景色为主题底色，消除加载瞬间白闪 | `capacitor.config` / 原生 |
| 应用名 | `strings.xml` 设中文应用名「我的日程」 | — |

### 3.7 关键难点 6：流畅性与包体优化

- **代码分割**：当前 JS 为单块（gzip ~213KB）。用路由级 `React.lazy` + 动态 `import()` 拆分，降低首屏 JS 解析时间，提升 TTI。
- **资源本地化**：内置模式下所有静态资源从设备本地加载，天然快；确保无残留远程阻塞资源（字体见 §3.4）。
- **冷启动**：启动屏覆盖 WebView 初始化窗口，首帧就绪后再隐藏，主观「秒开」。
- **构建目标**：Vite `build.target` 对齐 WebView Chromium 版本（`esnext`/`es2020`），避免过度 polyfill 增大包体。
- **度量**：用真机（中端安卓）测冷启动、页面切换帧率，作为验收依据（§5.3）。

### 3.8 关键难点 7：签名与分发（可安装）

- **调试包**：`assembleDebug` 产出 `app-debug.apk`，用调试签名，可直接侧载（适合开发自测）。
- **发布包**：生成 **release keystore**（`keytool`），在 `android/app/build.gradle` 配置 `signingConfigs.release`，`assembleRelease` 产出**签名 release APK**用于分发。
  - keystore 与口令**必须安全保管**（丢失则无法对同一 App 升级签名）；不得提交进 Git（加入 `.gitignore`，口令走本地/密钥管理）。
- **安装**：手机开启「允许安装未知应用」→ 传输 APK → 点击安装。
- **版本号**：`versionCode`（整数，递增，用于升级判定）/ `versionName`（展示用，如 `1.0.0`），与项目版本对齐。

---

## 4. 实施步骤（执行阶段用，本 PRD 不执行）

> 说明：以下为**规划好的完整步骤**，供后续开发按阶段推进。每阶段含任务、涉及文件/命令、验收标准。

### Phase 0：环境与前置调研（0.5–1 天）

| # | 任务 | 操作/文件 | 验收标准 |
|---|------|-----------|----------|
| 0.1 | 安装 JDK 17 | 本地 | `java -version` 显示 17.x |
| 0.2 | 安装 Android Studio + SDK（Platform 34/35、build-tools、platform-tools） | 本地 | `sdkmanager --list` 可用；`ANDROID_HOME` 已设 |
| 0.3 | 配置 Windows 环境变量 | `JAVA_HOME` / `ANDROID_HOME` / `PATH` | 新开终端可识别 |
| 0.4 | 校验 Node 版本约束 | `node -v` | 满足 `>=22.12 <23` |
| 0.5 | **探测边缘函数 CORS 现状** | `curl -i -X OPTIONS`/`GET` 线上 `/functions/v1/app?action=bootstrap` | 记录是否返回 `Access-Control-Allow-*`、`OPTIONS` 状态码 → 决定 §3.3 是否需后端兜底 |
| 0.6 | 确认真机调试条件 | 一台安卓手机 + USB 调试 或 模拟器 | 可 `adb devices` 识别 |

**交付物**：环境就绪清单；CORS 探测结论。

---

### Phase 1：接入 Capacitor 基座（0.5–1 天）

| # | 任务 | 文件/命令 | 验收标准 |
|---|------|-----------|----------|
| 1.1 | 安装依赖 | `npm i @capacitor/core @capacitor/cli` | `package.json` 出现依赖 |
| 1.2 | 初始化 Capacitor | `npx cap init 我的日程 <appId>`（appId 如 `com.jack.myschedule`） | 生成 `capacitor.config.ts` |
| 1.3 | 配置 `webDir` 指向 `dist` | `capacitor.config.ts` | `webDir: 'dist'` |
| 1.4 | 启用 `CapacitorHttp` | `capacitor.config.ts` → `plugins.CapacitorHttp.enabled: true` | 配置就位 |
| 1.5 | 设置 `androidScheme: 'https'` | `capacitor.config.ts` → `server.androidScheme` | 源为 `https://localhost` |
| 1.6 | 添加安卓平台 | `npm i @capacitor/android` → `npx cap add android` | 生成 `android/` 工程 |
| 1.7 | `.gitignore` 处理 | 忽略 keystore、`android/` 构建产物（按团队策略决定是否纳管 `android/`） | 敏感文件不入库 |

**交付物**：可用 `npx cap open android` 打开的安卓工程骨架。

---

### Phase 2：Web 侧适配（1–2 天）

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 2.1 | 新增运行时配置 | `src/lib/config.ts`（`API_BASE` 按原生/Web 切换） | 原生返回绝对域名，Web 返回相对路径 |
| 2.2 | `api.ts` 接入配置 | `src/lib/api.ts`（`BASE` 改读 `config.ts`） | 请求命中正确基址 |
| 2.3 | 字体自托管 | `public/fonts/*`、`src/globals.css`（`@font-face`）、`index.html`（移除 CDN link） | 离线字体正常，无 Google Fonts 请求 |
| 2.4 | Noto Sans SC 子集化 | 字体处理脚本/工具 | 中文字体包体可控（目标 < ~1.5MB 或分片） |
| 2.5 | 网络状态增强 | `src/lib/sync.ts` + `@capacitor/network` 封装 | 原生联网/离线切换触发 `syncNow`/`offline` 态 |
| 2.6 | 状态栏随主题联动 | 主题切换处（`App.tsx`/主题加载器）+ `@capacitor/status-bar` | 切主题时状态栏配色同步更新 |
| 2.7 | 安全区核对 | `src/globals.css`（底部导航/悬浮元素 `env(safe-area-inset-*)`） | 手势导航无遮挡 |
| 2.8 | 路由级代码分割（可选优化） | `src/App.tsx`（`React.lazy` + `Suspense`） | 首屏 JS 体积下降，TTI 改善 |
| 2.9 | Web 端回归 | 现有 Web 构建/部署 | **改动不得破坏 Web 版**（字体、API、同步全回归） |

**交付物**：同时兼容 Web 与原生两套运行环境的 Web 代码。

---

### Phase 3：原生观感资源（0.5–1 天）

| # | 任务 | 文件/命令 | 验收标准 |
|---|------|-----------|----------|
| 3.1 | 准备图标母版（1024×1024）+ 启动屏素材 | 设计资源 | 母版就位 |
| 3.2 | 生成图标/启动屏资源 | `npm i -D @capacitor/assets` → `npx capacitor-assets generate --android` | 各密度 mipmap + 自适应图标生成 |
| 3.3 | 安装并配置启动屏插件 | `@capacitor/splash-screen` + `capacitor.config` | 启动显示主题化启动屏，无白闪 |
| 3.4 | 安装状态栏插件 | `@capacitor/status-bar` | 状态栏配色正确 |
| 3.5 | 设置应用名/版本 | `android/app/src/main/res/values/strings.xml`、`build.gradle`（versionCode/versionName） | 桌面显示「我的日程」，版本号正确 |
| 3.6 | WebView 背景色 | 原生/配置 | 加载瞬间无白闪 |

**交付物**：图标、启动屏、状态栏、应用名全部就位。

---

### Phase 4：构建与打包 APK（0.5–1 天）

| # | 任务 | 命令 | 验收标准 |
|---|------|------|----------|
| 4.1 | 构建 Web 产物 | `npm run build` | `dist/` 更新 |
| 4.2 | 同步到安卓工程 | `npx cap sync android` | Web 资源 + 插件同步进 `android/` |
| 4.3 | 生成 release keystore | `keytool -genkeypair ...` | 产出 `.keystore`（安全保管，不入库） |
| 4.4 | 配置签名 | `android/app/build.gradle` → `signingConfigs.release` + `keystore.properties` | release 构建使用正式签名 |
| 4.5 | 打调试包自测 | `cd android && ./gradlew assembleDebug` | 产出 `app-debug.apk` |
| 4.6 | 打发布包 | `./gradlew assembleRelease` | 产出**签名 release APK** |
| 4.7 | 脚本化 | `scripts/build-android.*`（一键 build→sync→assembleRelease） | 一条命令产出 APK |

**交付物**：可侧载安装的签名 release APK + 一键打包脚本。

---

### Phase 5：真机验收与调优（1 天）

| # | 任务 | 操作 | 验收标准 |
|---|------|------|----------|
| 5.1 | 侧载安装 | 传输 APK → 允许未知来源 → 安装 | 安装成功，图标/应用名正确 |
| 5.2 | 功能全流程 | 增删改查课表/日程/作业/战役/倒计时 | 全部正常 |
| 5.3 | 性能度量 | 中端真机测冷启动、页面切换 | 达到 §5.3 指标 |
| 5.4 | 同步与离线 | 见 §5.2 验收项 | 全部通过 |
| 5.5 | 观感核对 | 图标/启动屏/状态栏/安全区/各主题 | 达到 §5.4 验收项 |
| 5.6 | 调优 | 针对卡顿/白闪/字体等修复 | 复测通过 |

**交付物**：真机验收报告（含截图/录屏/性能数据）。

---

## 5. 验收标准

### 5.1 安装与启动

| # | 验收项 | 测试方法 | 预期结果 |
|---|--------|----------|----------|
| A1 | 可安装 | 侧载 release APK | 安装成功，无签名/解析错误 |
| A2 | 应用名与图标 | 查看桌面 | 显示「我的日程」+ 自适应图标，各分辨率清晰 |
| A3 | 冷启动无白闪 | 点击图标启动 | 先显示主题化启动屏，进入应用无白屏闪烁 |
| A4 | 首屏可用 | 启动后 | 首页正常渲染，字体正确 |

### 5.2 数据同步（核心，不得回归）

| # | 验收项 | 测试方法 | 预期结果 |
|---|--------|----------|----------|
| S1 | 云端连通 | App 内 `bootstrap` | 请求命中线上域名，返回 200，数据加载 |
| S2 | App→Web 同步 | App 新增作业 → 电脑端 Web 刷新 | Web 端看到该作业 |
| S3 | Web→App 同步 | Web 新增作业 → App 下拉/重进刷新 | App 看到该作业 |
| S4 | 离线可写 | 飞行模式下增删改 | 操作成功、UI 即时响应，写入 IndexedDB + 入队 |
| S5 | 联网自动同步 | 恢复网络 | 队列自动推送，云端出现该数据，无重复行 |
| S6 | 同步提示 | 在线操作后 | 弹「数据同步成功」toast（`notifyDirectSync` 生效） |
| S7 | 待同步徽标 | 离线累积多笔后 | 右上角显示待同步数量；同步后归零 |
| S8 | upsert 幂等 | 同一条目重复保存 | 服务端单行、无重复（upsertById 生效） |
| S9 | 无卡死错误态 | 正常联网使用 | 同步指示器停在 synced/0 pending |

### 5.3 性能与流畅性

| # | 指标 | 目标值（中端安卓真机） |
|---|------|------------------------|
| P1 | 冷启动到可交互（有本地缓存） | < 2.5s |
| P2 | 离线冷启动到首屏 | < 2s，且不白屏 |
| P3 | 本地写操作延迟 | < 50ms（乐观更新即时） |
| P4 | 联网同步延迟 | < 5s |
| P5 | 页面切换 | 无明显掉帧/卡顿 |
| P6 | APK 体积 | 目标 < 20MB（含子集化字体，视资源而定） |

### 5.4 观感与适配

| # | 验收项 | 预期结果 |
|---|--------|----------|
| U1 | 状态栏 | 配色随主题正确（浅/深主题图标对比清晰） |
| U2 | 安全区 | 底部导航/悬浮元素不被手势条遮挡 |
| U3 | 四套主题 | Liquid Glass / Dark Glass / Neo-Brutalism / Paper Terminal 均正常，与 Web 观感一致 |
| U4 | 字体 | 5 款字体离线正确渲染，无 FOUT/回退 |
| U5 | 横竖屏 | 竖屏为主，布局不错乱（如锁定竖屏则明确说明） |

### 5.5 兼容性

| # | 项 | 目标 |
|---|----|------|
| C1 | 最低安卓版本 | minSdk 建议 23（Android 6.0）+，覆盖绝大多数在用机型 |
| C2 | 目标安卓版本 | targetSdk 对齐当前主流（34/35） |
| C3 | WebView | 依赖系统 Chromium WebView（现代机型均支持 IndexedDB/fetch） |
| C4 | Web 版不回归 | 本次改动后，Web 端构建/部署/功能全绿 |

---

## 6. 风险与缓解

| # | 风险 | 影响 | 概率 | 缓解措施 |
|---|------|------|------|----------|
| R1 | CORS 拦截云端请求 | 原生端无法同步 | 中 | 首选 `CapacitorHttp` 桥接；兜底后端补 CORS 头（Phase 0 先探测） |
| R2 | 相对路径未改绝对 | 所有请求打到本地壳、失败 | 高（若遗漏） | §3.2 强制 `config.ts` 环境判定；A1/S1 验收拦截 |
| R3 | Google Fonts 离线丢失 | 字体回退、布局跳动、不美观 | 高 | §3.4 自托管 + 子集化 |
| R4 | Noto Sans SC 体积过大 | APK 膨胀、下载/安装慢 | 中 | 子集化 / `unicode-range` 分片 |
| R5 | 匿名共享数据的隐私风险 | 他人可读写同一份数据 | 中 | 明示现状（既有模型）；后续引入账号体系（§7） |
| R6 | keystore 丢失 | 无法对同一 App 升级签名 | 低 | 安全备份 keystore + 口令，纳入密钥管理，不入库 |
| R7 | WebView 版本差异 | 老机型 IndexedDB/CSS 行为异常 | 低 | 设合理 minSdk；真机矩阵抽测 |
| R8 | Web 内置导致更新滞后 | 用户需重装 APK 才更新 | 中 | 脚本化打包降低重打成本；后续评估热更新/远程模式 |
| R9 | 启动白闪 | 观感差 | 中 | 启动屏 + WebView 背景色主题化 |
| R10 | Windows 安卓工具链配置繁琐 | 阻塞构建 | 中 | Phase 0 环境清单先行；必要时用 Android Studio 图形化 |

---

## 7. 后续扩展（非本次范围）

- **iOS App**：需 Mac + Xcode + 苹果开发者账号；Capacitor 工程可复用，另做 iOS 适配与签名。
- **上架商店**：产出 AAB（`bundleRelease`），补充隐私政策、内容分级、商店素材；国内商店需软著等资质。
- **热更新（OTA）**：Capgo 或自建，实现「Web 更新免重装」。
- **原生推送 / 桌面小组件**：FCM 推送、日程 Widget、日历快捷方式。
- **账号体系与数据隔离**：引入登录，按用户隔离云数据，解决 R5 隐私问题（涉及后端鉴权与 schema 调整）。
- **PWA + TWA 路线**：把站点升级为合格 PWA 后，可切换/并行提供 TWA 版本，享受「更新即生效」。

---

## 8. 环境与工具清单

| 类别 | 工具/版本 | 说明 |
|------|-----------|------|
| Node | `>=22.12 <23`（现有约束） | 与项目 `engines` 一致 |
| JDK | 17 | 安卓构建要求 |
| Android Studio | 最新稳定版 | 含 SDK Manager / 模拟器 |
| Android SDK | Platform 34/35、build-tools、platform-tools | targetSdk 对齐主流 |
| Gradle | 使用安卓工程自带 wrapper | 无需单独装 |
| Capacitor | 最新稳定大版本（core/cli/android） | 套壳运行时 |
| Capacitor 插件 | `@capacitor/network`、`@capacitor/status-bar`、`@capacitor/splash-screen`、`@capacitor/assets`(dev) | 网络/状态栏/启动屏/资源生成 |
| 字体工具 | `glyphhanger`/`fonttools` 等（子集化） | 处理 Noto Sans SC |
| 打包机 | Windows 10（用户现机）或 CI | 侧载 APK 产出 |
| 真机 | 一台中端安卓手机（USB 调试） | 验收 §5.3 |

**建议 appId**：`com.jack.myschedule`（可调整）；**versionName** 起步 `1.0.0`，**versionCode** `1`。

---

## 9. 交付物清单（Definition of Done）

1. **可安装的签名 release APK**（`android/app/build/outputs/apk/release/*.apk`）。
2. **一键打包脚本**（`scripts/build-android.*`：build → cap sync → assembleRelease）。
3. **Capacitor 工程**（`capacitor.config.ts` + `android/`，按策略决定是否纳管）。
4. **Web 适配代码**：`src/lib/config.ts`、`api.ts` 基址切换、字体自托管、`@capacitor/network` 接入、状态栏联动。
5. **原生资源**：自适应图标、启动屏、应用名、版本号。
6. **验收报告**：§5 全部验收项结果 + 真机截图/录屏 + 性能数据。
7. **文档**：本 PRD 落地后的开发日志（`docs/logs/`）、README 增补「安卓 App 构建说明」。
8. **Web 版无回归证明**：改动后 Web 构建/部署/功能复测通过。

---

## 10. 开发守则

1. **不破坏 Web 版**：所有 Web 侧改动必须双端兼容，改完先回归 Web（构建 + 部署 + 功能）。
2. **同步逻辑零重做**：复用现有 IndexedDB + `sync.ts`，仅增强连接感知，不改核心同步语义。
3. **分阶段验收**：每个 Phase 完成即验收，问题不后置。
4. **敏感物不入库**：keystore、口令、签名配置走 `.gitignore` + 本地/密钥管理。
5. **文档同步**：遵循项目「开发日志 + README 版本号 + commit/push」收尾流程（见 `docs/logs/`）。
6. **真机为准**：模拟器不足以判定流畅性与观感，验收以中端真机为准。
7. **先探测后动手**：Phase 0 的 CORS 探测结论决定 §3.3 走哪条路径，避免盲目改后端。

---

## 11. 参考

- 现有持久化架构：`docs/product/PRD-数据持久化改造.md`
- 同步修复记录：`docs/logs/开发日志2026-10-01-141234.md`（runtime v53）
- Capacitor 官方文档：https://capacitorjs.com/docs
- CapacitorHttp（绕 CORS）：https://capacitorjs.com/docs/apis/http
- 安卓自适应图标：https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- TWA / Bubblewrap（备选路线）：https://github.com/GoogleChromeLabs/bubblewrap

---

_本 PRD 为「安卓 App 打包」的唯一开发依据。实施前请通读全文并完成 Phase 0 探测；如遇 CORS、字体、同步等关键决策分歧，先向用户确认再动手。本文档仅为规划，未执行任何打包操作。_
