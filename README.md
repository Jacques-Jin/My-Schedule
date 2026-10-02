# My Schedule - 我的日程

> **Runtime v63** · IndexedDB 离线优先持久化 · Liquid Glass 视觉系统 · macOS 液态玻璃设计语言 · Dark Glass 深色主题 · Neo-Brutalism 新粗野主义 · Paper Terminal 纸面终端 · Android App (Capacitor 8) · 开屏动画「光迹 · Trace」· 开屏文字可配置

个人日程管理应用，支持课表导入、战役计划、调休标记等功能。

**线上版本**: https://my-schedule-akzzfsdx3vh.qoder.zone/

## 快速启动

### 一键启动（推荐）
双击 `启动.bat`，自动启动所有服务并打开浏览器。

### 停止服务
双击 `停止.bat`。

### 启动器一览

| 文件 | 作用 |
| --- | --- |
| `启动.bat` | 启动 Deno API(8000) + Vite(5173) + 打开浏览器（含端口占用守卫） |
| `停止.bat` | 停止所有服务 |
| `打开线上.bat` / `open-deployed.bat` | 打开线上版本 |
| `set-splash-text.bat` | 启动「开屏文字编辑器」（http://127.0.0.1:5299/） |

### 手动启动
```bash
# 终端 1：启动 API 服务器
deno run --allow-net --allow-env --allow-read functions/local-dev-index.ts

# 终端 2：启动前端开发服务器
npm run dev
```

访问 http://127.0.0.1:5173/

## 开屏文字配置

开屏动画显示的主/副标题来自 `public/splash-text.json`（默认 `我的日程 / My Schedule`），
开屏时运行时 fetch（`cache: no-store`），失败回退内置默认——**保存后刷新页面即生效**，
无需重新构建（开发版、本地独立版、线上站点均如此；APK 资源只读除外）。

- 双击 `set-splash-text.bat` 打开本地编辑器（http://127.0.0.1:5299/），改字后点「保存」，或点「重置为默认」恢复。
- 本地独立版包内自带 `开屏文字编辑.bat`（端口 5399，改包内 `app/splash-text.json`）。

## 本地独立版（免开发环境）

`scripts/build-local-package.mjs` 将 `dist/` + 内置 Deno 运行时 + 单端口服务器
打包为自包含文件夹 `output/MySchedule-Local/`（并压缩为 zip），拷到任意
Windows 电脑双击 `启动本地版.bat` 即用，无需 Node/npm/Deno。

- 单端口 `8100`：静态前端 + 内存假 Supabase API（与开发版同一 SEED）。
- 数据存浏览器 IndexedDB（源 `127.0.0.1:8100`），**不与线上/APK 同步**，
  与开发版（5173/8000）数据也互不相通。
- 模板源在 `scripts/local-package/`；`output/` 不入库（.gitignore）。

## 环境要求

- Node.js >= 22.12.0
- Deno
- 首次运行需执行 `npm install`
- 依赖：`idb`（IndexedDB 封装）、`vite`、`react`

## 项目结构

```
my-schedule/
├── src/                    # React 前端源码
│   ├── lib/
│   │   ├── db.ts           # IndexedDB 封装层（14 stores）
│   │   ├── sync.ts         # Write-behind 同步管理器
│   │   └── api.ts          # Supabase REST API 客户端
│   ├── splash.css          # 开屏动画样式
├── public/
│   └── splash-text.json    # 开屏文字配置（v63 运行时加载）
├── functions/              # 边缘函数（API 处理）
│   ├── local-dev-index.ts  # 本地开发服务器
│   ├── handler.mjs         # API 请求处理器
│   └── adapter.mjs         # Supabase 适配器
├── docs/                   # 开发文档
│   ├── product/            # 产品需求（PRD、开发计划）
│   ├── features/           # 子功能方案
│   ├── acceptance/         # 验收报告
│   ├── logs/               # 开发日志
│   └── guides/             # 使用说明
├── data/                   # 数据资产
│   ├── seed/               # 种子数据
│   ├── backups/            # 数据备份
│   └── raw/                # 原始数据来源（课表、笔记）
├── scripts/                # 构建/开发脚本
│   ├── build.mjs           # 生产构建
│   ├── check-node.mjs      # Node 版本校验
│   ├── splash-text-editor.mjs # 开屏文字本地编辑服务（v62）
│   ├── build-local-package.mjs # 本地独立版打包（v62）
│   ├── local-package/      # 本地独立版模板（server/bat/README）
│   └── tools/              # 一次性工具
├── tests/                  # 自动化测试（phase1-10）
├── dev/                    # 开发工具
├── vendor/                 # 第三方 CSS（shadcn）
├── 启动.bat / 停止.bat      # 启动器
├── 打开线上.bat / open-deployed.bat  # 打开线上
└── set-splash-text.bat     # 开屏文字编辑器启动器（v62）
```

## 开发说明

- 本地开发使用 IndexedDB 持久化 + Deno 内存 API 服务器
- 前端数据优先读写 IndexedDB，异步与 Supabase 同步（离线可用）
- 前端支持热重载，后端修改需重启 Deno 服务器
- 端口：API 8000，前端 5173
- 如端口被占用，先用 `停止.bat` 清理旧进程
- 设置页 → 数据备份 → "清除本地数据"可重置 IndexedDB

## 安卓 App

使用 Capacitor 8 将 Web 应用打包为安卓 APK（内置模式，Web 资源打包进 APK）。

### 环境要求

- JDK 21（推荐 OpenJDK 21，华为镜像可下载）
- Android SDK（API 34/35、build-tools 35+）
- `JAVA_HOME` 和 `ANDROID_HOME` 环境变量已配置

### 一键打包

```bash
scripts/build-android.bat    # Windows CMD
scripts/build-android.sh     # Git Bash
```

产出：`android/app/build/outputs/apk/release/app-release.apk`（~15MB）

### 手动构建

```bash
npm run build                          # 构建 Web 产物
npx cap sync android                   # 同步到 Android 工程
cd android && ./gradlew assembleRelease # 打签名 release APK
```

### 安装

手机开启「允许安装未知应用」→ 传输 APK → 点击安装。

### 关键配置

- `capacitor.config.ts`：Capacitor 配置（appId、webDir、插件）
- `android/keystore.properties`：签名配置（不入库）
- `src/lib/config.ts`：运行时 API 基址切换（Web 相对路径 / 原生绝对地址）

### 已知限制：系统状态栏 / 导航条

部分国产 OEM 皮肤（实测 Android 15 / API 35）不允许应用改色或隐藏系统状态栏与底部导航条：
edge-to-edge、`window.setNavigationBarColor` 均被系统忽略，`StatusBar.hide()` 仅隐藏图标并留下浅色空带。
因此本应用**保持系统条原样**（基线），不再尝试原生改色；如需视觉统一，可在手机系统设置中切换深色模式。
