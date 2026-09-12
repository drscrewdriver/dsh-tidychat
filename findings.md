# Findings

## 架构决策
- tidychat 的客户端半是纯 DOM 锚点 + eventSource 读取，不写会话、不用 RPC/HTTP 通道、不碰 Sidebar slot——因此 0.1.5 的三大重灾区（Session V3 迁移、Sidebar dockkit 重写、RPC 405）对本插件影响面天然很小
- 「0.1.5 优先」策略下，package.json 的 `dsh-client-runtime` inject 直接换成 `dsh-client-store`：runtime 包在 0.1.2 起已移除，0.2.10 时代靠宿主 alias 兼容（distribution-strategy §1.2 已验证案例），0.1.5 分支不再依赖该 alias

## 技术选型
- settings 注册维持 installSection/register 运行时双回退（src/index.ts:83-93），0.1.5 模块矩阵确认 `installSection` 为「同 0.1.2 + installSection()」，预期走第一分支
- Session V3 事件读取：现有 `collectUserEvents`（src/client/index.ts:861-886）已按 `entry.event` 包装结构 + `surfaceOp === 'append'` 过滤，与 docs/VERSION-COMPATIBILITY-ANALYSIS.md 的跨版本结论一致（V3 仅新增 surfaceOp 字段，entries/user-message 形状不变）
- 消息轨数据不依赖 `ChatSnapshot.navigation`（0.1.5 TurnNavigator 的官方数据源），插件自采 DOM 行 + eventSource，不受 TurnNavigator 硬编码无 slot 的影响

## 约束与依赖
- 模块矩阵（dsh-015-notes §插件侧模块可用性矩阵）：0.1.5 新增 `dsh-client-connection`、`dsh-session`、`dsh-session-projection` 等；`dsh-client-store`/`ui-slots`/`ui-settings` 持续可用
- typecheck 需要 0.1.5 版本的 devDeps 类型；当前 devDeps 锁在 ^0.1.0-rc.7
- 0.1.5 要求 Node ≥ 24（import.meta.main 守卫问题，#6124/#6373）；tidychat 构建脚本为 tsdown，不使用 import.meta.main 守卫，无此风险

## 风险识别
- **待运行时验证（静态无法确认）**：
  1. `settings.plugin.item`（keyed, key='tidychat'）与 `conversation.session.header.utilities` 两个 slot 名在 0.1.5 是否仍存在——文档未见移除记录，但 Sidebar 重写波及面大
  2. `data-chat-flow-kind` / `data-chat-anchor-key` / `data-conversation-scroll` / `data-variant="think"` 等 DOM 契约在 0.1.5 dsh-client-ui-chat 是否保持——0.1.5 可能有新 kind，折叠白名单需实测补全
  3. `hideOfficialNav` 隐藏官方 TurnNavigator 的 CSS 选择器——0.1.5 TurnNavigator 硬编码在 ChatView，DOM 结构可能变化
  4. `ctx.get('webUiSettings') ?? ctx.get('settingsScope')` 的 bind() 契约在 0.1.5 是否不变
  5. `installSection(ctx, ns, schema, entry, hooks)` 五参签名在 0.1.5 是否保持
- 升级后 client combo 缓存陈旧会让插件整体不激活（upgrade-pitfalls §3.1）——验证时必须先强制刷新浏览器
- feature 分支的 RAIL 修复（steering 行、append 过滤）本身是对 0.1.2+ 行为的修正，理论上是 0.1.5 适配的前置；若适配中发现圆点/DOM 错位优先怀疑此处而非 0.1.5 新问题
