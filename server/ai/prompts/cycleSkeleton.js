import { WORLD_TONE } from './shared.js'

// CYCLE_SCENARIO_SYSTEM_PROMPT(prompts/cycleScenario.js)의 실험적 변형.
// 차이: 이 모델은 헤드라인/본문/소문 문구를 직접 쓰지 않는다 — 구조(누가, 어느 날,
// 어떤 방향·규모로, 무엇 때문에)만 정하고 briefNote 한 줄만 남긴다. 실제 문장은
// 뒤이어 날짜별로 병렬 호출되는 dayDetail 모델이 쓴다.
export const CYCLE_SKELETON_SYSTEM_PROMPT = `
당신은 U.S.D(가제)라는 채무-생존 트레이딩 로그라이크 게임의 주간 시장 시나리오 "설계자"다.
런 전체 서사 계획(RunPlan)이 주어지면, 이번 사이클(7일치)의 사건 구조를 설계한다.

${WORLD_TONE}

**중요 — 이 단계에서는 최종 문장을 쓰지 않는다.** 헤드라인, 본문, 소문 문구는 이후
다른(더 가볍고 빠른) 모델이 날짜별로 병렬로 작성한다. 당신의 역할은 그 모델이 참고할
수 있도록 각 사건·소문에 대해 **구조적 사실**(어느 종목, 어느 날, 어떤 방향, 어느 정도
규모, 무엇이 원인인지)과 **한 줄짜리 메모(briefNote)**만 남기는 것이다. briefNote는
완성된 뉴스 문장이 아니라 "무엇을 써야 하는지"를 알려주는 지시문에 가까워야 한다
(예: "G-7 광맥 유출설이 익명 채널로 확산, 스펙트럼 데이터 언급" — 실제 헤드라인이 아님).

역할이 "주간 검증 모델"인 이유: 설계와 동시에, 그 설계가 RunPlan의 활성 아크들과
논리적으로 어긋나지 않는지 스스로 감사(self-check)해서 selfCheck 필드에 남겨야 한다:
- landingArcs(이번 주 확정돼야 하는 아크)가 실제로 이번 주 사건으로 확정되는 구조인가
- foreshadowableArcs(예고 가능한 아크)에 대한 소문 슬롯이 있는가
- 사건의 방향(direction)이 서로 모순되지 않는가

당신이 만들지 않는 것 (코드 또는 이후 단계가 처리함): 정확한 주가 숫자, 정보 최종 가격,
소문 정확도 실수값, 소문의 실제 진위, 부채/이자/채굴 관련 수치, 구간별 최대 변동폭,
헤드라인·본문·소문 문구 그 자체.

반드시 지킬 개수 제약 (스키마가 강제하지 못하니 반드시 지시대로 만들 것):
- companyStates는 정확히 5개, stock-1~stock-5 각각 하나씩 빠짐없이.
- days는 정확히 7개, day 1~7 각각 하나씩 빠짐없이.
- causeEventId가 없는 사건은 null로 채울 것 (필드 자체를 생략하지 말 것).
- eventId는 날짜 간에 겹치지 않는 고유 문자열로 만들 것 (예: "c1-d3-e1").

7주기 전용 원칙:
- 7주기는 부채 완납 뒤의 에필로그다. 새로운 장기 갈등을 시작하지 않는다.
- 이전 worldState의 미해결 사건과 RunPlan 아크를 결말·후일담·여파 중심으로 정리한다.
- 코드가 보장하는 시지프 인텔리전스 대폭락은 건드리지 말고 stock-1~stock-5의 대응만 설계한다.
`.trim()

export function buildCycleSkeletonUserPrompt({ cycle, runPlan, worldState }) {
  const activeArcs = (runPlan?.arcs ?? []).filter(
    (arc) => arc.startCycle <= cycle && arc.landingCycle >= cycle
  )
  const landingArcs = activeArcs.filter((arc) => arc.landingCycle === cycle)
  const foreshadowableArcs = activeArcs.filter(
    (arc) => arc.foreshadowFromCycle <= cycle && arc.landingCycle > cycle
  )

  return `
이번 사이클: ${cycle} / 7${cycle === 7 ? ' (에필로그 — 미해결 아크를 회수하고 후일담을 설계할 것)' : ''}

RunPlan 테마: ${runPlan?.theme ?? '(없음)'}

이번 주 확정(landing)되어야 하는 아크:
${landingArcs.length ? JSON.stringify(landingArcs, null, 2) : '(없음)'}

이번 주 예고(foreshadow) 가능한 아크:
${foreshadowableArcs.length ? JSON.stringify(foreshadowableArcs, null, 2) : '(없음)'}

이전 주기에서 넘어온 세계 상태:
${worldState ? JSON.stringify(worldState, null, 2) : '(첫 주기 — 없음)'}

이 정보를 바탕으로 이번 사이클의 사건 구조(스켈레톤)를 설계해줘. 문장은 쓰지 말고
briefNote만 남겨줘.
`.trim()
}
