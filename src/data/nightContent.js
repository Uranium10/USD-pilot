export const NIGHT_ITEMS = {
  chiliEnergy: {
    id: 'chili-energy',
    name: '칠리맛 에너지 드링크',
    img: '/imgs/items/chili_energy.png',
    description: '매콤함과 카페인을 같은 캔에 가둔 수상한 음료.',
    price: 50,
    energyRestore: 20,
  },
  // 진 엔딩(우주 밀항) 전용 — 6주차 청산 성공 후 에필로그(유예일)에만 상점에 노출된다.
  // 구매 즉시 게임이 끝난다(별도 "사용" 단계 없음, gameStore.buySmugglingTicket 참고).
  smugglingTicket: {
    id: 'smuggling-ticket',
    name: '밀항선 티켓',
    img: '/imgs/items/mining_machine.png', // TODO: 전용 아트 없음 — 임시로 기존 아이콘 재사용
    description: '이름도 국적도 묻지 않는 화물선의 마지막 남은 좌석 하나.',
    price: 500000,
  },
}

export const NIGHT_ACTIVITIES = {
  convenienceJob: {
    id: 'convenience-job',
    name: '편의점 아르바이트',
    img: '/imgs/items/convenience_job.png',
    description: '궤도 정거장 편의점의 야간 재고를 정리한다.',
  },
}
