/**
 * 定位条配色链的纯函数半：调色盘、颜色解析、对比度、色系×明度取值。
 * 从 client/index.ts 抽出（原先闭包在 apply() 内）以便单元测试；
 * 依赖 DOM / 闭包的部分（findBackgroundRgb、resolveNavColors、applyNavColors 等）留在 index.ts。
 */

// ===== 定位条配色：默认色（auto 背景自适应 / 手动色系×明度）+ 强调色（色系×明度）=====
// canvas 绘制时从 CSS 变量取值（applyNavColors 统一写入），redraw 不重复计算。
// 每个色系 5 档明度 [l1 极浅, l2 浅, l3 中, l4 深, l5 极深]——正交组合即 hue × light 查表。
export const NAV_HUE_PALETTE: Record<string, [string, string, string, string, string]> = {
  gray: ['rgba(225,225,225,0.9)', 'rgba(190,190,190,0.78)', 'rgba(128,128,128,0.8)', 'rgba(70,70,70,0.85)', 'rgba(20,20,20,0.92)'],
  black: ['rgba(90,90,90,0.8)', 'rgba(60,60,60,0.85)', 'rgba(30,30,30,0.9)', 'rgba(12,12,12,0.94)', 'rgba(0,0,0,0.97)'],
  white: ['rgba(255,255,255,0.95)', 'rgba(250,250,250,0.9)', 'rgba(240,240,240,0.85)', 'rgba(225,225,225,0.8)', 'rgba(205,205,205,0.75)'],
  blue: ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e40af'],
  violet: ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#5b21b6'],
  cyan: ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#155e75'],
  green: ['#86efac', '#4ade80', '#22c55e', '#16a34a', '#166534'],
  orange: ['#fdba74', '#fb923c', '#f97316', '#ea580c', '#9a3412'],
  red: ['#fca5a5', '#f87171', '#ef4444', '#dc2626', '#991b1b'],
}
export const NAV_LIGHT_IDX: Record<string, number> = { l1: 0, l2: 1, l3: 2, l4: 3, l5: 4 }
export const NAV_HUE_KEYS: readonly string[] = Object.keys(NAV_HUE_PALETTE)

export const hueColor = (hue: unknown, light: unknown, fallback: string): string => {
  if (typeof hue === 'string') {
    const palette = NAV_HUE_PALETTE[hue]
    if (palette !== undefined) return palette[NAV_LIGHT_IDX[typeof light === 'string' ? light : 'l3'] ?? 2]
  }
  return fallback
}
// 解析颜色，返回 [r, g, b, a]；兼容历史 rgba/rgb 逗号语法、空格 + `/` 语法、#rgb/#rgba/#rrggbb/#rrggbbaa、transparent
export const parseRgba = (s: string): [number, number, number, number] | null => {
  const t = (s ?? '').trim().toLowerCase()
  if (t === '') return null
  if (t === 'transparent') return [0, 0, 0, 0]
  const hex = /^#([0-9a-f]{3,8})$/.exec(t)
  if (hex !== null) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    if (h.length === 6) h += 'ff'
    const n = parseInt(h, 16)
    return [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, Math.round(((n & 255) / 255) * 1000) / 1000]
  }
  const num = (x: string, base: number): number | null => {
    const v = x.trim()
    if (v === '') return null
    const p = v.endsWith('%') ? Number(v.slice(0, -1)) : Number(v)
    if (Number.isNaN(p)) return null
    if (base === 255 && v.endsWith('%')) return Math.round((p / 100) * 255)
    if (base === 1 && v.endsWith('%')) return p / 100
    return base === 1 ? p : Math.round(p)
  }
  const comma = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*([\d.]+%?))?\s*\)$/.exec(t)
  if (comma !== null) {
    const r = num(comma[1], 255); const g = num(comma[2], 255); const b = num(comma[3], 255)
    const a = comma[4] !== undefined ? num(comma[4], 1) : 1
    if (r === null || g === null || b === null || a === null) return null
    return [r, g, b, a]
  }
  const space = /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(t)
  if (space !== null) {
    const r = num(space[1], 255); const g = num(space[2], 255); const b = num(space[3], 255)
    const a = space[4] !== undefined ? num(space[4], 1) : 1
    if (r === null || g === null || b === null || a === null) return null
    return [r, g, b, a]
  }
  return null
}
export const parseRgb = (s: string): [number, number, number] | null => {
  const a = parseRgba(s)
  return a === null ? null : [a[0], a[1], a[2]]
}
// WCAG 近似相对对比度（指示性元素用 3:1 即可，不必正文级 4.5）
export const contrastRatio = (a: [number, number, number], b: [number, number, number]): number => {
  const lum = (c: [number, number, number]): number => {
    const f = (v: number): number => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
  }
  const la = lum(a)
  const lb = lum(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}
// 自定义色：只接受能被 parseRgba 解析的颜色（#rgb/#rrggbb/#rrggbbaa、rgb()/rgba()），否则回退。
export const validColor = (raw: unknown, fallback: string): string => {
  if (typeof raw !== 'string') return fallback
  const s = raw.trim()
  if (s === '') return fallback
  return parseRgba(s) !== null ? s : fallback
}
