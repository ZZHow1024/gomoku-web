# Gomoku Web

> 一款基于增强型 MiniMax 算法的五子棋 AI 演示应用，同时提供算法讲解与视频介绍。

## 项目简介

`Gomoku Web` 旨在用现代前端技术展示五子棋 AI 的决策过程。应用内置 15×15 的实战棋盘、可视化的算法演示，以及嵌入式视频讲解，帮助使用者快速理解搜索算法的威力。

## 核心特性

- **高级对弈 AI**：MiniMax + Alpha-Beta 剪枝 + 置换表缓存 + Zobrist 哈希。
- **威胁感知**：优先处理必胜、必防的关键落点，显著缩小搜索空间。
- **棋型评估**：针对活四、冲四、活三等多种棋型给出精细评分。
- **算法演示面板**：实时展示候选点评分、搜索节点数与剪枝次数。
- **多页面结构**：通过 `react-router-dom` 实现游戏、演示与视频的快速切换。
- **现代 UI**：采用 `tdesign-react` 组件库与响应式布局。

## 页面概览

| 路由 | 名称 | 说明 |
| --- | --- | --- |
| `/game` | 井字棋对弈 | 15×15 五子棋棋盘，支持玩家 VS AI，对局信息实时反馈。 |
| `/demo` | 算法演示 | 小棋盘调试环境，可调节搜索深度，查看 AI 思考过程。 |
| `/video` | 视频介绍 | 嵌入 B 站视频，讲解项目背景与算法要点。 |

## 技术栈

- 核心框架：React 19、TypeScript
- 构建工具：Vite 7
- UI 组件：TDesign React
- 路由管理：React Router DOM 7
- 代码质量：ESLint 9 + TypeScript ESLint

## 目录结构（节选）

```text
├── public/               # 静态资源
├── src/
│   ├── App.tsx           # 全局布局与路由
│   ├── main.tsx          # 应用入口，挂载根节点
│   └── pages/
│       ├── Game.tsx      # 五子棋对弈页面与 AI 逻辑
│       ├── Demo.tsx      # MiniMax/Alpha-Beta 演示页
│       └── Video.tsx     # 视频嵌入页
├── package.json          # 项目信息与脚本
├── pnpm-lock.yaml        # 依赖锁定文件
└── vite.config.ts        # Vite 配置
```

## 快速开始

> 推荐使用 Node.js 18 或更高版本。

```bash
# 安装依赖（推荐 pnpm，如无可改用 npm/yarn）
pnpm install

# 启动本地开发服务器（默认 http://localhost:5173 ）
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 代码质量检查
pnpm lint
```

如需使用 `npm` 或 `yarn`，将以上命令中的 `pnpm` 替换为对应包管理器即可。

## 算法亮点

- **候选点筛选**：仅围绕已有棋子附近扩展，确保搜索高效。
- **启发式排序**：通过落点评估优先探索高价值分支。
- **置换表缓存**：利用 Zobrist 哈希复用已计算局面，减少重复计算。
- **威胁检测**：即时识别对手必杀，兼顾攻防平衡。

## 视频资源

项目内置 B 站视频（`BV14E3tzPEiP`），可在 `/video` 页面直接观看详细讲解。

## 贡献指南

欢迎提交 Issue 或 Pull Request，一起迭代更强大的五子棋 AI 演示工具。
