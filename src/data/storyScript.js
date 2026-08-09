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
      { speaker: 'tarae', portrait: 'neutral', text: '이 시간에 올 연락이라곤 스팸이랑 압류 통지뿐인데.' },
      { speaker: 'system', text: '[시지프 인텔리전스 채권관리부]\n상속 집행이 정상적으로 완료되었습니다.' },
      { speaker: 'tarae', portrait: 'worried', text: '잠깐. 부모님은 **실종**이야. 사망 신고도 없는데 무슨 상속을—' },
      { speaker: 'system', text: '귀하의 이의 제기는 접수와 동시에 기각되었습니다. 빠른 행정 처리에 협조해 주셔서 감사합니다.' },
      { speaker: 'tarae', portrait: 'worried', text: '접수랑 기각을 동시에 하지 마.' },
      { speaker: 'system', sound: '/sounds/UIPopup.mp3', soundVolume: 0.7, text: '미상환 시 시지프 인텔리전스 **내부 연구직**으로 특별 채용됩니다.\n복지 혜택: 현실 1초당 체감 근무시간 약 1년. 종신 고용 보장.' },
      { speaker: 'tarae', portrait: 'worried', text: '그건 취업이 아니라 뇌를 서버에 꽂고 영원히 갈아버리겠다는 거잖아.' },
      { speaker: 'system', text: '상환 기한: **6주.**\n현재 채무: **₡{{debt}}.**\n현재 가용 현금: **₡{{cash}}.**' },
      { speaker: 'tarae', portrait: 'worried', text: '......숫자 하나가 사람을 이렇게 조용하게 만들 수도 있구나.' },
      { speaker: 'system', text: '채무자의 원활한 변제를 지원하기 위해 **궤도 증권시장 접속 권한**을 개방합니다. 투자 손실은 전적으로 고객의 책임입니다.' },
      { speaker: 'tarae', portrait: 'neutral', text: '부모님은 저 회사를 부수려다 사라졌고, 나는 그 회사에 빚을 졌다.' },
      { speaker: 'tarae', portrait: 'determined', text: '좋아. 빚부터 갚는다. 그리고 살아남으면—' },
      { speaker: 'tarae', portrait: 'determined', text: '**시지프 주식을 한 주씩 사서, 저 바위를 회사 쪽으로 굴려주겠어.**' },
    ],
  },
}
