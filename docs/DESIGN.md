# cli-resume 扩展 — 设计文档 (DESIGN)

> 一个 VS Code 扩展：退出时自动快照每个集成终端的"目录 + 正在运行的 CLI"，下次启动时在 VS Code 原生恢复的终端布局原位，自动重新拉起对应 CLI 并续接会话。零硬编码配置。

---

## 1. 背景与问题

用户的工作方式：

- 在 VS Code 集成终端中同时并行运行多个 agent CLI（opencode / codex / claude）
- 将屏幕均分为多个象限（终端窗格拖到编辑器区域），每个象限一个 CLI，同屏可见
- 重启 VS Code 后希望：**布局、每个终端的工作目录、每个终端里跑的 CLI 及其会话**全部原位恢复

现状分析（实测验证过的事实）：

| 能力 | VS Code 原生 | 现有插件 (restore-terminals) | 本扩展 |
|---|---|---|---|
| 恢复窗口/终端布局（分屏、分组） | ✅ 会（前提 File > Exit 退出） | ❌ 只建新终端 | ✅ 不碰，靠原生 |
| 恢复终端 cwd | ✅ 会 | ⚠️ 需写死配置 | ✅ 不碰，靠原生 |
| 恢复 CLI 进程/会话 | ❌ 不可能 | ⚠️ 命令写死 + executeCommand 对 TUI 不友好 | ✅ 快照 + sendText |
| 零配置 | ✅ | ❌ 项目清单写死 | ✅ |

结论：布局和 cwd 交给 VS Code 原生恢复（已具备）；本扩展只补最后一块——**记住每个终端跑的是什么 CLI，并在原位重新拉起**。

## 2. 目标与非目标

### 目标 (Goals)

- G1 退出时自动快照：每个终端的名称、cwd、正在运行的 CLI 类型
- G2 启动时自动恢复：按快照匹配恢复出来的终端，发送续接命令
- G3 零配置：不需要用户维护项目/CLI 清单
- G4 不破坏布局：不创建、不移动、不关闭任何终端
- G5 对交互式 TUI 安全：使用 `sendText`（等同手动打字），不用 `executeCommand`

### 非目标 (Non-Goals)

- 不恢复 CLI 的进程状态（正在执行的命令会中断，只恢复会话上下文）
- 不处理 VS Code 未优雅退出（X 关光窗口）的场景——此时无布局可恢复
- 不做跨机器/云同步快照
- 不支持 WSL 远端终端的 CLI 检测（见限制，优雅跳过）

## 3. 用户故事

1. 用户摆好 4 象限：opencode@CODE、claude@archify、claude@claude-mem、codex@claude-mem
2. 正常使用，扩展在后台持续快照（无感）
3. File > Exit 退出
4. 双击快捷方式重新打开 → VS Code 原生恢复窗口和 4 象限布局（cwd 就位）
5. 扩展检测到布局恢复完成，逐个终端发送 `claude -c` / `opencode -c` / `codex resume --last`
6. 用户看到 4 个 CLI 原位复活，会话续接，直接继续工作

## 4. 核心设计决策 (ADR)

| # | 决策 | 理由 | 备选方案及否决原因 |
|---|---|---|---|
| D1 | 布局/cwd 依赖 VS Code 原生恢复，扩展不管理布局 | VS Code API 无法创建/恢复自定义窗格排列 | 插件重建终端 → 只能塞进底部面板，已证失败 |
| D2 | 命令注入用 `terminal.sendText(cmd, true)` | 完全等同用户手动输入，对 TUI 零兼容风险 | `shellIntegration.executeCommand` 面向非交互命令，TUI 输入有已知问题 |
| D3 | CLI 识别靠进程树（cmd 子进程的 exe 名） | 唯一可靠方式；VS Code 不暴露终端内运行的程序 | 猜终端标题不可靠；shell integration 不提供进程信息 |
| D4 | 快照存 `workspaceState`，周期 60s + 关闭事件触发 | 防崩溃/强杀丢状态；异步落盘失败也有兜底 | 只在关闭时存 → 强杀场景丢失 |
| D5 | 恢复匹配用"终端名"优先、cwd 兜底 | 终端名由 VS Code 持久化且用户可辨；cwd 可能存在重复 | 只用 cwd → 同目录多终端无法区分 |
| D6 | 续接命令固定为 `-c` / `resume --last` 语义，不存 session id | 免去运行时解析会话 id；"最近会话"语义正确 | 存 session id → 需要深入各 CLI 内部状态，脆弱 |

