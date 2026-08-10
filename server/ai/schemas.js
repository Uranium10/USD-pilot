// AI가 만드는 두 가지 중간 산출물의 JSON Schema.
// 최종 MarketCycle(가격 숫자)은 여기 없다 — 그건 항상 코드(generateMarket.js)가 만든다.
// 스키마 배경은 USD-spec/for_agent_plan.md §2 MarketScenarioDraft, agent_workthrough_1.md 참고.
//
// 두 공급자의 구조화 출력 제약을 모두 만족해야 해서 스키마가 다소 보수적이다:
//   - Claude(Anthropic) 구조화 출력: 배열의 minItems/maxItems는 0 또는 1만 허용된다
//     (그 외 값은 400). 그래서 배열 길이 제약(예: "정확히 5개")은 스키마가 아니라
//     프롬프트 지시 + (향후) 애플리케이션 레벨 검증으로 강제해야 한다.
//   - OpenAI strict 모드: 모든 object의 `required`에 `properties`의 모든 키가
//     빠짐없이 들어가야 한다. 진짜 선택적인 필드는 생략하지 말고 required에 넣되
//     타입에 null을 허용해서 표현한다 (예: causeEventId).
//   - 두 공급자 모두 object에는 additionalProperties: false만 허용하고, 동적 키를
//     가진 맵 형태(예: {[stockId]: string[]})는 지원하지 않는다 — 그래서
//     companyFlags 같은 필드는 맵이 아니라 {stockId, flags}[] 배열로 표현했다.

// stock-1~stock-5는 런 전체에서 고정된 슬롯 (for_agent_logic.md §3-1 불변식).
const STOCK_SLOT_IDS = ['stock-1', 'stock-2', 'stock-3', 'stock-4', 'stock-5']

// --- RunPlan: 런 시작 시 한 번만 생성하는 7주기 전체의 굵은 서사 아크 ---
// 실제 아크 개수(4~8개) 제약은 프롬프트로 지시한다 (스키마의 minItems/maxItems 사용 불가).
export const RUN_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['theme', 'worldTone', 'arcs'],
  properties: {
    theme: { type: 'string', description: '이번 런 전체를 관통하는 한 줄 테마' },
    worldTone: {
      type: 'string',
      description: '세계관 톤 요약 (사이버펑크, 암울하지만 자조적 농담 정서 등)',
    },
    arcs: {
      type: 'array',
      description: '4~8개의 서사 아크 (개수는 프롬프트 지시를 따를 것)',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'arcId',
          'title',
          'summary',
          'involvedStockIds',
          'intensity',
          'direction',
          'startCycle',
          'foreshadowFromCycle',
          'landingCycle',
        ],
        properties: {
          arcId: { type: 'string', description: '아크 고유 id, 예: arc-1' },
          title: { type: 'string' },
          summary: {
            type: 'string',
            description: '이 아크가 무엇이고 왜 일어나는지 2~3문장',
          },
          involvedStockIds: {
            type: 'array',
            description: '관련된 stock-1~stock-5 슬롯 (1~5개)',
            items: { type: 'string', enum: STOCK_SLOT_IDS },
          },
          intensity: {
            type: 'string',
            enum: ['minor', 'medium', 'major', 'critical'],
            description: '아크가 확정(landing)됐을 때의 파급력',
          },
          direction: { type: 'string', enum: ['up', 'down', 'mixed'] },
          startCycle: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5, 6, 7],
            description: '이 아크의 씨앗(소문 등)이 처음 등장할 수 있는 사이클',
          },
          foreshadowFromCycle: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5, 6, 7],
            description: '이 사이클부터 소문으로 예고 가능 (startCycle 이상)',
          },
          landingCycle: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5, 6, 7],
            description: '이 아크가 뉴스로 확정되는 사이클 (foreshadowFromCycle 이상)',
          },
        },
      },
    },
  },
}

