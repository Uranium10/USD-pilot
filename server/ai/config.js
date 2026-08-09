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
    role: '런 전체 서사(RunPlan) — 6주기 전체를 관통하는 굵직한 사건 아크를 한 번만 생성',
  },
  weekly: {
    provider: 'openai',
    model: 'gpt-5.5',
    role: '주간 검증 모델 — 사이클별 시장 시나리오(CycleScenario) 초안 생성 + 자체 정합성 검증',
  },
  filler: {
    provider: 'google',
    // 사용자가 지정한 'gemini-2.5-flash'는 이 API 키/프로젝트 기준 404
    // ("no longer available to new users")로 실제 호출이 거부됐다. 대안으로 검토했던
    // 'gemini-2.5-flash-preview'도 실제로 호출해보니 존재하지 않는 모델 ID였다
    // (404 "is not found ... or is not supported for generateContent" —
    // ListModels 결과에도 없음, -preview-tts/-native-audio-preview 변형만 존재).
    // 그래서 항상 현재 권장되는 flash 모델을 가리키는 별칭(alias)인
    // gemini-flash-latest로 대체했다. 검증 근거는 USD-spec/agent_workthrough_1.md 참고.
    model: 'gemini-flash-latest',
    role: '짜잘한 작업 — 4줄 이내 출력(소문 플레이버, 필드 단위 복구 등)',
  },
}

// server/api 라우트에서만 import 해야 한다 (VITE_ 접두사 없는 서버 전용 env).
export const ENV_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GEMINI_API_KEY',
}
