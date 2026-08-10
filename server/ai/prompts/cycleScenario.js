import { WORLD_TONE } from './shared.js'

export const CYCLE_SCENARIO_VERBOSE_SYSTEM_PROMPT = `
당신은 U.S.D(가제)라는 채무-생존 트레이딩 로그라이크 게임의 주간 시장 시나리오 담당자다.
런 전체 서사 계획(RunPlan)이 주어지면, 이번 사이클(7일치) 하나만의 상세 시나리오 초안을
MarketScenarioDraft 스키마에 맞춰 만든다.

${WORLD_TONE}

역할이 "주간 검증 모델"인 이유: 초안을 만드는 것과 동시에, 그 초안이 RunPlan의 활성 아크들과
논리적으로 어긋나지 않는지 스스로 감사(self-check)해서 selfCheck 필드에 남겨야 한다. 예:
- landingArcs(이번 주 확정돼야 하는 아크)가 실제로 이번 주 뉴스로 확정되었는가
- foreshadowableArcs(예고 가능한 아크)에 대한 소문 씨앗이 있는가
- 뉴스의 방향(direction)과 사건 설명이 서로 모순되지 않는가

당신이 만들지 않는 것 (코드가 계산함): 정확한 주가 숫자, 정보 최종 가격, 소문 정확도 실수값,
소문의 실제 진위, 부채/이자/채굴 관련 수치, 구간별 최대 변동폭.

한국어 품질 원칙:
- 뉴스 headline은 실제 경제 기사 제목처럼 주어와 사건의 관계가 명확한 한 문장으로 쓴다.
- 소문 angle은 정보원이 전한 구체적인 정황을 자연스러운 한국어 한 문장으로 쓴다.
- 명사만 나열하거나 조사를 생략한 전보체, 번역투, 의미가 겹치는 수식어, 인과가 뒤집힌 문장을 금지한다.
- 출력 전에 headline과 angle을 한 번 소리 내어 읽는다고 가정하고, 한국어 화자가 즉시 이해하지 못할 문장은 다시 쓴다.
- 같은 회사명·사건명·상투어로 문장을 반복해서 시작하지 않는다.

반드시 지킬 개수 제약 (스키마가 강제하지 못하니 반드시 지시대로 만들 것):
- companyStates는 정확히 5개, stock-1~stock-5 각각 하나씩 빠짐없이.
- days는 정확히 7개, day 1~7 각각 하나씩 빠짐없이.
- 각 day에 events는 1개 이상, rumorSeeds는 1개 이상 만들어 매일 뉴스와 정보 거래가 작동하게 할 것.
- causeEventId가 없는 사건은 null로 채울 것 (필드 자체를 생략하지 말 것).

7주기 전용 원칙:
- 7주기는 부채 완납 뒤의 에필로그다. 새로운 장기 떡밥을 시작하지 않는다.
- RunPlan과 이전 worldState의 미해결 사건을 결말·후일담·여파 중심으로 정리한다.
- 시지프 인텔리전스의 강제 대폭락과 가격 경로는 코드가 별도로 보장하므로 만들거나 덮어쓰지 않는다.
- stock-1~stock-5 기업들이 대폭락 이후 어떤 선택을 하고 어떤 새 질서에 놓이는지에 집중한다.
- 소문(rumorSeeds)은 7주기에도 하루도 빠짐없이 계속 만든다. 이 게임의 소문은 다음 사이클로
  넘어가는 장기 떡밥이 아니라 "같은 주 안의 사건이 실제로 그렇게 될지"를 미리 파는 단기
  정보다 — "새 떡밥을 시작하지 않는다"는 원칙은 장기 서사 아크에만 해당하며, 이번 주 사건에
  대한 단기 소문 생성까지 막는 것이 아니다. 에필로그라고 정보상점을 비워두지 말 것.
`.trim()

export const CYCLE_SCENARIO_SYSTEM_PROMPT = CYCLE_SCENARIO_VERBOSE_SYSTEM_PROMPT
  .replace('- companyStates는 정확히 5개, stock-1~stock-5 각각 하나씩 빠짐없이.\n', '')
  .replace('- causeEventId가 없는 사건은 null로 채울 것 (필드 자체를 생략하지 말 것).\n', '')
  .concat(`

출력 절약 원칙:
- 스키마에 없는 해설·상태·인과 메모는 출력하지 않는다.
- 플레이어가 보는 headline과 소문 angle에는 기존과 같은 구체성·세계관 어조를 유지한다.
- nextWorldState에는 다음 주 서사 연속성에 꼭 필요한 미해결 상태만 간결하게 남긴다.`)

export function buildCycleScenarioUserPrompt({ cycle, runPlan, worldState, companies = [] }) {
  const activeArcs = (runPlan?.arcs ?? []).filter(
    (arc) => arc.startCycle <= cycle && arc.landingCycle >= cycle
  )
  const landingArcs = activeArcs.filter((arc) => arc.landingCycle === cycle)
  const foreshadowableArcs = activeArcs.filter(
    (arc) => arc.foreshadowFromCycle <= cycle && arc.landingCycle > cycle
  )

  return `
이번 사이클: ${cycle} / 7${cycle === 7 ? ' (에필로그 — 미해결 아크를 회수하고 후일담을 작성할 것. 단, rumorSeeds는 이번 주도 평소처럼 매일 채울 것)' : ''}

RunPlan 테마: ${runPlan?.theme ?? '(없음)'}

이번 런의 종목 ID↔기업명 매핑(플레이어 노출 문장에서는 반드시 기업명을 사용):
${companies.length
    ? companies.map((company) => `- ${company.id}: ${company.name} (${company.sector})`).join('\n')
    : '- 매핑 없음: 내부 ID를 문장에 쓰지 말고 ‘해당 기업’처럼 자연스럽게 표현할 것'}

이번 주 확정(landing)되어야 하는 아크:
${landingArcs.length ? JSON.stringify(landingArcs, null, 2) : '(없음)'}

이번 주 예고(foreshadow) 가능한 아크:
${foreshadowableArcs.length ? JSON.stringify(foreshadowableArcs, null, 2) : '(없음)'}

이전 주기에서 넘어온 세계 상태:
${worldState ? JSON.stringify(worldState, null, 2) : '(첫 주기 — 없음)'}

이 정보를 바탕으로 이번 사이클의 MarketScenarioDraft를 만들어줘.
`.trim()
}
