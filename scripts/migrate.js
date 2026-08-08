// db/schema.sql을 Turso(libSQL)에 적용한다.
// 사용법: node --env-file=.env.local scripts/migrate.js
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수가 필요합니다. (.env.local 확인)')
  process.exit(1)
}

const client = createClient({ url, authToken })
const sql = readFileSync(path.join(dirname, '../db/schema.sql'), 'utf-8')

// 세미콜론 기준으로 문장을 나눠 순서대로 실행한다 (libSQL 클라이언트는 batch에서
// 여러 statement가 섞인 단일 문자열을 지원하지 않는다).
const statements = sql
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

for (const statement of statements) {
  console.log(`실행: ${statement.slice(0, 60).replace(/\s+/g, ' ')}...`)
  await client.execute(statement)
}

console.log(`완료. ${statements.length}개 문장 적용됨.`)
client.close()
