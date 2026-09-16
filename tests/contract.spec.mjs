/**
 * dsh-tidychat 契约测试。
 *
 * 本仓库没有业务单测所需的纯函数层（客户端功能全部是 DOM 副作用），因此这里断言的是
 * **发布契约**——那些曾经真实出过错、且出错时静默失效的东西：
 *
 * 1. 宿主半的命名空间与 README 承诺一致；
 * 2. 客户端产物只依赖宿主提供的模块（曾经的 `dsh-client-runtime` 在 0.1.2 被移除，
 *    靠宿主 alias 苟活；0.1.5 必须用 `dsh-client-store`）；
 * 3. **合并无损**：上游 main 与本仓库 0.1.5 线各自的功能标记必须同时存在于产物里——
 *    `git merge upstream/main` 之后如果有人误删一边，这里会红。
 *
 * 断言对象是构建产物 `lib/**`，所以必须 `pnpm run build` 之后再跑（`pretest` 已自动执行）。
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const manifest = JSON.parse(read('package.json'))
const host = read('lib/index.js')
const client = read('lib/client.js')

/** 产物的 CJS require 实参（客户端 bundle 是 CJS）。 */
const requiredSpecifiers = (src) => {
  const found = new Set()
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g
  let m
  while ((m = re.exec(src)) !== null) found.add(m[1])
  return [...found].sort()
}

test('宿主半：README 承诺的 settings 命名空间与产物一致', () => {
  assert.match(host, /tidychat/, 'lib/index.js 必须注册 tidychat 命名空间')
  assert.ok(
    host.includes('installSection'),
    '宿主半必须优先走 settings.installSection（0.1.2+ 路径）',
  )
  assert.ok(
    host.includes('register'),
    '宿主半必须保留 settings.register 回退（0.1.0-rc.7 / 0.1.1-rc.x 路径）',
  )
})

test('宿主半：schema 默认值与 README 表格逐项一致', () => {
  // README「⚙️ 设置」表格里写明默认值的开关；默认值错了会静默改变所有新装用户的行为。
  for (const [key, expected] of [
    ['fold', true],
    ['divider', true],
    ['navigator', true],
    ['hideOfficialNav', false],
    ['autoLoad', true],
    ['navRing', false],
    ['navGuideSeen', false],
  ]) {
    const re = new RegExp(`${key}\\s*:[^,}]*default\\(\\s*${expected}\\s*\\)`)
    assert.match(host, re, `${key} 的默认值应为 ${expected}`)
  }
  for (const [key, expected] of [
    ['navSide', 'left'],
    ['navStyle', 'bar'],
  ]) {
    const re = new RegExp(`${key}\\s*:[^,}]*default\\(\\s*['"]${expected}['"]\\s*\\)`)
    assert.match(host, re, `${key} 的默认值应为 ${expected}`)
  }
})

test('客户端产物：不再引用已被宿主移除的 dsh-client-runtime', () => {
  assert.ok(
    !client.includes('dsh-client-runtime'),
    'lib/client.js 不得再引用 dsh-client-runtime（0.1.2 起宿主已删除，0.1.5 不存在）',
  )
  assert.ok(
    manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-store'),
    'package.json 的 dsh.client.inject 必须声明 dsh-client-store',
  )
})

test('客户端产物：外部依赖只有宿主提供的包', () => {
  const externals = requiredSpecifiers(client).filter(
    (s) => !s.startsWith('./') && !s.startsWith('../'),
  )
  for (const spec of externals) {
    assert.ok(
      spec === 'react' ||
        spec.startsWith('react/') ||
        spec.startsWith('@deepseek-ai/dsh-client-'),
      `意外的外部依赖 ${spec}：客户端半只能依赖 react 与宿主提供的 @deepseek-ai/dsh-client-*`,
    )
  }
})

test('合并无损：上游 main 的功能标记仍在产物里', () => {
  // 这些来自上游 main（457998b 首次引导 / 设置项重排 / 滚动缓动、16dd14a 截图、
  // 04f8ff9 提示带）。合并 upstream/main 时若误取「我方旧版」，它们会整块消失。
  for (const marker of [
    'navGuideSeen', // 首次引导的「已看过」标记
    'shell.overlay', // 首次引导的座位
    'prefers-reduced-motion', // 跳转滚动缓动尊重系统偏好
  ]) {
    assert.ok(client.includes(marker), `上游标记 ${marker} 缺失——合并可能把上游内容丢了`)
  }
})

test('合并无损：本仓库 0.1.5 线的功能标记仍在产物里', () => {
  // 这些是本仓库线的自有内容（04f8ff9 的落点修复、未加载更早历史的提示带、
  // 接管官方消息轨）。合并 upstream/main 时若误取「上游旧版」，它们会整块消失。
  for (const marker of [
    'data-tidychat-hide-official-nav', // 接管官方消息轨的根属性
    '--turn-natural-position', // 官方轨的三重锚定之一
  ]) {
    assert.ok(client.includes(marker), `本线标记 ${marker} 缺失——合并可能把本线内容丢了`)
  }
})

test('客户端产物：版本号由构建注入，不是硬编码字面量', () => {
  assert.ok(
    !/__PLUGIN_VERSION__/.test(client),
    'lib/client.js 里不该残留未替换的 __PLUGIN_VERSION__',
  )
  const version = manifest.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  assert.match(client, new RegExp(version), `产物里应能读到注入的版本号 ${manifest.version}`)
})
