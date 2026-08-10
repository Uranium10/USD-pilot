Play: https://usd-pilot.vercel.app/


# U.S.D

빚 상환일까지 7일 동안 실시간 주식 거래로 살아남는 로그라이크 웹게임 파일럿입니다.

## 실행

Windows에서는 `run.bat`을 실행하면 의존성을 확인하고 `http://localhost:5173`에서 브라우저와 Vite 개발 서버를 함께 시작합니다. 로컬 `/api`는 Vite 미들웨어로 제공되므로 Vercel 로그인이나 프로젝트 연결이 필요하지 않습니다.

```bash
npm install
vercel dev
```

`npm run dev`에서는 Vite 미들웨어가 시장 API를 제공합니다. Vercel 배포 환경에서는 `api/market-cycle.js` Vercel Function이 같은 인터페이스를 제공합니다. 어느 API든 실패하면 클라이언트의 로컬 생성기로 자동 대체됩니다.

낮 주식 스테이지는 기본 4분입니다. 개발 중에는 `.env.local`에 `VITE_DAY_DURATION_SECONDS=30`처럼 지정해 단축할 수 있습니다.

## 게임 규칙

- 하루는 4분의 낮 주식 장과 시간제한 없는 밤으로 구성됩니다.
- 밤에는 `하루 종료`를 눌러야 다음 날로 넘어갑니다.
- 7일째 밤 종료 후 빚을 갚고, 6주차 상환 성공 시 클리어합니다.
- 시장 API가 실패해도 로컬 대체 데이터로 계속 플레이할 수 있습니다.

## 기술

- React + Vite
- Zustand 중앙 상태 관리
- React 외부 스테이지 엔진
- Canvas 차트
- Vercel Functions 시장 생성 API
