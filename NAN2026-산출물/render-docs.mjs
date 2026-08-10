import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const htmlDir = path.join(root, 'HTML')
mkdirSync(htmlDir, { recursive: true })
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const inline = (value) => escapeHtml(value)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')

function renderTable(lines) {
  const rows = lines.map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
  return `<table><thead><tr>${rows[0].map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(2).map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const output = []
  let index = 0
  let list = null
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null } }
  while (index < lines.length) {
    const line = lines[index]
    if (line.startsWith('|') && lines[index + 1]?.match(/^\|[\s:|-]+\|$/)) {
      closeList(); const table = []
      while (lines[index]?.startsWith('|')) table.push(lines[index++])
      output.push(renderTable(table)); continue
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) { closeList(); const level = heading[1].length; output.push(`<h${level}>${inline(heading[2])}</h${level}>`); index++; continue }
    if (/^---+$/.test(line.trim())) { closeList(); output.push('<hr>'); index++; continue }
    const bullet = line.match(/^[-*]\s+(.+)$/)
    const numbered = line.match(/^\d+\.\s+(.+)$/)
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol'
      if (list !== wanted) { closeList(); list = wanted; output.push(`<${list}>`) }
      output.push(`<li>${inline((bullet || numbered)[1])}</li>`); index++; continue
    }
    if (!line.trim()) { closeList(); index++; continue }
    closeList(); const paragraph = [line.trim()]
    while (lines[index + 1]?.trim() && !lines[index + 1].match(/^(#{1,4})\s|^[-*]\s|^\d+\.\s|^\|/)) paragraph.push(lines[++index].trim())
    output.push(`<p>${inline(paragraph.join(' '))}</p>`); index++
  }
  closeList(); return output.join('\n')
}

const style = `
@page { size: A4; margin: 18mm 17mm 19mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #172033; font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: 10.5pt; line-height: 1.68; word-break: keep-all; }
body::before { content: "NAN2026 · U.S.D"; display: block; margin-bottom: 24mm; color: #16627a; font: 700 9pt monospace; letter-spacing: .18em; border-bottom: 2px solid #24c8ef; padding-bottom: 4mm; }
h1 { margin: 0 0 12mm; color: #0d2940; font-size: 26pt; line-height: 1.25; letter-spacing: -.04em; }
h2 { margin: 12mm 0 4mm; padding-bottom: 2mm; color: #11445b; font-size: 16pt; border-bottom: 1px solid #b8d9e4; break-after: avoid; }
h3 { margin: 7mm 0 2mm; color: #12647c; font-size: 12.5pt; break-after: avoid; }
h4 { color: #334b5d; }
p { margin: 0 0 4mm; }
ul, ol { margin: 1mm 0 5mm; padding-left: 7mm; }
li { margin: 1.2mm 0; }
table { width: 100%; margin: 4mm 0 7mm; border-collapse: collapse; font-size: 9.3pt; break-inside: avoid; }
th { background: #e9f7fb; color: #123d50; font-weight: 700; }
th, td { padding: 2.5mm 3mm; border: 1px solid #b8d4dd; text-align: left; vertical-align: top; }
tr:nth-child(even) td { background: #f7fbfc; }
code { padding: .3mm 1mm; border-radius: 2px; background: #eef3f5; color: #8b2f59; font-family: "Cascadia Mono", monospace; font-size: .9em; }
a { color: #087a9d; text-decoration: none; }
strong { color: #0b4b64; }
hr { margin: 12mm 0 5mm; border: 0; border-top: 1px solid #9ebbc5; }
`

for (const file of readdirSync(root).filter((name) => /^0[1-4]_.+\.md$/.test(name))) {
  const markdown = readFileSync(path.join(root, file), 'utf8')
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] || file
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>${style}</style></head><body>${markdownToHtml(markdown)}</body></html>`
  writeFileSync(path.join(htmlDir, file.replace(/\.md$/, '.html')), html)
  console.log(`rendered: ${file}`)
}
