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
    if (['string', 'number', 'boolean', 'bigint'].includes(typeof value)) return String(value)
    return token
  })
}