## 5. 功能需求 (FR)

- FR1 快照：枚举 `window.terminals`，采集 {名称, cwd, CLI}；触发时机 = 任一终端关闭事件 + 每 60s 周期
- FR2 检测：对每个终端取 `processId`，经 PowerShell `Get-CimInstance Win32_Process` 查子进程链，识别 CLI 类型（claude / opencode / codex / 未知）
- FR3 存储：快照 JSON 存 `workspaceState`，带 schema 版本号；损坏时降级为忽略
- FR4 恢复：启动后等待终端恢复完成（事件静默期），按名称精确匹配（cwd 兜底），对每个匹配终端：
  - 若检测到该终端已有 CLI 在跑 → 跳过（防重复拉起）
  - 等待 shell 就绪（`processId` 可用）
  - `sendText(续接命令, true)`
- FR5 映射：CLI → 续接命令（claude→`claude -c`，opencode→`opencode -c`，codex→`codex resume --last`），可通过配置覆盖
- FR6 可观测：所有动作写 Output Channel `cli-resume`；跳过/失败原因可查
- FR7 配置面（全部可选，默认零配置可用）：启用开关、命令模板覆盖、快照周期

## 6. 非功能需求 (NFR)

- NFR1 兼容 VS Code ≥ 1.125（用户 1.135）
- NFR2 快照开销：每周期 < 100ms，对交互零感知
- NFR3 失败安全：任何异常只影响该终端，不阻断其他恢复；扩展不崩溃
- NFR4 不向工作区写入任何文件（状态只在 VS Code 内部存储）
- NFR5 跨平台可扩展：进程检测抽象为适配器（当前实现 Windows；Linux/macOS 留接口）

## 7. 边界情况与处理策略

| 场景 | 策略 |
|---|---|
| 首次使用（无快照） | 静默 no-op，不弹任何提示 |
| 退出方式 = X 关光窗口 | 无布局恢复，扩展启动后无终端可匹配 → no-op（提示用户用 File > Exit，见输出面板） |
| shell integration 超时（cmd 慢启动） | 等待上限 5s；`sendText` 不依赖 integration，仅 cwd 采集降级用 `creationOptions.cwd` |
| 终端名重复（两个 claude 都在 CODE） | 按名称一对一顺序匹配；多余快照条目跳过并记录日志 |
| 快照里 CLI=未知 | 跳过该终端（不猜），日志记录 |
| WSL 终端 | `processId` 是 wsl.exe 宿主，子进程不可见 → 检测返回未知 → 跳过 |
| 用户已手动启动 CLI 的终端 | 恢复前复查进程树，已运行则跳过 |
| 快照指向已删除的项目目录 | 终端 cwd 恢复失败或不同 → 名称仍匹配，命令照发，CLI 自会在当前目录续接（-c 语义安全） |
| 多个 VS Code 窗口（多工作区） | workspaceState 天然按工作区隔离，互不干扰 |
| VS Code 强杀/崩溃 | 周期快照保证最多丢 60s 内的布局变化 |

## 8. 验收标准

- AC1 摆好 N 个终端（含 4 分屏、不同 CLI）→ File > Exit → 重开 → 布局同前，N 个 CLI 全部自动在原位续接
- AC2 无快照时（全新工作区）扩展零行为、零提示
- AC3 换项目/换 CLI 组合后，无需改任何配置，下次自动跟随
- AC4 手动已启动 CLI 的终端不会被重复注入命令
- AC5 扩展故障不影响 VS Code 稳定性（异常被捕获并记日志）
