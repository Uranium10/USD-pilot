import { SCENES } from '../data/storyScript.js'

// 아직 재생 안 한 장면 중, 현재 게임 상태와 조건이 맞는 첫 번째 장면을 찾는다.
// 지금은 day/cycle/phase 조건만 지원한다(주가 조건 등은 나중에 이 함수에 케이스만
// 추가하면 됨 — SCENES 데이터 형식과 호출부는 안 바뀜).
export function findMatchingScene(state, playedSceneIds) {
  const played = playedSceneIds instanceof Set ? playedSceneIds : new Set(playedSceneIds || [])
  const entry = Object.entries(SCENES).find(([id, scene]) => {
    if (played.has(id)) return false
    const trigger = scene.trigger
    if (trigger.type === 'dayStart') return trigger.cycle === state.cycle && trigger.day === state.day
    if (trigger.type === 'phaseEnter') {
      return trigger.phase === state.phase
        && (trigger.cycle == null || trigger.cycle === state.cycle)
        && (trigger.day == null || trigger.day === state.day)
    }
    return false
  })
  return entry ? { id: entry[0], scene: entry[1] } : null
}
