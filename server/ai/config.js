// U.S.D AI 시장 생성 — 3티어 모델 설정
//
// 이 파일 하나만 고치면 티어별로 쓰는 모델을 바꿀 수 있다.
// 각 티어의 "역할"은 사용자 지시(2026-08-09) 기준:
//   narrative — 런 전체 서사(RunPlan)를 담당하는 가장 중요한 모델
//   weekly    — 주간(사이클) 시장 시나리오를 생성 + 자체 검증하는 모델
//   filler    — 4줄 이내의 짧고 값싼 텍스트(소문 플레이버, 필드 복구 등)를 담당하는 모델
//
// 2026-08-10: claude-opus-4-6 high, claude-opus-5 max/high를 실제 RunPlan으로 비교했다.
// 품질을 유지하면서 비용·속도가 가장 좋았던 claude-opus-5 high를 정식 설정으로 고정한다.
// 세부 실측값은 log.txt의 Opus 5 RunPlan 비교 기록 참고.

export const MODEL_TIERS = {
  narrative: {
    provider: 'anthropic',
    model: 'claude-opus-5',
    role: '런 전체 서사(RunPlan) — 에필로그를 포함한 7주기 전체의 굵직한 사건 아크를 한 번만 생성',
  },
  weekly: {
    provider: 'openai',
    // 2026-08-09: gpt-5.5 → gpt-5.6-terra(사용자 지정).
    // 2026-08-10: Luna low 실험은 비용·속도 면에서는 유리했지만 뉴스와 소문의 한국어
    // 문장 품질 편차가 커, 마지막으로 안정성이 검증된 Terra medium 설정으로 복원했다.
    // Luna low 설정과 프롬프트는 server/ai/backups/2026-08-10-luna-low/에 보존한다.
    model: 'gpt-5.6-terra',
    // 이 티어의 reasoning effort. cycleScenarioModel.js가 기본값으로 읽어간다.
    effort: 'medium',
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
