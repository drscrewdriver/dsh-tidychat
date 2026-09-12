# Spec: dsh-tidychat 0.1.5 适配（compat/0.1.5 分支）

## 需求
- 在 `feat/rail-mirror-and-dots`（最新 feature 分支）基础上切出 `compat/0.1.5` 分支，完成 DSH 0.1.5 适配
- 分支定位：**0.1.5 优先**（inject 改为 `dsh-client-store`；旧版本兼容交给 main 线 0.2.10 现有代码，不在本分支维护双回退）
- 切分支前，先把 feature 分支上的未提交改动（消息轨共享采集修复 + 3 份 RAIL 分析文档）提交到 feature 分支
- 适配范围（基于 DSH 0.1.5-rc.2）：
  1. package.json：inject 客户端包、peerDependencies/devDependencies 版本线
  2. settings 注册路径验证（installSection 双回退保留为防御性代码）
  3. slot 契约验证（settings.plugin.item / conversation.session.header.utilities）
  4. DOM 锚点验证（data-chat-flow-kind / data-chat-anchor-key / data-conversation-scroll / data-variant="think"）
  5. TurnNavigator 接管（hideOfficialNav）选择器在 0.1.5 ChatView 下的验证
  6. Session V3 事件读取验证（collectUserEvents 已处理 surfaceOp append）
  7. README 版本适配矩阵更新 + 版本号 bump

## 技术方案

### 分支与提交
1. 在 `feat/rail-mirror-and-dots` 提交现有改动（消息轨修复 WIP + docs/RAIL-*.md + docs/VERSION-COMPATIBILITY-ANALYSIS.md）
2. `git checkout -b compat/0.1.5`（基于该提交）

### package.json 变更（0.1.5 优先）
- `dsh.client.inject`：`["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-ui-settings"]` → `["@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-ui-settings"]`
- `peerDependencies`：`dsh-settings` 扩为 `>=0.1.0-rc.7`（或 `^0.1.5-rc.2`，0.1.5 优先取后者），react 不变
- `devDependencies`：`@deepseek-ai/dsh-client-store`、`dsh-client-ui-settings`、`dsh-client-ui-slots`、`dsh-client-ui-chat`、`dsh-session` 等升到 `^0.1.5-rc.2`（typecheck 需要）
- `engines.dsh`：新增 `>=0.1.5-alpha.1` 声明
- 版本号：`0.2.10` → `0.3.0`（新 DSH 版本线，遵循 distribution-strategy 多版本分发约定）

### 代码层（预期改动极小，以验证为主）
- `src/index.ts`：settings 双回退（installSection → register）保留不动，0.1.5 走 installSection 分支；仅当 0.1.5 签名变化时调整
- `src/client/index.ts`：
  - `inject = ['slots', 'sessions']` 保持（0.1.5 未变更）
  - `settingsScope` 获取路径 `ctx.get('webUiSettings') ?? ctx.get('settingsScope')` 保持，运行时验证 bind() 契约
  - `collectUserEvents` 已按 surfaceOp append 过滤 + `entry.event` 包装结构读取，V3 兼容已就位
  - 折叠/定位条全部基于 `data-*` 语义属性 + flow-kind 白名单，0.1.5 如新增 kind（需实测）只改白名单
  - `hideOfficialNav` 的 CSS 选择器若 0.1.5 TurnNavigator DOM 变化则更新

## 决策记录
| 选项 | 选择 | 理由 |
|------|------|------|
| 分支基点 | feat/rail-mirror-and-dots | 用户指定"从最新 feature 分支切出" |
| 未提交改动 | 先提交到 feature 分支 | 用户确认；历史清晰，两分支都含修复 |
| 兼容目标 | 0.1.5 优先 | 用户确认；inject 直接换 client-store，不再为 0.1.0-rc.7 维护别名 hack |
| 版本号 | 0.3.0 | 新 DSH 版本线用新 minor，与 0.2.x（≤0.1.2 线）区分 |
| settings 双回退 | 保留 | 防御性代码无副作用，避免 0.1.5 签名再变时二次返工 |

## 约束
- 本分支不追求 0.1.0-rc.7 ~ 0.1.3 回归兼容（main 线 0.2.10 覆盖）
- 0.1.5 运行时验证需要本机安装 DSH 0.1.5-rc.2（验证清单中标注，无法纯静态完成）
- 不可写自定义 message source kind / null turn-step marker（upgrade-pitfalls §1）——当前代码不写会话，无此风险
- 依赖安装走 pnpm；构建 `pnpm build`（tsdown），类型检查 `pnpm typecheck`
