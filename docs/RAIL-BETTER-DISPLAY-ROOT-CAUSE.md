# 消息轨不渲染 · 根因定位（better-display 阅读视图替换宿主行级锚点）

> 结论性文档。前序同族排查见 `RAIL-NOT-RENDERING-INVESTIGATION.md`（0.1.2 快照取数断链）与
> `RAIL-ROOT-CAUSE-ANALYSIS.md`（取数修复 + steering 对齐 + DOM 单一事实源）。
> 本次是**第三个**「零 DOM、零报错」案例，根因不在宿主、不在本插件代码变化，而在**第三方插件替换了
> 本插件依赖的宿主 DOM 契约**。
> 生成时间：2026-09-28 ｜ 状态：**根因已实锤；bd fork 侧修复已实施（见下），tidychat 侧回退转为健壮性后续项**
>
> **2026-09-28 修复进展**：better-display fork（`mine-dsh-plugins/refer-dsh-better-display`，基于
> `94d59c7` = fork.5）已在 Reader.tsx 四处（answer / userCluster / turn-error / unknown 回退）
> 补回 `data-chat-anchor-key` + `data-chat-flow-kind`，并给推理思考卡加了与答案泡泡同款的半透明
> 衬底（规划产物见该仓库根目录 spec/findings/checklist/tasks 四件套）。typecheck/build 通过，
> 已备份覆盖部署到本机 profile（原 lib 备份于 `lib.backup-fork5/`），**待重启 host + 硬刷新后按
> 其 checklist.md 验证**。验证通过后向上游 `aa2246740/dsh-better-display` 提 issue/PR。
> 若上游接受，本插件无需任何改动；`§5.1` 的 `[data-reader-key]` 回退保留为「其它渲染器替换者
> 出现时」的健壮性后续项，非本轮必需。

---

## 0. 一句话结论

**`dsh-better-display`（阅读视图插件）接管了宿主 ChatView 的消息渲染，其阅读视图把用户/插队消息行渲染为
`<div class="…_userCluster" data-reader-anchor data-reader-key="4:user…">`，
不再写宿主契约里的 `data-chat-anchor-key` / `data-chat-flow-kind` 两个属性**；
本插件消息轨的 DOM 事实源 `railRows()` 只认这两个属性 → 解析出 0 行 →
命中最后一道判空 `turns.length === 0 && !hasMoreHistory` → `return null`。
于是「接管链路正常（官方右缘轨被隐藏）× 渲染链路断裂（插件左缘轨不存在）」同时成立。

三条链路的真实状态（浏览器实测）：

| 链路 | 状态 | 证据 |
|---|---|---|
| 接管链路（CSS 隐藏官方轨） | ✅ 正常 | `data-tidychat-hide-official-nav` 在；官方标记 DOM 有 2 个、可见 0 个 |
| 渲染链路（插件自己的 canvas 轨） | ❌ 断裂 | `.tidychat-nav-rail` / `.tidychat-nav-canvas` 均 **不在 DOM**（从未生成，非被隐藏） |
| 宿主/槽位/配置 | ✅ 正常 | `conversation.session.header.utilities` 在渲染；插件已注入；配置四开关全开 |

---

## 1. 环境事实（本机实测，2026-09-28）

| 角色 | 值 |
|---|---|
| 宿主 DSH | `0.1.7-rc.2`（全局安装 `C:\nodejs\node_modules\@deepseek-ai\dsh`） |
| 本插件 | `@drscrewdriver/dsh-tidychat` **0.3.3（npm 安装，非 link）**；本地 `release/0.1.7` 已到 0.3.4 |
| 肇事插件 | `@drscrewdriver/dsh-better-display` **0.3.3-fork.5**（**fork**；上游 = `aa2246740/dsh-better-display`） |
| 会话 | 「你好」：2 个用户轮、2 个助手轮，页面正常显示消息 |
| 设置现状 | 定位条=开、位置=左缘、样式=横线、外圈=开、接管官方消息轨=开、自动折叠=开、智能加载=开 |

实测 Console 探针（原样记录）：