// --- CycleScenario (= for_agent_plan.md의 MarketScenarioDraft): 사이클 1개분 시장 서사 초안 ---
// companyStates는 정확히 5개(stock-1~5), days는 정확히 7개여야 하지만 이 역시
// 프롬프트 지시 + 향후 애플리케이션 검증으로 강제한다 (스키마 minItems/maxItems 사용 불가).
export const CYCLE_SCENARIO_VERBOSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'cycle',
    'title',
    'openingNarration',
    'weeklyTheme',
    'marketMood',
    'companyStates',
    'days',
    'nextWorldState',
    'selfCheck',
  ],
  properties: {
    cycle: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
    title: { type: 'string' },
    openingNarration: { type: 'string' },
    weeklyTheme: { type: 'string' },
    marketMood: { type: 'string', enum: ['calm', 'uneasy', 'speculative', 'panic'] },
    companyStates: {
      type: 'array',
      description: '정확히 5개, stock-1~stock-5 각각 하나씩',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['stockId', 'situation', 'pressure', 'relationships'],
        properties: {
          stockId: { type: 'string', enum: STOCK_SLOT_IDS },
          situation: { type: 'string' },
          pressure: { type: 'string', enum: ['low', 'medium', 'high'] },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['targetStockId', 'relation'],
              properties: {
                targetStockId: { type: 'string', enum: STOCK_SLOT_IDS },
                relation: {
                  type: 'string',
                  enum: ['supplier', 'customer', 'competitor', 'partner', 'political'],
                },
              },
            },
          },
        },
      },
    },
    days: {
      type: 'array',
      description: '정확히 7개, day 1~7 각각 하나씩',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'dailyTheme', 'events', 'rumorSeeds'],
        properties: {
          day: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
          dailyTheme: { type: 'string' },
          events: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'eventId',
                'primaryStockId',
                'relatedStockIds',
                'direction',
                'magnitude',
                'impactProgress',
                'headline',
                'detail',
                'causeEventId',
              ],
              properties: {
                eventId: { type: 'string' },
                primaryStockId: { type: 'string', enum: STOCK_SLOT_IDS },
                relatedStockIds: { type: 'array', items: { type: 'string', enum: STOCK_SLOT_IDS } },
                direction: { type: 'string', enum: ['up', 'down'] },
                magnitude: { type: 'string', enum: ['minor', 'medium', 'major'] },
                impactProgress: {
                  type: 'number',
                  description: '0(주 시작)~1(주 마지막) 사이 값. 이 사건이 설명하는 가격 변곡점의 진행률.',
                },
                headline: { type: 'string' },
                detail: { type: 'string' },
                causeEventId: {
                  type: ['string', 'null'],
                  description: '이 사건을 유발한 이전 eventId. 없으면 null.',
                },
              },
            },
          },
          rumorSeeds: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['targetEventId', 'sourceArchetype', 'confidence', 'angle'],
              properties: {
                targetEventId: { type: 'string' },
                sourceArchetype: {
                  type: 'string',
                  enum: ['insider', 'hacker', 'broker', 'regulator', 'worker'],
                },
                confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                angle: { type: 'string' },
              },
            },
          },
        },
      },
    },
    nextWorldState: {
      type: 'object',
      additionalProperties: false,
      required: ['tensions', 'unresolvedEvents', 'companyFlags'],
      properties: {
        tensions: { type: 'array', items: { type: 'string' } },
        unresolvedEvents: { type: 'array', items: { type: 'string' } },
        companyFlags: {
          type: 'array',
          description: '동적 키 맵 대신 {stockId, flags}[] 배열로 표현 (구조화 출력 제약).',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['stockId', 'flags'],
            properties: {
              stockId: { type: 'string', enum: STOCK_SLOT_IDS },
              flags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    // "주간 검증 모델"이라는 역할을 실제로 수행하게 만드는 필드 —
    // 생성한 초안이 RunPlan 및 자체 정합성 규칙과 맞는지 모델 스스로 감사한 결과.
    selfCheck: {
      type: 'object',
      additionalProperties: false,
      required: ['consistentWithRunPlan', 'notes'],
      properties: {
        consistentWithRunPlan: {
          type: 'boolean',
          description: 'RunPlan의 활성 아크들과 이번 초안이 논리적으로 맞아떨어지는가',
        },
        notes: {
          type: 'string',
          description: '불일치가 있었다면 무엇을 어떻게 조정했는지, 없었다면 빈 문자열',
        },
      },
    },
  },
}

// 실제 게임 컴파일러가 소비하는 필드만 남긴 기본 스키마. verbose 스키마는 위에 온전히
// 보존되어 있으며 AI_CYCLE_SCHEMA_MODE=verbose로 즉시 복구할 수 있다.
const slimCycleScenarioSchema = JSON.parse(JSON.stringify(CYCLE_SCENARIO_VERBOSE_SCHEMA))
for (const field of ['openingNarration', 'weeklyTheme', 'marketMood', 'companyStates']) {
  delete slimCycleScenarioSchema.properties[field]
  slimCycleScenarioSchema.required = slimCycleScenarioSchema.required.filter((item) => item !== field)
}
const slimDay = slimCycleScenarioSchema.properties.days.items
delete slimDay.properties.dailyTheme
slimDay.required = slimDay.required.filter((item) => item !== 'dailyTheme')
const slimEvent = slimDay.properties.events.items
for (const field of ['relatedStockIds', 'detail', 'causeEventId']) {
  delete slimEvent.properties[field]
  slimEvent.required = slimEvent.required.filter((item) => item !== field)
}
const slimSelfCheck = slimCycleScenarioSchema.properties.selfCheck
delete slimSelfCheck.properties.notes
slimSelfCheck.required = slimSelfCheck.required.filter((item) => item !== 'notes')

export const CYCLE_SCENARIO_SCHEMA = slimCycleScenarioSchema

// --- CycleSkeleton (실험용, 2026-08-09) ---
// CYCLE_SCENARIO_SCHEMA를 "구조 결정"과 "문장 작성"으로 쪼갠 실험적 대안의 앞부분.
// companyStates/nextWorldState/selfCheck는 그대로 두고, 날짜별 사건·소문은 headline/
// detail/angle 같은 실제 문장을 안 만들고 구조(eventId, 방향, 규모, 인과관계)와
// briefNote(본문 작성자에게 줄 한 줄 메모)만 정한다. 이 스켈레톤이 모든 구조적 판단을
// 끝내기 때문에, 뒤이어 날짜별로 병렬 호출하는 DAY_DETAIL_SCHEMA 쪽은 문장만 쓰면 되고
// 정합성을 해칠 수 없다. 아직 실제 게임에 연결되지 않았다 — server/ai/cycleScenarioParallel.js
// 참고, 배경은 USD-spec/agent_workthrough_4.md.
export const CYCLE_SKELETON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'cycle',
    'title',
    'openingNarration',
    'weeklyTheme',
    'marketMood',
    'companyStates',
    'days',
    'nextWorldState',
    'selfCheck',
  ],
  properties: {
    cycle: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
    title: { type: 'string' },
    openingNarration: { type: 'string' },
    weeklyTheme: { type: 'string' },
    marketMood: { type: 'string', enum: ['calm', 'uneasy', 'speculative', 'panic'] },
    companyStates: CYCLE_SCENARIO_VERBOSE_SCHEMA.properties.companyStates,
    days: {
      type: 'array',
      description: '정확히 7개, day 1~7 각각 하나씩. 이 단계는 구조만 정한다 — 문장은 안 씀.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'dailyTheme', 'eventSlots', 'rumorSlots'],
        properties: {
          day: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
          dailyTheme: { type: 'string' },
          eventSlots: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'eventId',
                'primaryStockId',
                'relatedStockIds',
                'direction',
                'magnitude',
                'impactProgress',
                'causeEventId',
                'briefNote',
              ],
              properties: {
                eventId: { type: 'string' },
                primaryStockId: { type: 'string', enum: STOCK_SLOT_IDS },
                relatedStockIds: { type: 'array', items: { type: 'string', enum: STOCK_SLOT_IDS } },
                direction: { type: 'string', enum: ['up', 'down'] },
                magnitude: { type: 'string', enum: ['minor', 'medium', 'major'] },
                impactProgress: {
                  type: 'number',
                  description: '0(주 시작)~1(주 마지막) 사이 값.',
                },
                causeEventId: {
                  type: ['string', 'null'],
                  description: '이 사건을 유발한 이전 eventId. 없으면 null.',
                },
                briefNote: {
                  type: 'string',
                  description: '본문 작성 모델에게 줄 한 줄 메모. headline/detail 문장 자체가 아님.',
                },
              },
            },
          },
          rumorSlots: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['targetEventId', 'sourceArchetype', 'confidence', 'briefNote'],
              properties: {
                targetEventId: { type: 'string' },
                sourceArchetype: {
                  type: 'string',
                  enum: ['insider', 'hacker', 'broker', 'regulator', 'worker'],
                },
                confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                briefNote: { type: 'string', description: '본문 작성 모델에게 줄 한 줄 메모.' },
              },
            },
          },
        },
      },
    },
    nextWorldState: CYCLE_SCENARIO_VERBOSE_SCHEMA.properties.nextWorldState,
    selfCheck: CYCLE_SCENARIO_VERBOSE_SCHEMA.properties.selfCheck,
  },
}

export { STOCK_SLOT_IDS }
