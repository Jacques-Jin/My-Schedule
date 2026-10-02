# My Schedule - 我的日程

> **Runtime v59** · IndexedDB 离线优先持久化 · Liquid Glass 视觉系统 · macOS 液态玻璃设计语言 · Dark Glass 深色主题 · Neo-Brutalism 新粗野主义 · Paper Terminal 纸面终端 · Android App (Capacitor 8) · 开屏动画「光迹 · Trace」

个人日程管理应用，支持课表导入、战役计划、调休标记等功能。

**线上版本**: https://my-schedule-akzzfsdx3vh.qoder.zone/

## 快速启动

### 一键启动（推荐）
双击 `启动.bat`，自动启动所有服务并打开浏览器。

### 停止服务
双击 `停止.bat`。

### 手动启动
```bash
# 终端 1：启动 API 服务器
deno run --allow-net --allow-env --allow-read functions/local-dev-index.ts

# 终端 2：启动前端开发服务器
npm run dev
```

访问 http://127.0.0.1:5173/

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
│   └── tools/              # 一次性工具
├── tests/                  # 自动化测试（phase1-10）
├── dev/                    # 开发工具
├── vendor/                 # 第三方 CSS（shadcn）
├── 启动.bat / 停止.bat      # 启动器
└── open-deployed.bat       # 打开线上版本
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
