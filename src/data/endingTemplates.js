// 멀티엔딩 초안 템플릿. 실제 장소가 정해지면 background 경로와 lines만 교체한다.
// 한 줄에서 background를 생략하면 직전 줄의 배경을 유지한다.
export const ENDING_BACKGROUNDS = {
  bad_interior: '/imgs/endings/bad_interior.png',
  bad_exterior: '/imgs/endings/bad_exterior.png',
  normal_interior: '/imgs/endings/normal_interior.png',
  normal_exterior: '/imgs/endings/normal_exterior.png',
  hidden_interior: '/imgs/endings/hidden_interior.png',
  hidden_exterior: '/imgs/endings/hidden_exterior.png',
  true_interior: '/imgs/endings/true_interior.png',
  true_exterior: '/imgs/endings/true_exterior.png',
}

export const ENDING_TEMPLATES = {
  bad: {
    eyebrow: 'ACCOUNT LIQUIDATED', title: '끝났다.', className: '',
    summary: '바위를 정상까지 밀어 올리지 못했다. 시지프는 친절하게 다음 노동을 준비해 두었다.',
    lines: [
      { background: ENDING_BACKGROUNDS.bad_interior, speaker: 'system', text: '00:00. 장 마감 알림이 사라진 자리에 새 창 하나가 떠올랐다.' },
      { speaker: 'system', text: '[시지프 인텔리전스 채권관리부]\n최종 상환 기한이 종료되었습니다. 미상환 채무: **₡{{debt}}**' },
      { speaker: 'tarae', text: '한 번만… 딱 한 번만 더 장이 열리면 어떻게든—' },
      { speaker: 'system', text: '귀하의 성실한 변제 노력을 높이 평가하여, 약정대로 **내부 연구직 특별 채용**을 진행합니다.' },
      { background: ENDING_BACKGROUNDS.bad_exterior, speaker: 'system', text: '잠금장치가 바깥에서 해제된다. 복도 끝의 금속성 발소리가 문 앞에서 멎었다.' },
      { speaker: 'tarae', text: '엄마, 아빠… 미안해. 그래도 거기서 뭘 봤는지는, 내가 직접 알아낼게.' },
      { speaker: 'system', text: '문이 열리고, 모니터에는 마지막 문장만 남았다.' },
      { speaker: 'system', text: '**시지프 인텔리전스는 귀하의 자발적 합류를 진심으로 환영합니다.**' },
    ],
  },
  normal: {
    eyebrow: 'DEBT CLEARED', title: '살아남았다.', className: 'clear',
    summary: '빚은 끝났다. 부모님을 찾는 일은 이제 누구의 허락도 필요하지 않다.',
    lines: [
      { background: ENDING_BACKGROUNDS.normal_interior, speaker: 'system', text: '송금 버튼을 누른 뒤에도 한동안 아무 일도 일어나지 않았다.' },
      { speaker: 'system', text: '[시지프 인텔리전스 채권관리부]\n채무 전액 상환 확인. 상속 채무 계약이 **종결**되었습니다.' },
      { speaker: 'tarae', text: '…끝난 거지? 정말로 내일은 장이 열려도 안 봐도 되는 거지?' },
      { speaker: 'system', text: '늘 화면을 채우던 숫자들이 사라졌다. 방 안이 이렇게 조용했던 적이 있었나.' },
      { speaker: 'tarae', text: '겨우 숫자 하나를 0으로 만들었을 뿐인데… 숨 쉬는 법을 다시 배워야 할 것 같네.' },
      { background: ENDING_BACKGROUNDS.normal_exterior, speaker: 'system', text: '오랜만에 연 방문 너머로 궤도 도시의 아침 소음이 밀려들었다.' },
      { speaker: 'tarae', text: '가자. 엄마 아빠가 사라진 날의 기록부터 다시 찾는 거야. **이번에는 내 시간을 걸고.**' },
    ],
  },
  hidden: {
    eyebrow: 'HOSTILE TAKEOVER', title: '왕좌를 빼앗았다.', className: 'clear hidden',
    summary: '바위를 밀던 채무자는 산의 주인이 되었다. 그러나 정상에도 답은 없었다.',
    lines: [
      { background: ENDING_BACKGROUNDS.hidden_exterior, speaker: 'system', text: '[궤도거래소 긴급 공시]\n시지프 인텔리전스의 최대 주주가 변경되었습니다.' },
      { speaker: 'system', text: '보유 지분이 의결권 기준선을 넘자, 차단되었던 사내망이 하나씩 열리기 시작했다.' },
      { speaker: 'tarae', text: '빚을 물려준 회사가 이제 내 회사라니. 인터넷 농담도 이것보단 개연성이 있겠다.' },
      { background: ENDING_BACKGROUNDS.hidden_interior, speaker: 'system', text: '[임시 주주총회 결의]\n대표이사 해임. METIS 코어 접근 권한을 신규 최대 주주에게 이관합니다.' },
      { speaker: 'tarae', text: '메티스, 부모님의 연구 기록과 실종 당일 로그를 전부 열어.' },
      { speaker: 'system', text: '검색 결과: 삭제된 기록 18,402건. 외부 반출 흔적 없음. 생존 여부 **확인 불가**.' },
      { speaker: 'tarae', text: '…좋아. 답이 없다면, 이 회사가 숨긴 것부터 하나씩 세상에 풀어버리자.' },
      { speaker: 'tarae', text: '맨 위에 있으면 보이겠지. 누가 이 바위를 굴리기 시작했는지.' },
    ],
  },
  true: {
    eyebrow: 'ESCAPE VELOCITY', title: '궤도를 벗어났다.', className: 'clear true',
    summary: '추적 신호가 끊긴 자리에서 오래된 가족의 신호가 시작되었다.',
    lines: [
      { background: ENDING_BACKGROUNDS.true_interior, speaker: 'system', text: '밀항선의 화물칸은 방보다 좁았고, 가진 것을 거의 다 털어 산 좌석은 볼트 두 개뿐이었다.' },
      { speaker: 'tarae', text: '표 한 장에 가진 걸 거의 다 썼네. 그래도 저 창문 없는 방보단 훨씬 넓어 보여.' },
      { background: ENDING_BACKGROUNDS.true_exterior, speaker: 'system', text: '도킹 해제. 궤도 관제국의 정지 명령이 잡음 속으로 멀어진다.' },
      { speaker: 'system', text: '추적 위성 소실. 항로 추적 불가 구역에 진입합니다.' },
      { speaker: 'tarae', text: '정말 나온 거야… 시지프도, 빚도, 그 지긋지긋한 장 마감 종도 없는 곳으로.' },
      { speaker: 'system', text: '그때 폐기된 규격의 짧은 암호 신호가 수신기에 반복해서 걸렸다.' },
      { speaker: 'tarae', text: '이 배열… 어릴 때 길 잃으면 찾으라고 엄마 아빠가 가르쳐 준 거야.' },
      { speaker: 'system', text: '**TARAE. WE ARE ALIVE. DO NOT RETURN. FOLLOW THE DUST.**' },
      { speaker: 'tarae', text: '찾았다. 이번엔 차트가 아니라… **진짜로 가야 할 방향을.**' },
    ],
  },
}
