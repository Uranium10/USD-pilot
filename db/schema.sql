-- U.S.D 세션 저장 스키마
-- 자세한 설계 근거는 docs/db-schema.md 참고.
-- 이 파일은 그대로 재실행 가능해야 한다 (모두 IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS sessions (
  device_id         TEXT PRIMARY KEY,               -- 클라이언트가 최초 실행 시 생성해 localStorage에 저장하는 UUID.
                                                      -- 로그인이 없으므로 "이 브라우저의 저장 슬롯 1개"를 식별하는 용도.
  status            TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'gameover' | 'clear'
                                                      -- 타이틀 화면의 "불러오기"는 status='active'일 때만 노출한다.
  created_at        INTEGER NOT NULL,                -- unix epoch(ms)
  updated_at        INTEGER NOT NULL,

  screen            TEXT NOT NULL,                   -- 'title' | 'room' | 'monitor'
  phase             TEXT NOT NULL,                   -- 'idle'|'loading'|'dayIntro'|'premarket'|'day'|'dayReport'|'night'|'settlement'|'gameover'|'clear'
  cycle             INTEGER NOT NULL DEFAULT 1,       -- 몇 주차
  day               INTEGER NOT NULL DEFAULT 1,       -- 주차 내 며칠째 (1~7)

  market_seed       INTEGER NOT NULL,                -- generateMarketCycle({cycle, seed})로 이번 주차 시장을 그대로 재현하기 위한 시드.
                                                      -- 가격 경로·뉴스·소문 전체를 저장하지 않고 이 값 하나로 재생성한다.
  elapsed           REAL NOT NULL DEFAULT 0,         -- 낮 스테이지 경과 시간(초). 불러오기 시 이어서 재생할지 판단하는 값.

  cash              REAL NOT NULL,
  debt              REAL NOT NULL,

  selected_stock_id TEXT,                            -- 마지막으로 보고 있던 종목
  selected_rumor_id TEXT,                            -- 이번 날 구매한 소문 id (없으면 NULL)

  world_state_json  TEXT                             -- 다중 소문, 메모, 일일 요약, 에너지·인벤토리·채굴기와
                                                      -- 시장 재현 보조값 등 확장 진행 상태를 JSON으로 저장한다.
);

CREATE TABLE IF NOT EXISTS holdings (
  device_id TEXT NOT NULL REFERENCES sessions(device_id) ON DELETE CASCADE,
  stock_id  TEXT NOT NULL,
  quantity  REAL NOT NULL,
  average   REAL NOT NULL,
  PRIMARY KEY (device_id, stock_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- AI 시장 생성(RunPlan/CycleScenario) 전용 상태 저장소.
-- sessions.world_state_json과 분리한 이유: 그 컬럼은 클라이언트(gameStore)가 15초마다
-- 통째로 덮어쓰는 "게임 진행 상태"(에너지·인벤토리·메모 등)라, 서버가 생성한 AI 상태를
-- 같이 넣으면 다음 클라이언트 저장 때 사라진다. 그래서 서버 전용으로 별도 테이블을 둔다.
CREATE TABLE IF NOT EXISTS ai_market_state (
  device_id         TEXT PRIMARY KEY,               -- sessions.device_id와 같은 값이지만
                                                      -- 쓰기 순서가 달라 FK는 걸지 않는다.
  run_plan_json     TEXT,                            -- generateRunPlan() 결과 전체. 런당 1회
                                                      -- 생성 후 재사용 (재생성 방지가 핵심).
  world_state_json  TEXT,                            -- 가장 최근 CycleScenario.nextWorldState.
                                                      -- 다음 사이클 생성 프롬프트의 입력이 된다.
  updated_at        INTEGER NOT NULL
);

-- 사이클별 "입력 worldState" 저장소 (2026-08-10 도입).
-- ai_market_state.world_state_json은 단일 슬롯이라, 사이클 N을 플레이하는 도중에
-- N+1을 미리 생성(프리페치)하면 그 슬롯이 N+1의 결과로 덮어써진다. 프리페치 창이
-- 정산 화면 몇 초일 때는 드러나지 않았지만, 주 시작 시점으로 앞당기면 "worldState는
-- N+1로 진행됐는데 플레이어는 아직 N주차"인 상태가 일주일 내내 유지되므로, 그 사이에
-- 사이클 N이 다시 생성되면 잘못된 worldState로 서사가 어긋난다.
-- 여기서는 (device_id, cycle) → "그 사이클을 생성할 때 입력으로 쓸 worldState"를
-- 저장해, 몇 주를 앞서 생성하든 사이클 N의 재생성이 항상 같은 입력을 읽게 한다.
CREATE TABLE IF NOT EXISTS ai_cycle_world_state (
  device_id        TEXT NOT NULL,
  cycle            INTEGER NOT NULL,   -- 이 worldState를 "입력으로" 사용하는 사이클 번호
  world_state_json TEXT,               -- 직전 사이클의 nextWorldState. 1주차는 NULL.
  updated_at       INTEGER NOT NULL,
  PRIMARY KEY (device_id, cycle)
);

-- 사이클별 AI 시나리오 캐시 (2026-08-10 도입, 프리페치용).
-- 한 사이클의 결과물은 (a) 결정론적 시장(가격 경로 — 시드·기업·코인 시작가로 즉시 생성)과
-- (b) AI 시나리오(GPT 호출 — 17~25초, 비용의 대부분)로 나뉘고, compileScenario()가 둘을
-- 합친다. (b)는 runPlan·worldState·기업 매핑에만 의존하고 플레이어 상태와 무관하므로
-- 이번 주가 시작될 때 미리 만들어 여기 저장해 둘 수 있다. 반면 (a)는 그 주 마지막
-- 코인 종가를 시작가로 받아야 해서 미리 만들 수 없다 — 그래서 시장 전체가 아니라
-- 시나리오만 캐시한다. 플레이어가 실제로 그 주차에 도달하면 (a)만 즉석에서 만들고
-- 저장된 (b)를 얹으므로 GPT 대기가 0이 된다.
CREATE TABLE IF NOT EXISTS ai_cycle_scenario (
  device_id     TEXT NOT NULL,
  cycle         INTEGER NOT NULL,
  scenario_json TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  PRIMARY KEY (device_id, cycle)
);

-- 반복 새 게임으로 1주차 GPT를 무제한 재호출하는 것을 막는 기기별 보호 캐시.
-- 세이브/ai_market_state를 삭제해도 이 행은 남아 짧은 재시작에는 같은 1주차를 돌려준다.
CREATE TABLE IF NOT EXISTS ai_restart_guard (
  device_id          TEXT PRIMARY KEY,
  market_json        TEXT NOT NULL,
  run_plan_json      TEXT NOT NULL,
  world_state_json   TEXT NOT NULL,
  cached_at          INTEGER NOT NULL,
  window_started_at  INTEGER NOT NULL,
  fresh_count        INTEGER NOT NULL DEFAULT 1
);

-- 미리 만들어둔 RunPlan 풀 (2026-08-09 도입). 새 게임 시작 시 이 풀에서 무작위로 하나
-- 뽑아 그 세션의 ai_market_state.run_plan_json으로 쓴다 — 플레이어가 "새로하기"를 누른
-- 순간 RunPlan 생성(수십 초)을 기다리지 않게 하기 위함. RunPlan은 stock-1~stock-5라는
-- 추상 슬롯만 참조하고 실제 기업 배정과 무관하므로, 여러 세션이 같은 항목을 재사용해도
-- 구조적으로 안전하다. scripts/generate-run-plan-pool.mjs로 한가할 때마다 채워 넣는다.
-- 근거: USD-spec/agent_workthrough_3.md.
CREATE TABLE IF NOT EXISTS run_plan_pool (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  run_plan_json TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
