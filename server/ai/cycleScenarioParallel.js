// 실험적 대안(2026-08-09): generateCycleScenario()(cycleScenarioModel.js, 순차 1콜)를
// "스켈레톤 1콜(weekly 티어) + 날짜별 병렬 7콜(filler 티어)"로 바꾼 버전.
// 모델 문자열은 server/ai/config.js MODEL_TIERS 참고 (2026-08-09 기준 gpt-5.6-terra / gemini-3.6-flash).
//
// 반환 shape은 generateCycleScenario()와 완전히 동일하다({ cycleScenario, raw }) —
// aiMarketCycle.js가 어느 쪽을 쓰든 validScenario()/compileScenario()를 그대로 쓸 수
// 있게 하기 위함. 아직 aiMarketCycle.js는 이 함수를 import하지 않는다 — 검증 후
// 교체할지 결정한다. 배경: USD-spec/agent_workthrough_4.md.

import { generateCycleSkeleton } from './cycleSkeletonModel.js'
import { generateDayDetail } from './dayDetailModel.js'

/**
 * @param {{ cycle: number, runPlan: object, worldState?: object }} params
 * @returns {Promise<{ cycleScenario: object, raw: { skeleton: unknown, details: unknown[] } }>}
 */
export async function generateCycleScenarioParallel({ cycle, runPlan, worldState }) {
  const { cycleSkeleton, raw: skeletonRaw } = await generateCycleSkeleton({ cycle, runPlan, worldState })

  const detailResults = await Promise.all(
    (cycleSkeleton.days || []).map((day) =>
      generateDayDetail({
        dailyTheme: day.dailyTheme,
        eventSlots: day.eventSlots || [],
        rumorSlots: day.rumorSlots || [],
        companyStates: cycleSkeleton.companyStates,
      }).then((result) => ({ day: day.day, ...result }))
    )
  )

  const days = (cycleSkeleton.days || []).map((day) => {
    const detail = detailResults.find((item) => item.day === day.day)?.dayDetail
    const headlineByEventId = new Map((detail?.events || []).map((event) => [event.eventId, event]))
    const angleByTargetEventId = new Map((detail?.rumorSeeds || []).map((rumor) => [rumor.targetEventId, rumor]))

    return {
      day: day.day,
      dailyTheme: day.dailyTheme,
      events: (day.eventSlots || []).map((slot) => {
        const written = headlineByEventId.get(slot.eventId)
        return {
          eventId: slot.eventId,
          primaryStockId: slot.primaryStockId,
          relatedStockIds: slot.relatedStockIds,
          direction: slot.direction,
          magnitude: slot.magnitude,
          impactProgress: slot.impactProgress,
          causeEventId: slot.causeEventId,
          // dayDetail 호출이 실패하거나 해당 eventId를 못 채운 경우, briefNote를 최소한의
          // 대체 문구로 써서 완전히 빈 헤드라인이 나가는 것보다는 낫게 한다.
          headline: written?.headline || slot.briefNote,
          detail: written?.detail || slot.briefNote,
        }
      }),
      rumorSeeds: (day.rumorSlots || []).map((slot) => {
        const written = angleByTargetEventId.get(slot.targetEventId)
        return {
          targetEventId: slot.targetEventId,
          sourceArchetype: slot.sourceArchetype,
          confidence: slot.confidence,
          angle: written?.angle || slot.briefNote,
        }
      }),
    }
  })

  const cycleScenario = {
    cycle: cycleSkeleton.cycle,
    title: cycleSkeleton.title,
    openingNarration: cycleSkeleton.openingNarration,
    weeklyTheme: cycleSkeleton.weeklyTheme,
    marketMood: cycleSkeleton.marketMood,
    companyStates: cycleSkeleton.companyStates,
    days,
    nextWorldState: cycleSkeleton.nextWorldState,
    selfCheck: cycleSkeleton.selfCheck,
  }

  return { cycleScenario, raw: { skeleton: skeletonRaw, details: detailResults.map((item) => item.raw) } }
}
