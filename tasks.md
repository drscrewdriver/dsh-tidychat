# Tasks

## Phase 1: 分支准备
- [ ] task_1: 提交 feature 分支未提交改动——`git add README.md README.en.md lib/ src/ docs/`，在 feat/rail-mirror-and-dots 上提交（消息轨共享采集修复 + RAIL 分析文档）
- [ ] task_2: `git checkout -b compat/0.1.5`（基于该提交）

## Phase 2: 依赖与元数据（0.1.5 优先）
- [ ] task_3: package.json — `dsh.client.inject` 中 `@deepseek-ai/dsh-client-runtime` → `@deepseek-ai/dsh-client-store`
- [ ] task_4: package.json — peerDependencies：`dsh-settings` → `^0.1.5-rc.2`；devDependencies：新增/升级 `@deepseek-ai/dsh-client-store`、`dsh-client-ui-settings`、`dsh-client-ui-slots`、`dsh-client-ui-chat`、`dsh-session` 至 `^0.1.5-rc.2`（保留 cordis/typescript/tsdown/react）
- [ ] task_5: package.json — 新增 `engines.dsh: ">=0.1.5-alpha.1"`，version bump `0.2.10` → `0.3.0`
- [ ] task_6: `pnpm install && pnpm typecheck`，修复类型报错（预期集中在 eventSource/settings 类型面，运行时 any 包裹处应无碍）

## Phase 3: 代码适配（以验证驱动，预期改动极小）
- [ ] task_7: 静态核对 src/index.ts settings 双回退、src/client/index.ts 的 inject/slots/DOM 锚点/surfaceOp 读取与 findings.md 风险清单逐项对照；仅在静态证据显示契约变化处改代码
- [ ] task_8: `pnpm build`，确认 lib/ 产物中不再引用 dsh-client-runtime

## Phase 4: 运行时验证（需本机 DSH 0.1.5-rc.2）
- [ ] task_9: 安装到 DSH 0.1.5-rc.2 profile，强制刷新浏览器，按 checklist.md Must Pass 逐项验证
- [ ] task_10: 按 checklist 验证结果修补（slot 名/DOM kind/CSS 选择器/双回退分支），每修一项重跑对应验证

## Phase 5: 收尾
- [ ] task_11: 更新 README.md / README.en.md 版本适配矩阵（0.3.0 → DSH ≥0.1.5，0.2.10 维持旧版本线说明）
- [ ] task_12: 提交 compat/0.1.5 分支（feat: DSH 0.1.5 适配），清理 spec/findings/checklist/tasks 规划产物（或按用户意愿保留）
