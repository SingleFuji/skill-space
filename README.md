# Skill Space

> Claude Code AI 技能仓库 — 将重复性工作交给 Skill，聚焦真正重要的创造。

[English](#english) · [中文](#中文)

## 中文

这是一个面向 Claude Code 的 AI 技能集合。每个 Skill 封装了一个特定领域的专家能力，安装后可通过自然语言直接调用。

### 技能一览

| 技能 | 版本 | 说明 |
|------|------|------|
| [Charge Thinking](skills/charge-thinking/) | 1.0.0 | 复合思维分析框架。融合底层逻辑学与 Charge 思维体系，用于复杂任务分析、战略研判、深度思考 |
| [CEO Plan Review](skills/gstack-plan-ceo-review/) | 1.0.0 | CEO/创始人模式计划审查。四种模式：范围扩张、选择性扩张、保持范围、范围缩减 |
| [一人公司（OPC+）](skills/one-person-company-plus/) | 1.0.0 | 一人公司全能运营助手。覆盖内容创作、商业运营、产品/研发、客户服务、个人提效五大模块 |
| [一人MCN](skills/one-person-mcn/) | 1.0.3 | 10 个 AI 模块 = 1 支 MCN 团队。涵盖选题策划、标题优化、SEO、视频导演、社群运营、商务报价全链路 |
| [旅游路线规划](skills/tour-planner/) | 1.0.0 | 根据地点列表自动规划自驾路线，估算每段行程耗时，提供游玩建议和美食推荐 |

### 基础设施

| 组件 | 说明 |
|------|------|
| [SQLite MCP Server](skills/sqlite-mcp-server/) | 基于 Model Context Protocol 的本地 SQLite 数据库服务，提供查询、执行、表结构探索等能力 |

### 使用方式

1. 将所需的 Skill 文件夹（如 `skills/one-person-mcn/`）复制到你的 Claude Code 项目的 `skills/` 目录
2. 在 Claude Code 中通过自然语言触发（如"帮我想个选题"、"规划从北京到西安的路线"）
3. 对于 SQLite MCP Server，确保在 `.claude/settings.json` 中正确配置 `SQLITE_DB_PATH` 环境变量

### 示例输出

参见 [FDE 分析报告](skills/result/FDE-analysis-charge-thinking.md) — 一份使用 Charge Thinking 技能生成的完整分析报告。

---

## English

A collection of AI Skills for Claude Code. Each Skill encapsulates domain-specific expertise and can be invoked through natural language.

### Skills

| Skill | Version | Description |
|-------|---------|-------------|
| Charge Thinking | 1.0.0 | Composite thinking framework combining Fundamental Logic and Charge Thinking systems for complex analysis and strategic decision-making |
| CEO Plan Review | 1.0.0 | Founder-mode plan review with four modes: Scope Expansion, Selective Expansion, Hold Scope, Scope Reduction |
| One Person Company (OPC+) | 1.0.0 | All-in-one operation assistant covering content creation, business operations, product/R&D, customer service, and personal efficiency |
| One Person MCN | 1.0.3 | 10 AI modules replacing a full MCN team — topic planning, SEO, video direction, community ops, business negotiation, and scheduling |
| Tour Planner | 1.0.0 | Auto-generate road trip routes from a list of locations with driving time estimates and recommendations |

### Infrastructure

| Component | Description |
|-----------|-------------|
| SQLite MCP Server | MCP-compliant local SQLite database service providing query, execute, and schema exploration tools |

### Usage

1. Copy the desired skill folder (e.g., `skills/one-person-mcn/`) into your Claude Code project's `skills/` directory
2. Trigger the skill through natural language in Claude Code
3. For SQLite MCP Server, configure the `SQLITE_DB_PATH` environment variable in `.claude/settings.json`

---

Built with [Claude Code](https://claude.ai/code).
