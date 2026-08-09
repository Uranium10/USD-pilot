const BLOCKED_PATH_PARTS = new Set(['__proto__', 'prototype', 'constructor'])
const TEMPLATE_TOKEN = /{{\s*([^{}\s]+)\s*}}/g

function readPath(source, path) {
  const parts = path.split('.')
  let value = source
  for (const part of parts) {
    if (BLOCKED_PATH_PARTS.has(part) || value == null || !Object.hasOwn(value, part)) return undefined
    value = value[part]
  }
  return value
}

export function renderDialogueTemplate(text, variables) {
  if (typeof text !== 'string' || !text.includes('{{')) return text || ''
  return text.replace(TEMPLATE_TOKEN, (token, path) => {
    const value = readPath(variables, path)
    if (value === null) return ''
    // 숫자는 게임 다른 곳의 money() 표기(₡165,000)와 통일되게 천단위 콤마를 넣는다 —
    // {{cycle}}/{{day}}처럼 작은 정수는 콤마가 안 붙으니(예: "6") 그대로 안전하다.
    if (typeof value === 'number') return value.toLocaleString('ko-KR')
    if (['string', 'boolean', 'bigint'].includes(typeof value)) return String(value)
    return token
  })
}

export function parseDialogueBold(text) {
  const segments = []
  let cursor = 0
  while (cursor < text.length) {
    const opening = text.indexOf('**', cursor)
    if (opening === -1) {
      segments.push({ text: text.slice(cursor), bold: false })
      break
    }
    if (opening > cursor) segments.push({ text: text.slice(cursor, opening), bold: false })
    const closing = text.indexOf('**', opening + 2)
    if (closing === -1) {
      segments.push({ text: text.slice(opening + 2), bold: false })
      break
    }
    if (closing > opening + 2) segments.push({ text: text.slice(opening + 2, closing), bold: true })
    cursor = closing + 2
  }
  return segments
}