```json
{
  "pluginInjected": true,
  "takeoverAttr": true,
  "officialMarksInDom": 2,
  "officialMarksVisible": 0,
  "railInDom": false,
  "canvasInDom": false,
  "anchorRows_数据聊天锚点": 0,
  "userRows": 0,
  "hostRect": "871x838（通过尺寸门）",
  "gutterLeft": 73, "gutterRight": 78,   // ≥48，通过空间门
  "loadEarlierBtn": false,
  "utilitiesSlot": "conversation.session.header.utilities 在 DOM"
}
```

四道判空门逐项核对：`enabled` ✅、`pos` ✅、`gutter` ✅、**`turns.length === 0 && !hasMoreHistory` ❌ 命中**
（`src/client/index.ts` `railRows()` L930 → 组件 L1891 → 判空 L2020）。

---

## 2. 肇事方证据（better-display 源码，fork 0.3.3-fork.5）

### 2.1 用户/插队行：锚点被替换

`src/client/Reader.tsx` `MainNode`（L195-211）：

```tsx
if (isNode(node, 'user') || isNode(node, 'steering')) {
  …
  return <div className={css.userCluster} data-reader-anchor data-reader-key={nodeKey}>
```

→ **只有 `data-reader-anchor` / `data-reader-key`，没有 `data-chat-anchor-key` / `data-chat-flow-kind`。**
助手回答行同理（`AssistantNode` → `article[data-reader-answer][data-reader-key]`）。

### 2.2 只有「官方回退节点」保留了原生锚点

`src/client/OfficialContent.tsx` `OfficialNode`（L59）：

```tsx
return <div data-reader-official-node={node.kind} data-chat-anchor-key={node.key} data-chat-flow-kind={node.kind}>
```

→ 作者**知道并会写**宿主锚点契约，只是只给了「阅读视图不认识的节点类型」的官方回退路径，
日常的 user / steering / assistant-step 行全部漏掉。

### 2.3 作者本有此类兼容的自觉（提 issue 的依据）

better-display README 自述：「阅读列保留宿主 ChatView 的 `data-chat-flow` 钩子，依赖该标记显示输入框的
第三方皮肤不会把阅读页当成仅检视视图。」——实测 DOM 里确有 `data-chat-flow=""`。
即作者已主动为「皮肤类生态插件」保留宿主钩子，行级锚点属于**同一类生态契约的遗漏**，不是设计拒绝。

### 2.4 实测 DOM 形态（对照）

| 属性 | 原生 0.1.7-rc.2 ChatView | better-display 阅读视图 |
|---|---|---|
| `data-chat-anchor-key` | 每行都有（引擎键） | **无** |
| `data-chat-flow-kind` | `user` / `steering` / `think`… | **无** |
| `data-reader-key` | 无 | 每行都有（引擎节点键，如 `4:user12`、`14:assistant-step…`） |
| `data-reader-anchor` | 无 | 有 |
| `data-flow-key` | 无 | 过程行有（`12:turn-process1` 等折叠行键） |
| `data-chat-flow=""` | ChatView 列上 | 保留（作者为皮肤特意留的） |

---

## 3. 本插件侧断链（逐步）

```
better-display Reader 接管消息区渲染（新会话默认进阅读）
        ↓
railRows() = scopedRows('[data-chat-anchor-key]') ∩ kind∈{user,steering}   ← L930
        ↓  页面上 0 个 data-chat-anchor-key
rows = [] → turns = []
        ↓
turns.length === 0 且无「加载更早」按钮                                      ← L2020 判空命中
        ↓
RailView return null → 零 DOM、零报错（与 0.1.2 快照断链同一「静默失明」家族）
```

### 3.1 为什么「官方轨隐藏了、插件轨又不出现」能同时成立

接管开关（`hideOfficialNav` → `applyOfficialNavTakeover()` 切根属性 + CSS）与插件轨渲染
（RailView 四道判空）是**两条独立链路**，前者只依赖配置，后者依赖 DOM 行。0.1.2 那次（快照取数断链）
与本次（锚点被第三方替换）都呈现「接管成功 × 轨缺席」的组合，判读时务必分开验证。

### 3.2 与 2026-09-11 根因的关系

