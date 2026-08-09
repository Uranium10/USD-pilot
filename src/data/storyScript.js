// 대화 스토리 엔진의 콘텐츠 데이터.
// 세계관 요약(전체 내용은 USD-spec/STORY.md 참고):
//   부모님이 남긴 천문학적 빚을 6주 안에 갚지 못하면 영원한 시간 지연 형벌에 처해지는
//   주인공 '타래'가, 방구석에서 밈 코인과 주식 단타로 자본을 불려 살아남아야 하는
//   사이버펑크 생존 시뮬레이션. 배후에는 초지능 AI 'Metis'를 키우는 '시지프
//   인텔리전스'가 있다.
//
// 대화 캐릭터 구조:
//   side: 기본 등장 위치('left' | 'right'). 같은 위치에 다른 캐릭터가 등장하면 교체된다.
//   portraits: 표정 키와 이미지 경로. 원본 이미지는 왼쪽을 바라보게 제작한다.
// 대사에서는 { speaker, portrait, side?, text }를 쓴다. side를 생략하면 캐릭터의 기본
// side를 사용하고, 특정 장면에서만 반대편에 세워야 할 때 대사 단위로 덮어쓸 수 있다.
// DialogueScene.jsx는 이미지 로드 실패 시 이니셜 placeholder로 자동 대체한다.

export const CHARACTERS = {
  tarae: {
    name: '타래',
    side: 'left',
    portraits: {
      neutral: '/imgs/portraits/tarae_neutral.png',
      worried: '/imgs/portraits/tarae_worried.png',
      determined: '/imgs/portraits/tarae_determined.png',
    },
  },
  system: {
    // 나레이션/시스템 메시지 전용. 이름표와 초상화 없이 텍스트만 표시된다.
    name: null,
    side: null,
    portraits: {},
  },
}

// 트리거 종류:
//   { type: 'dayStart', cycle, day } — 해당 주기·일차가 시작되는 시점(completeDayIntro 직후)
//   { type: 'phaseEnter', phase }    — 해당 phase로 처음 전환되는 시점
// 한 장면은 한 세이브당 한 번만 재생된다(gameStore.playedSceneIds로 추적).
export const SCENES = {
  'prologue-day1': {
    trigger: { type: 'dayStart', cycle: 1, day: 1 },
    background: null, // null이면 현재 화면을 살짝 어둡게 깔고 그 위에 대화창만 띄운다.
    lines: [
      { speaker: 'system', text: 'AI작성된 임시 스크립트입니다.' },
      { speaker: 'system', text: '방구석. 모니터가 경고음을 내고 있다.' },
      { speaker: 'tarae', portrait: 'neutral', text: '...상속 승인 완료? 내가 언제 승인했다고.' },
      { speaker: 'tarae', portrait: 'neutral', text: '부모님 몫이었던 빚이, 이제 전부 내 이름으로 넘어왔다.' },
      { speaker: 'system', text: '[시지프 인텔리전스 채권관리부] 6주내로 채무액을 전부 변제하지 못하면 전적으로 불이익을 받으실 수 있습니다.' },
    ],
  },
}
