// U.S.D AI 시장 생성 — 3티어 모델 설정
//
// 이 파일 하나만 고치면 티어별로 쓰는 모델을 바꿀 수 있다.
// 각 티어의 "역할"은 사용자 지시(2026-08-09) 기준:
//   narrative — 런 전체 서사(RunPlan)를 담당하는 가장 중요한 모델
//   weekly    — 주간(사이클) 시장 시나리오를 생성 + 자체 검증하는 모델
//   filler    — 4줄 이내의 짧고 값싼 텍스트(소문 플레이버, 필드 복구 등)를 담당하는 모델
//
// 2026-08-09 정정: 처음에 "claude opus4.6"을 존재하지 않는 ID로 오판해 claude-opus-5로
// 바꿨었는데, 실제 API 호출로 재검증한 결과 claude-opus-4-6은 실존하고 정상 작동하는
// 모델이었다 (Anthropic Opus 라인의 이전 세대 최상위 모델, claude-opus-5보다 하나 아래
// 세대). 사용자가 명시적으로 지정한 모델이므로 원래 지시대로 claude-opus-4-6을 쓴다.
// 자세한 검증 로그는 USD-spec/agent_workthrough_1.md 참고.

export const MODEL_TIERS = {
  narrative: {
    provider: 'anthropic',
    model: 'claude-opus-4-6',
    role: '런 전체 서사(RunPlan) — 에필로그를 포함한 7주기 전체의 굵직한 사건 아크를 한 번만 생성',
  },
  weekly: {
    provider: 'openai',
    // 2026-08-09: gpt-5.5 → gpt-5.6-terra로 교체(사용자 지정). 직접 호출로 실존·정상
    // 응답 확인. 가격도 gpt-5.5($5/$30)보다 낮음($2/$12 per 1M, short context) —
    // developers.openai.com/api/docs/pricing 조회로 확인.
    model: 'gpt-5.6-terra',
    role: '주간 검증 모델 — 사이클별 시장 시나리오(CycleScenario) 초안 생성 + 자체 정합성 검증',
  },
  filler: {
    provider: 'google',
    // 'gemini-2.5-flash'(404, 신규 사용자 불가) → 'gemini-2.5-flash-preview'(존재 안 함)
    // → 'gemini-flash-latest' → 'gemini-3.5-flash'(사용자가 특정 버전 고정 요청)를
    // 거쳐, 2026-08-09에 다시 'gemini-3.6-flash'로 교체(사용자 지정). 직접 호출로
    // 실존·정상 응답 확인. 가격도 gemini-3.5-flash($1.5/$9)보다 출력이 저렴함
    // ($1.5/$7.5 per 1M) — ai.google.dev/gemini-api/docs/pricing 조회로 확인.
    model: 'gemini-3.6-flash',
    role: '짜잘한 작업 — 4줄 이내 출력(소문 플레이버, 필드 단위 복구 등)',
  },
}

// server/api 라우트에서만 import 해야 한다 (VITE_ 접두사 없는 서버 전용 env).
export const ENV_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GEMINI_API_KEY',
}
