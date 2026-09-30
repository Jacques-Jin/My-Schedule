# My Schedule - 我的日程

> **Runtime v41** · Liquid Glass 视觉系统 · macOS 液态玻璃设计语言 · Dark Glass 深色主题 · Neo-Brutalism 新粗野主义 · Paper Terminal 纸面终端

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

## 项目结构

```
my-schedule/
├── src/                    # React 前端源码
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

- 本地开发使用内存数据库，重启后数据重置为种子数据
- 前端支持热重载，后端修改需重启 Deno 服务器
- 端口：API 8000，前端 5173
- 如端口被占用，先用 `停止.bat` 清理旧进程
