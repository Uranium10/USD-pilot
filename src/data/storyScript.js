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
// 대사에서는 { speaker, portrait, side?, sound?, soundVolume?, soundLoop?, text }를 쓴다.
// side를 생략하면 캐릭터의 기본 side를 사용하고, 특정 장면에서만 반대편에 세워야 할
// 때 대사 단위로 덮어쓸 수 있다. sound에는 `/sounds/파일명.mp3`처럼 public 기준 URL을
// 넣는다. 해당 대사가 시작될 때 재생되고 다음 대사로 넘어가면 자동으로 중단된다.
// text 안에서는 `{{cycle}}`, `{{cash}}`, `{{worldState.someValue}}`처럼 게임 상태의 원시값을
// 삽입할 수 있다. 존재하지 않거나 객체·함수인 값은 예약 기호를 그대로 남긴다.
// `**강조할 문장**`처럼 감싼 부분은 대화창에서 굵은 글씨로 표시된다.
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
// {
//   speaker: 'system',
//   sound: '/sounds/UIPopup.mp3',
//   soundVolume: 0.7,
//   soundLoop: false,
//   text: '대사 내용',
// }

export const SCENES = {
  'prologue-day1': {
    trigger: { type: 'dayStart', cycle: 1, day: 1 },
    background: null, // null이면 현재 화면을 살짝 어둡게 깔고 그 위에 대화창만 띄운다.
    lines: [
      { speaker: 'system', sound: '/sounds/Message_1.mp3', soundVolume: 0.55, text: '꺼 두었던 모니터가 혼자 켜졌다.' },
      { speaker: 'tarae', portrait: 'neutral', text: '...스팸 메일?' },
      { speaker: 'system', text: '[시지프 인텔리전스 채권관리부]\n상속 집행이 정상적으로 완료되었습니다.' },
      { speaker: 'tarae', portrait: 'neutral', text: '상속..? 부모님은 **실종**이야. 어디선가 살아 있을지도 모르는데, 무슨 상속을—' },
      { speaker: 'system', text: '**귀하의 모친과 부친이 회사에 끼친 손실**, 그리고 사내 규정에 의거- 모든 배상 책임은 귀하에게 **채무 형태로 상속**되었습니다.' },
      { speaker: 'system', text: '상환 기한: **6주.**\n현재 채무: **₡{{debt}} 크레딧**' },
      { speaker: 'tarae', portrait: 'neutral', text: '**{{debt}} 크레딧???!!** 이건 말도-' },
      { speaker: 'system', sound: '/sounds/UIPopup.mp3', soundVolume: 0.7, text: '저희 팀의 재무 조사 결과, 귀하의 총 보유 자산은 보험금을 포함해 {{cash}} 크레딧으로 추정됩니다만,' },
      { speaker: 'system', text: '사내 규정에 의거, 미상환 시 시지프 인텔리전스 **내부 연구직**으로 특별 채용 기회가 주어지니,\n염려 마시고 부디 긍정적으로 검토하시길 바랍니다.' },
      { speaker: 'tarae', portrait: 'neutral', text: '엄마 아빠가 **내부 연구직**만큼은 죽어도 하지 말라고 했었는데.' },
      { speaker: 'tarae', portrait: 'neutral', text: '평생 벌 수 있을 지도 모르는 돈인데, 6주는 너무 짧은걸...' },
      { speaker: 'system', text: '채무자의 여건상 **궤도 증권시장** 정도가 현실적인 변제 수단으로 판단됩니다. 단, 투자 손실은 전적으로 본인의 책임입니다.' },
      { speaker: 'tarae', portrait: 'neutral', text: '**주식**으로 빚을 갚으라니. 인터넷 사기 광고도 이것보단 양심이 있는데.' },
      { speaker: 'tarae', portrait: 'neutral', text: '그래도 내가 끌려가 버리면... 부모님을 계속 찾을 사람도 없어.' },
      { speaker: 'tarae', portrait: 'neutral', text: '무섭지만 해보자. **빚을 갚고, 살아남고, 부모님을 찾는 거야.**' },
    ],
  },
  'week1-day2-easy-flag': {
    trigger: { type: 'phaseEnter', phase: 'night', cycle: 1, day: 2 },
    background: null,
    lines: [
      { speaker: 'tarae', portrait: 'neutral', text: '그래도 생각보단 쉬운 것 같기도 하고...' },
    ],
  },
}