| | 0.1.2 快照断链 | 本次 |
|---|---|---|
| 断点 | `session.getSnapshot()` 无 `nodes`，取数路径错 | DOM 行锚点属性被第三方插件替换 |
| 宿主契约 | 宿主本身没变，是插件对宿主 API 的假设错 | 宿主 0.1.7 **仍在输出** `data-chat-anchor-key`（`dsh-client-ui-chat/lib/client.js` 实测在写），契约没变 |
| 教训 | 「DOM 单一事实源」修复了那次的问题 | **这次断的正是 DOM 事实源**——DOM 事实源的前提是「DOM 形态由宿主决定」，第三方换渲染器时同样会断 |

---

## 4. 影响面（`git grep data-chat-anchor-key src/` 全量核对）

| 位置 | 用途 | 在阅读视图下的现状 | 是否需修 |
|---|---|---|---|
| `railRows()` L930 | 轨的身份/数量/顺序（DOM 单一事实源） | 0 行 → 轨不渲染 | **P0 修** |
| `measurePos()` L1520 | gutter 参照候选（composer + 首末行） | 候选只剩 composer，gutter 可能被高估/低估 | **P0 同步修** |
| `countAnchors()` / 诊断 L1139/L1184 | 诊断报告轮数口径 | 报「0 行」，诊断失真 | P1 修（顺带标注「阅读模式」） |
| `scan()`/`applySurgery()` L679/692/732 | 折叠/分隔线（DOM 手术） | 找不到行 → 功能静默不生效 | **P1 明确不修**：bd 自带过程折叠，两边都对同一批行做手术会互相打架；保持「原生渲染下才手术」是合理语义，至多在 README 写清兼容边界 |

**修复设计约束**（沿用 HANDOVER §4 原则）：只对「只读消费」（轨/诊断）做 reader 回退；
不改 DOM 手术的适用范围；不硬编码 bd 的 CSS Module hash 类名（`_userCluster` 前缀随构建变化，禁用）。

---

## 5. 自修方案（待实施，代码目录随后）

### 5.1 `railRows()` 增加阅读视图回退（原生锚点优先，行为零回归）

```ts
const railRows = (): Element[] => {
  const native = scopedRows('[data-chat-anchor-key]').filter((r) => {
    const k = r.getAttribute('data-chat-flow-kind')
    return k === 'user' || k === 'steering'
  })
  if (native.length > 0) return native
  // 阅读视图回退：better-display 等替换渲染器时，行以 data-reader-key 携带引擎节点键。
  // 键公式 conversationContextKey(kind,id) = `${kind.length}:${kind}${id}`（engine-owned，
  // 见 HANDOVER §2）——仅作回退解析，解析失败一律跳过，绝不据此做身份关联。
  return scopedRows('[data-reader-key]').filter((r) => {
    const key = r.getAttribute('data-reader-key') || ''
    const m = /^(\d+):/.exec(key)
    if (m === null) return false
    const len = Number(m[1])
    const kind = key.slice(m[1].length + 1, m[1].length + 1 + len)
    return kind === 'user' || kind === 'steering'
  })
}
```

要点：
- 原生路径命中即返回 → **bd 关闭/未装/回退节点场景行为零变化**；
- `data-reader-key` 里的键是引擎节点键（`4:user12`、`8:steering3`），与宿主 `data-chat-anchor-key` 同源同值
  （bd `OfficialNode` 直接 `data-chat-anchor-key={node.key}` 可证），解析即得 kind；
- pending steering（`data-reader-pending-submission`）无 `data-reader-key` → 与原生行为一致（无键无点，无错位风险）；
- 已知风险：键公式属 engine-owned 面（§7.2 findings 旧结论），故只用于**分类**（user/steering 两个白名单值），
  不做身份关联；若宿主改公式，回退路径退化为 0 行——与今天的行为一致，不会更糟。

### 5.2 `measurePos()` 候选同步

gutter 参照候选（L1519-1521）在 `chatRows` 为 0 时补采 `[data-reader-key]` 行的首末元素，
防止左/右缘 gutter 被低估误隐藏（本次实测 gutter=73 属 composer 单参照的运气，同 0.1.2 的 §8.2）。

### 5.3 诊断口径（P1）

`countAnchors()` / `snapshotUserTurns` / `buildReport` 与 `railRows()` 共用同一 helper 后自然统一；
报告建议新增一行「检测到 better-display 阅读视图（行级锚点回退生效中）」，方便 issue 定位。

