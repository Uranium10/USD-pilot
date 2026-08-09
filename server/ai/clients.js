// 3사 SDK 클라이언트를 지연 생성한다 (모듈 로드 시점에 키가 없어도 죽지 않도록).
// 절대 src/ 밑에 두지 않는다 — Vite가 클라이언트 번들에 이 파일을 절대 포함해서는 안 된다.
// (USD_SPEC.md §8: API 키는 서버 전용, VITE_ 접두사 금지)

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { ENV_KEYS } from './config.js'

function requireEnv(key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[server/ai] 환경변수 ${key}가 설정되어 있지 않습니다 (.env.local 확인).`)
  }
  return value
}

let anthropicClient = null
export function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: requireEnv(ENV_KEYS.anthropic) })
  }
  return anthropicClient
}

let openaiClient = null
export function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: requireEnv(ENV_KEYS.openai) })
  }
  return openaiClient
}

let googleClient = null
export function getGoogleClient() {
  if (!googleClient) {
    googleClient = new GoogleGenAI({ apiKey: requireEnv(ENV_KEYS.google) })
  }
  return googleClient
}
