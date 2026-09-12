# Checklist

## Must Pass
- [ ] `pnpm install` 在 devDeps 升到 ^0.1.5-rc.2 后成功
- [ ] `pnpm typecheck`（tsc --noEmit）零错误
- [ ] `pnpm build`（tsdown）产出 lib/index.js + lib/client.js
- [ ] DSH 0.1.5-rc.2 上插件加载成功（无 Failed to load plugins）
- [ ] 设置面板出现 tidychat 卡片（installSection 路径生效，settings.plugin.item slot 正常）
- [ ] 会话头 utilities slot 正常（若该功能启用）
- [ ] 折叠功能在 0.1.5 会话上正常（think/tool-call/model-retry/steering kind 全覆盖）
- [ ] 左缘定位条（navigator）正常：圆点数与 DOM 行数一致，锚点定位准确
- [ ] hideOfficialNav 开启后官方 TurnNavigator 被隐藏（0.1.5 ChatView DOM 下）
- [ ] 自动加载更早历史正常
- [ ] 验证前已强制刷新浏览器（排除 client combo 缓存陈旧假象）

## Should Pass
- [ ] 设置改动即时生效（settingsScope bind + subscribe 契约在 0.1.5 正常）
- [ ] 深色/浅色主题下语义色 token 渲染正常
- [ ] 插件卸载无残留（折叠标记、注入 style 全部清理）
- [ ] README 版本适配矩阵已标注 0.3.0 → DSH ≥0.1.5
- [ ] npm 包 `files` 清单构建产物完整