### 5.4 验证步骤（修好后）

1. `pnpm typecheck && pnpm build`；本机是 npm 安装（非 link），需改 profile 依赖或 `pnpm pack` 后重装再硬刷新；
2. bd 开启 + 会话「你好」：左缘应出现横线轨（当前轮+悬停轮带外圈）；悬停摘要、点击跳转、滚到底高亮最后一点；
3. 关闭 bd（官方 ChatView 回归）：原生锚点路径回归——轨、折叠、分隔线与 0.3.1 行为一致；
4. 末尾插队（steering）会话回归：圆点数 = DOM 行数，尾部点击不失效；
5. 接管开 + bd 开：官方轨隐藏、bd 自带 TimelineRail 仍在右缘（那是 bd 自己的轨，不由接管管）——
   如视觉上嫌双轨，属 bd 侧开关问题，记入上游 issue 顺带询问。

---

## 6. 上游诉求（要求 better-display 一起修）

**对象**：上游 `aa2246740/dsh-better-display`（npm `dsh-better-display`；本机装的是 fork
`@drscrewdriver/dsh-better-display 0.3.3-fork.5`，fork 侧可先行同修）。

**诉求**：阅读视图渲染的行级节点（至少 user / steering / assistant-step / turn-error）在包裹元素上
**保留宿主 ChatView 锚点契约**：

```tsx
<div className={css.userCluster} data-reader-anchor data-reader-key={nodeKey}
     data-chat-anchor-key={nodeKey} data-chat-flow-kind={node.kind}>
```

**论据**：
1. 宿主契约仍在且稳定（0.1.7-rc.2 原生照常输出），生态以这两个属性为「会话行」的 DOM 事实源；
2. 作者已有同类自觉：`OfficialNode` 回退路径就在写这两个属性（`OfficialContent.tsx` L59），
   README 也写明为皮肤保留了 `data-chat-flow` 钩子——本诉求只是把同一兼容延伸到常规行，改动极小；
3. 现状是**静默失效**：依赖方解析出 0 行后按「无消息」设计内降级，无任何报错，用户与作者都难定位。

**备选（若上游不愿背原生属性）**：在 README/types 里把 `data-reader-key`（引擎节点键）+
键公式文档化为**公开替代契约**并承诺稳定，让依赖方有明确适配面；这仍优于现状的「无契约可用」。

---

## 7. 附：本次顺带核对的「外圈（透明光晕）」要求

要求：横线、圆点两种样式的消息轨都必须有透明外圈可选且可见。

| 项 | 结论 |
|---|---|
| 本地 `release/0.1.7`（0.3.4）代码 | ✅ 已满足：`navRing` 独立开关（`NAV_RING_OPTIONS` 关/开），绘制为样式无关的后置通道，`boxOf()` 横线出胶囊、圆点出正圆环；0.3.4 起 1px 实线改为**同色半透明光晕**（当前轮 α0.45 / 悬停 α0.25） |
| 本机运行中的 0.3.3（npm） | ⚠️ 外圈可开（设置卡实测「外圈 开」已按下）但仍是**旧 1px 实线**（设置卡 hint 文案「1px、外扩 2px」可证）；光晕需发布/部署 0.3.4 |
| 可见性 | 轨因本根因整体未渲染，外圈无从显示；§5 修复落地 + 0.3.4 部署后即满足「可选且可见」 |

## 8. 探针（复核用）

```js
// 接管与官方轨
document.documentElement.hasAttribute('data-tidychat-hide-official-nav')
document.querySelectorAll('[style*="--turn-natural-position"]').length          // 官方轨仍在 DOM（>0）
[...document.querySelectorAll('[style*="--turn-natural-position"]')]
  .filter(n => { let e = n; while (e) { if (getComputedStyle(e).display === 'none') return false; e = e.parentElement; } return true; }).length  // 可见（应 0）

// 插件轨与行锚点（本次根因核心）
!!document.querySelector('.tidychat-nav-canvas')          // 插件轨（应 true，现为 false）
document.querySelectorAll('[data-chat-anchor-key]').length // 原生行锚点（原生渲染 >0；阅读视图 =0）
document.querySelectorAll('[data-reader-key]').length       // 阅读视图行（bd 开启时 >0）
```
