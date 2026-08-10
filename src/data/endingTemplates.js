// 멀티엔딩 초안 템플릿. 실제 장소가 정해지면 background 경로와 lines만 교체한다.
// 한 줄에서 background를 생략하면 직전 줄의 배경을 유지한다.
export const ENDING_BACKGROUNDS = {
  interior: '/imgs/endings/ending_placeholder_interior.svg',
  exterior: '/imgs/endings/ending_placeholder_exterior.svg',
}

export const ENDING_TEMPLATES = {
  bad: {
    eyebrow: 'ACCOUNT LIQUIDATED', title: '끝났다.', className: '',
    summary: '{{cycle}}주차, 채권 추심 드론이 문을 두드립니다.',
    lines: [
      { background: ENDING_BACKGROUNDS.interior, speaker: 'system', text: '[채권관리부] 최종 상환 기한이 종료되었습니다.' },
      { speaker: 'tarae', text: '조금만 더 시간이 있었다면… 아니, 이제 와서 해도 소용없는 말인가.' },
      { background: ENDING_BACKGROUNDS.exterior, speaker: 'system', text: '복도 끝에서 금속성 발소리가 가까워진다.' },
    ],
  },
  normal: {
    eyebrow: 'DEBT CLEARED', title: '살아남았다.', className: 'clear',
    summary: '빚이라는 바위를 다 밀어 올렸다. 하지만 단타의 도파민은 아직 몸에 남아 있다.',
    lines: [
      { background: ENDING_BACKGROUNDS.interior, speaker: 'system', text: '[채권관리부] 채무 전액 상환이 확인되었습니다.' },
      { speaker: 'tarae', text: '끝난 거지? 정말로… 내일은 장이 열려도 안 봐도 되는 거지?' },
      { background: ENDING_BACKGROUNDS.exterior, speaker: 'tarae', text: '일단 밖으로 나가자. 부모님을 찾는 건 이제부터 시작이니까.' },
    ],
  },
  hidden: {
    eyebrow: 'HOSTILE TAKEOVER', title: '왕좌를 빼앗았다.', className: 'clear hidden',
    summary: '시지프 인텔리전스의 지배권을 손에 넣었다. 이제 질문에 답해야 할 쪽은 그들이다.',
    lines: [
      { background: ENDING_BACKGROUNDS.exterior, speaker: 'system', text: '[긴급 공시] 시지프 인텔리전스의 최대 주주가 변경되었습니다.' },
      { speaker: 'tarae', text: '빚을 물려준 회사가 이제 내 회사라니. 세상은 정말 이상하게 돌아가네.' },
      { background: ENDING_BACKGROUNDS.interior, speaker: 'tarae', text: '메티스부터 열어 봐. 부모님에 관한 기록이 분명 남아 있을 거야.' },
    ],
  },
  true: {
    eyebrow: 'ESCAPE VELOCITY', title: '궤도를 벗어났다.', className: 'clear true',
    summary: '밀항선은 감시망을 벗어났다. 먼 우주에서 기다리던 암호 메시지가 도착한다.',
    lines: [
      { background: ENDING_BACKGROUNDS.interior, speaker: 'tarae', text: '표 한 장에 가진 걸 거의 다 썼네. 그래도 후회는 없어.' },
      { background: ENDING_BACKGROUNDS.exterior, speaker: 'system', text: '도킹 해제. 항로 추적 불가 구역에 진입합니다.' },
      { speaker: 'tarae', text: '이 신호… 엄마 아빠가 쓰던 암호야. 살아 있었구나.' },
    ],
  },
}
